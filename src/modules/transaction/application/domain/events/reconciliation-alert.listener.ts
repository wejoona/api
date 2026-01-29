import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  BalanceDiscrepancy,
  FullReconciliationReport,
} from '../services/reconciliation.service';

/**
 * Reconciliation Alert Listener
 *
 * Listens to reconciliation events and sends alerts via the notification system.
 * Integrates balance reconciliation with the existing monitoring and alerting infrastructure.
 */
@Injectable()
export class ReconciliationAlertListener {
  private readonly logger = new Logger(ReconciliationAlertListener.name);

  /**
   * Handle balance discrepancy events
   * Logs all discrepancies for audit trail
   */
  @OnEvent('reconciliation.balance.discrepancy')
  async handleBalanceDiscrepancy(event: {
    discrepancy: BalanceDiscrepancy;
    userId: string;
    walletId: string;
  }): Promise<void> {
    const { discrepancy, userId, walletId } = event;

    this.logger.warn(
      `Balance discrepancy detected for user ${userId} (wallet: ${walletId}): ` +
        `Blnk=${discrepancy.blnkBalance}, DB=${discrepancy.databaseBalance}, ` +
        `Circle=${discrepancy.circleBalance}, Diff=${discrepancy.totalDiff} ${discrepancy.currency} ` +
        `[${discrepancy.severity.toUpperCase()}]`,
    );

    // Log to audit trail
    this.logger.debug(
      JSON.stringify({
        event: 'balance_discrepancy',
        userId,
        walletId,
        ...discrepancy,
      }),
    );
  }

  /**
   * Handle critical balance discrepancies (>= $0.10)
   * Sends immediate alerts to operations team
   */
  @OnEvent('reconciliation.balance.critical')
  async handleCriticalDiscrepancy(event: {
    discrepancy: BalanceDiscrepancy;
    userId: string;
    walletId: string;
  }): Promise<void> {
    const { discrepancy, userId, walletId } = event;

    this.logger.error(
      `CRITICAL BALANCE DISCREPANCY for user ${userId} (wallet: ${walletId}): ` +
        `Total difference: ${discrepancy.totalDiff} ${discrepancy.currency} ` +
        `[Blnk: ${discrepancy.blnkBalance}, DB: ${discrepancy.databaseBalance}, ` +
        `Circle: ${discrepancy.circleBalance}]`,
    );

    // In production, this would:
    // 1. Send email to finance team
    // 2. Create PagerDuty/Slack alert
    // 3. Log to security audit system
    // 4. Potentially suspend wallet until reconciled

    // TODO: Integrate with notification service
    // await this.notificationService.send({
    //   userId: 'admin',
    //   category: 'finance',
    //   title: `Critical Balance Discrepancy: ${discrepancy.totalDiff} ${discrepancy.currency}`,
    //   body: `User ${userId} has a critical balance discrepancy. Immediate action required.`,
    //   priority: 'critical',
    //   channels: ['email', 'push', 'in_app'],
    //   data: { discrepancy, userId, walletId },
    // });
  }

  /**
   * Handle daily reconciliation completion
   * Sends summary report to finance team
   */
  @OnEvent('reconciliation.balance.completed')
  async handleReconciliationCompleted(
    report: FullReconciliationReport,
  ): Promise<void> {
    const { totalWallets, reconciledWallets, discrepancies, errors, duration } =
      report;

    const discrepancyCount = discrepancies.length;
    const successRate = ((reconciledWallets / totalWallets) * 100).toFixed(2);

    this.logger.log(
      `Daily reconciliation completed in ${duration}ms: ` +
        `${reconciledWallets}/${totalWallets} wallets reconciled (${successRate}%), ` +
        `${discrepancyCount} discrepancies, ${errors.length} errors`,
    );

    // Log summary statistics
    if (discrepancies.length > 0) {
      const severityCounts = {
        critical: discrepancies.filter((d) => d.severity === 'critical').length,
        high: discrepancies.filter((d) => d.severity === 'high').length,
        medium: discrepancies.filter((d) => d.severity === 'medium').length,
        low: discrepancies.filter((d) => d.severity === 'low').length,
      };

      this.logger.warn(
        `Discrepancy breakdown: ` +
          `Critical: ${severityCounts.critical}, ` +
          `High: ${severityCounts.high}, ` +
          `Medium: ${severityCounts.medium}, ` +
          `Low: ${severityCounts.low}`,
      );
    }

    // In production, send daily summary email
    // TODO: Integrate with email service
    // await this.emailService.send({
    //   to: 'finance@joonapay.com',
    //   subject: `Daily Balance Reconciliation Report - ${new Date().toLocaleDateString()}`,
    //   template: 'reconciliation-summary',
    //   data: { report },
    // });
  }

  /**
   * Handle critical discrepancy summary
   * Alerts when multiple wallets have critical discrepancies
   */
  @OnEvent('reconciliation.balance.critical.summary')
  async handleCriticalSummary(event: {
    count: number;
    discrepancies: BalanceDiscrepancy[];
    timestamp: Date;
  }): Promise<void> {
    const { count, discrepancies } = event;

    this.logger.error(
      `ALERT: ${count} wallets have critical balance discrepancies (>= $1.00)`,
    );

    // Calculate total discrepancy amount
    const totalDiscrepancy = discrepancies.reduce((sum, d) => {
      const amount = Math.abs(parseFloat(d.totalDiff));
      return sum + amount;
    }, 0);

    this.logger.error(
      `Total critical discrepancy amount: $${totalDiscrepancy.toFixed(2)}`,
    );

    // List affected wallets
    discrepancies.forEach((d) => {
      this.logger.error(
        `  - User ${d.userId} (Wallet ${d.walletId}): ${d.totalDiff} ${d.currency}`,
      );
    });

    // In production, this would trigger:
    // 1. Immediate PagerDuty alert
    // 2. Slack notification to #finance-alerts
    // 3. SMS to on-call finance team
    // 4. Create incident in incident management system

    // TODO: Integrate with incident management
    // await this.incidentService.create({
    //   severity: 'critical',
    //   title: `${count} Critical Balance Discrepancies`,
    //   description: `Total discrepancy: $${totalDiscrepancy.toFixed(2)}`,
    //   affectedUsers: discrepancies.map(d => d.userId),
    //   metadata: { discrepancies },
    // });
  }

  /**
   * Handle reconciliation errors
   * Logs errors for debugging and monitoring
   */
  @OnEvent('reconciliation.failed')
  async handleReconciliationFailed(event: {
    source: string;
    error: string;
    timestamp: string;
  }): Promise<void> {
    const { source, error, timestamp } = event;

    this.logger.error(
      `Reconciliation failed for ${source} at ${timestamp}: ${error}`,
    );

    // TODO: Send alert to engineering team
    // await this.notificationService.send({
    //   userId: 'engineering',
    //   category: 'system',
    //   title: `Reconciliation Failed: ${source}`,
    //   body: error,
    //   priority: 'high',
    //   channels: ['email', 'slack'],
    // });
  }
}
