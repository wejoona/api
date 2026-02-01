import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { CacheWarmingService } from '../../application/services/cache-warming.service';

/**
 * Cache Warming Health Indicator
 *
 * Monitors the health of the cache warming system.
 * Checks if critical caches are populated and fresh.
 */
@Injectable()
export class CacheWarmingHealthIndicator extends HealthIndicator {
  constructor(private readonly cacheWarmingService: CacheWarmingService) {
    super();
  }

  /**
   * Check cache warming health
   * Returns healthy if critical caches are populated
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const stats = await this.cacheWarmingService.getCacheStats();

      const isHealthy =
        stats.exchangeRates > 0 &&
        stats.featureFlags > 0 &&
        stats.countries > 0 &&
        stats.appConfig === true;

      const result = this.getStatus(key, isHealthy, {
        exchangeRates: stats.exchangeRates,
        featureFlags: stats.featureFlags,
        countries: stats.countries,
        appConfig: stats.appConfig,
        totalKeys: stats.totalKeys,
      });

      if (isHealthy) {
        return result;
      }

      throw new HealthCheckError(
        'Cache warming check failed',
        this.getStatus(key, false, {
          message: 'One or more critical caches are empty',
          details: {
            exchangeRates: stats.exchangeRates === 0 ? 'empty' : 'ok',
            featureFlags: stats.featureFlags === 0 ? 'empty' : 'ok',
            countries: stats.countries === 0 ? 'empty' : 'ok',
            appConfig: stats.appConfig === false ? 'empty' : 'ok',
          },
        }),
      );
    } catch (error) {
      throw new HealthCheckError(
        'Cache warming health check failed',
        this.getStatus(key, false, {
          error: error.message,
        }),
      );
    }
  }

  /**
   * Get detailed cache health status
   * Provides granular health information per cache category
   */
  async getDetailedHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      exchangeRates: {
        status: 'healthy' | 'missing';
        count: number;
      };
      featureFlags: {
        status: 'healthy' | 'missing';
        count: number;
      };
      countries: {
        status: 'healthy' | 'missing';
        count: number;
      };
      appConfig: {
        status: 'healthy' | 'missing';
        cached: boolean;
      };
    };
    recommendations: string[];
  }> {
    const stats = await this.cacheWarmingService.getCacheStats();

    const recommendations: string[] = [];

    // Check each cache category
    const exchangeRatesHealthy = stats.exchangeRates > 0;
    const featureFlagsHealthy = stats.featureFlags > 0;
    const countriesHealthy = stats.countries > 0;
    const appConfigHealthy = stats.appConfig === true;

    if (!exchangeRatesHealthy) {
      recommendations.push(
        'Exchange rates cache is empty - trigger manual warming or check Yellow Card API',
      );
    }

    if (!featureFlagsHealthy) {
      recommendations.push(
        'Feature flags cache is empty - trigger manual warming or check database',
      );
    }

    if (!countriesHealthy) {
      recommendations.push(
        'Country configurations cache is empty - check application configuration',
      );
    }

    if (!appConfigHealthy) {
      recommendations.push(
        'Application config cache is empty - trigger manual warming',
      );
    }

    // Determine overall status
    const healthyCount = [
      exchangeRatesHealthy,
      featureFlagsHealthy,
      countriesHealthy,
      appConfigHealthy,
    ].filter(Boolean).length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === 4) {
      status = 'healthy';
    } else if (healthyCount >= 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      details: {
        exchangeRates: {
          status: exchangeRatesHealthy ? 'healthy' : 'missing',
          count: stats.exchangeRates,
        },
        featureFlags: {
          status: featureFlagsHealthy ? 'healthy' : 'missing',
          count: stats.featureFlags,
        },
        countries: {
          status: countriesHealthy ? 'healthy' : 'missing',
          count: stats.countries,
        },
        appConfig: {
          status: appConfigHealthy ? 'healthy' : 'missing',
          cached: stats.appConfig,
        },
      },
      recommendations,
    };
  }
}
