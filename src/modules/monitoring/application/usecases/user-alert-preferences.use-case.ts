/**
 * User Alert Preferences Use Case
 * Business logic for managing user alert preferences
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { UserAlertPreferencesRepository } from '../../infrastructure/repositories/user-alert-preferences.repository';
import {
  UserAlertPreferences,
  AlertType,
  DEFAULT_ALERT_PREFERENCES,
} from '../../domain/interfaces/monitoring.types';

export interface UpdatePreferencesInput {
  emailAlerts?: boolean;
  pushAlerts?: boolean;
  smsAlerts?: boolean;
  largeTransactionThreshold?: number;
  balanceLowThreshold?: number;
  balanceHighThreshold?: number | null;
  dailyLimitThreshold?: number | null;
  alertTypes?: AlertType[];
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
  instantCriticalAlerts?: boolean;
  digestFrequency?: 'realtime' | 'hourly' | 'daily' | 'weekly';
}

@Injectable()
export class UserAlertPreferencesUseCase {
  private readonly logger = new Logger(UserAlertPreferencesUseCase.name);

  constructor(
    private readonly preferencesRepository: UserAlertPreferencesRepository,
  ) {}

  /**
   * Get user preferences or create default
   */
  async getPreferences(userId: string): Promise<UserAlertPreferences> {
    return this.preferencesRepository.getOrCreate(userId);
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    input: UpdatePreferencesInput,
  ): Promise<UserAlertPreferences> {
    this.validateInput(input);

    const updated = await this.preferencesRepository.update(userId, input);
    this.logger.log(`Updated alert preferences for user ${userId}`);

    return updated;
  }

  /**
   * Update large transaction threshold
   */
  async setLargeTransactionThreshold(
    userId: string,
    threshold: number,
  ): Promise<UserAlertPreferences> {
    if (threshold < 0) {
      throw new BadRequestException('Threshold must be a positive number');
    }

    await this.preferencesRepository.updateThreshold(
      userId,
      'large_transaction',
      threshold,
    );
    return this.getPreferences(userId);
  }

  /**
   * Update low balance threshold
   */
  async setBalanceLowThreshold(
    userId: string,
    threshold: number,
  ): Promise<UserAlertPreferences> {
    if (threshold < 0) {
      throw new BadRequestException('Threshold must be a positive number');
    }

    await this.preferencesRepository.updateThreshold(
      userId,
      'balance_low',
      threshold,
    );
    return this.getPreferences(userId);
  }

  /**
   * Update high balance threshold
   */
  async setBalanceHighThreshold(
    userId: string,
    threshold: number | null,
  ): Promise<UserAlertPreferences> {
    if (threshold !== null && threshold < 0) {
      throw new BadRequestException(
        'Threshold must be a positive number or null',
      );
    }

    if (threshold === null) {
      return this.updatePreferences(userId, { balanceHighThreshold: null });
    }

    await this.preferencesRepository.updateThreshold(
      userId,
      'balance_high',
      threshold,
    );
    return this.getPreferences(userId);
  }

  /**
   * Enable or disable specific alert type
   */
  async toggleAlertType(
    userId: string,
    alertType: AlertType,
    enabled: boolean,
  ): Promise<UserAlertPreferences> {
    const __validTypes = Object.keys(DEFAULT_ALERT_PREFERENCES.alertTypes);

    return this.preferencesRepository.toggleAlertType(
      userId,
      alertType,
      enabled,
    );
  }

  /**
   * Enable or disable notification channel
   */
  async toggleNotificationChannel(
    userId: string,
    channel: 'email' | 'push' | 'sms',
    enabled: boolean,
  ): Promise<UserAlertPreferences> {
    return this.preferencesRepository.toggleChannel(userId, channel, enabled);
  }

  /**
   * Configure quiet hours
   */
  async setQuietHours(
    userId: string,
    enabled: boolean,
    startTime?: string,
    endTime?: string,
    timezone?: string,
  ): Promise<UserAlertPreferences> {
    if (enabled) {
      if (!startTime || !endTime) {
        throw new BadRequestException(
          'Start and end time required when enabling quiet hours',
        );
      }
      this.validateTimeFormat(startTime);
      this.validateTimeFormat(endTime);
    }

    return this.preferencesRepository.setQuietHours(
      userId,
      enabled,
      startTime,
      endTime,
      timezone,
    );
  }

  /**
   * Reset preferences to default
   */
  async resetToDefault(userId: string): Promise<UserAlertPreferences> {
    const defaults = {
      ...DEFAULT_ALERT_PREFERENCES,
    };

    const updated = await this.preferencesRepository.update(userId, defaults);
    this.logger.log(`Reset alert preferences to default for user ${userId}`);

    return updated;
  }

  /**
   * Get available alert types with descriptions
   */
  getAvailableAlertTypes(): Array<{
    type: AlertType;
    name: string;
    description: string;
    defaultEnabled: boolean;
  }> {
    const types: Array<{
      type: AlertType;
      name: string;
      description: string;
      defaultEnabled: boolean;
    }> = [
      {
        type: 'large_transaction',
        name: 'Large Transaction',
        description: 'Alert when transaction exceeds your threshold',
        defaultEnabled: true,
      },
      {
        type: 'unusual_location',
        name: 'Unusual Location',
        description: 'Alert when transaction originates from a new location',
        defaultEnabled: true,
      },
      {
        type: 'rapid_transactions',
        name: 'Rapid Transactions',
        description: 'Alert on multiple transactions in a short period',
        defaultEnabled: true,
      },
      {
        type: 'new_recipient',
        name: 'New Recipient',
        description: 'Alert when sending to a new address',
        defaultEnabled: true,
      },
      {
        type: 'suspicious_pattern',
        name: 'Suspicious Pattern',
        description: 'Alert on unusual transaction patterns',
        defaultEnabled: true,
      },
      {
        type: 'failed_attempts',
        name: 'Failed Attempts',
        description: 'Alert on multiple failed transaction attempts',
        defaultEnabled: true,
      },
      {
        type: 'account_change',
        name: 'Account Changes',
        description: 'Alert when account settings are modified',
        defaultEnabled: true,
      },
      {
        type: 'login_new_device',
        name: 'New Device Login',
        description: 'Alert when signing in from a new device',
        defaultEnabled: true,
      },
      {
        type: 'balance_threshold',
        name: 'Balance Threshold',
        description: 'Alert when balance crosses your threshold',
        defaultEnabled: true,
      },
      {
        type: 'external_withdrawal',
        name: 'External Withdrawal',
        description: 'Alert when sending funds to external addresses',
        defaultEnabled: true,
      },
      {
        type: 'time_anomaly',
        name: 'Unusual Time',
        description: 'Alert on transactions at unusual hours',
        defaultEnabled: false,
      },
      {
        type: 'round_amount',
        name: 'Round Amount',
        description: 'Alert on suspiciously round transaction amounts',
        defaultEnabled: false,
      },
      {
        type: 'cumulative_daily',
        name: 'Daily Limit',
        description: 'Alert when daily volume exceeds threshold',
        defaultEnabled: true,
      },
      {
        type: 'velocity_limit',
        name: 'Velocity Limit',
        description: 'Alert when transaction rate is exceeded',
        defaultEnabled: false,
      },
    ];

    return types;
  }

  /**
   * Validate input parameters
   */
  private validateInput(input: UpdatePreferencesInput): void {
    if (
      input.largeTransactionThreshold !== undefined &&
      input.largeTransactionThreshold < 0
    ) {
      throw new BadRequestException(
        'Large transaction threshold must be positive',
      );
    }

    if (
      input.balanceLowThreshold !== undefined &&
      input.balanceLowThreshold < 0
    ) {
      throw new BadRequestException('Balance low threshold must be positive');
    }

    if (
      input.balanceHighThreshold !== undefined &&
      input.balanceHighThreshold !== null &&
      input.balanceHighThreshold < 0
    ) {
      throw new BadRequestException('Balance high threshold must be positive');
    }

    if (
      input.dailyLimitThreshold !== undefined &&
      input.dailyLimitThreshold !== null &&
      input.dailyLimitThreshold < 0
    ) {
      throw new BadRequestException('Daily limit threshold must be positive');
    }

    if (input.quietHoursStart) {
      this.validateTimeFormat(input.quietHoursStart);
    }

    if (input.quietHoursEnd) {
      this.validateTimeFormat(input.quietHoursEnd);
    }

    if (
      input.digestFrequency &&
      !['realtime', 'hourly', 'daily', 'weekly'].includes(input.digestFrequency)
    ) {
      throw new BadRequestException('Invalid digest frequency');
    }
  }

  /**
   * Validate time format (HH:mm)
   */
  private validateTimeFormat(time: string): void {
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!regex.test(time)) {
      throw new BadRequestException(
        `Invalid time format: ${time}. Use HH:mm format.`,
      );
    }
  }
}
