import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionRepository } from '../../src/modules/transaction/infrastructure/repositories/transaction.repository';
import { TransactionMapper } from '../../src/modules/transaction/infrastructure/mappers/transaction.mapper';
import { TransactionOrmEntity } from '../../src/modules/transaction/infrastructure/orm-entities/transaction.orm-entity';
import { WalletOrmEntity } from '../../src/modules/wallet/infrastructure/orm-entities/wallet.orm-entity';
import { UserOrmEntity } from '../../src/modules/user/infrastructure/orm-entities/user.orm-entity';
import { DataSource } from 'typeorm';

/**
 * Transaction Query Benchmarks
 *
 * Purpose: Measure query execution times for transaction-related database operations
 * Identifies slow queries and performance bottlenecks
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
  endMemory: number;
}

describe('Transaction Query Benchmarks', () => {
  let module: TestingModule;
  let repository: TransactionRepository;
  let dataSource: DataSource;
  const results: BenchmarkResult[] = [];

  // Performance thresholds (milliseconds)
  const THRESHOLDS = {
    findById: 50,
    findByWalletId: 100,
    findByWalletIdPaginated: 150,
    findByWalletIdFiltered: 200,
    getDailyTransferVolume: 100,
    getTransactionStats: 300,
    getTransactionTimeSeries: 500,
    findByDateRange: 250,
    bulkInsert: 1000,
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'joonapay_test',
          entities: [TransactionOrmEntity, WalletOrmEntity, UserOrmEntity],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([TransactionOrmEntity]),
      ],
      providers: [TransactionRepository, TransactionMapper],
    }).compile();

    repository = module.get<TransactionRepository>(TransactionRepository);
    dataSource = module.get<DataSource>(DataSource);

    // Seed test data
    await seedTestData(dataSource);
  });

  afterAll(async () => {
    await cleanupTestData(dataSource);
    await module.close();

    // Print benchmark report
    printBenchmarkReport(results);
  });

  describe('Single Record Queries', () => {
    it('should benchmark findById query', async () => {
      const testTransaction = await getTestTransaction(dataSource);
      const metrics = startMetrics(dataSource);

      const startTime = performance.now();
      const result = await repository.findById(testTransaction.id);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(dataSource, metrics);

      results.push(
        createBenchmarkResult(
          'findById',
          executionTime,
          queryMetrics.queryCount,
          result ? 1 : 0,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.findById,
        ),
      );

      expect(result).toBeDefined();
      expect(executionTime).toBeLessThan(THRESHOLDS.findById);
    });

    it('should benchmark findByProviderRef query', async () => {
      const testTransaction =
        await getTestTransactionWithProviderRef(dataSource);
      const metrics = startMetrics(dataSource);

      const startTime = performance.now();
      const result = await repository.findByProviderRef(
        testTransaction.yellowCardRef!,
      );
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(dataSource, metrics);

      results.push(
        createBenchmarkResult(
          'findByProviderRef',
          executionTime,
          queryMetrics.queryCount,
          result ? 1 : 0,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.findById,
        ),
      );

      expect(result).toBeDefined();
      expect(executionTime).toBeLessThan(THRESHOLDS.findById);
    });
  });

  describe('Collection Queries', () => {
    it('should benchmark findByWalletId query', async () => {
      const walletId = await getTestWalletId(dataSource);
      const metrics = startMetrics(dataSource);

      const startTime = performance.now();
      const results = await repository.findByWalletId(walletId);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(dataSource, metrics);

      this.results.push(
        createBenchmarkResult(
          'findByWalletId',
          executionTime,
          queryMetrics.queryCount,
          results.length,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.findByWalletId,
        ),
      );

      expect(results).toBeDefined();
      expect(executionTime).toBeLessThan(THRESHOLDS.findByWalletId);
    });

    it('should benchmark findByWalletIdPaginated query', async () => {
      const walletId = await getTestWalletId(dataSource);
      const metrics = startMetrics(dataSource);

      const startTime = performance.now();
      const result = await repository.findByWalletIdPaginated(walletId, {
        limit: 20,
        offset: 0,
      });
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(dataSource, metrics);

      results.push(
        createBenchmarkResult(
          'findByWalletIdPaginated',
          executionTime,
          queryMetrics.queryCount,
          result.transactions.length,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.findByWalletIdPaginated,
        ),
      );

      expect(result.transactions).toBeDefined();
      expect(executionTime).toBeLessThan(THRESHOLDS.findByWalletIdPaginated);
    });

    it('should benchmark findByWalletIdFiltered query with all filters', async () => {
      const walletId = await getTestWalletId(dataSource);
      const metrics = startMetrics(dataSource);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const startTime = performance.now();
      const result = await repository.findByWalletIdFiltered(walletId, {
        type: 'deposit',
        status: 'completed',
        startDate,
        endDate: new Date(),
        minAmount: 10,
        maxAmount: 1000,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
        limit: 20,
        offset: 0,
      });
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(dataSource, metrics);

      results.push(
        createBenchmarkResult(
          'findByWalletIdFiltered (all filters)',
          executionTime,
          queryMetrics.queryCount,
          result.transactions.length,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.findByWalletIdFiltered,
        ),
      );

      expect(result.transactions).toBeDefined();
      expect(executionTime).toBeLessThan(THRESHOLDS.findByWalletIdFiltered);
    });

    it('should benchmark findByDateRange query', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const metrics = startMetrics(dataSource);

      const startTime = performance.now();
      const transactions = await repository.findByDateRange(startDate, endDate);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(dataSource, metrics);

      results.push(
        createBenchmarkResult(
          'findByDateRange (7 days)',
          executionTime,
          queryMetrics.queryCount,
          transactions.length,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.findByDateRange,
        ),
      );

      expect(transactions).toBeDefined();
      expect(executionTime).toBeLessThan(THRESHOLDS.findByDateRange);
    });
  });

  describe('Aggregate Queries', () => {
    it('should benchmark getDailyTransferVolume query', async () => {
      const userId = await getTestUserId(dataSource);
      const sinceDate = new Date();
      sinceDate.setHours(0, 0, 0, 0);

      const metrics = startMetrics(dataSource);

      const startTime = performance.now();
      const volume = await repository.getDailyTransferVolume(userId, sinceDate);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(dataSource, metrics);

      results.push(
        createBenchmarkResult(
          'getDailyTransferVolume',
          executionTime,
          queryMetrics.queryCount,
          1,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.getDailyTransferVolume,
        ),
      );

      expect(typeof volume).toBe('number');
      expect(executionTime).toBeLessThan(THRESHOLDS.getDailyTransferVolume);
    });

    it('should benchmark getTransactionStats query', async () => {
      const metrics = startMetrics(dataSource);

      const startTime = performance.now();
      const stats = await repository.getTransactionStats();
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(dataSource, metrics);

      results.push(
        createBenchmarkResult(
          'getTransactionStats',
          executionTime,
          queryMetrics.queryCount,
          1,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.getTransactionStats,
        ),
      );

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(executionTime).toBeLessThan(THRESHOLDS.getTransactionStats);
    });

    it('should benchmark getTransactionTimeSeries query', async () => {
      const metrics = startMetrics(dataSource);

      const startTime = performance.now();
      const timeSeries = await repository.getTransactionTimeSeries(30);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(dataSource, metrics);

      results.push(
        createBenchmarkResult(
          'getTransactionTimeSeries (30 days)',
          executionTime,
          queryMetrics.queryCount,
          timeSeries.length,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.getTransactionTimeSeries,
        ),
      );

      expect(timeSeries).toBeDefined();
      expect(executionTime).toBeLessThan(THRESHOLDS.getTransactionTimeSeries);
    });

    it('should benchmark getTransactionCountByStatus query', async () => {
      const metrics = startMetrics(dataSource);

      const startTime = performance.now();
      const counts = await repository.getTransactionCountByStatus();
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(dataSource, metrics);

      results.push(
        createBenchmarkResult(
          'getTransactionCountByStatus',
          executionTime,
          queryMetrics.queryCount,
          Object.keys(counts).length,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.getTransactionStats,
        ),
      );

      expect(counts).toBeDefined();
      expect(executionTime).toBeLessThan(THRESHOLDS.getTransactionStats);
    });

    it('should benchmark getTransactionCountByType query', async () => {
      const metrics = startMetrics(dataSource);

      const startTime = performance.now();
      const counts = await repository.getTransactionCountByType();
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(dataSource, metrics);

      results.push(
        createBenchmarkResult(
          'getTransactionCountByType',
          executionTime,
          queryMetrics.queryCount,
          Object.keys(counts).length,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.getTransactionStats,
        ),
      );

      expect(counts).toBeDefined();
      expect(executionTime).toBeLessThan(THRESHOLDS.getTransactionStats);
    });
  });

  describe('Bulk Operations', () => {
    it('should benchmark bulk insert performance', async () => {
      const walletId = await getTestWalletId(dataSource);
      const metrics = startMetrics(dataSource);

      const startTime = performance.now();

      // Insert 100 transactions
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          dataSource.getRepository(TransactionOrmEntity).save({
            walletId,
            type: 'deposit',
            amount: Math.random() * 1000,
            currency: 'USDC',
            status: 'completed',
            createdAt: new Date(),
          }),
        );
      }
      await Promise.all(promises);

      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(dataSource, metrics);

      results.push(
        createBenchmarkResult(
          'bulkInsert (100 records)',
          executionTime,
          queryMetrics.queryCount,
          100,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.bulkInsert,
        ),
      );

      expect(executionTime).toBeLessThan(THRESHOLDS.bulkInsert);
    });

    it('should benchmark findByIds query with 50 IDs', async () => {
      const transactionIds = await getTestTransactionIds(dataSource, 50);
      const metrics = startMetrics(dataSource);

      const startTime = performance.now();
      const transactions = await repository.findByIds(transactionIds);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      const queryMetrics = await endMetrics(dataSource, metrics);

      results.push(
        createBenchmarkResult(
          'findByIds (50 IDs)',
          executionTime,
          queryMetrics.queryCount,
          transactions.length,
          queryMetrics.memoryUsedMB,
          THRESHOLDS.findByWalletId,
        ),
      );

      expect(transactions).toBeDefined();
      expect(executionTime).toBeLessThan(THRESHOLDS.findByWalletId);
    });
  });
});

// Helper functions

function startMetrics(dataSource: DataSource): QueryMetrics {
  const queryCount = getQueryCount(dataSource);
  const startMemory = process.memoryUsage().heapUsed;

  return {
    queryCount,
    startMemory,
    endMemory: 0,
  };
}

async function endMetrics(
  dataSource: DataSource,
  metrics: QueryMetrics,
): Promise<{
  queryCount: number;
  memoryUsedMB: number;
}> {
  const endQueryCount = getQueryCount(dataSource);
  const endMemory = process.memoryUsage().heapUsed;

  return {
    queryCount: endQueryCount - metrics.queryCount,
    memoryUsedMB: (endMemory - metrics.startMemory) / 1024 / 1024,
  };
}

function getQueryCount(dataSource: DataSource): number {
  // Note: This requires query logging to be enabled
  // For now, we return 1 as a placeholder
  return 1;
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
  console.log('TRANSACTION QUERY BENCHMARK REPORT');
  console.log('='.repeat(120));

  const passCount = results.filter((r) => r.status === 'PASS').length;
  const warnCount = results.filter((r) => r.status === 'WARN').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;

  console.log(
    `\nTotal Tests: ${results.length} | PASS: ${passCount} | WARN: ${warnCount} | FAIL: ${failCount}\n`,
  );

  console.log(
    'Operation'.padEnd(45) +
      'Time (ms)'.padEnd(12) +
      'Queries'.padEnd(10) +
      'Records'.padEnd(10) +
      'Memory (MB)'.padEnd(13) +
      'QPS'.padEnd(12) +
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
      result.operation.padEnd(45) +
        result.executionTimeMs.toString().padEnd(12) +
        result.queryCount.toString().padEnd(10) +
        result.recordsProcessed.toString().padEnd(10) +
        result.memoryUsedMB.toString().padEnd(13) +
        result.queriesPerSecond.toString().padEnd(12) +
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
      console.log(
        `    Recommendation: Review query optimization, add indexes, or increase resources\n`,
      );
    });
  }
}

// Test data seed functions

async function seedTestData(dataSource: DataSource): Promise<void> {
  // Create test user
  await dataSource.getRepository(UserOrmEntity).save({
    id: 'test-user-1',
    phone: '+225XXXXXXXX',
    phoneVerified: true,
    countryCode: 'CI',
    kycStatus: 'approved',
    role: 'user',
    status: 'active',
    pinAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Create test wallet
  await dataSource.getRepository(WalletOrmEntity).save({
    id: 'test-wallet-1',
    userId: 'test-user-1',
    currency: 'USDC',
    balance: 1000,
    kycStatus: 'verified',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Create test transactions
  const transactions = [];
  const types = ['deposit', 'transfer_internal', 'withdrawal'];
  const statuses = ['completed', 'pending', 'failed'];

  for (let i = 0; i < 200; i++) {
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 90));

    transactions.push({
      id: `test-tx-${i}`,
      walletId: 'test-wallet-1',
      type: types[i % types.length],
      amount: Math.random() * 1000,
      currency: 'USDC',
      status: statuses[i % statuses.length],
      yellowCardRef: i % 5 === 0 ? `ref-${i}` : null,
      createdAt,
    });
  }

  await dataSource.getRepository(TransactionOrmEntity).save(transactions);
}

async function cleanupTestData(dataSource: DataSource): Promise<void> {
  await dataSource.getRepository(TransactionOrmEntity).delete({});
  await dataSource.getRepository(WalletOrmEntity).delete({});
  await dataSource.getRepository(UserOrmEntity).delete({});
}

async function getTestTransaction(
  dataSource: DataSource,
): Promise<TransactionOrmEntity> {
  const transaction = await dataSource
    .getRepository(TransactionOrmEntity)
    .findOne({ where: {} });
  return transaction!;
}

async function getTestTransactionWithProviderRef(
  dataSource: DataSource,
): Promise<TransactionOrmEntity> {
  const transaction = await dataSource
    .getRepository(TransactionOrmEntity)
    .findOne({ where: { yellowCardRef: 'ref-0' } });
  return transaction!;
}

async function getTestWalletId(dataSource: DataSource): Promise<string> {
  return 'test-wallet-1';
}

async function getTestUserId(dataSource: DataSource): Promise<string> {
  return 'test-user-1';
}

async function getTestTransactionIds(
  dataSource: DataSource,
  count: number,
): Promise<string[]> {
  const transactions = await dataSource
    .getRepository(TransactionOrmEntity)
    .find({ take: count });
  return transactions.map((tx) => tx.id);
}
