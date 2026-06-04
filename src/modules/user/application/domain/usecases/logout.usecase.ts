import {
  Injectable,
  Logger,
  UnauthorizedException,
  OnModuleDestroy,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  closeRedisClient,
  createConfiguredRedisClient,
} from '@/common/redis/redis-client.helper';

export interface LogoutInput {
  userId: string;
  refreshToken: string;
}

export interface LogoutOutput {
  success: boolean;
  message: string;
}

@Injectable()
export class LogoutUsecase implements OnModuleDestroy {
  private readonly logger = new Logger(LogoutUsecase.name);
  private readonly redis: Redis;
  private readonly refreshSecret: string;
  private isRedisConnected = false;
  private isShuttingDown = false;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.refreshSecret = this.configService.get<string>('jwt.refreshSecret');
    if (!this.refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required');
    }

    this.redis = createConfiguredRedisClient(this.configService, this.logger, {
      maxRetriesPerRequest: 3,
      retryLogContext: 'logout',
      isShuttingDown: () => this.isShuttingDown,
    });

    // Redis connection event handlers
    this.redis.on('connect', () => {
      this.isRedisConnected = true;
      this.logger.log('Redis connected successfully');
    });

    this.redis.on('error', (error) => {
      this.isRedisConnected = false;
      if (this.isShuttingDown) {
        return;
      }
      this.logger.error(`Redis connection error: ${error.message}`);
    });

    this.redis.on('close', () => {
      this.isRedisConnected = false;
      if (this.isShuttingDown) {
        return;
      }
      this.logger.warn('Redis connection closed');
    });
  }

  async onModuleDestroy() {
    this.isShuttingDown = true;
    this.isRedisConnected = false;

    await closeRedisClient(this.redis, this.logger, 'Redis logout');
  }

  private ensureConnection(): void {
    if (!this.isRedisConnected) {
      throw new Error('Redis connection unavailable. Please try again later.');
    }
  }

  async execute(input: LogoutInput): Promise<LogoutOutput> {
    this.ensureConnection();

    try {
      const decoded = this.jwtService.verify(input.refreshToken, {
        secret: this.refreshSecret,
      });

      if (!decoded || !decoded.exp) {
        throw new UnauthorizedException('Invalid refresh token format');
      }

      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Verify the token belongs to the user
      if (decoded.sub !== input.userId) {
        throw new UnauthorizedException('Token does not belong to this user');
      }

      // Calculate TTL (time until token expires)
      const currentTime = Math.floor(Date.now() / 1000);
      const ttl = decoded.exp - currentTime;

      // Only blacklist if token hasn't expired yet
      if (ttl > 0) {
        const blacklistKey = `blacklist:${input.refreshToken}`;
        await this.redis.setex(blacklistKey, ttl, '1');

        this.logger.log(
          `Token blacklisted for user ${input.userId}, TTL: ${ttl} seconds`,
        );
      } else {
        this.logger.log(
          `Token already expired for user ${input.userId}, skipping blacklist`,
        );
      }

      this.eventEmitter.emit('user.logged_out', {
        userId: input.userId,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(
        `Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
