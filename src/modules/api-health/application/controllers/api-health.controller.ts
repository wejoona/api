import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { ApiHealthMetricsService } from '../services/api-health-metrics.service';
import {
  ApiProvider,
  ApiHealthStatus,
} from '../../domain/entities/api-health-metric.entity';
import {
  ApiHealthResponseDto,
  ApiHealthSummaryDto,
} from '../dto/api-health-response.dto';

@Controller('api-health')
export class ApiHealthController {
  constructor(
    private readonly apiHealthMetricsService: ApiHealthMetricsService,
  ) {}

  /**
   * Get health status for all APIs
   * Public endpoint for monitoring tools
   */
  @Get()
  async getHealthStatus(): Promise<ApiHealthSummaryDto> {
    const health = await this.apiHealthMetricsService.getCurrentHealth();

    const providers: ApiHealthResponseDto[] = Object.values(health).map(
      (h: any) => ({
        provider: h.provider,
        endpoint: h.endpoint,
        status: this.determineStatus(h.available, h.latencyMs),
        available: h.available,
        latencyMs: h.latencyMs,
        statusCode: h.statusCode,
        errorMessage: h.errorMessage,
        metadata: h.metadata,
        timestamp: new Date(),
      }),
    );

    const overall = this.determineOverallStatus(providers);

    return {
      overall,
      providers,
      checkedAt: new Date(),
    };
  }

  /**
   * Get health status for a specific provider
   */
  @Get(':provider')
  async getProviderHealth(
    @Param('provider') provider: string,
  ): Promise<ApiHealthResponseDto> {
    const providerEnum = provider.toUpperCase() as ApiProvider;

    if (!Object.values(ApiProvider).includes(providerEnum)) {
      throw new Error(`Invalid provider: ${provider}`);
    }

    await this.apiHealthMetricsService.checkProviderHealth(providerEnum);

    const health = await this.apiHealthMetricsService.getCurrentHealth();
    const providerHealth = health[providerEnum];

    if (!providerHealth) {
      throw new Error(`Provider health data not found: ${provider}`);
    }

    return {
      provider: providerHealth.provider,
      endpoint: providerHealth.endpoint,
      status: this.determineStatus(
        providerHealth.available,
        providerHealth.latencyMs,
      ),
      available: providerHealth.available,
      latencyMs: providerHealth.latencyMs,
      statusCode: (providerHealth as any).statusCode,
      errorMessage: (providerHealth as any).errorMessage,
      metadata: (providerHealth as any).metadata,
      timestamp: new Date(),
    };
  }

  /**
   * Manually trigger health checks for all providers
   * Requires authentication
   */
  @Post('check')
  @UseGuards(JwtAuthGuard)
  async triggerHealthCheck(): Promise<{ message: string; timestamp: Date }> {
    await this.apiHealthMetricsService.collectAllMetrics();

    return {
      message: 'Health checks triggered successfully',
      timestamp: new Date(),
    };
  }

  /**
   * Manually trigger health check for a specific provider
   * Requires authentication
   */
  @Post('check/:provider')
  @UseGuards(JwtAuthGuard)
  async triggerProviderHealthCheck(
    @Param('provider') provider: string,
  ): Promise<{ message: string; provider: string; timestamp: Date }> {
    const providerEnum = provider.toUpperCase() as ApiProvider;

    if (!Object.values(ApiProvider).includes(providerEnum)) {
      throw new Error(`Invalid provider: ${provider}`);
    }

    await this.apiHealthMetricsService.checkProviderHealth(providerEnum);

    return {
      message: 'Health check triggered successfully',
      provider: providerEnum,
      timestamp: new Date(),
    };
  }

  /**
   * Determine health status based on availability and latency
   */
  private determineStatus(
    available: boolean,
    latencyMs: number,
  ): ApiHealthStatus {
    if (!available) {
      return ApiHealthStatus.DOWN;
    }

    if (latencyMs > 2000) {
      return ApiHealthStatus.DEGRADED;
    }

    return ApiHealthStatus.HEALTHY;
  }

  /**
   * Determine overall health status
   */
  private determineOverallStatus(
    providers: ApiHealthResponseDto[],
  ): 'healthy' | 'degraded' | 'down' {
    const hasDown = providers.some((p) => p.status === ApiHealthStatus.DOWN);
    const hasDegraded = providers.some(
      (p) => p.status === ApiHealthStatus.DEGRADED,
    );

    if (hasDown) {
      return 'down';
    }

    if (hasDegraded) {
      return 'degraded';
    }

    return 'healthy';
  }
}
