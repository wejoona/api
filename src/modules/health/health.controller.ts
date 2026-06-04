import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
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
  StellarHealthIndicator,
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
    private readonly stellarHealth: StellarHealthIndicator,
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
      () => this.stellarHealth.isHealthy('stellar'),
      // Note: Yellow Card is DEACTIVATED — not included in readiness
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

  @Get('mobile-readiness')
  @ApiOperation({
    summary: 'Mobile/API readiness split by app, providers, and features',
  })
  @ApiResponse({
    status: 200,
    description:
      'Readiness summary that separates core app readiness from external provider and feature availability.',
  })
  async mobileReadiness() {
    const [database, redis, blnk, circle, stellar, yellowCard] =
      await Promise.all([
        this.checkDependency('database', async () =>
          this.db.pingCheck('database'),
        ),
        this.checkDependency('redis', async () =>
          this.redisHealth.isHealthy('redis'),
        ),
        this.checkDependency('blnk', async () =>
          this.blnkHealth.isHealthy('blnk'),
        ),
        this.checkDependency('circle', async () =>
          this.circleHealth.isHealthy('circle'),
        ),
        this.checkDependency('stellar', async () =>
          this.stellarHealth.isHealthy('stellar'),
        ),
        this.checkDependency('yellowCard', async () =>
          this.yellowCardHealth.isHealthy('yellowcard'),
        ),
      ]);

    const yellowCardEnabled =
      this.configService.get<string>('YELLOW_CARD_ENABLED', 'false') === 'true';
    const cardIssuingEnabled =
      this.configService.get<boolean>('cards.issuingEnabled') === true;
    const bankLinkingEnabled =
      this.configService.get<boolean>('bankLinking.enabled') === true;
    const bulkPaymentsEnabled =
      this.configService.get<boolean>('bulkPayments.enabled') === true;
    const billPayConfigured = Boolean(
      this.configService.get<string>('billPay.baseUrl'),
    );

    const appDependencies = { database, redis, blnk };
    const providerReadiness = {
      circle,
      stellar,
      yellowCard: yellowCardEnabled
        ? yellowCard
        : {
            ...yellowCard,
            status: 'skipped',
            available: false,
            reason: 'YELLOW_CARD_ENABLED=false',
          },
    };
    const features = {
      deposits: this.featureStatus(yellowCardEnabled, 'yellow_card'),
      externalWithdrawals: this.featureStatus(yellowCardEnabled, 'yellow_card'),
      cards: this.featureStatus(
        cardIssuingEnabled,
        this.configService.get<string>('cards.issuingProvider') || null,
      ),
      bankLinking: this.featureStatus(
        bankLinkingEnabled,
        this.configService.get<string>('bankLinking.provider') || null,
      ),
      billPayments: this.featureStatus(
        billPayConfigured,
        billPayConfigured ? 'bill-pay' : null,
      ),
      bulkPayments: this.featureStatus(bulkPaymentsEnabled, null),
    };

    const appReady = Object.values(appDependencies).every(
      (dependency) => dependency.status === 'up',
    );
    const providerDown = Object.values(providerReadiness).some(
      (provider) => provider.status === 'down',
    );

    return {
      status: appReady ? (providerDown ? 'degraded' : 'ready') : 'not_ready',
      checkedAt: new Date().toISOString(),
      app: {
        ready: appReady,
        dependencies: appDependencies,
      },
      providers: providerReadiness,
      features,
    };
  }

  @Get('exchange-rates')
  @ApiOperation({ summary: 'Get current exchange rates' })
  @ApiResponse({ status: 200, description: 'Exchange rates' })
  exchangeRates() {
    const updatedAt = new Date().toISOString();

    // Health exposes indicative fallback data only. Executable quotes must come
    // from wallet/rate or provider-backed quote endpoints with freshness rules.
    return {
      baseCurrency: 'USDC',
      quoteStatus: 'indicative_fallback',
      executable: false,
      validForExecution: false,
      live: false,
      stale: true,
      provider: null,
      source: 'static_fallback',
      reason: 'exchange_rate_provider_not_connected',
      rates: {
        XOF: {
          buy: 595.0,
          sell: 605.0,
          mid: 600.0,
          source: 'static_fallback',
          executable: false,
        },
        USD: {
          buy: 1.0,
          sell: 1.0,
          mid: 1.0,
          source: 'static_fallback',
          executable: false,
        },
        EUR: {
          buy: 0.92,
          sell: 0.94,
          mid: 0.93,
          source: 'static_fallback',
          executable: false,
        },
      },
      updatedAt,
      warning:
        'Indicative fallback rates only. Do not use this health endpoint for executable quotes.',
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

  private async checkDependency(
    name: string,
    check: () => Promise<Record<string, any>>,
  ): Promise<{
    name: string;
    status: 'up' | 'down';
    available: boolean;
    details?: Record<string, any>;
    error?: string;
    errorType?: string;
  }> {
    try {
      const result = await check();
      const details = result[name] ?? result;
      return {
        name,
        status: 'up',
        available: true,
        details,
      };
    } catch (error) {
      return {
        name,
        status: 'down',
        available: false,
        error: 'dependency_unavailable',
        errorType: error instanceof Error ? error.name : 'UnknownError',
      };
    }
  }

  private featureStatus(enabled: boolean, provider: string | null) {
    return {
      available: enabled,
      status: enabled ? 'available' : 'unavailable',
      provider,
      reason: enabled ? null : 'provider_or_feature_disabled',
    };
  }

  @Get('detailed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Detailed health check with all services (admin only)',
  })
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
      stellar: { status: 'unknown' },
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

    // Check Stellar
    try {
      const result = await this.stellarHealth.isHealthy('stellar');
      services.stellar = { status: 'up', ...result.stellar };
    } catch (error: any) {
      services.stellar = {
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
