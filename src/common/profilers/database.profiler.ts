import { Logger } from '@nestjs/common';
import { Logger as TypeOrmLogger, QueryRunner } from 'typeorm';
import { MetricsService } from '@/modules/metrics/metrics.service';

interface QueryMetadata {
  query: string;
  parameters?: any[];
  duration: number;
  timestamp: number;
  endpoint?: string;
}

export class DatabaseProfiler implements TypeOrmLogger {
  private readonly logger = new Logger('DatabaseProfiler');
  private readonly slowQueryThreshold = 100; // 100ms
  private readonly queryHistory = new Map<string, QueryMetadata[]>();
  private readonly maxHistoryPerQuery = 100;

  // Request-scoped query tracking for N+1 detection
  private readonly requestQueries = new Map<number, Set<string>>();

  constructor(private readonly metricsService?: MetricsService) {}

  /**
   * Logs query and parameters used in it
   */
  logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner) {
    const startTime = Date.now();

    // Store in async context for tracking
    const requestId = this.getRequestId();
    if (requestId) {
      this.trackRequestQuery(requestId, query);
    }

    // For development, log all queries
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(
        JSON.stringify({
          type: 'query',
          query: this.formatQuery(query),
          parameters,
        }),
      );
    }
  }

  /**
   * Logs query that is failed
   */
  logQueryError(
    error: string | Error,
    query: string,
    parameters?: any[],
    queryRunner?: QueryRunner,
  ) {
    const table = this.extractTableName(query);

    this.logger.error(
      JSON.stringify({
        type: 'query_error',
        error: error instanceof Error ? error.message : error,
        query: this.formatQuery(query),
        parameters,
        table,
        stack: error instanceof Error ? error.stack : undefined,
      }),
    );

    if (this.metricsService) {
      this.metricsService.recordDbQuery('error', table, 0, true);
    }
  }

  /**
   * Logs query that is slow (execution time exceeds maxQueryExecutionTime)
   */
  logQuerySlow(
    time: number,
    query: string,
    parameters?: any[],
    queryRunner?: QueryRunner,
  ) {
    const table = this.extractTableName(query);
    const operation = this.extractOperation(query);
    const normalizedQuery = this.normalizeQuery(query);

    // Record metrics
    if (this.metricsService) {
      this.metricsService.recordDbQuery(operation, table, time);
    }

    // Store in history for analysis
    this.storeQueryHistory(normalizedQuery, {
      query,
      parameters,
      duration: time,
      timestamp: Date.now(),
    });

    const recommendations = this.generateQueryRecommendations(
      query,
      time,
      operation,
    );

    this.logger.warn(
      JSON.stringify({
        type: 'slow_query',
        executionTime: `${time}ms`,
        threshold: `${this.slowQueryThreshold}ms`,
        query: this.formatQuery(query),
        normalizedQuery,
        parameters,
        table,
        operation,
        recommendations,
      }),
    );

    // Check for N+1 patterns
    this.detectN1Problem(normalizedQuery);
  }

  /**
   * Logs events from the schema build process
   */
  logSchemaBuild(message: string, queryRunner?: QueryRunner) {
    this.logger.log(
      JSON.stringify({
        type: 'schema_build',
        message,
      }),
    );
  }

  /**
   * Logs events from the migrations run process
   */
  logMigration(message: string, queryRunner?: QueryRunner) {
    this.logger.log(
      JSON.stringify({
        type: 'migration',
        message,
      }),
    );
  }

  /**
   * Perform logging using given logger
   */
  log(
    level: 'log' | 'info' | 'warn',
    message: any,
    queryRunner?: QueryRunner,
  ) {
    switch (level) {
      case 'log':
      case 'info':
        this.logger.log(message);
        break;
      case 'warn':
        this.logger.warn(message);
        break;
    }
  }

  /**
   * Get slow queries report
   */
  getSlowQueries(limit = 20): Array<{
    query: string;
    count: number;
    avgDuration: number;
    maxDuration: number;
    lastSeen: number;
  }> {
    const queryStats: Array<{
      query: string;
      count: number;
      avgDuration: number;
      maxDuration: number;
      lastSeen: number;
    }> = [];

    for (const [query, history] of this.queryHistory.entries()) {
      const durations = history.map((h) => h.duration);
      const avgDuration =
        durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const lastSeen = Math.max(...history.map((h) => h.timestamp));

      queryStats.push({
        query,
        count: history.length,
        avgDuration: Math.round(avgDuration),
        maxDuration: Math.round(maxDuration),
        lastSeen,
      });
    }

    // Sort by average duration descending
    return queryStats
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);
  }

  /**
   * Get N+1 query patterns
   */
  getN1Patterns(): Array<{
    query: string;
    occurrences: number;
    avgDuration: number;
    recommendation: string;
  }> {
    const patterns: Array<{
      query: string;
      occurrences: number;
      avgDuration: number;
      recommendation: string;
    }> = [];

    for (const [query, history] of this.queryHistory.entries()) {
      // Detect patterns that run multiple times in short succession
      if (history.length > 5) {
        const durations = history.map((h) => h.duration);
        const avgDuration =
          durations.reduce((sum, d) => sum + d, 0) / durations.length;

        patterns.push({
          query,
          occurrences: history.length,
          avgDuration: Math.round(avgDuration),
          recommendation: this.getN1Recommendation(query),
        });
      }
    }

    return patterns.sort((a, b) => b.occurrences - a.occurrences);
  }

  /**
   * Reset profiler statistics
   */
  reset(): void {
    this.queryHistory.clear();
    this.requestQueries.clear();
  }

  private formatQuery(query: string): string {
    return query.replace(/\s+/g, ' ').trim();
  }

  private normalizeQuery(query: string): string {
    return query
      .replace(/\$\d+/g, '$?') // Replace $1, $2, etc. with $?
      .replace(/\d+/g, 'N') // Replace numbers with N
      .replace(/'[^']*'/g, "'?'") // Replace string literals
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractTableName(query: string): string {
    const fromMatch = query.match(/FROM\s+["']?(\w+)["']?/i);
    const intoMatch = query.match(/INTO\s+["']?(\w+)["']?/i);
    const updateMatch = query.match(/UPDATE\s+["']?(\w+)["']?/i);

    return fromMatch?.[1] || intoMatch?.[1] || updateMatch?.[1] || 'unknown';
  }

  private extractOperation(query: string): string {
    const trimmed = query.trim().toUpperCase();
    if (trimmed.startsWith('SELECT')) return 'SELECT';
    if (trimmed.startsWith('INSERT')) return 'INSERT';
    if (trimmed.startsWith('UPDATE')) return 'UPDATE';
    if (trimmed.startsWith('DELETE')) return 'DELETE';
    return 'OTHER';
  }

  private storeQueryHistory(
    normalizedQuery: string,
    metadata: QueryMetadata,
  ): void {
    if (!this.queryHistory.has(normalizedQuery)) {
      this.queryHistory.set(normalizedQuery, []);
    }

    const history = this.queryHistory.get(normalizedQuery)!;
    history.push(metadata);

    // Keep only last N entries
    if (history.length > this.maxHistoryPerQuery) {
      history.shift();
    }
  }

  private generateQueryRecommendations(
    query: string,
    duration: number,
    operation: string,
  ): string[] {
    const recommendations: string[] = [];
    const queryUpper = query.toUpperCase();

    // Check for missing indexes
    if (queryUpper.includes('WHERE') && duration > 200) {
      recommendations.push('Consider adding indexes on WHERE clause columns');
    }

    // Check for SELECT *
    if (queryUpper.includes('SELECT *')) {
      recommendations.push(
        'Avoid SELECT * - specify only needed columns for better performance',
      );
    }

    // Check for missing JOINs (potential N+1)
    if (
      operation === 'SELECT' &&
      !queryUpper.includes('JOIN') &&
      duration > 100
    ) {
      recommendations.push(
        'Consider using JOIN instead of multiple queries (N+1 problem)',
      );
    }

    // Check for ORDER BY without index
    if (queryUpper.includes('ORDER BY') && duration > 300) {
      recommendations.push('Add index on ORDER BY columns for faster sorting');
    }

    // Check for large LIMIT
    const limitMatch = query.match(/LIMIT\s+(\d+)/i);
    if (limitMatch && parseInt(limitMatch[1]) > 1000) {
      recommendations.push(
        'Large LIMIT detected - consider pagination or reducing result set',
      );
    }

    // Check for complex subqueries
    const subqueryCount = (query.match(/SELECT/gi) || []).length;
    if (subqueryCount > 2) {
      recommendations.push(
        'Complex query with multiple subqueries - consider query optimization or CTEs',
      );
    }

    return recommendations;
  }

  private detectN1Problem(normalizedQuery: string): void {
    const requestId = this.getRequestId();
    if (!requestId) return;

    const queries = this.requestQueries.get(requestId);
    if (!queries) return;

    // Check if same query pattern appears multiple times
    const occurrences = Array.from(queries).filter((q) =>
      q.includes(normalizedQuery.substring(0, 50)),
    ).length;

    if (occurrences > 5) {
      this.logger.warn(
        JSON.stringify({
          type: 'n1_detection',
          query: normalizedQuery,
          occurrences,
          requestId,
          recommendation:
            'Possible N+1 query problem - use eager loading or JOIN instead',
        }),
      );
    }
  }

  private trackRequestQuery(requestId: number, query: string): void {
    if (!this.requestQueries.has(requestId)) {
      this.requestQueries.set(requestId, new Set());
    }

    this.requestQueries.get(requestId)!.add(this.normalizeQuery(query));

    // Clean up old requests (keep last 100)
    if (this.requestQueries.size > 100) {
      const firstKey = this.requestQueries.keys().next().value;
      this.requestQueries.delete(firstKey);
    }
  }

  private getRequestId(): number | null {
    // In a real implementation, this would use AsyncLocalStorage or similar
    // to track the current request context
    return Date.now();
  }

  private getN1Recommendation(query: string): string {
    const table = this.extractTableName(query);

    if (query.toUpperCase().includes('JOIN')) {
      return `Already using JOIN - verify it's the most efficient approach for ${table}`;
    }

    return `Use eager loading or JOIN to fetch ${table} data in a single query instead of multiple queries`;
  }
}
