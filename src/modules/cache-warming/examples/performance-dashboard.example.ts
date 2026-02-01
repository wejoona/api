/**
 * Cache Performance Dashboard Example
 *
 * Comprehensive performance monitoring dashboard that combines
 * cache warming metrics with profiling data for full observability.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheWarmingService } from '../application/services/cache-warming.service';
import { CachePerformanceService } from '../application/services/cache-performance.service';
import { CacheProfiler } from '@/common/profilers/cache.profiler';

/**
 * Performance Dashboard Service
 * Aggregates all cache-related metrics for monitoring
 */
@Injectable()
export class CachePerformanceDashboard {
  private readonly logger = new Logger(CachePerformanceDashboard.name);

  constructor(
    private readonly cacheWarmingService: CacheWarmingService,
    private readonly cachePerformanceService: CachePerformanceService,
    private readonly cacheProfiler: CacheProfiler,
  ) {}

  /**
   * Get complete dashboard data
   */
  async getDashboard(): Promise<CacheDashboardData> {
    const [warmingStats, profilerStats, _performanceMetrics, efficiencyScore] =
      await Promise.all([
        this.cacheWarmingService.getCacheStats(),
        Promise.resolve(this.cacheProfiler.getStats()),
        this.cachePerformanceService.getPerformanceMetrics(),
        Promise.resolve(this.cachePerformanceService.getCacheEfficiencyScore()),
      ]);

    const recommendations = this.cacheProfiler.getRecommendations();
    const topKeys = this.cacheProfiler.getMostAccessedKeys(10);
    const warmingRecommendations =
      await this.cachePerformanceService.getWarmingRecommendations();

    return {
      timestamp: new Date().toISOString(),
      overview: {
        status: this.determineOverallStatus(
          profilerStats.overall.hitRate,
          warmingStats,
        ),
        efficiencyScore: efficiencyScore.score,
        grade: efficiencyScore.grade,
        totalCacheKeys: warmingStats.totalKeys,
        cacheHitRate: profilerStats.overall.hitRate,
        averageResponseTime: profilerStats.overall.avgDuration,
      },
      warming: {
        status: {
          exchangeRates: warmingStats.exchangeRates > 0 ? 'active' : 'empty',
          featureFlags: warmingStats.featureFlags > 0 ? 'active' : 'empty',
          countries: warmingStats.countries > 0 ? 'active' : 'empty',
          appConfig: warmingStats.appConfig ? 'active' : 'empty',
        },
        counts: {
          exchangeRates: warmingStats.exchangeRates,
          featureFlags: warmingStats.featureFlags,
          countries: warmingStats.countries,
        },
      },
      performance: {
        hits: profilerStats.overall.totalHits,
        misses: profilerStats.overall.totalMisses,
        hitRate: profilerStats.overall.hitRate,
        averageDuration: profilerStats.overall.avgDuration,
        totalOperations: profilerStats.overall.totalOperations,
        grade: this.getPerformanceGrade(profilerStats.overall.hitRate),
      },
      topKeys: topKeys.map((key) => ({
        key: key.key,
        totalAccess: key.totalAccess,
        hitRate: key.hitRate,
        recommendation: this.getKeyRecommendation(key.hitRate, key.totalAccess),
      })),
      recommendations: {
        critical: recommendations.filter((r) => r.priority === 'high'),
        medium: recommendations.filter((r) => r.priority === 'medium'),
        low: recommendations.filter((r) => r.priority === 'low'),
        warming: warmingRecommendations,
      },
      trends: {
        performanceTrend: this.analyzePerformanceTrend(profilerStats),
        warmingHealth: this.analyzeWarmingHealth(warmingStats),
      },
    };
  }

  /**
   * Generate text-based dashboard for console logging
   */
  async generateConsoleReport(): Promise<void> {
    const dashboard = await this.getDashboard();

    console.log('\n' + '='.repeat(80));
    console.log('🔥 CACHE PERFORMANCE DASHBOARD'.padStart(50));
    console.log('='.repeat(80) + '\n');

    // Overview
    console.log('📊 OVERVIEW');
    console.log('-'.repeat(80));
    console.log(
      `Status: ${this.getStatusEmoji(dashboard.overview.status)} ${dashboard.overview.status.toUpperCase()}`,
    );
    console.log(
      `Efficiency: ${dashboard.overview.efficiencyScore}/100 (Grade: ${dashboard.overview.grade})`,
    );
    console.log(
      `Cache Hit Rate: ${dashboard.overview.cacheHitRate.toFixed(2)}%`,
    );
    console.log(
      `Avg Response Time: ${dashboard.overview.averageResponseTime.toFixed(2)}ms`,
    );
    console.log(`Total Cache Keys: ${dashboard.overview.totalCacheKeys}\n`);

    // Cache Warming Status
    console.log('🔥 CACHE WARMING STATUS');
    console.log('-'.repeat(80));
    console.log(
      `Exchange Rates: ${this.getStatusEmoji(dashboard.warming.status.exchangeRates)} ${dashboard.warming.counts.exchangeRates} pairs`,
    );
    console.log(
      `Feature Flags: ${this.getStatusEmoji(dashboard.warming.status.featureFlags)} ${dashboard.warming.counts.featureFlags} flags`,
    );
    console.log(
      `Countries: ${this.getStatusEmoji(dashboard.warming.status.countries)} ${dashboard.warming.counts.countries} countries`,
    );
    console.log(
      `App Config: ${this.getStatusEmoji(dashboard.warming.status.appConfig)} ${dashboard.warming.status.appConfig}\n`,
    );

    // Performance Metrics
    console.log('⚡ PERFORMANCE METRICS');
    console.log('-'.repeat(80));
    console.log(`Total Operations: ${dashboard.performance.totalOperations}`);
    console.log(`Cache Hits: ${dashboard.performance.hits}`);
    console.log(`Cache Misses: ${dashboard.performance.misses}`);
    console.log(
      `Hit Rate: ${dashboard.performance.hitRate.toFixed(2)}% (${dashboard.performance.grade})`,
    );
    console.log(
      `Avg Duration: ${dashboard.performance.averageDuration.toFixed(2)}ms\n`,
    );

    // Top Keys
    if (dashboard.topKeys.length > 0) {
      console.log('🔑 TOP ACCESSED KEYS');
      console.log('-'.repeat(80));
      dashboard.topKeys.slice(0, 5).forEach((key, index) => {
        console.log(
          `${index + 1}. ${key.key.padEnd(40)} | ${key.totalAccess} hits | ${key.hitRate.toFixed(1)}% hit rate`,
        );
      });
      console.log();
    }

    // Critical Recommendations
    if (dashboard.recommendations.critical.length > 0) {
      console.log('⚠️  CRITICAL RECOMMENDATIONS');
      console.log('-'.repeat(80));
      dashboard.recommendations.critical.forEach((rec) => {
        console.log(`❌ ${rec.issue}`);
        console.log(`   → ${rec.recommendation}\n`);
      });
    }

    // Medium Priority Recommendations
    if (dashboard.recommendations.medium.length > 0) {
      console.log('📋 MEDIUM PRIORITY RECOMMENDATIONS');
      console.log('-'.repeat(80));
      dashboard.recommendations.medium.slice(0, 3).forEach((rec) => {
        console.log(`⚠️  ${rec.issue}`);
        console.log(`   → ${rec.recommendation}\n`);
      });
    }

    // Trends
    console.log('📈 TRENDS & INSIGHTS');
    console.log('-'.repeat(80));
    console.log(`Performance: ${dashboard.trends.performanceTrend.assessment}`);
    console.log(`Warming Health: ${dashboard.trends.warmingHealth.assessment}`);

    console.log('\n' + '='.repeat(80));
    console.log(
      `Generated at: ${new Date(dashboard.timestamp).toLocaleString()}`,
    );
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Scheduled performance report (daily at 9 AM)
   */
  @Cron('0 9 * * *')
  async generateDailyReport(): Promise<void> {
    this.logger.log('📊 Generating daily cache performance report...');
    await this.generateConsoleReport();
  }

  /**
   * Real-time health check (every 5 minutes)
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async healthCheck(): Promise<void> {
    const dashboard = await this.getDashboard();

    // Alert on critical issues
    if (dashboard.overview.status === 'critical') {
      this.logger.error(
        '🚨 CRITICAL: Cache performance degraded - immediate action required!',
      );
      this.logger.error(
        `Hit Rate: ${dashboard.overview.cacheHitRate.toFixed(2)}% | ` +
          `Response Time: ${dashboard.overview.averageResponseTime.toFixed(2)}ms`,
      );
    } else if (dashboard.overview.status === 'warning') {
      this.logger.warn('⚠️ WARNING: Cache performance suboptimal');
    }

    // Alert on warming issues
    if (dashboard.trends.warmingHealth.status === 'unhealthy') {
      this.logger.error('🚨 Cache warming unhealthy - triggering manual warm');
      await this.cacheWarmingService.warmAllCaches();
    }
  }

  /**
   * Export dashboard data for external monitoring systems
   */
  async exportMetrics(): Promise<PrometheusMetrics> {
    const dashboard = await this.getDashboard();

    return {
      cache_hit_rate: dashboard.overview.cacheHitRate,
      cache_efficiency_score: dashboard.overview.efficiencyScore,
      cache_avg_response_time_ms: dashboard.overview.averageResponseTime,
      cache_total_keys: dashboard.overview.totalCacheKeys,
      cache_total_operations: dashboard.performance.totalOperations,
      cache_warming_exchange_rates: dashboard.warming.counts.exchangeRates,
      cache_warming_feature_flags: dashboard.warming.counts.featureFlags,
      cache_warming_countries: dashboard.warming.counts.countries,
    };
  }

  // Helper methods
  private determineOverallStatus(
    hitRate: number,
    warmingStats: any,
  ): 'healthy' | 'warning' | 'critical' {
    // Critical if any cache is empty
    if (
      warmingStats.exchangeRates === 0 ||
      warmingStats.featureFlags === 0 ||
      warmingStats.countries === 0 ||
      !warmingStats.appConfig
    ) {
      return 'critical';
    }

    // Critical if hit rate is very low
    if (hitRate < 50) {
      return 'critical';
    }

    // Warning if hit rate is suboptimal
    if (hitRate < 80) {
      return 'warning';
    }

    return 'healthy';
  }

  private getPerformanceGrade(hitRate: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (hitRate >= 95) return 'A';
    if (hitRate >= 85) return 'B';
    if (hitRate >= 75) return 'C';
    if (hitRate >= 60) return 'D';
    return 'F';
  }

  private getKeyRecommendation(hitRate: number, totalAccess: number): string {
    if (hitRate < 50 && totalAccess > 100) {
      return 'Low hit rate - consider increasing TTL or pre-warming';
    }
    if (hitRate > 95) {
      return 'Excellent - well cached';
    }
    if (hitRate > 80) {
      return 'Good - working as expected';
    }
    return 'Review caching strategy';
  }

  private analyzePerformanceTrend(stats: any): {
    status: 'improving' | 'stable' | 'degrading';
    assessment: string;
  } {
    const hitRate = stats.overall.hitRate;
    const avgDuration = stats.overall.avgDuration;

    if (hitRate >= 90 && avgDuration < 30) {
      return {
        status: 'improving',
        assessment: 'Excellent performance - cache working optimally',
      };
    }

    if (hitRate >= 70 && avgDuration < 100) {
      return {
        status: 'stable',
        assessment: 'Stable performance - minor optimizations possible',
      };
    }

    return {
      status: 'degrading',
      assessment: 'Performance degrading - review cache strategy',
    };
  }

  private analyzeWarmingHealth(warmingStats: any): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    assessment: string;
  } {
    const healthyCount = [
      warmingStats.exchangeRates > 0,
      warmingStats.featureFlags > 0,
      warmingStats.countries > 0,
      warmingStats.appConfig === true,
    ].filter(Boolean).length;

    if (healthyCount === 4) {
      return {
        status: 'healthy',
        assessment: 'All caches warmed successfully',
      };
    }

    if (healthyCount >= 2) {
      return {
        status: 'degraded',
        assessment: `${4 - healthyCount} cache category(ies) need warming`,
      };
    }

    return {
      status: 'unhealthy',
      assessment: 'Critical: Multiple cache categories empty',
    };
  }

  private getStatusEmoji(status: string): string {
    const emojiMap: Record<string, string> = {
      healthy: '✅',
      active: '✅',
      warning: '⚠️',
      degraded: '⚠️',
      critical: '❌',
      empty: '❌',
      unhealthy: '❌',
    };
    return emojiMap[status] || '❓';
  }
}

// Type definitions
interface CacheDashboardData {
  timestamp: string;
  overview: {
    status: 'healthy' | 'warning' | 'critical';
    efficiencyScore: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    totalCacheKeys: number;
    cacheHitRate: number;
    averageResponseTime: number;
  };
  warming: {
    status: {
      exchangeRates: string;
      featureFlags: string;
      countries: string;
      appConfig: string;
    };
    counts: {
      exchangeRates: number;
      featureFlags: number;
      countries: number;
    };
  };
  performance: {
    hits: number;
    misses: number;
    hitRate: number;
    averageDuration: number;
    totalOperations: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
  };
  topKeys: Array<{
    key: string;
    totalAccess: number;
    hitRate: number;
    recommendation: string;
  }>;
  recommendations: {
    critical: any[];
    medium: any[];
    low: any[];
    warming: any[];
  };
  trends: {
    performanceTrend: {
      status: 'improving' | 'stable' | 'degrading';
      assessment: string;
    };
    warmingHealth: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      assessment: string;
    };
  };
}

interface PrometheusMetrics {
  cache_hit_rate: number;
  cache_efficiency_score: number;
  cache_avg_response_time_ms: number;
  cache_total_keys: number;
  cache_total_operations: number;
  cache_warming_exchange_rates: number;
  cache_warming_feature_flags: number;
  cache_warming_countries: number;
}

/**
 * Example: Dashboard Controller
 */
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';

@Controller('admin/cache/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class CacheDashboardController {
  constructor(private readonly dashboard: CachePerformanceDashboard) {}

  @Get()
  async getDashboard() {
    return this.dashboard.getDashboard();
  }

  @Get('metrics')
  async getMetrics() {
    return this.dashboard.exportMetrics();
  }

  @Get('report')
  async generateReport() {
    await this.dashboard.generateConsoleReport();
    return { message: 'Report generated - check server logs' };
  }
}

/**
 * Example Console Output:
 *
 * ================================================================================
 *                         🔥 CACHE PERFORMANCE DASHBOARD
 * ================================================================================
 *
 * 📊 OVERVIEW
 * --------------------------------------------------------------------------------
 * Status: ✅ HEALTHY
 * Efficiency: 92/100 (Grade: A)
 * Cache Hit Rate: 94.50%
 * Avg Response Time: 28.30ms
 * Total Cache Keys: 35
 *
 * 🔥 CACHE WARMING STATUS
 * --------------------------------------------------------------------------------
 * Exchange Rates: ✅ 6 pairs
 * Feature Flags: ✅ 15 flags
 * Countries: ✅ 8 countries
 * App Config: ✅ active
 *
 * ⚡ PERFORMANCE METRICS
 * --------------------------------------------------------------------------------
 * Total Operations: 15,432
 * Cache Hits: 14,583
 * Cache Misses: 849
 * Hit Rate: 94.50% (A)
 * Avg Duration: 28.30ms
 *
 * 🔑 TOP ACCESSED KEYS
 * --------------------------------------------------------------------------------
 * 1. rate:XOF:USD                          | 3,245 hits | 98.5% hit rate
 * 2. feature_flag:mobile_money_enabled     | 2,890 hits | 95.2% hit rate
 * 3. country:CI                            | 2,156 hits | 99.1% hit rate
 * 4. app:config:limits                     | 1,987 hits | 97.8% hit rate
 * 5. rate:USD:XOF                          | 1,654 hits | 96.3% hit rate
 *
 * 📈 TRENDS & INSIGHTS
 * --------------------------------------------------------------------------------
 * Performance: Excellent performance - cache working optimally
 * Warming Health: All caches warmed successfully
 *
 * ================================================================================
 * Generated at: 1/30/2026, 10:30:00 AM
 * ================================================================================
 */
