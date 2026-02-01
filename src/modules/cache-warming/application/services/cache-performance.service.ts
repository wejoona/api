import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CacheProfiler } from '@/common/profilers/cache.profiler';

/**
 * Cache Performance Service
 *
 * Analyzes cache performance and provides optimization recommendations.
 * Works in conjunction with CacheProfiler to track cache metrics.
 */
@Injectable()
export class CachePerformanceService {
  private readonly logger = new Logger(CachePerformanceService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly cacheProfiler: CacheProfiler,
  ) {}

  /**
   * Get comprehensive cache performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    timestamp: string;
    stats: {
      totalHits: number;
      totalMisses: number;
      hitRate: number;
      totalOperations: number;
      avgDuration: number;
    };
    topKeys: Array<{
      key: string;
      totalAccess: number;
      hitRate: number;
    }>;
    recommendations: Array<{
      key: string;
      issue: string;
      recommendation: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    performance: {
      overall: 'excellent' | 'good' | 'fair' | 'poor';
      issues: string[];
    };
  }> {
    const stats = this.cacheProfiler.getStats();
    const topKeys = this.cacheProfiler.getMostAccessedKeys(10);
    const recommendations = this.cacheProfiler.getRecommendations();

    // Evaluate overall performance
    const performance = this.evaluatePerformance(
      stats.overall.hitRate,
      stats.overall.avgDuration,
    );

    return {
      timestamp: new Date().toISOString(),
      stats: stats.overall,
      topKeys,
      recommendations,
      performance,
    };
  }

  /**
   * Generate cache warming optimization recommendations
   */
  async getWarmingRecommendations(): Promise<
    Array<{
      category: 'warmup' | 'ttl' | 'size' | 'frequency';
      severity: 'high' | 'medium' | 'low';
      issue: string;
      recommendation: string;
      estimatedImpact: string;
    }>
  > {
    const recommendations: Array<{
      category: 'warmup' | 'ttl' | 'size' | 'frequency';
      severity: 'high' | 'medium' | 'low';
      issue: string;
      recommendation: string;
      estimatedImpact: string;
    }> = [];

    const stats = this.cacheProfiler.getStats();

    // Check hit rate
    if (stats.overall.hitRate < 70) {
      recommendations.push({
        category: 'warmup',
        severity: 'high',
        issue: `Low cache hit rate: ${stats.overall.hitRate.toFixed(1)}%`,
        recommendation:
          'Increase cache warming frequency or add more frequently accessed data to warming strategy',
        estimatedImpact: 'Could improve hit rate by 15-20%',
      });
    }

    // Check average duration
    if (stats.overall.avgDuration > 50) {
      recommendations.push({
        category: 'size',
        severity: 'medium',
        issue: `Slow cache operations: ${stats.overall.avgDuration.toFixed(1)}ms average`,
        recommendation:
          'Review cached data size and consider storing smaller, normalized data',
        estimatedImpact: 'Could reduce latency by 30-40ms',
      });
    }

    // Analyze individual keys
    for (const keyStats of stats.byKey.slice(0, 20)) {
      if (keyStats.hitRate < 50 && keyStats.hits + keyStats.misses > 100) {
        recommendations.push({
          category: 'ttl',
          severity: 'medium',
          issue: `Key "${keyStats.key}" has low hit rate: ${keyStats.hitRate.toFixed(1)}%`,
          recommendation: 'Consider increasing TTL or pre-warming this key',
          estimatedImpact: 'Could reduce database queries by 30-50%',
        });
      }
    }

    // Sort by severity
    return recommendations.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Get cache efficiency score (0-100)
   */
  getCacheEfficiencyScore(): {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    breakdown: {
      hitRate: { score: number; weight: number };
      performance: { score: number; weight: number };
      coverage: { score: number; weight: number };
    };
  } {
    const stats = this.cacheProfiler.getStats();

    // Hit rate score (50% weight)
    const hitRateScore = Math.min(100, stats.overall.hitRate);
    const hitRateWeight = 0.5;

    // Performance score (30% weight)
    const performanceScore = Math.max(0, 100 - stats.overall.avgDuration * 2);
    const performanceWeight = 0.3;

    // Coverage score (20% weight)
    const coverageScore = Math.min(
      100,
      (stats.overall.totalOperations / 10000) * 100,
    );
    const coverageWeight = 0.2;

    // Calculate weighted score
    const totalScore =
      hitRateScore * hitRateWeight +
      performanceScore * performanceWeight +
      coverageScore * coverageWeight;

    // Determine grade
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (totalScore >= 90) grade = 'A';
    else if (totalScore >= 80) grade = 'B';
    else if (totalScore >= 70) grade = 'C';
    else if (totalScore >= 60) grade = 'D';
    else grade = 'F';

    return {
      score: Math.round(totalScore),
      grade,
      breakdown: {
        hitRate: {
          score: Math.round(hitRateScore),
          weight: hitRateWeight,
        },
        performance: {
          score: Math.round(performanceScore),
          weight: performanceWeight,
        },
        coverage: {
          score: Math.round(coverageScore),
          weight: coverageWeight,
        },
      },
    };
  }

  /**
   * Reset cache performance metrics
   */
  resetMetrics(): void {
    this.cacheProfiler.reset();
    this.logger.log('Cache performance metrics reset');
  }

  /**
   * Evaluate overall cache performance
   */
  private evaluatePerformance(
    hitRate: number,
    avgDuration: number,
  ): {
    overall: 'excellent' | 'good' | 'fair' | 'poor';
    issues: string[];
  } {
    const issues: string[] = [];

    // Check hit rate
    if (hitRate < 50) {
      issues.push(
        'Very low cache hit rate - cache warming may not be effective',
      );
    } else if (hitRate < 70) {
      issues.push('Low cache hit rate - consider reviewing cache strategy');
    }

    // Check average duration
    if (avgDuration > 100) {
      issues.push('Very slow cache operations - check Redis performance');
    } else if (avgDuration > 50) {
      issues.push(
        'Slow cache operations - consider optimizing cache data size',
      );
    }

    // Determine overall performance
    let overall: 'excellent' | 'good' | 'fair' | 'poor';
    if (hitRate >= 90 && avgDuration < 20) {
      overall = 'excellent';
    } else if (hitRate >= 75 && avgDuration < 50) {
      overall = 'good';
    } else if (hitRate >= 60 && avgDuration < 100) {
      overall = 'fair';
    } else {
      overall = 'poor';
    }

    return { overall, issues };
  }
}
