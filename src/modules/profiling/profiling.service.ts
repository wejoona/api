import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DatabaseProfiler } from '@/common/profilers/database.profiler';
import { CacheProfiler } from '@/common/profilers/cache.profiler';
import { PerformanceInterceptor } from '@/common/interceptors/performance.interceptor';

interface IndexRecommendation {
  table: string;
  columns: string[];
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
}

interface OptimizationOpportunity {
  category: 'database' | 'cache' | 'endpoint' | 'query';
  issue: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact?: string;
}

@Injectable()
export class ProfilingService {
  private readonly logger = new Logger('ProfilingService');

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly databaseProfiler: DatabaseProfiler,
    private readonly cacheProfiler: CacheProfiler,
    private readonly performanceInterceptor: PerformanceInterceptor,
  ) {}

  /**
   * Get comprehensive performance report
   */
  async getPerformanceReport(): Promise<{
    timestamp: string;
    endpoints: any[];
    database: any;
    cache: any;
    optimizations: OptimizationOpportunity[];
    system: any;
  }> {
    const [
      endpointStats,
      databaseStats,
      cacheStats,
      systemStats,
      missingIndexes,
    ] = await Promise.all([
      this.getEndpointStats(),
      this.getDatabaseStats(),
      this.getCacheStats(),
      this.getSystemStats(),
      this.analyzeMissingIndexes(),
    ]);

    const optimizations = this.generateOptimizationRecommendations(
      endpointStats,
      databaseStats,
      cacheStats,
      missingIndexes,
    );

    return {
      timestamp: new Date().toISOString(),
      endpoints: endpointStats,
      database: databaseStats,
      cache: cacheStats,
      optimizations,
      system: systemStats,
    };
  }

  /**
   * Get endpoint performance statistics
   */
  getEndpointStats(): any[] {
    return this.performanceInterceptor.getEndpointStats();
  }

  /**
   * Get database performance statistics
   */
  getDatabaseStats(): {
    slowQueries: any[];
    n1Patterns: any[];
  } {
    return {
      slowQueries: this.databaseProfiler.getSlowQueries(20),
      n1Patterns: this.databaseProfiler.getN1Patterns(),
    };
  }

  /**
   * Get cache performance statistics
   */
  getCacheStats(): any {
    const stats = this.cacheProfiler.getStats();
    const recommendations = this.cacheProfiler.getRecommendations();
    const mostAccessed = this.cacheProfiler.getMostAccessedKeys(10);

    return {
      ...stats,
      recommendations,
      mostAccessed,
    };
  }

  /**
   * Get system resource statistics
   */
  getSystemStats(): {
    memory: any;
    uptime: number;
    platform: string;
    nodeVersion: string;
  } {
    const memUsage = process.memoryUsage();

    return {
      memory: {
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`,
        external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`,
        arrayBuffers: `${(memUsage.arrayBuffers / 1024 / 1024).toFixed(2)}MB`,
      },
      uptime: process.uptime(),
      platform: process.platform,
      nodeVersion: process.version,
    };
  }

  /**
   * Analyze database for missing indexes
   */
  async analyzeMissingIndexes(): Promise<IndexRecommendation[]> {
    try {
      // Get PostgreSQL statistics for missing indexes
      const query = `
        SELECT
          schemaname,
          tablename,
          seq_scan,
          seq_tup_read,
          idx_scan,
          idx_tup_fetch,
          n_live_tup
        FROM pg_stat_user_tables
        WHERE seq_scan > 100
          AND (idx_scan IS NULL OR seq_scan > idx_scan * 10)
          AND n_live_tup > 1000
        ORDER BY seq_scan DESC
        LIMIT 10;
      `;

      const results = await this.dataSource.query(query);
      const recommendations: IndexRecommendation[] = [];

      for (const row of results) {
        const priority = this.calculateIndexPriority(row);

        recommendations.push({
          table: row.tablename,
          columns: [], // Would need query analysis to determine exact columns
          reason: `High sequential scan count (${row.seq_scan}) vs index scan (${row.idx_scan || 0})`,
          priority,
          estimatedImpact: `Could reduce ${row.seq_scan} sequential scans`,
        });
      }

      return recommendations;
    } catch (error) {
      this.logger.error('Failed to analyze missing indexes', error);
      return [];
    }
  }

  /**
   * Get table statistics
   */
  async getTableStatistics(): Promise<any[]> {
    try {
      const query = `
        SELECT
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
          pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
          pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as indexes_size,
          n_live_tup as row_count,
          n_dead_tup as dead_rows,
          CASE
            WHEN n_live_tup > 0
            THEN round((n_dead_tup::float / n_live_tup::float) * 100, 2)
            ELSE 0
          END as dead_row_percent,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 20;
      `;

      return await this.dataSource.query(query);
    } catch (error) {
      this.logger.error('Failed to get table statistics', error);
      return [];
    }
  }

  /**
   * Get active queries
   */
  async getActiveQueries(): Promise<any[]> {
    try {
      const query = `
        SELECT
          pid,
          usename,
          application_name,
          client_addr,
          state,
          query,
          state_change,
          EXTRACT(EPOCH FROM (now() - query_start)) as duration_seconds
        FROM pg_stat_activity
        WHERE state != 'idle'
          AND pid != pg_backend_pid()
        ORDER BY query_start;
      `;

      return await this.dataSource.query(query);
    } catch (error) {
      this.logger.error('Failed to get active queries', error);
      return [];
    }
  }

  /**
   * Get connection pool statistics
   */
  async getConnectionPoolStats(): Promise<{
    total: number;
    active: number;
    idle: number;
    waiting: number;
  }> {
    try {
      const query = `
        SELECT
          COUNT(*) FILTER (WHERE state = 'active') as active,
          COUNT(*) FILTER (WHERE state = 'idle') as idle,
          COUNT(*) as total
        FROM pg_stat_activity
        WHERE datname = current_database();
      `;

      const result = await this.dataSource.query(query);

      return {
        total: parseInt(result[0]?.total || '0'),
        active: parseInt(result[0]?.active || '0'),
        idle: parseInt(result[0]?.idle || '0'),
        waiting: 0, // Would need additional query for waiting connections
      };
    } catch (error) {
      this.logger.error('Failed to get connection pool stats', error);
      return { total: 0, active: 0, idle: 0, waiting: 0 };
    }
  }

  /**
   * Reset all profiler statistics
   */
  resetProfilers(): { success: boolean; message: string } {
    try {
      this.databaseProfiler.reset();
      this.cacheProfiler.reset();

      return {
        success: true,
        message: 'All profiler statistics have been reset',
      };
    } catch (error) {
      this.logger.error('Failed to reset profilers', error);
      return {
        success: false,
        message: 'Failed to reset profilers',
      };
    }
  }

  private generateOptimizationRecommendations(
    endpointStats: any[],
    databaseStats: any,
    cacheStats: any,
    missingIndexes: IndexRecommendation[],
  ): OptimizationOpportunity[] {
    const recommendations: OptimizationOpportunity[] = [];

    // Endpoint optimizations
    const slowEndpoints = endpointStats.filter((e) => e.p95 > 1000);
    for (const endpoint of slowEndpoints.slice(0, 5)) {
      recommendations.push({
        category: 'endpoint',
        issue: `Slow endpoint: ${endpoint.endpoint} (p95: ${endpoint.p95}ms)`,
        recommendation:
          'Review business logic, add caching, or optimize database queries',
        priority: endpoint.p95 > 5000 ? 'high' : 'medium',
        estimatedImpact: 'Could improve user experience significantly',
      });
    }

    // Database optimizations
    if (databaseStats.slowQueries.length > 0) {
      for (const query of databaseStats.slowQueries.slice(0, 3)) {
        recommendations.push({
          category: 'database',
          issue: `Slow query (avg: ${query.avgDuration}ms, count: ${query.count})`,
          recommendation: 'Add indexes, optimize query structure, or add caching',
          priority: query.avgDuration > 500 ? 'high' : 'medium',
          estimatedImpact: `Executed ${query.count} times - high impact`,
        });
      }
    }

    // N+1 query problems
    if (databaseStats.n1Patterns.length > 0) {
      for (const pattern of databaseStats.n1Patterns.slice(0, 2)) {
        recommendations.push({
          category: 'query',
          issue: `N+1 query pattern (${pattern.occurrences} occurrences)`,
          recommendation: pattern.recommendation,
          priority: 'high',
          estimatedImpact: `Could reduce ${pattern.occurrences} queries to 1-2 queries`,
        });
      }
    }

    // Cache optimizations
    if (cacheStats.overall.hitRate < 70) {
      recommendations.push({
        category: 'cache',
        issue: `Low cache hit rate: ${cacheStats.overall.hitRate.toFixed(1)}%`,
        recommendation: 'Review cache TTL settings and pre-warm critical data',
        priority: 'medium',
        estimatedImpact: 'Could reduce database load by 20-30%',
      });
    }

    // Missing indexes
    for (const index of missingIndexes.slice(0, 3)) {
      recommendations.push({
        category: 'database',
        issue: `Missing index on table: ${index.table}`,
        recommendation: `Add index to improve query performance - ${index.reason}`,
        priority: index.priority,
        estimatedImpact: index.estimatedImpact,
      });
    }

    // Sort by priority
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private calculateIndexPriority(
    row: any,
  ): 'high' | 'medium' | 'low' {
    const seqScan = parseInt(row.seq_scan || '0');
    const nLiveTup = parseInt(row.n_live_tup || '0');

    if (seqScan > 1000 && nLiveTup > 10000) {
      return 'high';
    } else if (seqScan > 500 || nLiveTup > 5000) {
      return 'medium';
    }
    return 'low';
  }
}
