import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  closeRedisClient,
  createConfiguredRedisClient,
} from '@/common/redis/redis-client.helper';

@Injectable()
export class RedisHealthIndicator
  extends HealthIndicator
  implements OnModuleDestroy
{
  private readonly logger = new Logger(RedisHealthIndicator.name);
  private redis: Redis;

  constructor(private readonly configService: ConfigService) {
    super();
    this.redis = createConfiguredRedisClient(this.configService, this.logger, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: true,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await closeRedisClient(this.redis, this.logger, 'Redis health');
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      await this.redis.connect();
      const pong = await this.redis.ping();
      const latency = Date.now() - startTime;
      await this.redis.disconnect();

      if (pong === 'PONG') {
        const result = this.getStatus(key, true, {
          latency: `${latency}ms`,
        });
        return result;
      }

      throw new Error('Redis ping failed');
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, {
          latency: `${latency}ms`,
          error: errorMessage,
        }),
      );
    }
  }
}
