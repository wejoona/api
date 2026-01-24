import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  HealthCheckResult,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private redis: Redis;

  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly configService: ConfigService,
  ) {
    // Create Redis connection for health checks
    this.redis = new Redis({
      host: this.configService.get<string>('redis.host', 'localhost'),
      port: this.configService.get<number>('redis.port', 6379),
      password: this.configService.get<string>('redis.password'),
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: true,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-01-24T12:00:00.000Z',
      },
    },
  })
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check - all dependencies' })
  @ApiResponse({
    status: 200,
    description: 'Service is ready to accept traffic',
  })
  @ApiResponse({
    status: 503,
    description: 'Service is not ready',
  })
  @HealthCheck()
  async readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.checkRedis(),
      () => this.checkBlnk(),
    ]);
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check - is the service running' })
  @ApiResponse({
    status: 200,
    description: 'Service is alive',
  })
  live() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check with all services' })
  @ApiResponse({
    status: 200,
    description: 'Detailed health status',
  })
  async detailed() {
    const checks = {
      timestamp: new Date().toISOString(),
      services: {
        database: await this.checkDatabaseDetailed(),
        redis: await this.checkRedisDetailed(),
        blnk: await this.checkBlnkDetailed(),
      },
      environment: {
        nodeEnv: this.configService.get('NODE_ENV', 'development'),
        version: process.env.npm_package_version || '0.0.1',
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    const allHealthy = Object.values(checks.services).every(
      (service) => service.status === 'up',
    );

    return {
      status: allHealthy ? 'ok' : 'degraded',
      ...checks,
    };
  }

  // ============================================
  // Private Health Check Methods
  // ============================================

  private async checkRedis(): Promise<HealthIndicatorResult> {
    try {
      await this.redis.connect();
      const pong = await this.redis.ping();
      await this.redis.disconnect();

      if (pong === 'PONG') {
        return { redis: { status: 'up' } };
      }
      throw new Error('Redis ping failed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { redis: { status: 'down', message: errorMessage } };
    }
  }

  private async checkBlnk(): Promise<HealthIndicatorResult> {
    try {
      const blnkUrl = this.configService.get<string>('blnk.url', 'http://localhost:5001');
      const response = await fetch(`${blnkUrl}/`, {
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        return { blnk: { status: 'up' } };
      }
      return { blnk: { status: 'down', message: `HTTP ${response.status}` } };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { blnk: { status: 'down', message: errorMessage } };
    }
  }

  private async checkDatabaseDetailed() {
    try {
      const start = Date.now();
      await this.db.pingCheck('database');
      const latency = Date.now() - start;
      return { status: 'up', latency: `${latency}ms` };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkRedisDetailed() {
    try {
      await this.redis.connect();
      const start = Date.now();
      const pong = await this.redis.ping();
      const latency = Date.now() - start;
      await this.redis.disconnect();

      if (pong === 'PONG') {
        return { status: 'up', latency: `${latency}ms` };
      }
      return { status: 'down', error: 'Ping failed' };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkBlnkDetailed() {
    try {
      const blnkUrl = this.configService.get<string>('blnk.url', 'http://localhost:5001');
      const start = Date.now();
      const response = await fetch(`${blnkUrl}/`, {
        signal: AbortSignal.timeout(5000)
      });
      const latency = Date.now() - start;

      if (response.ok) {
        return { status: 'up', latency: `${latency}ms`, url: blnkUrl };
      }
      return {
        status: 'down',
        error: `HTTP ${response.status}`,
        url: blnkUrl,
      };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
        url: this.configService.get<string>('blnk.url', 'http://localhost:5001'),
      };
    }
  }
}
