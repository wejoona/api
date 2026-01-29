import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { ProfilingService } from './profiling.service';
import { DatabaseProfiler } from '@/common/profilers/database.profiler';
import { CacheProfiler } from '@/common/profilers/cache.profiler';
import { PerformanceInterceptor } from '@/common/interceptors/performance.interceptor';
import { MetricsService } from '../metrics/metrics.service';

describe('ProfilingService', () => {
  let service: ProfilingService;
  let databaseProfiler: DatabaseProfiler;
  let cacheProfiler: CacheProfiler;
  let performanceInterceptor: PerformanceInterceptor;

  const mockDataSource = {
    query: jest.fn(),
  };

  const mockMetricsService = {
    recordHttpRequest: jest.fn(),
    recordDbQuery: jest.fn(),
    recordCacheHit: jest.fn(),
    recordCacheMiss: jest.fn(),
    recordCacheOperation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilingService,
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
        {
          provide: DatabaseProfiler,
          useValue: {
            getSlowQueries: jest.fn(),
            getN1Patterns: jest.fn(),
            reset: jest.fn(),
          },
        },
        {
          provide: CacheProfiler,
          useValue: {
            getStats: jest.fn(),
            getRecommendations: jest.fn(),
            getMostAccessedKeys: jest.fn(),
            reset: jest.fn(),
          },
        },
        {
          provide: PerformanceInterceptor,
          useValue: {
            getEndpointStats: jest.fn(),
          },
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    service = module.get<ProfilingService>(ProfilingService);
    databaseProfiler = module.get<DatabaseProfiler>(DatabaseProfiler);
    cacheProfiler = module.get<CacheProfiler>(CacheProfiler);
    performanceInterceptor = module.get<PerformanceInterceptor>(
      PerformanceInterceptor,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPerformanceReport', () => {
    it('should return comprehensive performance report', async () => {
      // Arrange
      const mockEndpointStats = [
        { endpoint: '/api/v1/users', p50: 100, p95: 200, p99: 300 },
      ];

      const mockDatabaseStats = {
        slowQueries: [
          {
            query: 'SELECT * FROM users',
            count: 10,
            avgDuration: 150,
            maxDuration: 300,
          },
        ],
        n1Patterns: [],
      };

      const mockCacheStats = {
        overall: {
          totalHits: 100,
          totalMisses: 20,
          hitRate: 83.33,
          totalOperations: 120,
          avgDuration: 5,
        },
        recommendations: [],
        mostAccessed: [],
        byKey: [],
      };

      jest
        .spyOn(performanceInterceptor, 'getEndpointStats')
        .mockReturnValue(mockEndpointStats);
      jest
        .spyOn(databaseProfiler, 'getSlowQueries')
        .mockReturnValue(mockDatabaseStats.slowQueries);
      jest
        .spyOn(databaseProfiler, 'getN1Patterns')
        .mockReturnValue(mockDatabaseStats.n1Patterns);
      jest.spyOn(cacheProfiler, 'getStats').mockReturnValue(mockCacheStats);
      jest.spyOn(cacheProfiler, 'getRecommendations').mockReturnValue([]);
      jest.spyOn(cacheProfiler, 'getMostAccessedKeys').mockReturnValue([]);

      mockDataSource.query.mockResolvedValue([]);

      // Act
      const report = await service.getPerformanceReport();

      // Assert
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('endpoints');
      expect(report).toHaveProperty('database');
      expect(report).toHaveProperty('cache');
      expect(report).toHaveProperty('optimizations');
      expect(report).toHaveProperty('system');

      expect(report.endpoints).toEqual(mockEndpointStats);
      expect(report.database.slowQueries).toEqual(
        mockDatabaseStats.slowQueries,
      );
      expect(report.cache.overall).toEqual(mockCacheStats.overall);
    });
  });

  describe('getEndpointStats', () => {
    it('should return endpoint statistics', () => {
      // Arrange
      const mockStats = [
        {
          endpoint: '/api/v1/transfers',
          sampleCount: 100,
          p50: 150,
          p95: 450,
          p99: 800,
        },
      ];

      jest
        .spyOn(performanceInterceptor, 'getEndpointStats')
        .mockReturnValue(mockStats);

      // Act
      const stats = service.getEndpointStats();

      // Assert
      expect(stats).toEqual(mockStats);
      expect(performanceInterceptor.getEndpointStats).toHaveBeenCalled();
    });
  });

  describe('getDatabaseStats', () => {
    it('should return database statistics', () => {
      // Arrange
      const mockSlowQueries = [
        {
          query: 'SELECT * FROM transactions WHERE user_id = $1',
          count: 50,
          avgDuration: 200,
          maxDuration: 500,
          lastSeen: Date.now(),
        },
      ];

      const mockN1Patterns = [
        {
          query: 'SELECT * FROM users WHERE id = $1',
          occurrences: 100,
          avgDuration: 50,
          recommendation: 'Use eager loading',
        },
      ];

      jest
        .spyOn(databaseProfiler, 'getSlowQueries')
        .mockReturnValue(mockSlowQueries);
      jest
        .spyOn(databaseProfiler, 'getN1Patterns')
        .mockReturnValue(mockN1Patterns);

      // Act
      const stats = service.getDatabaseStats();

      // Assert
      expect(stats.slowQueries).toEqual(mockSlowQueries);
      expect(stats.n1Patterns).toEqual(mockN1Patterns);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics with recommendations', () => {
      // Arrange
      const mockStats = {
        overall: {
          totalHits: 1000,
          totalMisses: 200,
          hitRate: 83.33,
          totalOperations: 1200,
          avgDuration: 10,
        },
        byKey: [
          {
            key: 'user::id',
            hits: 500,
            misses: 50,
            hitRate: 90.91,
            avgDuration: 8,
            lastAccessed: new Date(),
          },
        ],
      };

      const mockRecommendations = [
        {
          key: 'wallet:balance::id',
          issue: 'Low cache hit rate: 45.2%',
          recommendation: 'Increase TTL or pre-warm cache',
          priority: 'high' as const,
        },
      ];

      const mockMostAccessed = [
        {
          key: 'user::id',
          totalAccess: 550,
          hitRate: 90.91,
        },
      ];

      jest.spyOn(cacheProfiler, 'getStats').mockReturnValue(mockStats);
      jest
        .spyOn(cacheProfiler, 'getRecommendations')
        .mockReturnValue(mockRecommendations);
      jest
        .spyOn(cacheProfiler, 'getMostAccessedKeys')
        .mockReturnValue(mockMostAccessed);

      // Act
      const stats = service.getCacheStats();

      // Assert
      expect(stats.overall).toEqual(mockStats.overall);
      expect(stats.recommendations).toEqual(mockRecommendations);
      expect(stats.mostAccessed).toEqual(mockMostAccessed);
    });
  });

  describe('getSystemStats', () => {
    it('should return system resource statistics', () => {
      // Act
      const stats = service.getSystemStats();

      // Assert
      expect(stats).toHaveProperty('memory');
      expect(stats).toHaveProperty('uptime');
      expect(stats).toHaveProperty('platform');
      expect(stats).toHaveProperty('nodeVersion');

      expect(stats.memory).toHaveProperty('heapUsed');
      expect(stats.memory).toHaveProperty('heapTotal');
      expect(stats.memory).toHaveProperty('rss');
      expect(stats.memory).toHaveProperty('external');
    });
  });

  describe('analyzeMissingIndexes', () => {
    it('should return index recommendations', async () => {
      // Arrange
      const mockQueryResult = [
        {
          schemaname: 'public',
          tablename: 'transactions',
          seq_scan: 5000,
          seq_tup_read: 100000,
          idx_scan: 10,
          idx_tup_fetch: 100,
          n_live_tup: 50000,
        },
      ];

      mockDataSource.query.mockResolvedValue(mockQueryResult);

      // Act
      const recommendations = await service.analyzeMissingIndexes();

      // Assert
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0]).toHaveProperty('table', 'transactions');
      expect(recommendations[0]).toHaveProperty('priority');
      expect(recommendations[0].priority).toBe('high');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockDataSource.query.mockRejectedValue(new Error('Database error'));

      // Act
      const recommendations = await service.analyzeMissingIndexes();

      // Assert
      expect(recommendations).toEqual([]);
    });
  });

  describe('getTableStatistics', () => {
    it('should return table statistics', async () => {
      // Arrange
      const mockTables = [
        {
          schemaname: 'public',
          tablename: 'users',
          total_size: '10 MB',
          table_size: '8 MB',
          indexes_size: '2 MB',
          row_count: 10000,
          dead_rows: 100,
          dead_row_percent: 1.0,
        },
      ];

      mockDataSource.query.mockResolvedValue(mockTables);

      // Act
      const stats = await service.getTableStatistics();

      // Assert
      expect(stats).toEqual(mockTables);
    });
  });

  describe('getConnectionPoolStats', () => {
    it('should return connection pool statistics', async () => {
      // Arrange
      const mockResult = [
        {
          total: '20',
          active: '5',
          idle: '15',
        },
      ];

      mockDataSource.query.mockResolvedValue(mockResult);

      // Act
      const stats = await service.getConnectionPoolStats();

      // Assert
      expect(stats).toEqual({
        total: 20,
        active: 5,
        idle: 15,
        waiting: 0,
      });
    });
  });

  describe('resetProfilers', () => {
    it('should reset all profiler statistics', () => {
      // Act
      const result = service.resetProfilers();

      // Assert
      expect(result.success).toBe(true);
      expect(databaseProfiler.reset).toHaveBeenCalled();
      expect(cacheProfiler.reset).toHaveBeenCalled();
    });
  });
});
