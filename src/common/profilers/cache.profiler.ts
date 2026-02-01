import { Injectable, Logger } from '@nestjs/common';
import { MetricsService } from '@/modules/metrics/metrics.service';

interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  totalDuration: number;
  avgDuration: number;
  lastAccessed: number;
}

@Injectable()
export class CacheProfiler {
  private readonly logger = new Logger('CacheProfiler');
  private readonly cacheMetrics = new Map<string, CacheMetrics>();
  private readonly slowCacheThreshold = 50; // 50ms

  constructor(private readonly metricsService?: MetricsService) {}

  /**
   * Record cache hit
   */
  recordHit(key: string, duration: number): void {
    this.updateMetrics(key, 'hit', duration);

    if (this.metricsService) {
      this.metricsService.recordCacheHit('get', this.normalizeCacheKey(key));
      this.metricsService.recordCacheOperation('get', duration);
    }

    if (duration > this.slowCacheThreshold) {
      this.logger.warn(
        JSON.stringify({
          type: 'slow_cache_hit',
          key: this.normalizeCacheKey(key),
          duration: `${duration}ms`,
          threshold: `${this.slowCacheThreshold}ms`,
          recommendation:
            'Cache retrieval is slow - check Redis connection or key size',
        }),
      );
    }
  }

  /**
   * Record cache miss
   */
  recordMiss(key: string, duration: number): void {
    this.updateMetrics(key, 'miss', duration);

    if (this.metricsService) {
      this.metricsService.recordCacheMiss('get', this.normalizeCacheKey(key));
      this.metricsService.recordCacheOperation('get', duration);
    }
  }

  /**
   * Record cache set operation
   */
  recordSet(key: string, duration: number, size?: number): void {
    this.updateMetrics(key, 'set', duration);

    if (this.metricsService) {
      this.metricsService.recordCacheOperation('set', duration);
    }

    if (duration > this.slowCacheThreshold) {
      this.logger.warn(
        JSON.stringify({
          type: 'slow_cache_set',
          key: this.normalizeCacheKey(key),
          duration: `${duration}ms`,
          size: size ? `${(size / 1024).toFixed(2)}KB` : 'unknown',
          threshold: `${this.slowCacheThreshold}ms`,
          recommendation:
            size && size > 100 * 1024
              ? 'Large cache value (>100KB) - consider storing reference instead'
              : 'Cache write is slow - check Redis connection',
        }),
      );
    }
  }

  /**
   * Record cache delete operation
   */
  recordDelete(key: string, duration: number): void {
    this.updateMetrics(key, 'delete', duration);

    if (this.metricsService) {
      this.metricsService.recordCacheOperation('delete', duration);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    overall: {
      totalHits: number;
      totalMisses: number;
      hitRate: number;
      totalOperations: number;
      avgDuration: number;
    };
    byKey: Array<{
      key: string;
      hits: number;
      misses: number;
      hitRate: number;
      avgDuration: number;
      lastAccessed: Date;
    }>;
  } {
    let totalHits = 0;
    let totalMisses = 0;
    let totalDuration = 0;
    let totalOperations = 0;

    const byKey: Array<{
      key: string;
      hits: number;
      misses: number;
      hitRate: number;
      avgDuration: number;
      lastAccessed: Date;
    }> = [];

    for (const [key, metrics] of this.cacheMetrics.entries()) {
      totalHits += metrics.hits;
      totalMisses += metrics.misses;
      totalDuration += metrics.totalDuration;
      totalOperations +=
        metrics.hits + metrics.misses + metrics.sets + metrics.deletes;

      const hitRate =
        metrics.hits + metrics.misses > 0
          ? (metrics.hits / (metrics.hits + metrics.misses)) * 100
          : 0;

      byKey.push({
        key,
        hits: metrics.hits,
        misses: metrics.misses,
        hitRate: Math.round(hitRate * 100) / 100,
        avgDuration: Math.round(metrics.avgDuration * 100) / 100,
        lastAccessed: new Date(metrics.lastAccessed),
      });
    }

    const hitRate =
      totalHits + totalMisses > 0
        ? (totalHits / (totalHits + totalMisses)) * 100
        : 0;

    const avgDuration =
      totalOperations > 0 ? totalDuration / totalOperations : 0;

    return {
      overall: {
        totalHits,
        totalMisses,
        hitRate: Math.round(hitRate * 100) / 100,
        totalOperations,
        avgDuration: Math.round(avgDuration * 100) / 100,
      },
      byKey: byKey.sort((a, b) => b.hits + b.misses - (a.hits + a.misses)),
    };
  }

  /**
   * Get cache efficiency recommendations
   */
  getRecommendations(): Array<{
    key: string;
    issue: string;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
  }> {
    const recommendations: Array<{
      key: string;
      issue: string;
      recommendation: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    for (const [key, metrics] of this.cacheMetrics.entries()) {
      const totalAccess = metrics.hits + metrics.misses;
      const hitRate = totalAccess > 0 ? (metrics.hits / totalAccess) * 100 : 0;

      // Low hit rate
      if (totalAccess > 100 && hitRate < 50) {
        recommendations.push({
          key,
          issue: `Low cache hit rate: ${hitRate.toFixed(1)}%`,
          recommendation: 'Review cache invalidation strategy or increase TTL',
          priority: 'high',
        });
      }

      // High miss rate with frequent access
      if (totalAccess > 50 && metrics.misses > metrics.hits * 2) {
        recommendations.push({
          key,
          issue: 'More misses than hits',
          recommendation:
            'Consider pre-warming cache or reviewing cache key strategy',
          priority: 'medium',
        });
      }

      // Slow cache operations
      if (metrics.avgDuration > this.slowCacheThreshold) {
        recommendations.push({
          key,
          issue: `Slow cache operations: ${metrics.avgDuration.toFixed(1)}ms avg`,
          recommendation: 'Check Redis performance or reduce cached data size',
          priority: 'high',
        });
      }

      // Rarely accessed cache
      if (totalAccess < 10 && metrics.sets > 5) {
        recommendations.push({
          key,
          issue: 'Cache set but rarely accessed',
          recommendation: 'Consider removing this cache to save memory',
          priority: 'low',
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Reset cache profiler statistics
   */
  reset(): void {
    this.cacheMetrics.clear();
  }

  /**
   * Get most accessed cache keys
   */
  getMostAccessedKeys(limit = 10): Array<{
    key: string;
    totalAccess: number;
    hitRate: number;
  }> {
    const keyStats: Array<{
      key: string;
      totalAccess: number;
      hitRate: number;
    }> = [];

    for (const [key, metrics] of this.cacheMetrics.entries()) {
      const totalAccess = metrics.hits + metrics.misses;
      const hitRate = totalAccess > 0 ? (metrics.hits / totalAccess) * 100 : 0;

      keyStats.push({
        key,
        totalAccess,
        hitRate: Math.round(hitRate * 100) / 100,
      });
    }

    return keyStats
      .sort((a, b) => b.totalAccess - a.totalAccess)
      .slice(0, limit);
  }

  private updateMetrics(
    key: string,
    operation: 'hit' | 'miss' | 'set' | 'delete',
    duration: number,
  ): void {
    const normalizedKey = this.normalizeCacheKey(key);

    if (!this.cacheMetrics.has(normalizedKey)) {
      this.cacheMetrics.set(normalizedKey, {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        totalDuration: 0,
        avgDuration: 0,
        lastAccessed: Date.now(),
      });
    }

    const metrics = this.cacheMetrics.get(normalizedKey)!;

    switch (operation) {
      case 'hit':
        metrics.hits++;
        break;
      case 'miss':
        metrics.misses++;
        break;
      case 'set':
        metrics.sets++;
        break;
      case 'delete':
        metrics.deletes++;
        break;
    }

    metrics.totalDuration += duration;
    const totalOps =
      metrics.hits + metrics.misses + metrics.sets + metrics.deletes;
    metrics.avgDuration = metrics.totalDuration / totalOps;
    metrics.lastAccessed = Date.now();

    // Keep only last 500 keys
    if (this.cacheMetrics.size > 500) {
      const oldestKey = Array.from(this.cacheMetrics.entries()).sort(
        (a, b) => a[1].lastAccessed - b[1].lastAccessed,
      )[0][0];
      this.cacheMetrics.delete(oldestKey);
    }
  }

  private normalizeCacheKey(key: string): string {
    // Replace UUIDs and other dynamic parts with placeholders
    return key
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        ':id',
      )
      .replace(/:\d+/g, ':id')
      .replace(/[a-f0-9]{24}/g, ':id'); // MongoDB ObjectId
  }
}
