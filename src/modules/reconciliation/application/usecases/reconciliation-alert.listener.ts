import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ReconciliationStartedEvent,
  ReconciliationCompletedEvent,
  ReconciliationFailedEvent,
  CriticalDiscrepancyFoundEvent,
  ProviderBalanceMismatchEvent,
  SettlementReportGeneratedEvent,
  ReconciliationRequiresReviewEvent,
  DailyReconciliationSummaryEvent,
} from '../../domain/events/reconciliation.events';

/**
 * Reconciliation Alert Listener
 *
 * Handles reconciliation events and triggers alerts/notifications:
 * - Logs important events
 * - Sends alerts for critical discrepancies
 * - Notifies finance team of issues requiring review
 *
 * In production, integrate with:
 * - Slack/Teams webhooks
 * - Email notifications
 * - PagerDuty/OpsGenie for critical alerts
 * - Metrics/monitoring systems (Prometheus, Datadog)
 */
@Injectable()
export class ReconciliationAlertListener {
  private readonly logger = new Logger(ReconciliationAlertListener.name);

  /**
   * Log when reconciliation starts
   */
  @OnEvent('reconciliation.started')
  handleReconciliationStarted(event: ReconciliationStartedEvent): void {
    this.logger.log(
      `[RECONCILIATION] Started ${event.reportType} report (${event.reportId}) ` +
        `for period ${event.periodStart.toISOString()} to ${event.periodEnd.toISOString()}`,
    );
  }

  /**
   * Log and notify on successful completion
   */
  @OnEvent('reconciliation.completed')
  handleReconciliationCompleted(event: ReconciliationCompletedEvent): void {
    const successRate =
      event.totalTransactions > 0
        ? ((event.matchedTransactions / event.totalTransactions) * 100).toFixed(
            2,
          )
        : 100;

    this.logger.log(
      `[RECONCILIATION] Completed ${event.reportType} report (${event.reportId}) ` +
        `in ${event.duration}ms - ${successRate}% success rate, ` +
        `${event.discrepancyCount} discrepancies`,
    );

    // Send notification if there are discrepancies
    if (event.discrepancyCount > 0) {
      this.sendNotification({
        type: 'warning',
        title: `Reconciliation Completed with ${event.discrepancyCount} Discrepancies`,
        message:
          `${event.reportType} report completed with ${event.discrepancyCount} discrepancies. ` +
          `${event.matchedTransactions}/${event.totalTransactions} transactions matched.`,
        reportId: event.reportId,
      });
    }
  }

  /**
   * Alert on reconciliation failure
   */
  @OnEvent('reconciliation.failed')
  handleReconciliationFailed(event: ReconciliationFailedEvent): void {
    this.logger.error(
      `[RECONCILIATION] FAILED ${event.reportType} report (${event.reportId}) ` +
        `after ${event.duration}ms: ${event.error}`,
    );

    // Send critical alert
    this.sendAlert({
      severity: 'critical',
      title: `Reconciliation Failed: ${event.reportType}`,
      message: `Report ${event.reportId} failed: ${event.error}`,
      reportId: event.reportId,
    });
  }

  /**
   * Alert on critical discrepancy
   */
  @OnEvent('reconciliation.critical_discrepancy')
  handleCriticalDiscrepancy(event: CriticalDiscrepancyFoundEvent): void {
    const discrepancy = event.discrepancy;

    this.logger.error(
      `[RECONCILIATION] CRITICAL DISCREPANCY in report ${event.reportId}: ` +
        `${event.discrepancyType} discrepancy for transaction ${discrepancy.transactionId}`,
    );

    // Send critical alert
    this.sendAlert({
      severity: 'critical',
      title: 'Critical Financial Discrepancy Detected',
      message:
        `A critical ${event.discrepancyType} discrepancy was found for ` +
        `transaction ${discrepancy.transactionId}. Immediate review required.`,
      reportId: event.reportId,
      data: {
        discrepancyType: event.discrepancyType,
        transactionId: discrepancy.transactionId,
        severity: discrepancy.severity,
      },
    });
  }

  /**
   * Alert on provider balance mismatch
   */
  @OnEvent('reconciliation.provider_balance_mismatch')
  handleProviderBalanceMismatch(event: ProviderBalanceMismatchEvent): void {
    this.logger.warn(
      `[RECONCILIATION] Provider balance mismatch for ${event.provider} (${event.currency}): ` +
        `reported=${event.reportedBalance}, calculated=${event.calculatedBalance}, ` +
        `difference=${event.difference}`,
    );

    // Determine severity based on difference
    const diff = Math.abs(parseFloat(event.difference));
    const severity = diff >= 100 ? 'critical' : diff >= 10 ? 'high' : 'medium';

    if (severity === 'critical' || severity === 'high') {
      this.sendAlert({
        severity,
        title: `Provider Balance Mismatch: ${event.provider}`,
        message:
          `Balance mismatch detected for ${event.provider} (${event.currency}): ` +
          `$${event.difference} difference between reported and calculated balance.`,
        reportId: event.reportId,
        data: {
          provider: event.provider,
          currency: event.currency,
          reportedBalance: event.reportedBalance,
          calculatedBalance: event.calculatedBalance,
          difference: event.difference,
        },
      });
    }
  }

  /**
   * Log settlement report generation
   */
  @OnEvent('reconciliation.settlement_generated')
  handleSettlementGenerated(event: SettlementReportGeneratedEvent): void {
    this.logger.log(
      `[RECONCILIATION] Settlement report generated (${event.reportId}): ` +
        `$${event.totalGrossVolume} gross, $${event.totalNetSettlement} net, ` +
        `${event.providerCount} providers`,
    );

    // Send daily summary notification
    this.sendNotification({
      type: 'info',
      title: 'Daily Settlement Report Generated',
      message:
        `Settlement report for ${event.periodStart.toISOString().split('T')[0]}: ` +
        `$${event.totalGrossVolume} gross volume, $${event.totalNetSettlement} net settlement.`,
      reportId: event.reportId,
    });
  }

  /**
   * Alert when report requires review
   */
  @OnEvent('reconciliation.requires_review')
  handleRequiresReview(event: ReconciliationRequiresReviewEvent): void {
    this.logger.warn(
      `[RECONCILIATION] Report ${event.reportId} requires manual review: ${event.reason}`,
    );

    this.sendNotification({
      type: 'warning',
      title: 'Reconciliation Report Requires Review',
      message:
        `${event.reportType} report has ${event.criticalCount} critical and ` +
        `${event.highCount} high severity issues. ${event.reason}`,
      reportId: event.reportId,
    });
  }

  /**
   * Log daily reconciliation summary
   */
  @OnEvent('reconciliation.daily_summary')
  handleDailySummary(event: DailyReconciliationSummaryEvent): void {
    const statusEmoji =
      event.overallStatus === 'healthy'
        ? '[OK]'
        : event.overallStatus === 'issues'
          ? '[WARN]'
          : '[CRITICAL]';

    this.logger.log(
      `[RECONCILIATION] ${statusEmoji} Daily Summary for ${event.date.toISOString().split('T')[0]}: ` +
        `${event.summary.totalTransactions} transactions, ` +
        `$${event.summary.totalVolume} volume, ` +
        `$${event.summary.totalFees} fees, ` +
        `${event.summary.discrepancyCount} discrepancies`,
    );

    // Send daily summary notification
    this.sendNotification({
      type: event.overallStatus === 'critical' ? 'warning' : 'info',
      title: `Daily Reconciliation Summary: ${event.overallStatus.toUpperCase()}`,
      message:
        `Date: ${event.date.toISOString().split('T')[0]}\n` +
        `Transactions: ${event.summary.totalTransactions}\n` +
        `Volume: $${event.summary.totalVolume}\n` +
        `Fees: $${event.summary.totalFees}\n` +
        `Discrepancies: ${event.summary.discrepancyCount}`,
      reportId: event.transactionReportId,
    });
  }

  /**
   * Send notification (implement actual notification service integration)
   */
  private sendNotification(payload: {
    type: 'info' | 'warning' | 'error';
    title: string;
    message: string;
    reportId: string;
  }): void {
    // TODO: Integrate with actual notification service
    // Examples:
    // - this.slackService.sendMessage(payload);
    // - this.emailService.sendToFinanceTeam(payload);
    // - this.teamsService.sendCard(payload);

    this.logger.debug(
      `[NOTIFICATION] ${payload.type.toUpperCase()}: ${payload.title}`,
    );
  }

  /**
   * Send critical alert (implement actual alerting service integration)
   */
  private sendAlert(payload: {
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    message: string;
    reportId: string;
    data?: Record<string, unknown>;
  }): void {
    // TODO: Integrate with actual alerting service
    // Examples:
    // - this.pagerDutyService.createIncident(payload);
    // - this.opsGenieService.createAlert(payload);
    // - this.datadogService.sendEvent(payload);

    this.logger.error(
      `[ALERT] ${payload.severity.toUpperCase()}: ${payload.title} - ${payload.message}`,
    );
  }
}
