import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  HealthCheckResult,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { CircleHealthIndicator, BlnkHealthIndicator, RedisHealthIndicator } from './health-indicators';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly configService: ConfigService,
    private readonly circleHealth: CircleHealthIndicator,
    private readonly blnkHealth: BlnkHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator,
  ) {}

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
      () => this.redisHealth.isHealthy('redis'),
      () => this.blnkHealth.isHealthy('blnk'),
      () => this.circleHealth.isHealthy('circle'),
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
    const services: Record<string, any> = {
      database: { status: 'unknown' },
      redis: { status: 'unknown' },
      blnk: { status: 'unknown' },
      circle: { status: 'unknown' },
    };

    // Check database
    try {
      const startDb = Date.now();
      await this.db.pingCheck('database');
      services.database = { status: 'up', latency: `${Date.now() - startDb}ms` };
    } catch (error) {
      services.database = {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Check Redis
    try {
      const result = await this.redisHealth.isHealthy('redis');
      services.redis = { status: 'up', ...result.redis };
    } catch (error: any) {
      services.redis = {
        status: 'down',
        error: error.message || 'Unknown error',
      };
    }

    // Check Blnk
    try {
      const result = await this.blnkHealth.isHealthy('blnk');
      services.blnk = { status: 'up', ...result.blnk };
    } catch (error: any) {
      services.blnk = {
        status: 'down',
        error: error.message || 'Unknown error',
      };
    }

    // Check Circle
    try {
      const result = await this.circleHealth.isHealthy('circle');
      services.circle = { status: 'up', ...result.circle };
    } catch (error: any) {
      services.circle = {
        status: 'down',
        error: error.message || 'Unknown error',
      };
    }

    const allHealthy = Object.values(services).every(
      (service) => service.status === 'up',
    );

    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services,
      environment: {
        nodeEnv: this.configService.get('NODE_ENV', 'development'),
        version: process.env.npm_package_version || '0.0.1',
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}
