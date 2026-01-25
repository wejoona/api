/**
 * Transaction Monitor Service
 * Real-time transaction monitoring and alert generation
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { AlertRepository } from '../../infrastructure/repositories/alert.repository';
import { UserAlertPreferencesRepository } from '../../infrastructure/repositories/user-alert-preferences.repository';
import { AlertRulesService, RuleEvaluationResult } from './alert-rules.service';
import {
  TransactionAlert,
  TransactionContext,
  AlertType,
  AlertSeverity,
  AlertCreatedEvent,
  UserAlertPreferences,
  ALERT_TYPE_CONFIG,
} from '../../domain/interfaces/monitoring.types';

export interface MonitoringResult {
  transactionId: string;
  userId: string;
  alertsCreated: TransactionAlert[];
  transactionBlocked: boolean;
  blockReason?: string;
  processingTimeMs: number;
}

export interface BalanceCheckResult {
  alertTriggered: boolean;
  alert?: TransactionAlert;
  thresholdType: 'low' | 'high' | null;
}

@Injectable()
export class TransactionMonitorService {
  private readonly logger = new Logger(TransactionMonitorService.name);

  constructor(
    private readonly alertRepository: AlertRepository,
    private readonly preferencesRepository: UserAlertPreferencesRepository,
    private readonly rulesService: AlertRulesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Monitor a transaction and generate alerts
   */
  async monitorTransaction(context: TransactionContext): Promise<MonitoringResult> {
    const startTime = Date.now();
    this.logger.log(`Monitoring transaction ${context.transactionId} for user ${context.userId}`);

    try {
      // Get user preferences
      const preferences = await this.preferencesRepository.getOrCreate(context.userId);

      // Evaluate all rules
      const results = await this.rulesService.evaluateTransaction(context, preferences);

      // Process rule results
      const alertsToCreate: TransactionAlert[] = [];
      let transactionBlocked = false;
      let blockReason: string | undefined;

      for (const result of results) {
        if (result.alert) {
          alertsToCreate.push(result.alert);
        }
        if (result.blockedTransaction && !transactionBlocked) {
          transactionBlocked = true;
          blockReason = `Blocked by rule: ${result.rule?.name}`;
        }
      }

      // Save alerts to database
      let savedAlerts: TransactionAlert[] = [];
      if (alertsToCreate.length > 0) {
        savedAlerts = await this.alertRepository.createMany(alertsToCreate);

        // Emit events for each alert
        for (const alert of savedAlerts) {
          await this.emitAlertCreated(alert, preferences);
        }

        this.logger.log(
          `Created ${savedAlerts.length} alerts for transaction ${context.transactionId}`
        );
      }

      const processingTimeMs = Date.now() - startTime;

      return {
        transactionId: context.transactionId,
        userId: context.userId,
        alertsCreated: savedAlerts,
        transactionBlocked,
        blockReason,
        processingTimeMs,
      };
    } catch (error) {
      this.logger.error(
        `Error monitoring transaction ${context.transactionId}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Check balance thresholds and create alerts if needed
   */
  async checkBalanceThreshold(
    userId: string,
    currentBalance: number,
    previousBalance: number,
    currency: string = 'USD',
  ): Promise<BalanceCheckResult> {
    const preferences = await this.preferencesRepository.getOrCreate(userId);

    // Check if balance alerts are enabled
    if (!preferences.alertTypes.includes('balance_threshold')) {
      return { alertTriggered: false, thresholdType: null };
    }

    let alertTriggered = false;
    let thresholdType: 'low' | 'high' | null = null;
    let alert: TransactionAlert | undefined;

    // Check low balance threshold
    if (
      currentBalance < preferences.balanceLowThreshold &&
      previousBalance >= preferences.balanceLowThreshold
    ) {
      alertTriggered = true;
      thresholdType = 'low';
      alert = await this.createBalanceAlert(
        userId,
        'low',
        currentBalance,
        preferences.balanceLowThreshold,
        currency,
      );
    }

    // Check high balance threshold (if configured)
    if (
      preferences.balanceHighThreshold &&
      currentBalance > preferences.balanceHighThreshold &&
      previousBalance <= preferences.balanceHighThreshold
    ) {
      alertTriggered = true;
      thresholdType = 'high';
      alert = await this.createBalanceAlert(
        userId,
        'high',
        currentBalance,
        preferences.balanceHighThreshold,
        currency,
      );
    }

    if (alert) {
      await this.emitAlertCreated(alert, preferences);
    }

    return { alertTriggered, alert, thresholdType };
  }

  /**
   * Create a balance threshold alert
   */
  private async createBalanceAlert(
    userId: string,
    type: 'low' | 'high',
    currentBalance: number,
    threshold: number,
    currency: string,
  ): Promise<TransactionAlert> {
    const config = ALERT_TYPE_CONFIG.balance_threshold;

    const alert: TransactionAlert = {
      alertId: uuidv4(),
      userId,
      alertType: 'balance_threshold',
      severity: type === 'low' ? 'warning' : 'info',
      title: type === 'low' ? 'Low Balance Alert' : 'High Balance Alert',
      message:
        type === 'low'
          ? `Your wallet balance (${currentBalance} ${currency}) has dropped below your threshold of ${threshold} ${currency}.`
          : `Your wallet balance (${currentBalance} ${currency}) has exceeded ${threshold} ${currency}.`,
      metadata: {
        amount: currentBalance,
        currency,
        threshold,
        thresholdType: type,
        previousValue: undefined,
      },
      isRead: false,
      isActionRequired: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.alertRepository.create(alert);
  }

  /**
   * Create alert for new device login
   */
  async createNewDeviceAlert(
    userId: string,
    deviceInfo: {
      deviceId: string;
      deviceType: string;
      platform: 'ios' | 'android' | 'web';
      osVersion?: string;
      appVersion?: string;
    },
    locationInfo?: {
      ip: string;
      country?: string;
      city?: string;
    },
  ): Promise<TransactionAlert | null> {
    const preferences = await this.preferencesRepository.findByUserId(userId);

    if (!preferences?.alertTypes.includes('login_new_device')) {
      return null;
    }

    const config = ALERT_TYPE_CONFIG.login_new_device;

    const alert: TransactionAlert = {
      alertId: uuidv4(),
      userId,
      alertType: 'login_new_device',
      severity: 'warning',
      title: config.title,
      message: `A new ${deviceInfo.platform} device was used to access your account${locationInfo?.country ? ` from ${locationInfo.country}` : ''}.`,
      metadata: {
        deviceInfo,
        location: locationInfo,
      },
      isRead: false,
      isActionRequired: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const saved = await this.alertRepository.create(alert);
    await this.emitAlertCreated(saved, preferences);

    return saved;
  }

  /**
   * Create alert for account/security changes
   */
  async createAccountChangeAlert(
    userId: string,
    changeType: 'password' | 'pin' | 'email' | 'phone' | '2fa' | 'preferences',
    details?: Record<string, any>,
  ): Promise<TransactionAlert | null> {
    const preferences = await this.preferencesRepository.findByUserId(userId);

    if (!preferences?.alertTypes.includes('account_change')) {
      return null;
    }

    const changeMessages: Record<string, string> = {
      password: 'Your password was changed.',
      pin: 'Your PIN was changed.',
      email: 'Your email address was updated.',
      phone: 'Your phone number was updated.',
      '2fa': 'Two-factor authentication settings were changed.',
      preferences: 'Your account preferences were updated.',
    };

    const alert: TransactionAlert = {
      alertId: uuidv4(),
      userId,
      alertType: 'account_change',
      severity: changeType === 'password' || changeType === 'pin' ? 'warning' : 'info',
      title: 'Account Settings Changed',
      message: changeMessages[changeType] || 'Your account settings were changed.',
      metadata: {
        changeType,
        ...details,
      },
      isRead: false,
      isActionRequired: changeType === 'password' || changeType === 'pin',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const saved = await this.alertRepository.create(alert);
    await this.emitAlertCreated(saved, preferences);

    return saved;
  }

  /**
   * Create custom alert
   */
  async createCustomAlert(
    userId: string,
    alertType: AlertType,
    severity: AlertSeverity,
    title: string,
    message: string,
    metadata?: Record<string, any>,
    transactionId?: string,
  ): Promise<TransactionAlert> {
    const alert: TransactionAlert = {
      alertId: uuidv4(),
      userId,
      transactionId,
      alertType,
      severity,
      title,
      message,
      metadata: metadata || {},
      isRead: false,
      isActionRequired: severity === 'critical',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const saved = await this.alertRepository.create(alert);
    const preferences = await this.preferencesRepository.findByUserId(userId);
    await this.emitAlertCreated(saved, preferences);

    return saved;
  }

  /**
   * Emit alert created event for notifications
   */
  private async emitAlertCreated(
    alert: TransactionAlert,
    preferences: UserAlertPreferences | null,
  ): Promise<void> {
    const shouldNotify = {
      push: preferences?.pushAlerts ?? true,
      sms: preferences?.smsAlerts ?? false,
      email: preferences?.emailAlerts ?? true,
    };

    // Check quiet hours
    if (preferences?.quietHoursEnabled && !this.isCriticalAlert(alert)) {
      const inQuietHours = this.isInQuietHours(
        preferences.quietHoursStart,
        preferences.quietHoursEnd,
        preferences.timezone,
      );
      if (inQuietHours) {
        shouldNotify.push = false;
        shouldNotify.sms = false;
      }
    }

    // Critical alerts always get sent immediately
    if (alert.severity === 'critical' && preferences?.instantCriticalAlerts) {
      shouldNotify.push = true;
      shouldNotify.sms = preferences.smsAlerts;
    }

    const event: AlertCreatedEvent = {
      alert,
      user: {
        userId: alert.userId,
        // Phone and email would be fetched from user service
      },
      shouldNotify,
    };

    this.eventEmitter.emit('monitoring.alert.created', event);
    this.eventEmitter.emit(`monitoring.alert.${alert.alertType}`, event);

    this.logger.debug(`Emitted alert created event for ${alert.alertId}`);
  }

  /**
   * Check if alert is critical
   */
  private isCriticalAlert(alert: TransactionAlert): boolean {
    return alert.severity === 'critical' || alert.isActionRequired;
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(
    startTime?: string,
    endTime?: string,
    timezone?: string,
  ): boolean {
    if (!startTime || !endTime) return false;

    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: timezone || 'UTC',
      });

      const currentTime = formatter.format(now);
      const [currentHour, currentMinute] = currentTime.split(':').map(Number);
      const currentMinutes = currentHour * 60 + currentMinute;

      const [startHour, startMinute] = startTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMinute;

      const [endHour, endMinute] = endTime.split(':').map(Number);
      const endMinutes = endHour * 60 + endMinute;

      // Handle overnight quiet hours (e.g., 22:00 - 07:00)
      if (startMinutes > endMinutes) {
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      }

      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } catch (error) {
      this.logger.warn(`Error checking quiet hours: ${error.message}`);
      return false;
    }
  }

  /**
   * Get monitoring health status
   */
  async getHealthStatus(): Promise<{
    isHealthy: boolean;
    rulesLoaded: number;
    lastProcessedAt?: Date;
  }> {
    const rulesLoaded = this.rulesService.getCachedRulesCount();

    return {
      isHealthy: rulesLoaded > 0,
      rulesLoaded,
    };
  }
}
