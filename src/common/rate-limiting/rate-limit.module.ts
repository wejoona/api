import { Module, Global } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';
import { RateLimitGuard } from './rate-limit.guard';

/**
 * Rate limiting module with Redis-backed storage.
 *
 * Provides:
 * - RateLimitService: Core service for checking/consuming rate limits
 * - RateLimitGuard: Guard to apply rate limiting to routes
 * - @RateLimit decorator: Configure limits per endpoint
 *
 * Usage:
 * 1. Import RateLimitModule in AppModule
 * 2. Use @RateLimit() decorator on controllers/routes
 * 3. Apply RateLimitGuard as needed (or use globally)
 *
 * @example
 * // In controller
 * @Controller('auth')
 * @UseGuards(RateLimitGuard)
 * export class AuthController {
 *   @Post('login')
 *   @RateLimit({ limit: 5, windowSeconds: 60, byIp: true })
 *   login() { ... }
 * }
 *
 * @example
 * // Using presets
 * @Post('verify-otp')
 * @RateLimitPresets.otp()
 * verifyOtp() { ... }
 */
@Global()
@Module({
  providers: [RateLimitService, RateLimitGuard],
  exports: [RateLimitService, RateLimitGuard],
})
export class RateLimitModule {}
