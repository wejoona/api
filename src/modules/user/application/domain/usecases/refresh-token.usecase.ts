import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { User } from '../entities';
import { UserRepository } from '../../../infrastructure/repositories';

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface RefreshTokenOutput {
  user: User;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class RefreshTokenUsecase implements OnModuleDestroy {
  private readonly logger = new Logger(RefreshTokenUsecase.name);
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;
  private readonly redis: Redis;
  private isRedisConnected = false;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    // Use separate secret for refresh tokens - no fallback for security
    this.refreshSecret = this.configService.get<string>('jwt.refreshSecret');
    if (!this.refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required');
    }
    this.refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn', '7d');

    // Initialize Redis client for token blacklist checking
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

  async execute(input: RefreshTokenInput): Promise<RefreshTokenOutput> {
    try {
      this.ensureConnection();

      // Check if token is blacklisted (logged out)
      const blacklistKey = `blacklist:${input.refreshToken}`;
      const isBlacklisted = await this.redis.get(blacklistKey);

      if (isBlacklisted) {
        this.logger.warn('Attempt to use blacklisted refresh token');
        throw new UnauthorizedException('Token has been revoked');
      }

      // Verify refresh token
      const payload = this.jwtService.verify(input.refreshToken, {
        secret: this.refreshSecret,
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Find user
      const user = await this.userRepository.findById(payload.sub);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new UnauthorizedException('User account is not active');
      }

      this.logger.log(`Refreshing tokens for user ${user.id}`);

      // Generate new access token
      const accessToken = this.jwtService.sign({
        sub: user.id,
        phone: user.phone,
      });

      // Generate new refresh token (rotation for security)
      const refreshToken = this.jwtService.sign(
        {
          sub: user.id,
          type: 'refresh',
        },
        {
          secret: this.refreshSecret,
          expiresIn: this.refreshExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      );

      // SECURITY: Blacklist the old refresh token to prevent reuse
      // This prevents "shadow sessions" where attacker can use old token
      await this.blacklistToken(input.refreshToken, payload.exp);

      this.logger.log(`Tokens refreshed and old token blacklisted for user ${user.id}`);

      return {
        user,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.warn(`Invalid refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Generate a new refresh token for a user
   * Called when user first authenticates
   */
  generateRefreshToken(userId: string): string {
    return this.jwtService.sign(
      {
        sub: userId,
        type: 'refresh',
      },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );
  }

  /**
   * Blacklist a refresh token to prevent reuse
   * Token is kept in blacklist until its original expiration time
   */
  async blacklistToken(token: string, expirationTimestamp?: number): Promise<void> {
    try {
      const blacklistKey = `blacklist:${token}`;

      // Calculate TTL - keep in blacklist until token would have expired
      let ttl: number;
      if (expirationTimestamp) {
        ttl = Math.max(0, expirationTimestamp - Math.floor(Date.now() / 1000));
      } else {
        // Default to 7 days if expiration unknown
        ttl = 7 * 24 * 60 * 60;
      }

      if (ttl > 0) {
        await this.redis.set(blacklistKey, '1', 'EX', ttl);
        this.logger.debug(`Token blacklisted with TTL ${ttl}s`);
      }
    } catch (error) {
      // Log but don't fail the refresh operation if blacklisting fails
      this.logger.error(`Failed to blacklist token: ${error.message}`);
    }
  }
}
