import { SetMetadata } from '@nestjs/common';

/**
 * Rate limit configuration for an endpoint.
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed in the time window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Use IP address for rate limiting instead of user ID */
  byIp?: boolean;
  /** Custom key prefix for this endpoint */
  keyPrefix?: string;
  /** Skip rate limiting for this endpoint */
  skip?: boolean;
  /** Allow API keys to override with custom limits */
  allowApiKeyOverride?: boolean;
  /** Bypass rate limiting for specific roles */
  bypassRoles?: string[];
}

export const RATE_LIMIT_KEY = 'rate_limit';

/**
 * Decorator to set custom rate limits on specific endpoints.
 *
 * @example
 * // 5 requests per minute for auth endpoint
 * @RateLimit({ limit: 5, windowSeconds: 60, byIp: true })
 *
 * @example
 * // 10 requests per minute for transfers
 * @RateLimit({ limit: 10, windowSeconds: 60 })
 */
export const RateLimit = (config: RateLimitConfig) =>
  SetMetadata(RATE_LIMIT_KEY, config);

/**
 * Preset rate limit decorators for common use cases.
 */
export const RateLimitPresets = {
  /**
   * Auth endpoints - strict limits to prevent brute force.
   * 5 requests per minute per IP.
   */
  auth: () => RateLimit({ limit: 5, windowSeconds: 60, byIp: true }),

  /**
   * OTP verification - very strict to prevent enumeration.
   * 3 attempts per 5 minutes per IP.
   */
  otp: () => RateLimit({ limit: 3, windowSeconds: 300, byIp: true }),

  /**
   * Transfers - moderate limits for financial operations.
   * 10 requests per minute per user.
   */
  transfer: () => RateLimit({ limit: 10, windowSeconds: 60 }),

  /**
   * Public endpoints - stricter limits for unauthenticated requests.
   * 30 requests per minute per IP.
   */
  public: () => RateLimit({ limit: 30, windowSeconds: 60, byIp: true }),

  /**
   * Standard API endpoints - default limits.
   * 100 requests per minute per user.
   */
  standard: () => RateLimit({ limit: 100, windowSeconds: 60 }),

  /**
   * Webhook endpoints - higher limits for external systems.
   * 200 requests per minute per IP.
   */
  webhook: () => RateLimit({ limit: 200, windowSeconds: 60, byIp: true }),

  /**
   * Admin endpoints - higher limits with role bypass.
   * 200 requests per minute, but admins/superadmins bypass limits.
   */
  admin: () =>
    RateLimit({
      limit: 200,
      windowSeconds: 60,
      bypassRoles: ['admin', 'superadmin'],
    }),

  /**
   * Enterprise API endpoints - support custom API key limits.
   * 500 requests per minute by default, but API keys can override.
   */
  enterprise: () =>
    RateLimit({
      limit: 500,
      windowSeconds: 60,
      allowApiKeyOverride: true,
    }),

  /**
   * Skip rate limiting for this endpoint.
   */
  skip: () => RateLimit({ limit: 0, windowSeconds: 0, skip: true }),
};
