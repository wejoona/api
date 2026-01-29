import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface LogoutAllInput {
  userId: string;
  currentRefreshToken?: string; // Optional: preserve current session
}

export interface LogoutAllOutput {
  success: boolean;
  message: string;
  sessionsInvalidated: number;
}

@Injectable()
export class LogoutAllUsecase implements OnModuleDestroy {
  private readonly logger = new Logger(LogoutAllUsecase.name);
  private readonly redis: Redis;
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;
  private isRedisConnected = false;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.refreshSecret = this.configService.get<string>('jwt.refreshSecret');
    if (!this.refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required');
    }
    this.refreshExpiresIn = this.configService.get<string>(
      'jwt.refreshExpiresIn',
      '7d',
    );

    this.redis = new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        this.logger.warn(
          `Redis connection retry attempt ${times}, waiting ${delay}ms`,
        );
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    // Redis connection event handlers
    this.redis.on('connect', () => {
      this.isRedisConnected = true;
      this.logger.log('Redis connected successfully');
    });

    this.redis.on('error', (error) => {
      this.isRedisConnected = false;
      this.logger.error(`Redis connection error: ${error.message}`);
    });

    this.redis.on('close', () => {
      this.isRedisConnected = false;
      this.logger.warn('Redis connection closed');
    });
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Redis connection closed gracefully');
    }
  }

  private ensureConnection(): void {
    if (!this.isRedisConnected) {
      throw new Error('Redis connection unavailable. Please try again later.');
    }
  }

  async execute(input: LogoutAllInput): Promise<LogoutAllOutput> {
    this.ensureConnection();

    try {
      // Create a global invalidation key for this user
      // This key will be checked by the refresh token usecase
      const userInvalidationKey = `user:${input.userId}:token_invalidation`;
      const invalidationTimestamp = Date.now();

      // Calculate TTL based on refresh token expiration
      const ttl = this.parseDurationToSeconds(this.refreshExpiresIn);

      // Set the invalidation timestamp with TTL
      // Any tokens issued before this timestamp will be considered invalid
      await this.redis.setex(
        userInvalidationKey,
        ttl,
        invalidationTimestamp.toString(),
      );

      // If currentRefreshToken is provided, whitelist it
      if (input.currentRefreshToken) {
        try {
          // Decode to verify it's valid and belongs to user
          const decoded = this.jwtService.verify(input.currentRefreshToken, {
            secret: this.refreshSecret,
          });

          if (decoded.sub === input.userId && decoded.type === 'refresh') {
            // Store the token hash in a whitelist set
            const whitelistKey = `user:${input.userId}:whitelisted_tokens`;
            await this.redis.sadd(whitelistKey, input.currentRefreshToken);
            await this.redis.expire(whitelistKey, ttl);

            this.logger.log(
              `Current session preserved for user ${input.userId}`,
            );
          }
        } catch (error) {
          // If current token is invalid, don't fail the logout
          this.logger.warn(
            `Failed to preserve current session: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      this.logger.log(
        `All tokens invalidated for user ${input.userId} at timestamp ${invalidationTimestamp}`,
      );

      return {
        success: true,
        message: 'All devices logged out successfully',
        sessionsInvalidated: 0, // We don't track exact count in current implementation
      };
    } catch (error) {
      this.logger.error(
        `Logout all failed for user ${input.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new Error('Failed to logout from all devices. Please try again.');
    }
  }

  /**
   * Check if a token has been invalidated by the logout-all operation
   */
  async isTokenInvalidated(userId: string, token: string): Promise<boolean> {
    try {
      this.ensureConnection();

      // Check if there's a global invalidation for this user
      const userInvalidationKey = `user:${userId}:token_invalidation`;
      const invalidationTimestamp = await this.redis.get(userInvalidationKey);

      if (!invalidationTimestamp) {
        return false; // No global invalidation
      }

      // Check if token is whitelisted (current session preservation)
      const whitelistKey = `user:${userId}:whitelisted_tokens`;
      const isWhitelisted = await this.redis.sismember(whitelistKey, token);

      if (isWhitelisted) {
        return false; // Token is whitelisted, not invalidated
      }

      // Decode token to get its issued-at time
      const decoded = this.jwtService.decode(token);

      if (!decoded || !decoded.iat) {
        return true; // Invalid token format, consider it invalidated
      }

      // Token is invalidated if it was issued before the invalidation timestamp
      const tokenIssuedAt = decoded.iat * 1000; // Convert to milliseconds
      const invalidatedAt = parseInt(invalidationTimestamp, 10);

      return tokenIssuedAt < invalidatedAt;
    } catch (error) {
      this.logger.error(
        `Error checking token invalidation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // In case of error, fail safe - don't invalidate
      return false;
    }
  }

  /**
   * Parse duration string (e.g., "7d", "24h") to seconds
   */
  private parseDurationToSeconds(duration: string): number {
    const regex = /^(\d+)([smhd])$/;
    const match = duration.match(regex);

    if (!match) {
      this.logger.warn(
        `Invalid duration format: ${duration}, defaulting to 7 days`,
      );
      return 7 * 24 * 60 * 60;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 7 * 24 * 60 * 60;
    }
  }
}
