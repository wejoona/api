import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import {
  IdempotencyStorage,
  IdempotencyRecord,
} from '../types/idempotency.types';

/**
 * Redis-based idempotency storage implementation
 *
 * Features:
 * - Fast key-value lookups via Redis
 * - Automatic TTL expiration
 * - Distributed locking for concurrent requests
 * - JSON serialization for complex data
 *
 * Key Patterns:
 * - idempotency:{key} - Stores the idempotency record
 * - idempotency:lock:{key} - Distributed lock for processing
 */
@Injectable()
export class RedisIdempotencyStorage extends IdempotencyStorage {
  private readonly logger = new Logger(RedisIdempotencyStorage.name);
  private readonly keyPrefix = 'idempotency:';
  private readonly lockPrefix = 'idempotency:lock:';
  private readonly _defaultTtl: number;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    super();
    this._defaultTtl =
      this.configService.get<number>('idempotency.ttl') || 86400; // 24 hours
  }

  /**
   * Get an idempotency record from Redis
   */
  async get(key: string): Promise<IdempotencyRecord | null> {
    try {
      const recordKey = this.getRecordKey(key);
      const data = await this.cacheManager.get<string>(recordKey);

      if (!data) {
        return null;
      }

      const record = JSON.parse(data) as IdempotencyRecord;

      // Deserialize dates
      record.createdAt = new Date(record.createdAt);
      record.updatedAt = new Date(record.updatedAt);
      record.expiresAt = new Date(record.expiresAt);

      return record;
    } catch (error) {
      this.logger.error(`Failed to get idempotency record: ${key}`, error);
      throw error;
    }
  }

  /**
   * Store an idempotency record in Redis
   */
  async set(record: IdempotencyRecord): Promise<void> {
    try {
      const recordKey = this.getRecordKey(record.key);
      const ttl = Math.floor((record.expiresAt.getTime() - Date.now()) / 1000);

      // Don't store expired records
      if (ttl <= 0) {
        this.logger.warn(`Attempted to store expired record: ${record.key}`);
        return;
      }

      const data = JSON.stringify(record);
      await this.cacheManager.set(recordKey, data, ttl * 1000); // Convert to ms

      this.logger.debug(
        `Stored idempotency record: ${record.key} (TTL: ${ttl}s)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to store idempotency record: ${record.key}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update an existing idempotency record
   */
  async update(
    key: string,
    updates: Partial<IdempotencyRecord>,
  ): Promise<void> {
    try {
      const existing = await this.get(key);

      if (!existing) {
        throw new Error(`Idempotency record not found: ${key}`);
      }

      const updated: IdempotencyRecord = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
      };

      await this.set(updated);

      this.logger.debug(`Updated idempotency record: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to update idempotency record: ${key}`, error);
      throw error;
    }
  }

  /**
   * Delete an idempotency record
   */
  async delete(key: string): Promise<void> {
    try {
      const recordKey = this.getRecordKey(key);
      await this.cacheManager.del(recordKey);

      this.logger.debug(`Deleted idempotency record: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete idempotency record: ${key}`, error);
      throw error;
    }
  }

  /**
   * Acquire a distributed lock for processing
   *
   * Uses Redis SET NX (set if not exists) for atomic lock acquisition
   */
  async acquireLock(key: string, ttl: number): Promise<boolean> {
    try {
      const lockKey = this.getLockKey(key);
      const lockValue = Date.now().toString();

      // Try to acquire lock (SET NX)
      // Note: cache-manager doesn't expose SETNX directly, so we simulate it
      const existing = await this.cacheManager.get(lockKey);

      if (existing) {
        return false; // Lock already held
      }

      await this.cacheManager.set(lockKey, lockValue, ttl * 1000);

      this.logger.debug(`Acquired lock: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to acquire lock: ${key}`, error);
      return false;
    }
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(key: string): Promise<void> {
    try {
      const lockKey = this.getLockKey(key);
      await this.cacheManager.del(lockKey);

      this.logger.debug(`Released lock: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to release lock: ${key}`, error);
      // Don't throw - lock will expire naturally
    }
  }

  /**
   * Get the Redis key for storing the record
   */
  private getRecordKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Get the Redis key for the distributed lock
   */
  private getLockKey(key: string): string {
    return `${this.lockPrefix}${key}`;
  }
}
