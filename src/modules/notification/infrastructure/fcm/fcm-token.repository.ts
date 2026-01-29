import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FcmTokenOrmEntity, FcmPlatform } from './fcm-token.orm-entity';

export const FCM_TOKEN_REPOSITORY = Symbol('FCM_TOKEN_REPOSITORY');

export interface IFcmTokenRepository {
  findByUserId(userId: string): Promise<FcmTokenOrmEntity[]>;
  findActiveByUserId(userId: string): Promise<FcmTokenOrmEntity[]>;
  findByToken(token: string): Promise<FcmTokenOrmEntity | null>;
  save(fcmToken: Partial<FcmTokenOrmEntity>): Promise<FcmTokenOrmEntity>;
  deactivateToken(token: string): Promise<void>;
  deactivateAllForUser(userId: string): Promise<void>;
  updateLastUsed(token: string): Promise<void>;
  incrementFailureCount(token: string, reason: string): Promise<void>;
}

/**
 * FCM Token Repository
 *
 * Manages FCM token persistence and retrieval.
 * Handles token lifecycle: registration, refresh, deactivation.
 */
@Injectable()
export class FcmTokenRepository implements IFcmTokenRepository {
  // Maximum failures before auto-deactivating a token
  private readonly MAX_FAILURES = 5;

  constructor(
    @InjectRepository(FcmTokenOrmEntity)
    private readonly repository: Repository<FcmTokenOrmEntity>,
  ) {}

  /**
   * Find all tokens for a user (including inactive)
   */
  async findByUserId(userId: string): Promise<FcmTokenOrmEntity[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find only active tokens for a user
   */
  async findActiveByUserId(userId: string): Promise<FcmTokenOrmEntity[]> {
    return this.repository.find({
      where: { userId, isActive: true },
      order: { lastUsedAt: 'DESC' },
    });
  }

  /**
   * Find a token by its value
   */
  async findByToken(token: string): Promise<FcmTokenOrmEntity | null> {
    return this.repository.findOne({ where: { token } });
  }

  /**
   * Save or create a token
   */
  async save(fcmToken: Partial<FcmTokenOrmEntity>): Promise<FcmTokenOrmEntity> {
    const entity = this.repository.create(fcmToken);
    return this.repository.save(entity);
  }

  /**
   * Register or update a token for a user
   * If token exists, update it; otherwise create new
   */
  async upsert(
    userId: string,
    token: string,
    platform: FcmPlatform,
    deviceId?: string,
    deviceName?: string,
    appVersion?: string,
    osVersion?: string,
  ): Promise<FcmTokenOrmEntity> {
    // Check if token already exists
    const existing = await this.repository.findOne({
      where: { token },
    });

    if (existing) {
      // Update existing token
      existing.userId = userId;
      existing.isActive = true;
      existing.lastUsedAt = new Date();
      existing.platform = platform;
      existing.failureCount = 0;
      existing.lastFailureReason = null;
      if (deviceId) existing.deviceId = deviceId;
      if (deviceName) existing.deviceName = deviceName;
      if (appVersion) existing.appVersion = appVersion;
      if (osVersion) existing.osVersion = osVersion;
      return this.repository.save(existing);
    }

    // Create new token
    return this.save({
      userId,
      token,
      platform,
      deviceId,
      deviceName,
      appVersion,
      osVersion,
      isActive: true,
      lastUsedAt: new Date(),
      failureCount: 0,
    });
  }

  /**
   * Deactivate a specific token
   */
  async deactivateToken(token: string): Promise<void> {
    await this.repository.update({ token }, { isActive: false });
  }

  /**
   * Deactivate all tokens for a user (e.g., on full logout)
   */
  async deactivateAllForUser(userId: string): Promise<void> {
    await this.repository.update({ userId }, { isActive: false });
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(token: string): Promise<void> {
    await this.repository.update({ token }, { lastUsedAt: new Date() });
  }

  /**
   * Increment failure count and potentially deactivate
   */
  async incrementFailureCount(token: string, reason: string): Promise<void> {
    const entity = await this.repository.findOne({ where: { token } });
    if (!entity) return;

    entity.failureCount += 1;
    entity.lastFailureReason = reason;

    // Auto-deactivate after too many failures
    if (entity.failureCount >= this.MAX_FAILURES) {
      entity.isActive = false;
    }

    await this.repository.save(entity);
  }

  /**
   * Delete tokens older than specified days
   * Use for cleanup jobs
   */
  async deleteInactiveOlderThan(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where('is_active = :isActive', { isActive: false })
      .andWhere('updated_at < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  /**
   * Get count of active tokens by platform
   */
  async getActiveTokenStats(): Promise<
    { platform: FcmPlatform; count: number }[]
  > {
    return this.repository
      .createQueryBuilder('token')
      .select('token.platform', 'platform')
      .addSelect('COUNT(*)', 'count')
      .where('token.is_active = :isActive', { isActive: true })
      .groupBy('token.platform')
      .getRawMany();
  }
}
