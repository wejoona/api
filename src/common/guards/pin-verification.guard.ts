import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export const SKIP_PIN_CHECK = 'skipPinCheck';
export const SkipPinCheck = () => Reflector.createDecorator<boolean>();

/**
 * PIN Verification Guard
 *
 * Ensures that PIN has been recently verified before allowing
 * sensitive operations like transfers.
 *
 * Use SkipPinCheck decorator to bypass for specific endpoints.
 *
 * Flow:
 * 1. Client calls POST /wallet/pin/verify with PIN
 * 2. On success, server issues a short-lived PIN token stored in cache
 * 3. Client includes PIN token in X-Pin-Token header for transfer requests
 * 4. This guard validates the token
 */
@Injectable()
export class PinVerificationGuard implements CanActivate {
  // PIN token is valid for 5 minutes
  private readonly PIN_TOKEN_TTL = 5 * 60 * 1000;

  constructor(
    private readonly reflector: Reflector,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if PIN verification is skipped for this endpoint
    const skipPinCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_PIN_CHECK,
      [context.getHandler(), context.getClass()],
    );

    if (skipPinCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get PIN token from header
    const pinToken = request.headers['x-pin-token'];

    if (!pinToken) {
      throw new BadRequestException({
        message: 'PIN verification required for this operation',
        code: 'PIN_REQUIRED',
        hint: 'Call POST /wallet/pin/verify first, then include the returned token in X-Pin-Token header',
      });
    }

    // Validate PIN token from cache
    const cacheKey = `pin_token:${userId}:${pinToken}`;
    const tokenData = await this.cacheManager.get<{
      verified: boolean;
      timestamp: number;
    }>(cacheKey);

    if (!tokenData) {
      throw new ForbiddenException({
        message: 'Invalid or expired PIN verification',
        code: 'PIN_INVALID',
        hint: 'PIN verification has expired. Please verify your PIN again.',
      });
    }

    // Check if token is still within valid time window
    const tokenAge = Date.now() - tokenData.timestamp;
    if (tokenAge > this.PIN_TOKEN_TTL) {
      // Remove expired token
      await this.cacheManager.del(cacheKey);
      throw new ForbiddenException({
        message: 'PIN verification has expired',
        code: 'PIN_EXPIRED',
        hint: 'Please verify your PIN again.',
      });
    }

    // Optional: Invalidate token after use for single-use security
    // await this.cacheManager.del(cacheKey);

    return true;
  }
}

/**
 * Service to generate and validate PIN tokens
 */
@Injectable()
export class PinTokenService {
  private readonly PIN_TOKEN_TTL = 5 * 60; // 5 minutes in seconds

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Generate a PIN verification token after successful PIN verification
   */
  async generatePinToken(userId: string): Promise<string> {
    const token = this.generateSecureToken();
    const cacheKey = `pin_token:${userId}:${token}`;

    await this.cacheManager.set(
      cacheKey,
      { verified: true, timestamp: Date.now() },
      this.PIN_TOKEN_TTL,
    );

    return token;
  }

  /**
   * Invalidate a PIN token (for single-use scenarios)
   */
  async invalidatePinToken(userId: string, token: string): Promise<void> {
    const cacheKey = `pin_token:${userId}:${token}`;
    await this.cacheManager.del(cacheKey);
  }

  /**
   * Invalidate all PIN tokens for a user (on PIN change, logout, etc.)
   */
  async invalidateAllPinTokens(userId: string): Promise<void> {
    // Note: This requires pattern-based deletion which depends on cache implementation
    // For Redis, you'd use SCAN with pattern matching
    // For simple cache-manager, we rely on TTL expiration
  }

  private generateSecureToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
}
