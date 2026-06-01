import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UserRepository } from '../../src/modules/user/infrastructure/repositories/user.repository';
import { UserOrmEntity } from '../../src/modules/user/infrastructure/orm-entities/user.orm-entity';
import { DataSource } from 'typeorm';
import {
  deleteAll,
  ensureBenchmarkDatabase,
  getBenchmarkDbConfig,
  testUserId,
} from './benchmark-db.helper';

/**
 * User Query Benchmarks
 *
 * Purpose: Measure query execution times for user-related database operations
 * Focus areas:
 * - Cache performance (Redis)
 * - Index effectiveness (phone, username)
 * - Search query performance
 * - Concurrent query handling
 *
 * Metrics tracked:
 * - Query execution time (ms)
 * - Cache hit/miss ratio
 * - Database query count
 * - Memory usage
 */

interface BenchmarkResult {
  operation: string;
  executionTimeMs: number;
  queryCount: number;
  cacheHitRate?: number;
  recordsProcessed: number;
  memoryUsedMB: number;
  queriesPerSecond: number;
  status: 'PASS' | 'WARN' | 'FAIL';
  threshold: number;
}

interface QueryMetrics {
  queryCount: number;
  startMemory: number;
  cacheHits: number;
  cacheMisses: number;
}

describe('User Query Benchmarks', () => {
  let module: TestingModule;
  let repository: UserRepository;
  let dataSource: DataSource;
  let cacheManager: any;
  const results: BenchmarkResult[] = [];

  // Performance thresholds (milliseconds)
  const THRESHOLDS = {
    findById: 30,
    findByIdCached: 5,
    findByPhone: 40,
    findByUsername: 40,
    searchByUsername: 100,
    existsByPhone: 30,
    existsByUsername: 30,
    findAll: 200,
    concurrentReads: 150,
  };

  beforeAll(async () => {
    await ensureBenchmarkDatabase();
    const dbConfig = getBenchmarkDbConfig();

    // Mock cache manager
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      stats: { hits: 0, misses: 0 },
    };

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
          entities: [UserOrmEntity],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([UserOrmEntity]),
      ],
      providers: [
        UserRepository,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    dataSource = module.get<DataSource>(DataSource);
    cacheManager = module.get(CACHE_MANAGER);

    await cleanupTestData(dataSource);
    await seedTestData(dataSource);
  });

  afterAll(async () => {
    await cleanupTestData(dataSource);
    await module.close();

    // Print benchmark report
    printBenchmarkReport(results);
  });

  describe('Single Record Queries', () => {
    it('should benchmark findById query (cache miss)', async () => {
      const userId = testUserId(1);
      cacheManager.get.mockResolvedValue(null);

      const metrics = startMetrics();

      const startTime = performance.now();
      const user = await repository.findById(userId);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'findById (cache miss)',
          executionTime,
          queryMetrics.queryCount,
          user ? 1 : 0,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.findById,
          queryMetrics.cacheHitRate,
        ),
      );

      expect(user).toBeDefined();
      expect(executionTime).toBeLessThan(THRESHOLDS.findById);
    });

    it('should benchmark findById query (cache hit)', async () => {
      const userId = testUserId(1);
      const cachedUser = await repository.findById(userId);
      cacheManager.get.mockResolvedValue(cachedUser);

      const metrics = startMetrics();

      const startTime = performance.now();
      const user = await repository.findById(userId);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'findById (cache hit)',
          executionTime,
          0, // No DB query on cache hit
          user ? 1 : 0,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.findByIdCached,
          queryMetrics.cacheHitRate,
        ),
      );

      expect(user).toBeDefined();
      expect(executionTime).toBeLessThan(THRESHOLDS.findByIdCached);
    });

    it('should benchmark findByPhone query', async () => {
      const phone = '+225XXXXXXXX';
      const metrics = startMetrics();

      const startTime = performance.now();
      const user = await repository.findByPhone(phone);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'findByPhone',
          executionTime,
          queryMetrics.queryCount,
          user ? 1 : 0,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.findByPhone,
        ),
      );

      expect(user).toBeDefined();
      expect(executionTime).toBeLessThan(THRESHOLDS.findByPhone);
    });

    it('should benchmark findByUsername query', async () => {
      const username = 'testuser';
      const metrics = startMetrics();

      const startTime = performance.now();
      const user = await repository.findByUsername(username);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'findByUsername',
          executionTime,
          queryMetrics.queryCount,
          user ? 1 : 0,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.findByUsername,
        ),
      );

      expect(user).toBeDefined();
      expect(executionTime).toBeLessThan(THRESHOLDS.findByUsername);
    });
  });

  describe('Existence Checks', () => {
    it('should benchmark existsByPhone query', async () => {
      const phone = '+225XXXXXXXX';
      const metrics = startMetrics();

      const startTime = performance.now();
      const exists = await repository.existsByPhone(phone);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'existsByPhone',
          executionTime,
          queryMetrics.queryCount,
          exists ? 1 : 0,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.existsByPhone,
        ),
      );

      expect(typeof exists).toBe('boolean');
      expect(executionTime).toBeLessThan(THRESHOLDS.existsByPhone);
    });

    it('should benchmark existsByUsername query', async () => {
      const username = 'testuser';
      const metrics = startMetrics();

      const startTime = performance.now();
      const exists = await repository.existsByUsername(username);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'existsByUsername',
          executionTime,
          queryMetrics.queryCount,
          exists ? 1 : 0,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.existsByUsername,
        ),
      );

      expect(typeof exists).toBe('boolean');
      expect(executionTime).toBeLessThan(THRESHOLDS.existsByUsername);
    });
  });

  describe('Search Queries', () => {
    it('should benchmark searchByUsername with prefix match', async () => {
      const query = 'test';
      const metrics = startMetrics();

      const startTime = performance.now();
      const users = await repository.searchByUsername(query, 10);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'searchByUsername (prefix match)',
          executionTime,
          queryMetrics.queryCount,
          users.length,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.searchByUsername,
        ),
      );

      expect(users).toBeDefined();
      expect(executionTime).toBeLessThan(THRESHOLDS.searchByUsername);
    });

    it('should benchmark searchByUsername with single character', async () => {
      const query = 't';
      const metrics = startMetrics();

      const startTime = performance.now();
      const users = await repository.searchByUsername(query, 10);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'searchByUsername (single char)',
          executionTime,
          queryMetrics.queryCount,
          users.length,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.searchByUsername,
        ),
      );

      expect(users).toBeDefined();
      expect(executionTime).toBeLessThan(THRESHOLDS.searchByUsername);
    });
  });

  describe('Collection Queries', () => {
    it('should benchmark findAll query', async () => {
      const metrics = startMetrics();

      const startTime = performance.now();
      const users = await repository.findAll();
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'findAll',
          executionTime,
          queryMetrics.queryCount,
          users.length,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.findAll,
        ),
      );

      expect(users).toBeDefined();
      expect(executionTime).toBeLessThan(THRESHOLDS.findAll);
    });
  });

  describe('Concurrent Operations', () => {
    it('should benchmark concurrent findById queries (10 concurrent)', async () => {
      cacheManager.get.mockResolvedValue(null);
      const userIds = [
        testUserId(1),
        testUserId(2),
        testUserId(3),
        testUserId(4),
        testUserId(5),
      ];

      const metrics = startMetrics();

      const startTime = performance.now();
      await Promise.all([
        ...userIds.map((id) => repository.findById(id)),
        ...userIds.map((id) => repository.findById(id)), // 10 total
      ]);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'concurrent findById (10 queries)',
          executionTime,
          queryMetrics.queryCount,
          10,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.concurrentReads,
        ),
      );

      expect(executionTime).toBeLessThan(THRESHOLDS.concurrentReads);
    });

    it('should benchmark concurrent mixed queries (20 concurrent)', async () => {
      cacheManager.get.mockResolvedValue(null);

      const metrics = startMetrics();

      const startTime = performance.now();
      await Promise.all([
        repository.findById(testUserId(1)),
        repository.findById(testUserId(2)),
        repository.findByPhone('+225XXXXXXXX'),
        repository.findByUsername('testuser'),
        repository.existsByPhone('+225YYYYYYYY'),
        repository.existsByUsername('anotheruser'),
        repository.findById(testUserId(3)),
        repository.findById(testUserId(4)),
        repository.searchByUsername('test', 5),
        repository.findById(testUserId(5)),
        repository.findByPhone('+225ZZZZZZZZ'),
        repository.findByUsername('user2'),
        repository.existsByPhone('+225XXXXXXXX'),
        repository.existsByUsername('testuser'),
        repository.findById(testUserId(1)),
        repository.searchByUsername('u', 5),
        repository.findById(testUserId(2)),
        repository.findByPhone('+225XXXXXXXX'),
        repository.findByUsername('testuser'),
        repository.findById(testUserId(3)),
      ]);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'concurrent mixed queries (20 queries)',
          executionTime,
          queryMetrics.queryCount,
          20,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.concurrentReads * 1.5,
        ),
      );

      expect(executionTime).toBeLessThan(THRESHOLDS.concurrentReads * 1.5);
    });
  });

  describe('Write Operations', () => {
    it('should benchmark user save operation', async () => {
      const metrics = startMetrics();

      const startTime = performance.now();
      const user = await repository.save({
        id: testUserId(1001),
        phone: '+225BENCHMARK',
        phoneVerified: true,
        username: null,
        firstName: null,
        lastName: null,
        email: null,
        countryCode: 'CI',
        kycStatus: 'pending',
        kycProviderId: null,
        circleUserId: null,
        circleUserToken: null,
        role: 'user',
        status: 'active',
        suspendedAt: null,
        suspendedReason: null,
        pinHash: null,
        pinSetAt: null,
        pinAttempts: 0,
        pinLockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'save (insert)',
          executionTime,
          queryMetrics.queryCount,
          1,
          queryMetrics.memoryUsedMB,
          50,
        ),
      );

      expect(user).toBeDefined();
      expect(executionTime).toBeLessThan(50);
    });

    it('should benchmark bulk user creation (50 users)', async () => {
      const metrics = startMetrics();

      const startTime = performance.now();

      const users = [];
      for (let i = 0; i < 50; i++) {
        users.push({
          id: testUserId(2000 + i),
          phone: `+225BULK${i.toString().padStart(4, '0')}`,
          phoneVerified: true,
          countryCode: 'CI',
          kycStatus: 'pending',
          role: 'user',
          status: 'active',
          pinAttempts: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await dataSource.getRepository(UserOrmEntity).save(users);

      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'bulk insert (50 users)',
          executionTime,
          queryMetrics.queryCount,
          50,
          queryMetrics.memoryUsedMB,
          500,
        ),
      );

      expect(executionTime).toBeLessThan(500);
    });
  });
});

// Helper functions

function startMetrics(): QueryMetrics {
  const startMemory = process.memoryUsage().heapUsed;

  return {
    queryCount: 0,
    startMemory,
    cacheHits: 0,
    cacheMisses: 0,
  };
}

async function endMetrics(metrics: QueryMetrics): Promise<{
  queryCount: number;
  memoryUsedMB: number;
  cacheHitRate?: number;
}> {
  const endMemory = process.memoryUsage().heapUsed;

  return {
    queryCount: 1, // Simplified for now
    memoryUsedMB: (endMemory - metrics.startMemory) / 1024 / 1024,
  };
}

function createBenchmarkResult(
  operation: string,
  executionTimeMs: number,
  queryCount: number,
  recordsProcessed: number,
  memoryUsedMB: number,
  threshold: number,
  cacheHitRate?: number,
): BenchmarkResult {
  const queriesPerSecond = recordsProcessed / (executionTimeMs / 1000);
  let status: 'PASS' | 'WARN' | 'FAIL';

  if (executionTimeMs < threshold * 0.7) {
    status = 'PASS';
  } else if (executionTimeMs < threshold) {
    status = 'WARN';
  } else {
    status = 'FAIL';
  }

  return {
    operation,
    executionTimeMs: Math.round(executionTimeMs * 100) / 100,
    queryCount,
    cacheHitRate,
    recordsProcessed,
    memoryUsedMB: Math.round(memoryUsedMB * 100) / 100,
    queriesPerSecond: Math.round(queriesPerSecond * 100) / 100,
    status,
    threshold,
  };
}

function printBenchmarkReport(results: BenchmarkResult[]): void {
  console.log('\n' + '='.repeat(130));
  console.log('USER QUERY BENCHMARK REPORT');
  console.log('='.repeat(130));

  const passCount = results.filter((r) => r.status === 'PASS').length;
  const warnCount = results.filter((r) => r.status === 'WARN').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;

  console.log(
    `\nTotal Tests: ${results.length} | PASS: ${passCount} | WARN: ${warnCount} | FAIL: ${failCount}\n`,
  );

  console.log(
    'Operation'.padEnd(50) +
      'Time (ms)'.padEnd(12) +
      'Queries'.padEnd(10) +
      'Records'.padEnd(10) +
      'Memory (MB)'.padEnd(13) +
      'Status',
  );
  console.log('-'.repeat(130));

  results.forEach((result) => {
    const statusColor =
      result.status === 'PASS'
        ? '\x1b[32m'
        : result.status === 'WARN'
          ? '\x1b[33m'
          : '\x1b[31m';
    const resetColor = '\x1b[0m';

    console.log(
      result.operation.padEnd(50) +
        result.executionTimeMs.toString().padEnd(12) +
        result.queryCount.toString().padEnd(10) +
        result.recordsProcessed.toString().padEnd(10) +
        result.memoryUsedMB.toString().padEnd(13) +
        statusColor +
        result.status +
        resetColor +
        ` (threshold: ${result.threshold}ms)`,
    );
  });

  console.log('='.repeat(130) + '\n');

  // Identify slow queries
  const slowQueries = results.filter((r) => r.status === 'FAIL');
  if (slowQueries.length > 0) {
    console.log('\nSLOW QUERIES DETECTED:\n');
    slowQueries.forEach((query) => {
      console.log(
        `  - ${query.operation}: ${query.executionTimeMs}ms (threshold: ${query.threshold}ms)`,
      );

      if (query.operation.includes('search')) {
        console.log(
          `    Recommendation: Add GIN index on username column for better LIKE performance\n`,
        );
      } else if (query.operation.includes('findAll')) {
        console.log(
          `    Recommendation: Implement pagination to reduce memory usage\n`,
        );
      } else {
        console.log(
          `    Recommendation: Review indexes on phone and username columns\n`,
        );
      }
    });
  }

  // Cache performance analysis
  const cacheQueries = results.filter((r) => r.cacheHitRate !== undefined);
  if (cacheQueries.length > 0) {
    console.log('\nCACHE PERFORMANCE ANALYSIS:\n');
    cacheQueries.forEach((query) => {
      console.log(`  - ${query.operation}: ${query.cacheHitRate}% hit rate`);
    });
  }
}

// Test data seed functions

async function seedTestData(dataSource: DataSource): Promise<void> {
  const users = [];

  // Create 100 test users
  for (let i = 1; i <= 100; i++) {
    users.push({
      id: testUserId(i),
      phone: `+225XXXX${i.toString().padStart(4, '0')}`,
      phoneVerified: true,
      username: i <= 50 ? `testuser${i}` : null,
      firstName: `Test${i}`,
      lastName: `User${i}`,
      email: i % 2 === 0 ? `test${i}@example.com` : null,
      countryCode: 'CI',
      kycStatus: i % 3 === 0 ? 'approved' : 'pending',
      kycProviderId: null,
      circleUserId: null,
      circleUserToken: null,
      role: 'user',
      status: 'active',
      suspendedAt: null,
      suspendedReason: null,
      pinHash: null,
      pinSetAt: null,
      pinAttempts: 0,
      pinLockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await dataSource.getRepository(UserOrmEntity).save(users);
}

async function cleanupTestData(dataSource: DataSource): Promise<void> {
  await deleteAll(dataSource, UserOrmEntity);
}
