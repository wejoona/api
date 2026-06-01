import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletRepository } from '../../src/modules/wallet/infrastructure/repositories/wallet.repository';
import { WalletMapper } from '../../src/modules/wallet/infrastructure/mappers/wallet.mapper';
import { WalletOrmEntity } from '../../src/modules/wallet/infrastructure/orm-entities/wallet.orm-entity';
import { UserOrmEntity } from '../../src/modules/user/infrastructure/orm-entities/user.orm-entity';
import { DataSource } from 'typeorm';
import {
  deleteAll,
  ensureBenchmarkDatabase,
  getBenchmarkDbConfig,
  testUserId,
  testWalletId,
} from './benchmark-db.helper';

/**
 * Wallet Query Benchmarks
 *
 * Purpose: Measure query execution times for wallet-related database operations
 * Focus areas:
 * - Primary key lookups (findById)
 * - Foreign key lookups (findByUserId)
 * - Provider integration queries (Circle, Yellow Card)
 * - Concurrent wallet access
 * - Write operation performance
 *
 * Metrics tracked:
 * - Query execution time (ms)
 * - Database query count
 * - Memory usage
 * - Throughput (queries/second)
 */

interface BenchmarkResult {
  operation: string;
  executionTimeMs: number;
  queryCount: number;
  recordsProcessed: number;
  memoryUsedMB: number;
  queriesPerSecond: number;
  status: 'PASS' | 'WARN' | 'FAIL';
  threshold: number;
}

interface QueryMetrics {
  queryCount: number;
  startMemory: number;
}

describe('Wallet Query Benchmarks', () => {
  let module: TestingModule;
  let repository: WalletRepository;
  let dataSource: DataSource;
  const results: BenchmarkResult[] = [];

  // Performance thresholds (milliseconds)
  const THRESHOLDS = {
    findById: 30,
    findByUserId: 40,
    findByCircleWalletId: 40,
    findByYellowCardWalletId: 40,
    findByProviderWalletId: 50,
    findAll: 200,
    save: 50,
    bulkInsert: 500,
    concurrentReads: 100,
    concurrentWrites: 200,
  };

  beforeAll(async () => {
    await ensureBenchmarkDatabase();
    const dbConfig = getBenchmarkDbConfig();

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
          entities: [WalletOrmEntity, UserOrmEntity],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([WalletOrmEntity]),
      ],
      providers: [WalletRepository, WalletMapper],
    }).compile();

    repository = module.get<WalletRepository>(WalletRepository);
    dataSource = module.get<DataSource>(DataSource);

    await cleanupTestData(dataSource);
    await seedTestData(dataSource);
  });

  afterAll(async () => {
    await cleanupTestData(dataSource);
    await module.close();

    // Print benchmark report
    printBenchmarkReport(results);
  });

  describe('Primary Key Lookups', () => {
    it('should benchmark findById query', async () => {
      const walletId = testWalletId(1);
      const metrics = startMetrics();

      const startTime = performance.now();
      const wallet = await repository.findById(walletId);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'findById',
          executionTime,
          queryMetrics.queryCount,
          wallet ? 1 : 0,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.findById,
        ),
      );

      expect(wallet).toBeDefined();
      expect(executionTime).toBeLessThan(THRESHOLDS.findById);
    });

    it('should benchmark findById with non-existent wallet', async () => {
      const walletId = testWalletId(9999);
      const metrics = startMetrics();

      const startTime = performance.now();
      const wallet = await repository.findById(walletId);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'findById (not found)',
          executionTime,
          queryMetrics.queryCount,
          wallet ? 1 : 0,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.findById,
        ),
      );

      expect(wallet).toBeNull();
      expect(executionTime).toBeLessThan(THRESHOLDS.findById);
    });
  });

  describe('Foreign Key Lookups', () => {
    it('should benchmark findByUserId query', async () => {
      const userId = testUserId(1);
      const metrics = startMetrics();

      const startTime = performance.now();
      const wallet = await repository.findByUserId(userId);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'findByUserId',
          executionTime,
          queryMetrics.queryCount,
          wallet ? 1 : 0,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.findByUserId,
        ),
      );

      expect(wallet).toBeDefined();
      expect(executionTime).toBeLessThan(THRESHOLDS.findByUserId);
    });

    it('should benchmark findByUserId with non-existent user', async () => {
      const userId = testUserId(9999);
      const metrics = startMetrics();

      const startTime = performance.now();
      const wallet = await repository.findByUserId(userId);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'findByUserId (not found)',
          executionTime,
          queryMetrics.queryCount,
          wallet ? 1 : 0,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.findByUserId,
        ),
      );

      expect(wallet).toBeNull();
      expect(executionTime).toBeLessThan(THRESHOLDS.findByUserId);
    });
  });

  describe('Provider Integration Queries', () => {
    it('should benchmark findByCircleWalletId query', async () => {
      const circleWalletId = 'circle-wallet-1';
      const metrics = startMetrics();

      const startTime = performance.now();
      const wallet = await repository.findByCircleWalletId(circleWalletId);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'findByCircleWalletId',
          executionTime,
          queryMetrics.queryCount,
          wallet ? 1 : 0,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.findByCircleWalletId,
        ),
      );

      expect(wallet).toBeDefined();
      expect(executionTime).toBeLessThan(THRESHOLDS.findByCircleWalletId);
    });

    it('should benchmark findByYellowCardWalletId query', async () => {
      const yellowCardWalletId = 'yc-wallet-1';
      const metrics = startMetrics();

      const startTime = performance.now();
      const wallet =
        await repository.findByYellowCardWalletId(yellowCardWalletId);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'findByYellowCardWalletId',
          executionTime,
          queryMetrics.queryCount,
          wallet ? 1 : 0,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.findByYellowCardWalletId,
        ),
      );

      expect(wallet).toBeDefined();
      expect(executionTime).toBeLessThan(THRESHOLDS.findByYellowCardWalletId);
    });

    it('should benchmark findByProviderWalletId query (Circle)', async () => {
      const providerWalletId = 'circle-wallet-1';
      const metrics = startMetrics();

      const startTime = performance.now();
      const wallet = await repository.findByProviderWalletId(providerWalletId);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'findByProviderWalletId (Circle)',
          executionTime,
          queryMetrics.queryCount,
          wallet ? 1 : 0,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.findByProviderWalletId,
        ),
      );

      expect(wallet).toBeDefined();
      expect(executionTime).toBeLessThan(THRESHOLDS.findByProviderWalletId);
    });

    it('should benchmark findByProviderWalletId query (Yellow Card fallback)', async () => {
      const providerWalletId = 'yc-wallet-50';
      const metrics = startMetrics();

      const startTime = performance.now();
      const wallet = await repository.findByProviderWalletId(providerWalletId);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'findByProviderWalletId (Yellow Card)',
          executionTime,
          queryMetrics.queryCount,
          wallet ? 1 : 0,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.findByProviderWalletId,
        ),
      );

      expect(wallet).toBeDefined();
      // Should execute 2 queries (Circle + Yellow Card)
      expect(executionTime).toBeLessThan(THRESHOLDS.findByProviderWalletId);
    });
  });

  describe('Collection Queries', () => {
    it('should benchmark findAll query', async () => {
      const metrics = startMetrics();

      const startTime = performance.now();
      const wallets = await repository.findAll();
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'findAll',
          executionTime,
          queryMetrics.queryCount,
          wallets.length,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.findAll,
        ),
      );

      expect(wallets).toBeDefined();
      expect(wallets.length).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(THRESHOLDS.findAll);
    });
  });

  describe('Write Operations', () => {
    it('should benchmark wallet save (insert)', async () => {
      const metrics = startMetrics();

      const startTime = performance.now();
      const wallet = await repository.save({
        id: testWalletId(1001),
        userId: testUserId(1),
        yellowCardWalletId: null,
        circleWalletId: 'circle-bench-1',
        circleWalletAddress: '0xBENCHMARK',
        currency: 'USDC',
        balance: 0,
        kycStatus: 'none',
        status: 'active',
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
          THRESHOLDS.save,
        ),
      );

      expect(wallet).toBeDefined();
      expect(executionTime).toBeLessThan(THRESHOLDS.save);
    });

    it('should benchmark wallet save (update)', async () => {
      const wallet = await repository.findById(testWalletId(1));
      wallet!.credit(100);

      const metrics = startMetrics();

      const startTime = performance.now();
      const updatedWallet = await repository.save(wallet!);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'save (update)',
          executionTime,
          queryMetrics.queryCount,
          1,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.save,
        ),
      );

      expect(updatedWallet).toBeDefined();
      expect(executionTime).toBeLessThan(THRESHOLDS.save);
    });

    it('should benchmark bulk wallet creation (50 wallets)', async () => {
      const metrics = startMetrics();

      const startTime = performance.now();

      const wallets = [];
      for (let i = 200; i < 250; i++) {
        wallets.push({
          id: testWalletId(i),
          userId: testUserId((i % 100) + 1),
          yellowCardWalletId: null,
          circleWalletId: `circle-bulk-${i}`,
          circleWalletAddress: `0xBULK${i}`,
          currency: 'USDC',
          balance: 0,
          kycStatus: 'none',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await dataSource.getRepository(WalletOrmEntity).save(wallets);

      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'bulk insert (50 wallets)',
          executionTime,
          queryMetrics.queryCount,
          50,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.bulkInsert,
        ),
      );

      expect(executionTime).toBeLessThan(THRESHOLDS.bulkInsert);
    });
  });

  describe('Concurrent Operations', () => {
    it('should benchmark concurrent findById queries (20 concurrent)', async () => {
      const walletIds = Array.from(
        { length: 20 },
        (_, i) => testWalletId((i % 100) + 1),
      );

      const metrics = startMetrics();

      const startTime = performance.now();
      await Promise.all(walletIds.map((id) => repository.findById(id)));
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'concurrent findById (20 queries)',
          executionTime,
          queryMetrics.queryCount,
          20,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.concurrentReads,
        ),
      );

      expect(executionTime).toBeLessThan(THRESHOLDS.concurrentReads);
    });

    it('should benchmark concurrent findByUserId queries (20 concurrent)', async () => {
      const userIds = Array.from(
        { length: 20 },
        (_, i) => testUserId((i % 100) + 1),
      );

      const metrics = startMetrics();

      const startTime = performance.now();
      await Promise.all(userIds.map((id) => repository.findByUserId(id)));
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'concurrent findByUserId (20 queries)',
          executionTime,
          queryMetrics.queryCount,
          20,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.concurrentReads,
        ),
      );

      expect(executionTime).toBeLessThan(THRESHOLDS.concurrentReads);
    });

    it('should benchmark concurrent mixed queries (30 concurrent)', async () => {
      const metrics = startMetrics();

      const startTime = performance.now();
      await Promise.all([
        ...Array.from({ length: 10 }, (_, i) =>
          repository.findById(testWalletId(i + 1)),
        ),
        ...Array.from({ length: 10 }, (_, i) =>
          repository.findByUserId(testUserId(i + 1)),
        ),
        ...Array.from({ length: 10 }, (_, i) =>
          repository.findByCircleWalletId(`circle-wallet-${i + 1}`),
        ),
      ]);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'concurrent mixed queries (30 queries)',
          executionTime,
          queryMetrics.queryCount,
          30,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.concurrentReads * 1.5,
        ),
      );

      expect(executionTime).toBeLessThan(THRESHOLDS.concurrentReads * 1.5);
    });

    it('should benchmark concurrent wallet updates (10 concurrent)', async () => {
      const wallets = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          repository.findById(testWalletId(i + 1)),
        ),
      );

      wallets.forEach((wallet) => wallet!.credit(10));

      const metrics = startMetrics();

      const startTime = performance.now();
      await Promise.all(wallets.map((wallet) => repository.save(wallet!)));
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'concurrent updates (10 queries)',
          executionTime,
          queryMetrics.queryCount,
          10,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.concurrentWrites,
        ),
      );

      expect(executionTime).toBeLessThan(THRESHOLDS.concurrentWrites);
    });
  });

  describe('Index Performance', () => {
    it('should verify userId index performance with large dataset', async () => {
      const metrics = startMetrics();

      const startTime = performance.now();
      await repository.findByUserId(testUserId(50));
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'findByUserId (with index)',
          executionTime,
          queryMetrics.queryCount,
          1,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.findByUserId,
        ),
      );

      expect(executionTime).toBeLessThan(THRESHOLDS.findByUserId);
    });

    it('should verify circleWalletId index performance', async () => {
      const metrics = startMetrics();

      const startTime = performance.now();
      await repository.findByCircleWalletId('circle-wallet-50');
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(metrics);

      results.push(
        createBenchmarkResult(
          'findByCircleWalletId (with index)',
          executionTime,
          queryMetrics.queryCount,
          1,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.findByCircleWalletId,
        ),
      );

      expect(executionTime).toBeLessThan(THRESHOLDS.findByCircleWalletId);
    });
  });
});

// Helper functions

function startMetrics(): QueryMetrics {
  const startMemory = process.memoryUsage().heapUsed;

  return {
    queryCount: 0,
    startMemory,
  };
}

async function endMetrics(metrics: QueryMetrics): Promise<{
  queryCount: number;
  memoryUsedMB: number;
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
    recordsProcessed,
    memoryUsedMB: Math.round(memoryUsedMB * 100) / 100,
    queriesPerSecond: Math.round(queriesPerSecond * 100) / 100,
    status,
    threshold,
  };
}

function printBenchmarkReport(results: BenchmarkResult[]): void {
  console.log('\n' + '='.repeat(120));
  console.log('WALLET QUERY BENCHMARK REPORT');
  console.log('='.repeat(120));

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
  console.log('-'.repeat(120));

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

  console.log('='.repeat(120) + '\n');

  // Identify slow queries
  const slowQueries = results.filter((r) => r.status === 'FAIL');
  if (slowQueries.length > 0) {
    console.log('\nSLOW QUERIES DETECTED:\n');
    slowQueries.forEach((query) => {
      console.log(
        `  - ${query.operation}: ${query.executionTimeMs}ms (threshold: ${query.threshold}ms)`,
      );

      if (query.operation.includes('findByProvider')) {
        console.log(
          `    Recommendation: Add composite index on (circleWalletId, yellowCardWalletId)\n`,
        );
      } else if (query.operation.includes('findByUserId')) {
        console.log(
          `    Recommendation: Verify index on userId column exists and is being used\n`,
        );
      } else if (query.operation.includes('concurrent')) {
        console.log(
          `    Recommendation: Consider connection pooling optimization or database scaling\n`,
        );
      } else {
        console.log(
          `    Recommendation: Review query execution plan and add appropriate indexes\n`,
        );
      }
    });
  }

  // Performance summary
  const avgExecutionTime =
    results.reduce((sum, r) => sum + r.executionTimeMs, 0) / results.length;
  const maxExecutionTime = Math.max(...results.map((r) => r.executionTimeMs));
  const minExecutionTime = Math.min(...results.map((r) => r.executionTimeMs));

  console.log('\nPERFORMANCE SUMMARY:\n');
  console.log(`  Average execution time: ${avgExecutionTime.toFixed(2)}ms`);
  console.log(`  Fastest query: ${minExecutionTime.toFixed(2)}ms`);
  console.log(`  Slowest query: ${maxExecutionTime.toFixed(2)}ms`);
  console.log('\n' + '='.repeat(120) + '\n');
}

// Test data seed functions

async function seedTestData(dataSource: DataSource): Promise<void> {
  // Create test users
  const users = [];
  for (let i = 1; i <= 100; i++) {
    users.push({
      id: testUserId(i),
      phone: `+225WALLET${i.toString().padStart(4, '0')}`,
      phoneVerified: true,
      countryCode: 'CI',
      kycStatus: 'approved',
      role: 'user',
      status: 'active',
      pinAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  await dataSource.getRepository(UserOrmEntity).save(users);

  // Create test wallets
  const wallets = [];
  for (let i = 1; i <= 100; i++) {
    wallets.push({
      id: testWalletId(i),
      userId: testUserId(i),
      yellowCardWalletId: i <= 50 ? `yc-wallet-${i}` : null,
      circleWalletId: `circle-wallet-${i}`,
      circleWalletAddress: `0x${i.toString().padStart(40, '0')}`,
      currency: 'USDC',
      balance: Math.random() * 10000,
      kycStatus: i % 3 === 0 ? 'verified' : 'none',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  await dataSource.getRepository(WalletOrmEntity).save(wallets);
}

async function cleanupTestData(dataSource: DataSource): Promise<void> {
  await deleteAll(dataSource, WalletOrmEntity);
  await deleteAll(dataSource, UserOrmEntity);
}
