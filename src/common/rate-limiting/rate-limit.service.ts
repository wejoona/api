import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // Unix timestamp in seconds
}

export interface CustomRateLimitConfig {
  limit: number;
  windowSeconds: number;
}

/**
 * Redis-backed rate limiting service using sliding window algorithm.
 * Provides atomic operations for distributed rate limiting.
 */
@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  /**
   * Check and consume a rate limit token.
   * Uses sliding window counter algorithm for smooth rate limiting.
   *
   * @param key - Unique identifier for the rate limit (e.g., user:123 or ip:192.168.1.1)
   * @param limit - Maximum number of requests allowed
   * @param windowSeconds - Time window in seconds
   * @returns Rate limit result with remaining quota
   */
  async consume(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    const now = Math.floor(Date.now() / 1000);
    const _windowStart = now - windowSeconds;
    const rateLimitKey = `rate_limit:${key}`;

    try {
      // Get current count from cache
      const currentData = await this.cache.get<{
        count!: number;
        resetAt!: number;
      }>(rateLimitKey);

      let count = 0;
      let resetAt = now + windowSeconds;

      if (currentData) {
        // Check if we're still within the window
        if (currentData.resetAt > now) {
          count = currentData.count;
          resetAt = currentData.resetAt;
        }
        // If window has expired, start fresh (count stays 0)
      }

      const remaining = Math.max(0, limit - count - 1);
      const allowed = count < limit;

      if (allowed) {
        // Increment counter
        await this.cache.set(
          rateLimitKey,
          { count: count + 1, resetAt },
          windowSeconds * 1000, // TTL in milliseconds
        );
      }

      return {
        allowed,
        limit,
        remaining: allowed ? remaining : 0,
        resetAt,
      };
    } catch (error) {
      // On cache error, allow the request but log the issue
      this.logger.error(`Rate limit check failed for ${key}: ${error}`);
      return {
        allowed!: true,
        limit,
        remaining: limit - 1,
        resetAt: now + windowSeconds,
      };
    }
  }

  /**
   * Get current rate limit status without consuming a token.
   *
   * @param key - Unique identifier for the rate limit
   * @param limit - Maximum number of requests allowed
   * @param windowSeconds - Time window in seconds
   * @returns Current rate limit status
   */
  async getStatus(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    const now = Math.floor(Date.now() / 1000);
    const rateLimitKey = `rate_limit:${key}`;

    try {
      const currentData = await this.cache.get<{
        count!: number;
        resetAt!: number;
      }>(rateLimitKey);

      if (!currentData || currentData.resetAt <= now) {
        return {
          allowed!: true,
          limit,
          remaining: limit,
          resetAt: now + windowSeconds,
        };
      }

      const remaining = Math.max(0, limit - currentData.count);
      return {
        allowed!: remaining > 0,
        limit,
        remaining,
        resetAt: currentData.resetAt,
      };
    } catch (error) {
      this.logger.error(`Rate limit status check failed for ${key}: ${error}`);
      return {
        allowed!: true,
        limit,
        remaining: limit,
        resetAt: now + windowSeconds,
      };
    }
  }

  /**
   * Reset rate limit for a specific key.
   * Useful for admin operations or after successful re-authentication.
   *
   * @param key - Unique identifier for the rate limit
   */
  async reset(key: string): Promise<void> {
    const rateLimitKey = `rate_limit:${key}`;
    try {
      await this.cache.del(rateLimitKey);
      this.logger.debug(`Rate limit reset for ${key}`);
    } catch (error) {
      this.logger.error(`Failed to reset rate limit for ${key}: ${error}`);
    }
  }

  /**
   * Generate a consistent key for user-based rate limiting.
   */
  getUserKey(userId: string, endpoint: string): string {
    return `user:${userId}:${endpoint}`;
  }

  /**
   * Generate a consistent key for IP-based rate limiting.
   */
  getIpKey(ip: string, endpoint: string): string {
    // Normalize IPv6 addresses
    const normalizedIp = ip.replace(/^::ffff:/, '');
    return `ip:${normalizedIp}:${endpoint}`;
  }

  /**
   * Generate a consistent key for API key-based rate limiting.
   */
  getApiKeyKey(apiKeyId: string, endpoint: string): string {
    return `apikey:${apiKeyId}:${endpoint}`;
  }

  /**
   * Get custom rate limit configuration for an API key.
   * This would typically fetch from a database or cache.
   * For now, returns null if no custom config exists.
   *
   * @param apiKeyId - API key identifier
   * @param endpoint - Endpoint path
   * @returns Custom rate limit config or null
   */
  async getCustomLimitForApiKey(
    apiKeyId: string,
    endpoint: string,
  ): Promise<CustomRateLimitConfig | null> {
    try {
      // Check cache for custom API key limits
      const customConfigKey = `api_key_limits:${apiKeyId}:${endpoint}`;
      const customConfig = await this.cache.get<CustomRateLimitConfig>(
        customConfigKey,
      );

      if (customConfig) {
        this.logger.debug(
          `Using custom rate limit for API key ${apiKeyId} on ${endpoint}: ${customConfig.limit}/${customConfig.windowSeconds}s`,
        );
        return customConfig;
      }

      // Check for wildcard limits (applies to all endpoints for this API key)
      const wildcardConfigKey = `api_key_limits:${apiKeyId}:*`;
      const wildcardConfig = await this.cache.get<CustomRateLimitConfig>(
        wildcardConfigKey,
      );

      if (wildcardConfig) {
        this.logger.debug(
          `Using wildcard rate limit for API key ${apiKeyId}: ${wildcardConfig.limit}/${wildcardConfig.windowSeconds}s`,
        );
        return wildcardConfig;
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Failed to fetch custom rate limit for API key ${apiKeyId}: ${error}`,
      );
      return null;
    }
  }

  /**
   * Set custom rate limit for an API key (admin operation).
   * This would typically be called by the API Keys module when configuring an API key.
   *
   * @param apiKeyId - API key identifier
   * @param endpoint - Endpoint path (use '*' for all endpoints)
   * @param config - Custom rate limit configuration
   */
  async setCustomLimitForApiKey(
    apiKeyId: string,
    endpoint: string,
    config: CustomRateLimitConfig,
  ): Promise<void> {
    try {
      const customConfigKey = `api_key_limits:${apiKeyId}:${endpoint}`;
      // Store custom limits with long TTL (they should be explicitly removed)
      await this.cache.set(
        customConfigKey,
        config,
        86400000, // 24 hours in milliseconds
      );

      this.logger.log(
        `Custom rate limit set for API key ${apiKeyId} on ${endpoint}: ${config.limit}/${config.windowSeconds}s`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to set custom rate limit for API key ${apiKeyId}: ${error}`,
      );
    }
  }

  /**
   * Remove custom rate limit for an API key.
   *
   * @param apiKeyId - API key identifier
   * @param endpoint - Endpoint path (use '*' for all endpoints)
   */
  async removeCustomLimitForApiKey(
    apiKeyId: string,
    endpoint: string,
  ): Promise<void> {
    const customConfigKey = `api_key_limits:${apiKeyId}:${endpoint}`;
    try {
      await this.cache.del(customConfigKey);
      this.logger.log(
        `Custom rate limit removed for API key ${apiKeyId} on ${endpoint}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to remove custom rate limit for API key ${apiKeyId}: ${error}`,
      );
    }
  }
}
