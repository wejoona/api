import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  HealthCheckResult,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import {
  CircleHealthIndicator,
  BlnkHealthIndicator,
  RedisHealthIndicator,
  YellowCardHealthIndicator,
  TwilioHealthIndicator,
} from './health-indicators';

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
    private readonly yellowCardHealth: YellowCardHealthIndicator,
    private readonly twilioHealth: TwilioHealthIndicator,
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
    return this.health.check([() => this.db.pingCheck('database')]);
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

  @Get('version')
  @ApiOperation({ summary: 'API version information' })
  @ApiResponse({ status: 200, description: 'Version info' })
  version() {
    return {
      version: process.env.npm_package_version || '1.2.3',
      build: process.env.BUILD_NUMBER || 'dev',
      node: process.version,
      uptime: Math.floor(process.uptime()),
    };
  }

  @Get('time')
  @ApiOperation({ summary: 'Server time for client clock synchronization' })
  @ApiResponse({
    status: 200,
    description: 'Current server time',
    schema: {
      example: {
        serverTime: '2026-02-11T03:30:00.000Z',
        timestamp: 1739245800000,
        timezone: 'UTC',
      },
    },
  })
  serverTime() {
    const now = new Date();
    return {
      serverTime: now.toISOString(),
      timestamp: now.getTime(),
      timezone: 'UTC',
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
      services.database = {
        status: 'up',
        latency: `${Date.now() - startDb}ms`,
      };
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

  @Get('providers')
  @ApiOperation({ summary: 'Provider health status for dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Provider health status',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-01-29T12:00:00.000Z',
        providers: {
          circle: {
            status: 'up',
            latency: '150ms',
            lastSuccess: '2026-01-29T12:00:00.000Z',
          },
        },
        healthScore: 100,
        alertCount: 0,
      },
    },
  })
  async providers() {
    const providers: Record<
      string,
      {
        name: string;
        status: 'up' | 'down' | 'degraded';
        latency: string | null;
        lastSuccess: string | null;
        error: string | null;
        type: 'api' | 'database' | 'cache' | 'messaging';
      }
    > = {};

    const now = new Date().toISOString();
    let healthyCount = 0;
    const totalProviders = 6;

    // Check Circle API
    try {
      const result = await this.circleHealth.isHealthy('circle');
      providers.circle = {
        name: 'Circle API',
        status: 'up',
        latency: result.circle?.latency || null,
        lastSuccess: now,
        error: null,
        type: 'api',
      };
      healthyCount++;
    } catch (error: any) {
      providers.circle = {
        name: 'Circle API',
        status: 'down',
        latency: null,
        lastSuccess: null,
        error: error.message || 'Connection failed',
        type: 'api',
      };
    }

    // Check Yellow Card API
    try {
      const result = await this.yellowCardHealth.isHealthy('yellowcard');
      providers.yellowcard = {
        name: 'Yellow Card API',
        status: 'up',
        latency: result.yellowcard?.latency || null,
        lastSuccess: now,
        error: null,
        type: 'api',
      };
      healthyCount++;
    } catch (error: any) {
      providers.yellowcard = {
        name: 'Yellow Card API',
        status: 'down',
        latency: null,
        lastSuccess: null,
        error: error.message || 'Connection failed',
        type: 'api',
      };
    }

    // Check Blnk Ledger
    try {
      const result = await this.blnkHealth.isHealthy('blnk');
      providers.blnk = {
        name: 'Blnk Ledger',
        status: 'up',
        latency: result.blnk?.latency || null,
        lastSuccess: now,
        error: null,
        type: 'api',
      };
      healthyCount++;
    } catch (error: any) {
      providers.blnk = {
        name: 'Blnk Ledger',
        status: 'down',
        latency: null,
        lastSuccess: null,
        error: error.message || 'Connection failed',
        type: 'api',
      };
    }

    // Check Twilio SMS
    try {
      const result = await this.twilioHealth.isHealthy('twilio');
      providers.twilio = {
        name: 'Twilio SMS',
        status: 'up',
        latency: result.twilio?.latency || null,
        lastSuccess: now,
        error: null,
        type: 'messaging',
      };
      healthyCount++;
    } catch (error: any) {
      providers.twilio = {
        name: 'Twilio SMS',
        status: 'down',
        latency: null,
        lastSuccess: null,
        error: error.message || 'Connection failed',
        type: 'messaging',
      };
    }

    // Check Redis
    try {
      const result = await this.redisHealth.isHealthy('redis');
      providers.redis = {
        name: 'Redis Cache',
        status: 'up',
        latency: result.redis?.latency || null,
        lastSuccess: now,
        error: null,
        type: 'cache',
      };
      healthyCount++;
    } catch (error: any) {
      providers.redis = {
        name: 'Redis Cache',
        status: 'down',
        latency: null,
        lastSuccess: null,
        error: error.message || 'Connection failed',
        type: 'cache',
      };
    }

    // Check PostgreSQL
    try {
      const startDb = Date.now();
      await this.db.pingCheck('database');
      providers.postgresql = {
        name: 'PostgreSQL',
        status: 'up',
        latency: `${Date.now() - startDb}ms`,
        lastSuccess: now,
        error: null,
        type: 'database',
      };
      healthyCount++;
    } catch (error: any) {
      providers.postgresql = {
        name: 'PostgreSQL',
        status: 'down',
        latency: null,
        lastSuccess: null,
        error: error.message || 'Connection failed',
        type: 'database',
      };
    }

    const healthScore = Math.round((healthyCount / totalProviders) * 100);
    const alertCount = totalProviders - healthyCount;

    return {
      status: healthyCount === totalProviders ? 'ok' : 'degraded',
      timestamp: now,
      providers,
      healthScore,
      alertCount,
      summary: {
        total: totalProviders,
        healthy: healthyCount,
        unhealthy: alertCount,
      },
    };
  }
}
