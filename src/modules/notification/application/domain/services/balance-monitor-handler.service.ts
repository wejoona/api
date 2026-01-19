import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BalanceMonitorTriggeredEvent } from '../events/balance-monitor-triggered.event';

/**
 * Balance Monitor Handler Service
 *
 * Handles balance monitor alerts and dispatches appropriate notifications:
 * - LOW_BALANCE_WARNING: Push notification + email to user
 * - HIGH_DEBIT_ALERT: Alert to fraud team + block account
 * - AML_DAILY_LIMIT: Compliance team notification
 * - LOW_FLOAT_ALERT: Operations team notification
 */
@Injectable()
export class BalanceMonitorHandlerService {
  private readonly logger = new Logger(BalanceMonitorHandlerService.name);

  /**
   * Handle user ledger identity created event
   * Sets up balance monitors for new users
   */
  @OnEvent('user.ledger-identity.created')
  handleUserLedgerIdentityCreated(payload: {
    userId: string;
    identityId: string;
    balanceId: string;
    email: string;
    timestamp: string;
  }): void {
    this.logger.log(`User ledger identity created: ${payload.userId}`);

    // The SetupUserBalanceMonitorsUseCase will be called separately
    // This handler logs for audit purposes
  }

  /**
   * Handle balance monitors setup event
   */
  @OnEvent('user.balance-monitors.setup')
  handleBalanceMonitorsSetup(payload: {
    userId: string;
    balanceId: string;
    monitors: { type: string; monitorId: string }[];
    timestamp: string;
  }): void {
    this.logger.log(
      `Balance monitors setup for user ${payload.userId}: ${payload.monitors.length} monitors`,
    );
  }

  /**
   * Handle low balance warning
   */
  @OnEvent('balance.monitor.low_balance')
  handleLowBalanceWarning(event: BalanceMonitorTriggeredEvent): void {
    this.logger.warn(`Low balance alert for user: ${event.userId}`);

    // TODO: Implement actual notification sending
    // 1. Get user's notification preferences
    // 2. Send push notification
    // 3. Send email notification
    // 4. Log to audit trail

    this.logger.log(
      `Would send low balance notification to user: ${event.userId}`,
    );
  }

  /**
   * Handle high debit alert (fraud detection)
   */
  @OnEvent('balance.monitor.high_debit')
  handleHighDebitAlert(event: BalanceMonitorTriggeredEvent): void {
    this.logger.error(`HIGH DEBIT ALERT for user: ${event.userId}`);

    // TODO: Implement fraud handling
    // 1. Flag account for review
    // 2. Alert fraud team via Slack/PagerDuty
    // 3. Optionally freeze account
    // 4. Log to security audit trail

    this.logger.log(`Would alert fraud team about user: ${event.userId}`);
  }

  /**
   * Handle AML daily limit reached
   */
  @OnEvent('balance.monitor.aml_limit')
  handleAmlLimit(event: BalanceMonitorTriggeredEvent): void {
    this.logger.warn(`AML daily limit reached for user: ${event.userId}`);

    // TODO: Implement compliance handling
    // 1. Block further transactions for the day
    // 2. Notify compliance team
    // 3. Generate SAR report if needed
    // 4. Log to compliance audit trail

    this.logger.log(`Would notify compliance team about user: ${event.userId}`);
  }

  /**
   * Handle low float alert (operations)
   */
  @OnEvent('balance.monitor.low_float')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleLowFloatAlert(event: BalanceMonitorTriggeredEvent): void {
    this.logger.warn(`LOW FLOAT ALERT - Operations action required`);

    // TODO: Implement operations handling
    // 1. Alert operations team via Slack
    // 2. Trigger float replenishment workflow
    // 3. Log to operations audit trail

    this.logger.log(`Would alert operations team about low float`);
  }

  /**
   * Handle reconciliation completed
   */
  @OnEvent('reconciliation.completed')
  handleReconciliationCompleted(payload: {
    source: string;
    reconciliationId: string;
    matchedCount: number;
    unmatchedCount: number;
  }): void {
    this.logger.log(
      `Reconciliation completed for ${payload.source}: ${payload.matchedCount} matched, ${payload.unmatchedCount} unmatched`,
    );

    if (payload.unmatchedCount > 0) {
      // TODO: Alert finance team about discrepancies
      this.logger.warn(
        `${payload.unmatchedCount} unmatched transactions for ${payload.source}`,
      );
    }
  }

  /**
   * Handle reconciliation discrepancy
   */
  @OnEvent('reconciliation.discrepancy')
  handleReconciliationDiscrepancy(payload: {
    source: string;
    reconciliationId: string;
    unmatchedCount: number;
    message: string;
  }): void {
    this.logger.error(`Reconciliation discrepancy: ${payload.message}`);

    // TODO: Implement discrepancy handling
    // 1. Alert finance team via email/Slack
    // 2. Create investigation ticket
    // 3. Log to audit trail
  }

  /**
   * Handle reconciliation failure
   */
  @OnEvent('reconciliation.failed')
  handleReconciliationFailed(payload: {
    source: string;
    error: string;
    timestamp: string;
  }): void {
    this.logger.error(
      `Reconciliation failed for ${payload.source}: ${payload.error}`,
    );

    // TODO: Alert operations team about failure
  }
}
