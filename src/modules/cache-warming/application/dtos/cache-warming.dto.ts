/**
 * Cache Warming Status DTO
 * Returns the current state of cache warming
 */
export class CacheWarmingStatusDto {
  isWarming: boolean;
  lastWarmed: string | null;
  stats: {
    exchangeRates: number;
    featureFlags: number;
    countries: number;
    appConfigCached: boolean;
    totalCachedKeys: number;
  };
  health: {
    exchangeRates: 'healthy' | 'missing' | 'degraded';
    featureFlags: 'healthy' | 'missing' | 'degraded';
    countries: 'healthy' | 'missing' | 'degraded';
    appConfig: 'healthy' | 'missing' | 'degraded';
  };
}

/**
 * Cache Statistics DTO
 * Detailed cache statistics
 */
export class CacheStatsDto {
  timestamp: string;
  totalKeys: number;
  breakdown: {
    exchangeRates: {
      count: number;
      status: 'active' | 'empty' | 'stale';
      ttl: number;
    };
    featureFlags: {
      count: number;
      status: 'active' | 'empty' | 'stale';
      ttl: number;
    };
    countries: {
      count: number;
      status: 'active' | 'empty' | 'stale';
      ttl: number;
    };
    appConfig: {
      cached: boolean;
      status: 'active' | 'empty' | 'stale';
      ttl: number;
    };
  };
  scheduledWarmingEnabled: boolean;
  nextScheduledWarm: string;
}

/**
 * Cache Warming Result DTO
 * Result of a cache warming operation
 */
export class CacheWarmingResultDto {
  success: boolean;
  message: string;
  duration: number;
  timestamp: string;
  error?: string;
}

/**
 * Cache Performance Metrics DTO
 * Performance metrics for cache operations
 */
export class CachePerformanceDto {
  timestamp: string;
  warmingDuration: number;
  cacheHitRate: number;
  averageResponseTime: number;
  totalCacheSize: number;
  recommendations: Array<{
    category: 'performance' | 'memory' | 'configuration';
    severity: 'high' | 'medium' | 'low';
    issue: string;
    recommendation: string;
  }>;
}
