/**
 * Alert Rules Service
 * Rule evaluation engine for transaction monitoring
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { MonitoringRuleRepository } from '../../infrastructure/repositories/monitoring-rule.repository';
import { UserAlertPreferencesRepository } from '../../infrastructure/repositories/user-alert-preferences.repository';
import {
  MonitoringRule,
  RuleCondition,
  RuleAction,
  TransactionContext,
  TransactionAlert,
  AlertType,
  AlertSeverity,
  UserAlertPreferences,
  ALERT_TYPE_CONFIG,
} from '../../domain/interfaces/monitoring.types';

export interface RuleEvaluationResult {
  matched: boolean;
  rule?: MonitoringRule;
  alert?: TransactionAlert;
  blockedTransaction?: boolean;
}

@Injectable()
export class AlertRulesService implements OnModuleInit {
  private readonly logger = new Logger(AlertRulesService.name);
  private rulesCache: MonitoringRule[] = [];
  private lastCacheUpdate: Date | null = null;
  private readonly CACHE_TTL_MS = 60000; // 1 minute

  constructor(
    private readonly ruleRepository: MonitoringRuleRepository,
    private readonly preferencesRepository: UserAlertPreferencesRepository,
  ) {}

  async onModuleInit() {
    await this.loadRules();
    await this.seedDefaultRules();
  }

  /**
   * Load rules from database into cache
   */
  async loadRules(): Promise<void> {
    this.rulesCache = await this.ruleRepository.findActiveRules();
    this.lastCacheUpdate = new Date();
    this.logger.log(`Loaded ${this.rulesCache.length} active monitoring rules`);
  }

  /**
   * Seed default rules if none exist
   */
  async seedDefaultRules(): Promise<void> {
    const existingRules = await this.ruleRepository.findAll();
    if (existingRules.length > 0) {
      return;
    }

    const defaultRules = this.getDefaultRules();
    for (const rule of defaultRules) {
      await this.ruleRepository.create(rule);
    }
    this.logger.log(`Seeded ${defaultRules.length} default monitoring rules`);
    await this.loadRules();
  }

  /**
   * Evaluate all rules against a transaction
   */
  async evaluateTransaction(
    context: TransactionContext,
    userPreferences?: UserAlertPreferences,
  ): Promise<RuleEvaluationResult[]> {
    await this.refreshCacheIfNeeded();

    const results: RuleEvaluationResult[] = [];
    const prefs =
      userPreferences ||
      (await this.preferencesRepository.findByUserId(context.userId));

    for (const rule of this.rulesCache) {
      const result = await this.evaluateRule(rule, context, prefs);
      if (result.matched) {
        results.push(result);
        this.logger.log(
          `Rule "${rule.name}" matched for transaction ${context.transactionId}`,
        );
      }
    }

    return results;
  }

  /**
   * Evaluate a single rule against transaction context
   */
  async evaluateRule(
    rule: MonitoringRule,
    context: TransactionContext,
    userPreferences?: UserAlertPreferences | null,
  ): Promise<RuleEvaluationResult> {
    try {
      const conditionResults = await Promise.all(
        rule.conditions.map((condition) =>
          this.evaluateCondition(condition, context, userPreferences),
        ),
      );

      const matched =
        rule.conditionLogic === 'AND'
          ? conditionResults.every((r) => r)
          : conditionResults.some((r) => r);

      if (!matched) {
        return { matched: false };
      }

      // Check if user has this alert type enabled
      if (userPreferences && rule.action.alertType) {
        const alertTypeEnabled = userPreferences.alertTypes.includes(
          rule.action.alertType,
        );
        if (!alertTypeEnabled) {
          this.logger.debug(
            `Alert type ${rule.action.alertType} disabled for user ${context.userId}`,
          );
          return { matched: false };
        }
      }

      // Create alert if configured
      let alert: TransactionAlert | undefined;
      if (rule.action.createAlert && rule.action.alertType) {
        alert = this.createAlertFromRule(rule, context);
      }

      return {
        matched: true,
        rule,
        alert,
        blockedTransaction: rule.action.blockTransaction,
      };
    } catch (error) {
      this.logger.error(
        `Error evaluating rule ${rule.ruleId}: ${error.message}`,
      );
      return { matched: false };
    }
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(
    condition: RuleCondition,
    context: TransactionContext,
    userPreferences?: UserAlertPreferences | null,
  ): Promise<boolean> {
    switch (condition.type) {
      case 'amount_greater_than':
        return this.evaluateAmountGreaterThan(
          condition,
          context,
          userPreferences,
        );

      case 'amount_less_than':
        return context.amount < (condition.value as number);

      case 'velocity_exceeded':
        return await this.evaluateVelocityExceeded(condition, context);

      case 'location_mismatch':
        return this.evaluateLocationMismatch(condition, context);

      case 'time_outside_range':
        return this.evaluateTimeOutsideRange(condition, context);

      case 'recipient_new':
        return await this.evaluateRecipientNew(condition, context);

      case 'cumulative_exceeded':
        return await this.evaluateCumulativeExceeded(
          condition,
          context,
          userPreferences,
        );

      case 'device_new':
        return this.evaluateDeviceNew(condition, context);

      case 'failed_count_exceeded':
        return await this.evaluateFailedCountExceeded(condition, context);

      case 'pattern_match':
        return this.evaluatePatternMatch(condition, context);

      default:
        this.logger.warn(`Unknown condition type: ${condition.type}`);
        return false;
    }
  }

  /**
   * Check if amount exceeds threshold
   */
  private evaluateAmountGreaterThan(
    condition: RuleCondition,
    context: TransactionContext,
    userPreferences?: UserAlertPreferences | null,
  ): boolean {
    // Use user preference threshold if available, otherwise use rule threshold
    const threshold =
      userPreferences?.largeTransactionThreshold ?? (condition.value as number);
    return context.amount > threshold;
  }

  /**
   * Check velocity (transaction count in time window)
   */
  private async evaluateVelocityExceeded(
    condition: RuleCondition,
    context: TransactionContext,
  ): Promise<boolean> {
    // This would typically query the transaction repository
    // For now, we'll use metadata if provided
    const recentCount =
      (context.metadata?.recentTransactionCount as number) || 0;
    const threshold = condition.countThreshold || 5;
    return recentCount >= threshold;
  }

  /**
   * Check for location mismatch
   */
  private evaluateLocationMismatch(
    condition: RuleCondition,
    context: TransactionContext,
  ): boolean {
    if (!context.location) return false;

    // Check for VPN/Tor usage
    if (context.location.isVpn || context.location.isTor) {
      return true;
    }

    // Check if country differs from usual
    const usualCountries = (context.metadata?.usualCountries as string[]) || [];
    if (usualCountries.length > 0 && context.location.countryCode) {
      return !usualCountries.includes(context.location.countryCode);
    }

    return false;
  }

  /**
   * Check if transaction time is outside normal range
   */
  private evaluateTimeOutsideRange(
    condition: RuleCondition,
    context: TransactionContext,
  ): boolean {
    const hour = context.createdAt.getHours();
    const typicalHours = (context.metadata?.typicalHours as number[]) || [
      8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    ];
    return !typicalHours.includes(hour);
  }

  /**
   * Check if recipient is new
   */
  private async evaluateRecipientNew(
    condition: RuleCondition,
    context: TransactionContext,
  ): Promise<boolean> {
    const address =
      context.recipientAddress ||
      context.recipientWalletId ||
      context.recipientPhone;
    if (!address) return false;

    // Check metadata for known recipients
    const knownRecipients =
      (context.metadata?.knownRecipients as string[]) || [];
    return !knownRecipients.includes(address);
  }

  /**
   * Check if cumulative daily amount exceeds threshold
   */
  private async evaluateCumulativeExceeded(
    condition: RuleCondition,
    context: TransactionContext,
    userPreferences?: UserAlertPreferences | null,
  ): Promise<boolean> {
    const dailyTotal = (context.metadata?.dailyTransactionTotal as number) || 0;
    const threshold =
      userPreferences?.dailyLimitThreshold ??
      (condition.value as number) ??
      5000;
    return dailyTotal + context.amount > threshold;
  }

  /**
   * Check if device is new
   */
  private evaluateDeviceNew(
    condition: RuleCondition,
    context: TransactionContext,
  ): boolean {
    if (!context.device?.deviceId) return false;

    const knownDevices = (context.metadata?.knownDevices as string[]) || [];
    return !knownDevices.includes(context.device.deviceId);
  }

  /**
   * Check if failed attempts exceed threshold
   */
  private async evaluateFailedCountExceeded(
    condition: RuleCondition,
    context: TransactionContext,
  ): Promise<boolean> {
    const failedCount = (context.metadata?.recentFailedCount as number) || 0;
    const threshold = condition.countThreshold || 3;
    return failedCount >= threshold;
  }

  /**
   * Evaluate pattern matching (e.g., round amounts)
   */
  private evaluatePatternMatch(
    condition: RuleCondition,
    context: TransactionContext,
  ): boolean {
    // Check for suspiciously round amounts (structuring indicator)
    if (condition.field === 'round_amount') {
      const amount = context.amount;
      // Check if amount is a round number (100, 500, 1000, etc.)
      const roundNumbers = [100, 200, 500, 1000, 2000, 5000, 10000];
      return (
        roundNumbers.includes(amount) || (amount >= 100 && amount % 100 === 0)
      );
    }

    return false;
  }

  /**
   * Create alert from matched rule
   */
  private createAlertFromRule(
    rule: MonitoringRule,
    context: TransactionContext,
  ): TransactionAlert {
    const alertType = rule.action.alertType;
    const config = ALERT_TYPE_CONFIG[alertType];
    const severity = rule.action.severity || config.defaultSeverity;

    return {
      alertId: uuidv4(),
      userId: context.userId,
      transactionId: context.transactionId,
      alertType,
      severity,
      title: config.title,
      message: this.generateAlertMessage(alertType, context),
      metadata: {
        amount: context.amount,
        currency: context.currency,
        recipientAddress: context.recipientAddress,
        location: context.location,
        deviceInfo: context.device,
        ruleId: rule.ruleId,
        ruleName: rule.name,
      },
      isRead: false,
      isActionRequired: severity === 'critical',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Generate human-readable alert message
   */
  private generateAlertMessage(
    alertType: AlertType,
    context: TransactionContext,
  ): string {
    const amount = `${context.amount} ${context.currency}`;

    switch (alertType) {
      case 'large_transaction':
        return `A transaction of ${amount} was detected, which exceeds your alert threshold.`;

      case 'unusual_location':
        const location = context.location?.country || 'unknown location';
        return `A transaction was initiated from ${location}, which differs from your usual locations.`;

      case 'rapid_transactions':
        return `Multiple transactions detected in a short time period. Please verify this activity.`;

      case 'new_recipient':
        const recipient =
          context.recipientAddress || context.recipientPhone || 'a new address';
        return `This is your first transaction to ${recipient}. Please verify the recipient.`;

      case 'suspicious_pattern':
        return `Unusual transaction pattern detected. Please review your recent activity.`;

      case 'failed_attempts':
        return `Multiple failed transaction attempts detected. Please verify your account security.`;

      case 'external_withdrawal':
        return `A withdrawal of ${amount} to an external address was initiated.`;

      case 'time_anomaly':
        return `A transaction was made at an unusual time. Please verify if this was you.`;

      case 'round_amount':
        return `A round-amount transaction of ${amount} was detected.`;

      case 'cumulative_daily':
        return `Your daily transaction volume has exceeded your alert threshold.`;

      case 'velocity_limit':
        return `You have exceeded the transaction rate limit. Please slow down.`;

      default:
        return `Alert: ${alertType} triggered for transaction of ${amount}.`;
    }
  }

  /**
   * Refresh cache if TTL expired
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    if (
      !this.lastCacheUpdate ||
      Date.now() - this.lastCacheUpdate.getTime() > this.CACHE_TTL_MS
    ) {
      await this.loadRules();
    }
  }

  /**
   * Get default monitoring rules
   */
  private getDefaultRules(): MonitoringRule[] {
    const now = new Date();

    return [
      {
        ruleId: uuidv4(),
        name: 'Large Transaction Alert',
        description: 'Alert when transaction amount exceeds user threshold',
        category: 'risk',
        conditions: [{ type: 'amount_greater_than', value: 1000 }],
        conditionLogic: 'AND',
        action: {
          createAlert: true,
          alertType: 'large_transaction',
          severity: 'warning',
          notifyUser: true,
          notifyAdmin: false,
          logToAudit: true,
        },
        isActive: true,
        priority: 10,
        isUserConfigurable: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        ruleId: uuidv4(),
        name: 'Velocity Check',
        description: 'Alert on rapid transactions (>5 in 10 minutes)',
        category: 'fraud',
        conditions: [
          {
            type: 'velocity_exceeded',
            timeWindowMinutes: 10,
            countThreshold: 5,
          },
        ],
        conditionLogic: 'AND',
        action: {
          createAlert: true,
          alertType: 'rapid_transactions',
          severity: 'warning',
          notifyUser: true,
          notifyAdmin: true,
          logToAudit: true,
        },
        isActive: true,
        priority: 5,
        isUserConfigurable: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        ruleId: uuidv4(),
        name: 'Geographic Anomaly',
        description: 'Alert on transactions from unusual locations',
        category: 'fraud',
        conditions: [{ type: 'location_mismatch' }],
        conditionLogic: 'AND',
        action: {
          createAlert: true,
          alertType: 'unusual_location',
          severity: 'critical',
          notifyUser: true,
          notifyAdmin: true,
          logToAudit: true,
        },
        isActive: true,
        priority: 3,
        isUserConfigurable: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        ruleId: uuidv4(),
        name: 'New Recipient Alert',
        description: 'Alert on first transaction to a new recipient',
        category: 'risk',
        conditions: [{ type: 'recipient_new' }],
        conditionLogic: 'AND',
        action: {
          createAlert: true,
          alertType: 'new_recipient',
          severity: 'info',
          notifyUser: true,
          notifyAdmin: false,
          logToAudit: true,
        },
        isActive: true,
        priority: 20,
        isUserConfigurable: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        ruleId: uuidv4(),
        name: 'Round Amount Detection',
        description: 'Alert on suspiciously round transaction amounts',
        category: 'aml',
        conditions: [
          { type: 'pattern_match', field: 'round_amount' },
          { type: 'amount_greater_than', value: 500 },
        ],
        conditionLogic: 'AND',
        action: {
          createAlert: true,
          alertType: 'round_amount',
          severity: 'warning',
          notifyUser: false,
          notifyAdmin: true,
          logToAudit: true,
        },
        isActive: true,
        priority: 15,
        isUserConfigurable: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        ruleId: uuidv4(),
        name: 'Daily Cumulative Limit',
        description: 'Alert when daily transaction volume exceeds limit',
        category: 'risk',
        conditions: [{ type: 'cumulative_exceeded', value: 5000 }],
        conditionLogic: 'AND',
        action: {
          createAlert: true,
          alertType: 'cumulative_daily',
          severity: 'warning',
          notifyUser: true,
          notifyAdmin: true,
          logToAudit: true,
        },
        isActive: true,
        priority: 8,
        isUserConfigurable: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        ruleId: uuidv4(),
        name: 'External Withdrawal Alert',
        description: 'Alert on withdrawals to external addresses',
        category: 'risk',
        conditions: [{ type: 'recipient_new' }],
        conditionLogic: 'AND',
        action: {
          createAlert: true,
          alertType: 'external_withdrawal',
          severity: 'warning',
          notifyUser: true,
          notifyAdmin: false,
          logToAudit: true,
        },
        isActive: true,
        priority: 12,
        isUserConfigurable: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        ruleId: uuidv4(),
        name: 'Failed Attempts Alert',
        description: 'Alert on multiple failed transaction attempts',
        category: 'risk',
        conditions: [
          {
            type: 'failed_count_exceeded',
            countThreshold: 3,
            timeWindowMinutes: 30,
          },
        ],
        conditionLogic: 'AND',
        action: {
          createAlert: true,
          alertType: 'failed_attempts',
          severity: 'warning',
          notifyUser: true,
          notifyAdmin: true,
          logToAudit: true,
        },
        isActive: true,
        priority: 4,
        isUserConfigurable: false,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  /**
   * Force reload rules (for admin use)
   */
  async forceReloadRules(): Promise<number> {
    await this.loadRules();
    return this.rulesCache.length;
  }

  /**
   * Get cached rules count
   */
  getCachedRulesCount(): number {
    return this.rulesCache.length;
  }
}
