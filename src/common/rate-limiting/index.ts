/**
 * Rate Limiting Module
 *
 * Provides Redis-backed distributed rate limiting with:
 * - Sliding window algorithm for smooth rate limiting
 * - Per-user and per-IP rate limiting
 * - Custom rate limits per API key
 * - Role-based bypass
 * - Prometheus metrics integration
 * - Standard rate limit headers (X-RateLimit-*)
 *
 * @module rate-limiting
 */

export * from './rate-limit.decorator';
export * from './rate-limit.service';
export * from './rate-limit.guard';
export * from './rate-limit.module';

/**
 * Quick Start:
 *
 * 1. Import RateLimitModule in AppModule (already global)
 *
 * 2. Use presets in controllers:
 *    @UseGuards(RateLimitGuard)
 *    @RateLimitPresets.auth()
 *    async login() {}
 *
 * 3. Or custom limits:
 *    @RateLimit({ limit: 10, windowSeconds: 60 })
 *    async customEndpoint() {}
 *
 * 4. Check rate limit headers in responses:
 *    X-RateLimit-Limit
 *    X-RateLimit-Remaining
 *    X-RateLimit-Reset
 *
 * See docs/RATE_LIMITING.md for full documentation.
 */
