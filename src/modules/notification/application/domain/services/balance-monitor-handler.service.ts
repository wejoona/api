import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BalanceMonitorTriggeredEvent } from '../events/balance-monitor-triggered.event';
import { NotificationService } from './notification.service';

/**
 * Balance Monitor Handler Service
 *
 * Handles balance monitor alerts and dispatches appropriate notifications:
 * - LOW_BALANCE_WARNING: Push notification to user
 * - HIGH_DEBIT_ALERT: Alert to fraud team + notify user
 * - AML_DAILY_LIMIT: Compliance team notification
 * - LOW_FLOAT_ALERT: Operations team notification
 */
@Injectable()
export class BalanceMonitorHandlerService {
  private readonly logger = new Logger(BalanceMonitorHandlerService.name);

  // Topic names for team notifications
  private readonly FRAUD_TEAM_TOPIC = 'fraud_team_alerts';
  private readonly COMPLIANCE_TEAM_TOPIC = 'compliance_team_alerts';
  private readonly OPERATIONS_TEAM_TOPIC = 'operations_team_alerts';
  private readonly FINANCE_TEAM_TOPIC = 'finance_team_alerts';

  constructor(private readonly notificationService: NotificationService) {}

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
  async handleLowBalanceWarning(
    event: BalanceMonitorTriggeredEvent,
  ): Promise<void> {
    this.logger.warn(`Low balance alert for user: ${event.userId}`);

    try {
      // Format the balance for display (assuming 6 decimals for USDC)
      const currentBalance = this.formatAmount(event.currentValue);
      const threshold = this.formatAmount(event.threshold);

      // Send push notification to user
      const result = await this.notificationService.sendToUser({
        userId: event.userId,
        type: 'low_balance',
        title: 'Low Balance Alert',
        body: `Your balance of ${currentBalance} USDC is below ${threshold} USDC. Consider topping up your wallet.`,
        data: {
          type: 'low_balance',
          balanceId: event.balanceId,
          currentBalance: currentBalance,
          threshold: threshold,
        },
        referenceType: 'balance_monitor',
        referenceId: event.monitorId,
        priority: 'normal',
      });

      this.logger.log(
        `Low balance notification sent: ${result.notificationId}, pushed to ${result.devicesNotified} devices`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send low balance notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Handle high debit alert (fraud detection)
   */
  @OnEvent('balance.monitor.high_debit')
  async handleHighDebitAlert(
    event: BalanceMonitorTriggeredEvent,
  ): Promise<void> {
    this.logger.error(`HIGH DEBIT ALERT for user: ${event.userId}`);

    try {
      const debitAmount = this.formatAmount(event.currentValue);
      const threshold = this.formatAmount(event.threshold);

      // 1. Alert fraud team via topic
      await this.notificationService.sendToTopic(
        this.FRAUD_TEAM_TOPIC,
        'High Debit Alert - Review Required',
        `User ${event.userId} has high debit activity: ${debitAmount} USDC (threshold: ${threshold} USDC)`,
        {
          type: 'high_debit_alert',
          userId: event.userId,
          balanceId: event.balanceId,
          amount: debitAmount,
          threshold: threshold,
          triggeredAt: event.triggeredAt.toISOString(),
        },
      );

      // 2. Notify the user about security review
      await this.notificationService.sendToUser({
        userId: event.userId,
        type: 'system',
        title: 'Security Alert',
        body: 'We noticed unusual activity on your account. Your recent transactions are being reviewed for security.',
        data: {
          type: 'security_review',
          reason: 'high_debit',
        },
        priority: 'high',
      });

      this.logger.log(
        `High debit alert notifications sent for user: ${event.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send high debit notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Handle AML daily limit reached
   */
  @OnEvent('balance.monitor.aml_limit')
  async handleAmlLimit(event: BalanceMonitorTriggeredEvent): Promise<void> {
    this.logger.warn(`AML daily limit reached for user: ${event.userId}`);

    try {
      const currentAmount = this.formatAmount(event.currentValue);
      const limit = this.formatAmount(event.threshold);

      // 1. Alert compliance team
      await this.notificationService.sendToTopic(
        this.COMPLIANCE_TEAM_TOPIC,
        'AML Limit Reached',
        `User ${event.userId} reached daily AML limit: ${currentAmount} USDC (limit: ${limit} USDC)`,
        {
          type: 'aml_limit_reached',
          userId: event.userId,
          balanceId: event.balanceId,
          dailyTotal: currentAmount,
          limit: limit,
          triggeredAt: event.triggeredAt.toISOString(),
        },
      );

      // 2. Notify user about transaction limit
      await this.notificationService.sendToUser({
        userId: event.userId,
        type: 'system',
        title: 'Daily Limit Reached',
        body: `You've reached your daily transaction limit of ${limit} USDC. Limits will reset tomorrow.`,
        data: {
          type: 'aml_limit',
          dailyTotal: currentAmount,
          limit: limit,
        },
        priority: 'normal',
      });

      this.logger.log(`AML limit notifications sent for user: ${event.userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send AML limit notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Handle low float alert (operations)
   */
  @OnEvent('balance.monitor.low_float')
  async handleLowFloatAlert(
    event: BalanceMonitorTriggeredEvent,
  ): Promise<void> {
    this.logger.warn(`LOW FLOAT ALERT - Operations action required`);

    try {
      const currentFloat = this.formatAmount(event.currentValue);
      const threshold = this.formatAmount(event.threshold);

      // Alert operations team
      await this.notificationService.sendToTopic(
        this.OPERATIONS_TEAM_TOPIC,
        'Low Float Alert - Action Required',
        `Operational float is low: ${currentFloat} USDC (threshold: ${threshold} USDC). Replenishment needed.`,
        {
          type: 'low_float_alert',
          balanceId: event.balanceId,
          currentFloat: currentFloat,
          threshold: threshold,
          triggeredAt: event.triggeredAt.toISOString(),
        },
      );

      this.logger.log(`Low float alert sent to operations team`);
    } catch (error) {
      this.logger.error(
        `Failed to send low float alert: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Handle reconciliation completed
   */
  @OnEvent('reconciliation.completed')
  async handleReconciliationCompleted(payload: {
    source: string;
    reconciliationId: string;
    matchedCount: number;
    unmatchedCount: number;
  }): Promise<void> {
    this.logger.log(
      `Reconciliation completed for ${payload.source}: ${payload.matchedCount} matched, ${payload.unmatchedCount} unmatched`,
    );

    if (payload.unmatchedCount > 0) {
      try {
        await this.notificationService.sendToTopic(
          this.FINANCE_TEAM_TOPIC,
          'Reconciliation Discrepancy',
          `Reconciliation for ${payload.source} completed with ${payload.unmatchedCount} unmatched transactions.`,
          {
            type: 'reconciliation_discrepancy',
            source: payload.source,
            reconciliationId: payload.reconciliationId,
            matchedCount: payload.matchedCount.toString(),
            unmatchedCount: payload.unmatchedCount.toString(),
          },
        );

        this.logger.warn(
          `Sent discrepancy alert for ${payload.unmatchedCount} unmatched transactions`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send reconciliation discrepancy alert: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  }

  /**
   * Handle reconciliation discrepancy
   */
  @OnEvent('reconciliation.discrepancy')
  async handleReconciliationDiscrepancy(payload: {
    source: string;
    reconciliationId: string;
    unmatchedCount: number;
    message: string;
  }): Promise<void> {
    this.logger.error(`Reconciliation discrepancy: ${payload.message}`);

    try {
      await this.notificationService.sendToTopic(
        this.FINANCE_TEAM_TOPIC,
        'Reconciliation Alert - Investigation Required',
        `${payload.message}. Source: ${payload.source}, Unmatched: ${payload.unmatchedCount}`,
        {
          type: 'reconciliation_alert',
          source: payload.source,
          reconciliationId: payload.reconciliationId,
          unmatchedCount: payload.unmatchedCount.toString(),
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send reconciliation discrepancy alert: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Handle reconciliation failure
   */
  @OnEvent('reconciliation.failed')
  async handleReconciliationFailed(payload: {
    source: string;
    error: string;
    timestamp: string;
  }): Promise<void> {
    this.logger.error(
      `Reconciliation failed for ${payload.source}: ${payload.error}`,
    );

    try {
      await this.notificationService.sendToTopic(
        this.OPERATIONS_TEAM_TOPIC,
        'Reconciliation Failed',
        `Reconciliation for ${payload.source} failed: ${payload.error}`,
        {
          type: 'reconciliation_failed',
          source: payload.source,
          error: payload.error,
          timestamp: payload.timestamp,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send reconciliation failure alert: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Format bigint amount to human-readable string
   * Assumes 6 decimal places for USDC
   */
  private formatAmount(amount: bigint): string {
    const divisor = BigInt(1000000);
    const whole = amount / divisor;
    const fraction = amount % divisor;
    const fractionStr = fraction.toString().padStart(6, '0').replace(/0+$/, '');

    if (fractionStr === '') {
      return whole.toString();
    }

    return `${whole}.${fractionStr}`;
  }
}
