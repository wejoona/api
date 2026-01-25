/**
 * User Alert Preferences Repository
 * Database operations for user alert preferences
 */

import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { UserAlertPreferencesOrmEntity } from '../orm-entities/user-alert-preferences.orm-entity';
import {
  UserAlertPreferences,
  AlertType,
  DEFAULT_ALERT_PREFERENCES,
} from '../../domain/interfaces/monitoring.types';

@Injectable()
export class UserAlertPreferencesRepository {
  private readonly repository: Repository<UserAlertPreferencesOrmEntity>;
  private readonly logger = new Logger(UserAlertPreferencesRepository.name);

  constructor(private readonly dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(UserAlertPreferencesOrmEntity);
  }

  /**
   * Find preferences by user ID
   */
  async findByUserId(userId: string): Promise<UserAlertPreferences | null> {
    const entity = await this.repository.findOne({ where: { userId } });
    return entity ? this.toDomain(entity) : null;
  }

  /**
   * Get preferences or create default
   */
  async getOrCreate(userId: string): Promise<UserAlertPreferences> {
    let entity = await this.repository.findOne({ where: { userId } });

    if (!entity) {
      entity = this.toEntity({
        userId,
        ...DEFAULT_ALERT_PREFERENCES,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      entity = await this.repository.save(entity);
      this.logger.log(`Created default alert preferences for user ${userId}`);
    }

    return this.toDomain(entity);
  }

  /**
   * Create preferences
   */
  async create(preferences: UserAlertPreferences): Promise<UserAlertPreferences> {
    const entity = this.toEntity(preferences);
    const saved = await this.repository.save(entity);
    this.logger.log(`Created alert preferences for user ${preferences.userId}`);
    return this.toDomain(saved);
  }

  /**
   * Update preferences
   */
  async update(
    userId: string,
    updates: Partial<UserAlertPreferences>,
  ): Promise<UserAlertPreferences> {
    const existing = await this.findByUserId(userId);
    if (!existing) {
      // Create with updates
      return this.create({
        userId,
        ...DEFAULT_ALERT_PREFERENCES,
        ...updates,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const updated: UserAlertPreferences = {
      ...existing,
      ...updates,
      userId,
      updatedAt: new Date(),
    };

    const entity = this.toEntity(updated);
    await this.repository.save(entity);
    this.logger.log(`Updated alert preferences for user ${userId}`);
    return updated;
  }

  /**
   * Update specific threshold
   */
  async updateThreshold(
    userId: string,
    thresholdType: 'large_transaction' | 'balance_low' | 'balance_high' | 'daily_limit',
    value: number,
  ): Promise<void> {
    const fieldMap: Record<string, string> = {
      large_transaction: 'largeTransactionThreshold',
      balance_low: 'balanceLowThreshold',
      balance_high: 'balanceHighThreshold',
      daily_limit: 'dailyLimitThreshold',
    };

    const field = fieldMap[thresholdType];
    if (!field) {
      throw new Error(`Invalid threshold type: ${thresholdType}`);
    }

    await this.repository.update(
      { userId },
      { [field]: value, updatedAt: new Date() },
    );
  }

  /**
   * Toggle alert type subscription
   */
  async toggleAlertType(
    userId: string,
    alertType: AlertType,
    enabled: boolean,
  ): Promise<UserAlertPreferences> {
    const preferences = await this.getOrCreate(userId);

    let alertTypes = [...preferences.alertTypes];
    if (enabled && !alertTypes.includes(alertType)) {
      alertTypes.push(alertType);
    } else if (!enabled) {
      alertTypes = alertTypes.filter((t) => t !== alertType);
    }

    return this.update(userId, { alertTypes });
  }

  /**
   * Toggle notification channel
   */
  async toggleChannel(
    userId: string,
    channel: 'email' | 'push' | 'sms',
    enabled: boolean,
  ): Promise<UserAlertPreferences> {
    const fieldMap: Record<string, keyof UserAlertPreferences> = {
      email: 'emailAlerts',
      push: 'pushAlerts',
      sms: 'smsAlerts',
    };

    const field = fieldMap[channel];
    return this.update(userId, { [field]: enabled });
  }

  /**
   * Set quiet hours
   */
  async setQuietHours(
    userId: string,
    enabled: boolean,
    startTime?: string,
    endTime?: string,
    timezone?: string,
  ): Promise<UserAlertPreferences> {
    return this.update(userId, {
      quietHoursEnabled: enabled,
      quietHoursStart: startTime,
      quietHoursEnd: endTime,
      timezone: timezone || 'UTC',
    });
  }

  /**
   * Check if user has alert type enabled
   */
  async isAlertTypeEnabled(userId: string, alertType: AlertType): Promise<boolean> {
    const preferences = await this.findByUserId(userId);
    if (!preferences) {
      // Use default preferences
      return DEFAULT_ALERT_PREFERENCES.alertTypes.includes(alertType);
    }
    return preferences.alertTypes.includes(alertType);
  }

  /**
   * Get users with specific alert type enabled
   */
  async getUsersWithAlertType(alertType: AlertType): Promise<string[]> {
    const entities = await this.repository
      .createQueryBuilder('prefs')
      .select('prefs.userId')
      .where(':alertType = ANY(prefs.alertTypes)', { alertType })
      .getMany();

    return entities.map((e) => e.userId);
  }

  /**
   * Delete preferences
   */
  async delete(userId: string): Promise<void> {
    await this.repository.delete({ userId });
  }

  // Mapping methods
  private toEntity(prefs: UserAlertPreferences): UserAlertPreferencesOrmEntity {
    const entity = new UserAlertPreferencesOrmEntity();
    entity.userId = prefs.userId;
    entity.emailAlerts = prefs.emailAlerts;
    entity.pushAlerts = prefs.pushAlerts;
    entity.smsAlerts = prefs.smsAlerts;
    entity.largeTransactionThreshold = prefs.largeTransactionThreshold;
    entity.balanceLowThreshold = prefs.balanceLowThreshold;
    entity.balanceHighThreshold = prefs.balanceHighThreshold || null;
    entity.dailyLimitThreshold = prefs.dailyLimitThreshold || null;
    entity.alertTypes = prefs.alertTypes;
    entity.quietHoursEnabled = prefs.quietHoursEnabled;
    entity.quietHoursStart = prefs.quietHoursStart || null;
    entity.quietHoursEnd = prefs.quietHoursEnd || null;
    entity.timezone = prefs.timezone;
    entity.instantCriticalAlerts = prefs.instantCriticalAlerts;
    entity.digestFrequency = prefs.digestFrequency;
    entity.createdAt = prefs.createdAt;
    entity.updatedAt = prefs.updatedAt;
    return entity;
  }

  private toDomain(entity: UserAlertPreferencesOrmEntity): UserAlertPreferences {
    return {
      userId: entity.userId,
      emailAlerts: entity.emailAlerts,
      pushAlerts: entity.pushAlerts,
      smsAlerts: entity.smsAlerts,
      largeTransactionThreshold: Number(entity.largeTransactionThreshold),
      balanceLowThreshold: Number(entity.balanceLowThreshold),
      balanceHighThreshold: entity.balanceHighThreshold ? Number(entity.balanceHighThreshold) : undefined,
      dailyLimitThreshold: entity.dailyLimitThreshold ? Number(entity.dailyLimitThreshold) : undefined,
      alertTypes: entity.alertTypes as AlertType[],
      quietHoursEnabled: entity.quietHoursEnabled,
      quietHoursStart: entity.quietHoursStart || undefined,
      quietHoursEnd: entity.quietHoursEnd || undefined,
      timezone: entity.timezone,
      instantCriticalAlerts: entity.instantCriticalAlerts,
      digestFrequency: entity.digestFrequency as any,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
