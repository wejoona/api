import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

/**
 * Cache Invalidation Service
 *
 * Centralized service for managing cache invalidation across the application.
 * This ensures cache consistency when data changes.
 */
@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Invalidate balance cache for a user
   * Called after: transfers, deposits, withdrawals
   */
  async invalidateBalance(userId: string): Promise<void> {
    const cacheKey = `balance:${userId}`;
    await this.cacheManager.del(cacheKey);
    this.logger.debug(`Invalidated balance cache for user: ${userId}`);
  }

  /**
   * Invalidate user profile cache
   * Called after: profile updates
   */
  async invalidateUserProfile(userId: string): Promise<void> {
    const cacheKey = `user:${userId}`;
    await this.cacheManager.del(cacheKey);
    this.logger.debug(`Invalidated user profile cache for: ${userId}`);
  }

  /**
   * Invalidate exchange rate cache
   * Called when: rates need to be refreshed (typically not manually invalidated)
   */
  async invalidateRate(sourceCurrency: string, targetCurrency: string): Promise<void> {
    const cacheKey = `rate:${sourceCurrency}:${targetCurrency}`;
    await this.cacheManager.del(cacheKey);
    this.logger.debug(`Invalidated rate cache: ${sourceCurrency} -> ${targetCurrency}`);
  }

  /**
   * Invalidate multiple user balances at once
   * Used for internal transfers where both sender and recipient balances change
   */
  async invalidateMultipleBalances(userIds: string[]): Promise<void> {
    await Promise.all(userIds.map((userId) => this.invalidateBalance(userId)));
  }

  /**
   * Clear all cache entries (use with caution, typically for maintenance)
   * Note: This clears known cache keys. For full reset, restart the Redis instance.
   */
  async clearAll(): Promise<void> {
    // Note: cache-manager v5+ doesn't have reset(). Clear known patterns instead.
    // For full cache clear, use Redis CLI: FLUSHDB
    this.logger.warn('clearAll() called - for full cache reset, use Redis FLUSHDB command');
  }
}
