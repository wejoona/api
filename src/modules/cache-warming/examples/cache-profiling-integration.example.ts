/**
 * Cache Profiling Integration Examples
 *
 * Demonstrates how to integrate cache warming with performance profiling
 * for comprehensive performance monitoring.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CacheProfiler } from '@/common/profilers/cache.profiler';
import { CacheWarmingService } from '../application/services/cache-warming.service';
import { CachePerformanceService } from '../application/services/cache-performance.service';

/**
 * Example 1: Enhanced Cache Service with Profiling
 */
@Injectable()
export class ProfiledCacheService {
  private readonly logger = new Logger(ProfiledCacheService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly cacheProfiler: CacheProfiler,
  ) {}

  /**
   * Get with profiling
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();

    try {
      const value = await this.cache.get<T>(key);
      const duration = performance.now() - startTime;

      if (value) {
        this.cacheProfiler.recordHit(key, duration);
      } else {
        this.cacheProfiler.recordMiss(key, duration);
      }

      return value || null;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.cacheProfiler.recordMiss(key, duration);
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set with profiling and size tracking
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const startTime = performance.now();

    try {
      // Calculate size (approximate)
      const size = JSON.stringify(value).length;

      await this.cache.set(key, value, ttl);
      const duration = performance.now() - startTime;

      this.cacheProfiler.recordSet(key, duration, size);

      // Warn on large values
      if (size > 100 * 1024) {
        // > 100KB
        this.logger.warn(
          `Large cache value (${(size / 1024).toFixed(2)}KB) for key: ${key}`,
        );
      }
    } catch (error) {
      const _duration = performance.now() - startTime;
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete with profiling
   */
  async delete(key: string): Promise<void> {
    const startTime = performance.now();

    try {
      await this.cache.del(key);
      const duration = performance.now() - startTime;
      this.cacheProfiler.recordDelete(key, duration);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }
}

/**
 * Example 2: Performance Monitoring Scheduler
 */
@Injectable()
export class CachePerformanceMonitor {
  private readonly logger = new Logger(CachePerformanceMonitor.name);

  constructor(
    private readonly cacheWarmingService: CacheWarmingService,
    private readonly cachePerformanceService: CachePerformanceService,
    private readonly cacheProfiler: CacheProfiler,
  ) {}

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(): Promise<void> {
    this.logger.log('Generating cache performance report...');

    // Get basic stats
    const stats = this.cacheProfiler.getStats();
    const recommendations = this.cacheProfiler.getRecommendations();
    const topKeys = this.cacheProfiler.getMostAccessedKeys(20);

    // Get warming stats
    const warmingStats = await this.cacheWarmingService.getCacheStats();

    // Get performance metrics
    const performanceMetrics =
      await this.cachePerformanceService.getPerformanceMetrics();
    const efficiencyScore =
      this.cachePerformanceService.getCacheEfficiencyScore();

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        hitRate: stats.overall.hitRate,
        totalOperations: stats.overall.totalOperations,
        avgDuration: stats.overall.avgDuration,
        efficiencyScore: efficiencyScore.score,
        grade: efficiencyScore.grade,
      },
      warmingStatus: {
        exchangeRates: warmingStats.exchangeRates,
        featureFlags: warmingStats.featureFlags,
        countries: warmingStats.countries,
        appConfig: warmingStats.appConfig,
      },
      topAccessedKeys: topKeys,
      recommendations: recommendations,
      performance: performanceMetrics.performance,
    };

    // Log report
    this.logger.log('Performance Report:', JSON.stringify(report, null, 2));

    // Alert on critical issues
    const criticalRecommendations = recommendations.filter(
      (r) => r.priority === 'high',
    );
    if (criticalRecommendations.length > 0) {
      this.logger.warn(
        `⚠️ ${criticalRecommendations.length} critical cache issues detected`,
      );
      criticalRecommendations.forEach((rec) => {
        this.logger.warn(`- ${rec.issue}: ${rec.recommendation}`);
      });
    }

    return;
  }

  /**
   * Check if cache warming is needed
   */
  async checkWarmingHealth(): Promise<{
    needsWarming: boolean;
    reason?: string;
  }> {
    const stats = await this.cacheWarmingService.getCacheStats();

    // Check if any critical cache is empty
    if (stats.exchangeRates === 0) {
      return { needsWarming: true, reason: 'Exchange rates cache is empty' };
    }

    if (stats.featureFlags === 0) {
      return { needsWarming: true, reason: 'Feature flags cache is empty' };
    }

    if (stats.countries === 0) {
      return { needsWarming: true, reason: 'Country config cache is empty' };
    }

    if (!stats.appConfig) {
      return { needsWarming: true, reason: 'App config cache is empty' };
    }

    // Check hit rate
    const profilerStats = this.cacheProfiler.getStats();
    if (
      profilerStats.overall.hitRate < 70 &&
      profilerStats.overall.totalOperations > 1000
    ) {
      return {
        needsWarming: true,
        reason: `Low hit rate: ${profilerStats.overall.hitRate.toFixed(1)}%`,
      };
    }

    return { needsWarming: false };
  }

  /**
   * Auto-remediation: warm cache if needed
   */
  async autoWarmIfNeeded(): Promise<void> {
    const healthCheck = await this.checkWarmingHealth();

    if (healthCheck.needsWarming) {
      this.logger.warn(`Auto-warming cache triggered: ${healthCheck.reason}`);
      await this.cacheWarmingService.warmAllCaches();
    }
  }
}

/**
 * Example 3: Real-time Cache Metrics Tracker
 */
@Injectable()
export class CacheMetricsTracker {
  private metrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    slowQueries: 0,
    errors: 0,
  };

  constructor(private readonly logger: Logger) {}

  /**
   * Track cache operation
   */
  trackOperation(
    operation: 'hit' | 'miss' | 'slow' | 'error',
    key: string,
    duration?: number,
  ): void {
    this.metrics.totalRequests++;

    switch (operation) {
      case 'hit':
        this.metrics.cacheHits++;
        break;
      case 'miss':
        this.metrics.cacheMisses++;
        break;
      case 'slow':
        this.metrics.slowQueries++;
        break;
      case 'error':
        this.metrics.errors++;
        break;
    }

    // Log slow queries
    if (operation === 'slow' && duration) {
      this.logger.warn(
        `Slow cache operation: ${key} (${duration.toFixed(2)}ms)`,
      );
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    const hitRate =
      this.metrics.totalRequests > 0
        ? (this.metrics.cacheHits / this.metrics.totalRequests) * 100
        : 0;

    return {
      ...this.metrics,
      hitRate: hitRate.toFixed(2),
    };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      slowQueries: 0,
      errors: 0,
    };
  }
}

/**
 * Example 4: Cache Warming Performance Benchmark
 */
export class CacheWarmingBenchmark {
  static async benchmark(cacheWarmingService: CacheWarmingService): Promise<{
    totalDuration: number;
    breakdown: Record<string, number>;
    throughput: number;
  }> {
    const results: Record<string, number> = {};

    // Benchmark exchange rates
    const exchangeStart = performance.now();
    await cacheWarmingService.warmExchangeRates();
    results.exchangeRates = performance.now() - exchangeStart;

    // Benchmark feature flags
    const flagsStart = performance.now();
    await cacheWarmingService.warmFeatureFlags();
    results.featureFlags = performance.now() - flagsStart;

    // Benchmark countries
    const countriesStart = performance.now();
    await cacheWarmingService.warmCountryConfigurations();
    results.countries = performance.now() - countriesStart;

    // Benchmark app config
    const configStart = performance.now();
    await cacheWarmingService.warmApplicationConfig();
    results.appConfig = performance.now() - configStart;

    const totalDuration = Object.values(results).reduce(
      (sum, val) => sum + val,
      0,
    );

    // Calculate throughput (items per second)
    const stats = await cacheWarmingService.getCacheStats();
    const totalItems =
      stats.exchangeRates + stats.featureFlags + stats.countries + 1; // +1 for app config
    const throughput = (totalItems / totalDuration) * 1000; // items per second

    return {
      totalDuration,
      breakdown: results,
      throughput,
    };
  }

  static logBenchmarkResults(results: {
    totalDuration: number;
    breakdown: Record<string, number>;
    throughput: number;
  }): void {
    console.log('\n=== Cache Warming Benchmark ===');
    console.log(`Total Duration: ${results.totalDuration.toFixed(2)}ms`);
    console.log(`Throughput: ${results.throughput.toFixed(2)} items/sec\n`);

    console.log('Breakdown:');
    for (const [category, duration] of Object.entries(results.breakdown)) {
      console.log(
        `  ${category}: ${duration.toFixed(2)}ms (${((duration / results.totalDuration) * 100).toFixed(1)}%)`,
      );
    }
    console.log('================================\n');
  }
}

/**
 * Example 5: Usage in Application Controller
 */
@Injectable()
export class ApplicationController {
  constructor(
    private readonly profiledCache: ProfiledCacheService,
    private readonly performanceMonitor: CachePerformanceMonitor,
  ) {}

  /**
   * Example: Get exchange rate with profiling
   */
  async getExchangeRate(from: string, to: string) {
    const cacheKey = `rate:${from}:${to}`;

    // Get from cache (automatically profiled)
    const cached = await this.profiledCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from API
    const rate = await this.fetchRateFromAPI(from, to);

    // Cache it (automatically profiled)
    await this.profiledCache.set(cacheKey, rate, 300 * 1000);

    return rate;
  }

  /**
   * Admin endpoint: Get performance report
   */
  async getPerformanceReport() {
    await this.performanceMonitor.generatePerformanceReport();
    return { status: 'Report generated' };
  }

  private async fetchRateFromAPI(from: string, to: string) {
    // Mock implementation
    return { from, to, rate: 600 };
  }
}

/**
 * Example Usage in Tests
 */
describe('Cache Warming Performance', () => {
  let cacheWarmingService: CacheWarmingService;

  beforeAll(async () => {
    // Setup test module
  });

  it('should benchmark cache warming performance', async () => {
    const results = await CacheWarmingBenchmark.benchmark(cacheWarmingService);

    // Assert performance requirements
    expect(results.totalDuration).toBeLessThan(5000); // < 5 seconds
    expect(results.throughput).toBeGreaterThan(10); // > 10 items/sec

    CacheWarmingBenchmark.logBenchmarkResults(results);
  });
});
