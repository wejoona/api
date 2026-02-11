import {
  Controller,
  Get,
  Post,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CacheWarmingService } from '../services/cache-warming.service';
import {
  CacheWarmingStatusDto,
  CacheStatsDto,
  CacheWarmingResultDto,
} from '../dtos/cache-warming.dto';

/**
 * Cache Warming Controller
 *
 * Admin endpoints for managing cache warming operations.
 * Requires authentication and admin role.
 */
import { ApiTags } from '@nestjs/swagger';
@ApiTags('Cache Warming')
@Controller('admin/cache')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class CacheWarmingController {
  constructor(private readonly cacheWarmingService: CacheWarmingService) {}

  /**
   * GET /admin/cache/status
   * Get current cache warming status
   */
  @Get('status')
  async getStatus(): Promise<CacheWarmingStatusDto> {
    const stats = await this.cacheWarmingService.getCacheStats();

    return {
      isWarming: this.cacheWarmingService['isWarming'],
      lastWarmed: this.cacheWarmingService['_lastWarmTime'] || null,
      stats: {
        exchangeRates: stats.exchangeRates,
        featureFlags: stats.featureFlags,
        countries: stats.countries,
        appConfigCached: stats.appConfig,
        totalCachedKeys: stats.totalKeys,
      },
      health: {
        exchangeRates: stats.exchangeRates > 0 ? 'healthy' : 'missing',
        featureFlags: stats.featureFlags > 0 ? 'healthy' : 'missing',
        countries: stats.countries > 0 ? 'healthy' : 'missing',
        appConfig: stats.appConfig ? 'healthy' : 'missing',
      },
    };
  }

  /**
   * GET /admin/cache/stats
   * Get detailed cache statistics
   */
  @Get('stats')
  async getStats(): Promise<CacheStatsDto> {
    const stats = await this.cacheWarmingService.getCacheStats();

    return {
      timestamp: new Date().toISOString(),
      totalKeys: stats.totalKeys,
      breakdown: {
        exchangeRates: {
          count: stats.exchangeRates,
          status: stats.exchangeRates > 0 ? 'active' : 'empty',
          ttl: 300, // 5 minutes
        },
        featureFlags: {
          count: stats.featureFlags,
          status: stats.featureFlags > 0 ? 'active' : 'empty',
          ttl: 300, // 5 minutes
        },
        countries: {
          count: stats.countries,
          status: stats.countries > 0 ? 'active' : 'empty',
          ttl: 3600, // 1 hour
        },
        appConfig: {
          cached: stats.appConfig,
          status: stats.appConfig ? 'active' : 'empty',
          ttl: 3600, // 1 hour
        },
      },
      scheduledWarmingEnabled: true,
      nextScheduledWarm: this.getNextScheduledWarm(),
    };
  }

  /**
   * POST /admin/cache/warm
   * Trigger cache warming manually
   */
  @Post('warm')
  @HttpCode(HttpStatus.OK)
  async warmCache(): Promise<CacheWarmingResultDto> {
    const startTime = Date.now();

    try {
      await this.cacheWarmingService.warmAllCaches();
      const duration = Date.now() - startTime;

      return {
        success: true,
        message: 'Cache warming completed successfully',
        duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: `Cache warming failed: ${error.message}`,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * POST /admin/cache/warm/exchange-rates
   * Warm only exchange rates cache
   */
  @Post('warm/exchange-rates')
  @HttpCode(HttpStatus.OK)
  async warmExchangeRates(): Promise<CacheWarmingResultDto> {
    const startTime = Date.now();

    try {
      await this.cacheWarmingService.warmExchangeRates();
      const duration = Date.now() - startTime;

      return {
        success: true,
        message: 'Exchange rates cache warmed successfully',
        duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: `Exchange rates warming failed: ${error.message}`,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * POST /admin/cache/warm/feature-flags
   * Warm only feature flags cache
   */
  @Post('warm/feature-flags')
  @HttpCode(HttpStatus.OK)
  async warmFeatureFlags(): Promise<CacheWarmingResultDto> {
    const startTime = Date.now();

    try {
      await this.cacheWarmingService.warmFeatureFlags();
      const duration = Date.now() - startTime;

      return {
        success: true,
        message: 'Feature flags cache warmed successfully',
        duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: `Feature flags warming failed: ${error.message}`,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * POST /admin/cache/warm/countries
   * Warm only country configurations cache
   */
  @Post('warm/countries')
  @HttpCode(HttpStatus.OK)
  async warmCountries(): Promise<CacheWarmingResultDto> {
    const startTime = Date.now();

    try {
      await this.cacheWarmingService.warmCountryConfigurations();
      const duration = Date.now() - startTime;

      return {
        success: true,
        message: 'Country configurations cache warmed successfully',
        duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: `Country configurations warming failed: ${error.message}`,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * POST /admin/cache/warm/app-config
   * Warm only application config cache
   */
  @Post('warm/app-config')
  @HttpCode(HttpStatus.OK)
  async warmAppConfig(): Promise<CacheWarmingResultDto> {
    const startTime = Date.now();

    try {
      await this.cacheWarmingService.warmApplicationConfig();
      const duration = Date.now() - startTime;

      return {
        success: true,
        message: 'Application config cache warmed successfully',
        duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: `Application config warming failed: ${error.message}`,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * DELETE /admin/cache/clear
   * Clear all warmed caches (use with caution)
   */
  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  async clearCache(): Promise<CacheWarmingResultDto> {
    const startTime = Date.now();

    try {
      await this.cacheWarmingService.clearAllCaches();
      const duration = Date.now() - startTime;

      return {
        success: true,
        message: 'All caches cleared successfully',
        duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: `Cache clearing failed: ${error.message}`,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Calculate next scheduled warm time (every 5 minutes)
   */
  private getNextScheduledWarm(): string {
    const now = new Date();
    const nextMinute = Math.ceil(now.getMinutes() / 5) * 5;
    const nextWarm = new Date(now);
    nextWarm.setMinutes(nextMinute, 0, 0);

    if (nextWarm <= now) {
      nextWarm.setMinutes(nextWarm.getMinutes() + 5);
    }

    return nextWarm.toISOString();
  }
}
