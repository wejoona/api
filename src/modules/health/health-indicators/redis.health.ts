import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private redis: Redis;

  constructor(private readonly configService: ConfigService) {
    super();
    this.redis = new Redis({
      host: this.configService.get<string>('redis.host', 'localhost'),
      port: this.configService.get<number>('redis.port', 6379),
      password: this.configService.get<string>('redis.password'),
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: true,
    });
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
          host: this.configService.get<string>('redis.host'),
          port: this.configService.get<number>('redis.port'),
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
          host: this.configService.get<string>('redis.host'),
          port: this.configService.get<number>('redis.port'),
          error: errorMessage,
        }),
      );
    }
  }
}
