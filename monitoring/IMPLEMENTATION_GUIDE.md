# Monitoring Implementation Guide

This guide shows how to integrate monitoring and observability into your USDC Wallet services.

## Table of Contents

1. [HTTP Metrics (Automatic)](#http-metrics-automatic)
2. [Transaction Metrics](#transaction-metrics)
3. [External API Metrics](#external-api-metrics)
4. [Cache Metrics](#cache-metrics)
5. [Database Metrics](#database-metrics)
6. [Business Metrics](#business-metrics)
7. [Custom Health Indicators](#custom-health-indicators)

## HTTP Metrics (Automatic)

HTTP metrics are automatically collected by the `MetricsInterceptor`. No code changes needed!

All HTTP requests will automatically track:
- Request duration
- Request count
- Error rates
- Status codes

## Transaction Metrics

### Example: Transfer Service

```typescript
import { Injectable } from '@nestjs/common';
import { MetricsService } from '@/modules/metrics';

@Injectable()
export class TransferService {
  constructor(
    private readonly metricsService: MetricsService,
  ) {}

  async createTransfer(transferDto: CreateTransferDto) {
    const startTime = Date.now();
    const type = transferDto.type; // 'internal' | 'external'

    try {
      // Create transfer
      const transfer = await this.transferRepository.save(transferDto);

      // Process transfer
      const result = await this.processTransfer(transfer);

      // Record successful transaction
      this.metricsService.recordTransaction(
        type,
        'success',
        transferDto.amount,
        Date.now() - startTime
      );

      return result;
    } catch (error) {
      // Record failed transaction
      this.metricsService.recordTransaction(
        type,
        'failed',
        transferDto.amount,
        Date.now() - startTime
      );

      throw error;
    }
  }
}
```

### Example: Wallet Service

```typescript
import { Injectable } from '@nestjs/common';
import { MetricsService } from '@/modules/metrics';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class WalletService {
  constructor(
    private readonly metricsService: MetricsService,
  ) {}

  async updateBalance(userId: string, newBalance: number) {
    // Update wallet balance gauge
    this.metricsService.updateWalletBalance(userId, newBalance);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async updatePendingTransactionsMetric() {
    const count = await this.transactionRepository.count({
      where: { status: 'pending' }
    });

    this.metricsService.updatePendingTransactions(count);
  }
}
```

## External API Metrics

### Example: Circle Provider

```typescript
import { Injectable } from '@nestjs/common';
import { MetricsService } from '@/modules/metrics';

@Injectable()
export class CircleService {
  constructor(
    private readonly metricsService: MetricsService,
  ) {}

  async createWallet(userId: string) {
    const provider = 'circle';
    const endpoint = '/wallets';
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ userId }),
      });

      // Record API call metrics
      this.metricsService.recordExternalApiCall(
        provider,
        endpoint,
        response.status,
        Date.now() - startTime
      );

      if (!response.ok) {
        throw new Error(`Circle API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // Record error
      this.metricsService.recordExternalApiCall(
        provider,
        endpoint,
        500,
        Date.now() - startTime
      );

      throw error;
    }
  }
}
```

### Example: Blnk Provider

```typescript
import { Injectable } from '@nestjs/common';
import { MetricsService } from '@/modules/metrics';

@Injectable()
export class BlnkService {
  constructor(
    private readonly metricsService: MetricsService,
  ) {}

  async recordTransaction(transaction: any) {
    const provider = 'blnk';
    const endpoint = '/transactions';
    const startTime = Date.now();

    try {
      const response = await this.client.recordTransaction(transaction);

      this.metricsService.recordExternalApiCall(
        provider,
        endpoint,
        200,
        Date.now() - startTime
      );

      return response;
    } catch (error) {
      const statusCode = error.response?.status || 500;

      this.metricsService.recordExternalApiCall(
        provider,
        endpoint,
        statusCode,
        Date.now() - startTime
      );

      throw error;
    }
  }
}
```

## Cache Metrics

### Example: User Cache Service

```typescript
import { Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { MetricsService } from '@/modules/metrics';

@Injectable()
export class UserCacheService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly metricsService: MetricsService,
  ) {}

  async getUser(userId: string) {
    const key = `user:${userId}`;
    const operation = 'get';
    const startTime = Date.now();

    try {
      const cached = await this.cacheManager.get(key);

      // Record cache operation duration
      this.metricsService.recordCacheOperation(
        operation,
        Date.now() - startTime
      );

      if (cached) {
        // Record cache hit
        this.metricsService.recordCacheHit(operation, 'user');
        return cached;
      }

      // Record cache miss
      this.metricsService.recordCacheMiss(operation, 'user');

      // Fetch from database and cache
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        await this.cacheManager.set(key, user, 300); // 5 minutes
      }

      return user;
    } catch (error) {
      this.metricsService.recordCacheOperation(
        operation,
        Date.now() - startTime
      );
      throw error;
    }
  }

  async setUser(userId: string, user: any) {
    const key = `user:${userId}`;
    const operation = 'set';
    const startTime = Date.now();

    try {
      await this.cacheManager.set(key, user, 300);

      this.metricsService.recordCacheOperation(
        operation,
        Date.now() - startTime
      );
    } catch (error) {
      this.metricsService.recordCacheOperation(
        operation,
        Date.now() - startTime
      );
      throw error;
    }
  }
}
```

## Database Metrics

### Example: Repository with Metrics

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetricsService } from '@/modules/metrics';
import { Transaction } from './entities/transaction.entity';

@Injectable()
export class TransactionRepository {
  constructor(
    @InjectRepository(Transaction)
    private readonly repository: Repository<Transaction>,
    private readonly metricsService: MetricsService,
  ) {}

  async findById(id: string): Promise<Transaction> {
    const operation = 'SELECT';
    const table = 'transactions';
    const startTime = Date.now();
    let error = false;

    try {
      const result = await this.repository.findOne({ where: { id } });

      this.metricsService.recordDbQuery(
        operation,
        table,
        Date.now() - startTime,
        error
      );

      return result;
    } catch (err) {
      error = true;
      this.metricsService.recordDbQuery(
        operation,
        table,
        Date.now() - startTime,
        error
      );
      throw err;
    }
  }

  async create(transaction: Partial<Transaction>): Promise<Transaction> {
    const operation = 'INSERT';
    const table = 'transactions';
    const startTime = Date.now();
    let error = false;

    try {
      const result = await this.repository.save(transaction);

      this.metricsService.recordDbQuery(
        operation,
        table,
        Date.now() - startTime,
        error
      );

      return result;
    } catch (err) {
      error = true;
      this.metricsService.recordDbQuery(
        operation,
        table,
        Date.now() - startTime,
        error
      );
      throw err;
    }
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const operation = 'UPDATE';
    const table = 'transactions';
    const startTime = Date.now();
    let error = false;

    try {
      await this.repository.update({ id }, { status });

      this.metricsService.recordDbQuery(
        operation,
        table,
        Date.now() - startTime,
        error
      );
    } catch (err) {
      error = true;
      this.metricsService.recordDbQuery(
        operation,
        table,
        Date.now() - startTime,
        error
      );
      throw err;
    }
  }
}
```

## Business Metrics

### Example: KYC Service

```typescript
import { Injectable } from '@nestjs/common';
import { MetricsService } from '@/modules/metrics';

@Injectable()
export class KycService {
  constructor(
    private readonly metricsService: MetricsService,
  ) {}

  async verifyKyc(userId: string, level: 'tier1' | 'tier2' | 'tier3') {
    try {
      // Perform KYC verification
      const result = await this.performVerification(userId, level);

      // Record successful KYC verification
      this.metricsService.recordKycVerification('success', level);

      return result;
    } catch (error) {
      // Record failed KYC verification
      this.metricsService.recordKycVerification('failed', level);
      throw error;
    }
  }
}
```

### Example: Webhook Service

```typescript
import { Injectable } from '@nestjs/common';
import { MetricsService } from '@/modules/metrics';

@Injectable()
export class WebhookService {
  constructor(
    private readonly metricsService: MetricsService,
  ) {}

  async deliverWebhook(event: string, payload: any) {
    try {
      await this.sendWebhook(event, payload);

      // Record successful delivery
      this.metricsService.recordWebhookDelivery(event, 'success');
    } catch (error) {
      // Record failure
      this.metricsService.recordWebhookFailure(event, error.message);
      this.metricsService.recordWebhookDelivery(event, 'failed');
      throw error;
    }
  }
}
```

### Example: User Service (Active Users)

```typescript
import { Injectable } from '@nestjs/common';
import { MetricsService } from '@/modules/metrics';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class UserService {
  constructor(
    private readonly metricsService: MetricsService,
  ) {}

  async register(registerDto: RegisterDto) {
    try {
      const user = await this.createUser(registerDto);

      // Record successful registration
      this.metricsService.recordUserRegistration('phone', 'success');

      return user;
    } catch (error) {
      // Record failed registration
      this.metricsService.recordUserRegistration('phone', 'failed');
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async updateActiveUsersMetric() {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const count = await this.userRepository.count({
      where: {
        lastActiveAt: MoreThan(twentyFourHoursAgo)
      }
    });

    this.metricsService.updateActiveUsers(count);
  }
}
```

## Custom Health Indicators

### Example: External Service Health Indicator

```typescript
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class YellowCardHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const apiUrl = this.configService.get<string>('yellowcard.apiUrl');
    const startTime = Date.now();

    try {
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        return this.getStatus(key, true, {
          latency: `${latency}ms`,
          url: apiUrl,
        });
      }

      throw new Error(`YellowCard API returned status ${response.status}`);
    } catch (error) {
      const latency = Date.now() - startTime;

      throw new HealthCheckError(
        'YellowCard API check failed',
        this.getStatus(key, false, {
          latency: `${latency}ms`,
          error: error.message,
        }),
      );
    }
  }
}
```

Then register it in `health.module.ts` and use in `health.controller.ts`:

```typescript
// health.module.ts
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [
    CircleHealthIndicator,
    BlnkHealthIndicator,
    RedisHealthIndicator,
    YellowCardHealthIndicator, // Add new indicator
  ],
})
export class HealthModule {}

// health.controller.ts
@Get('ready')
@HealthCheck()
async readiness(): Promise<HealthCheckResult> {
  return this.health.check([
    () => this.db.pingCheck('database'),
    () => this.redisHealth.isHealthy('redis'),
    () => this.blnkHealth.isHealthy('blnk'),
    () => this.circleHealth.isHealthy('circle'),
    () => this.yellowCardHealth.isHealthy('yellowcard'), // Add check
  ]);
}
```

## Scheduled Metric Updates

Some metrics should be updated periodically rather than on every request:

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MetricsService } from '@/modules/metrics';
import { DataSource } from 'typeorm';

@Injectable()
export class MetricsScheduler {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly dataSource: DataSource,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async updateConnectionPoolMetrics() {
    const pool = this.dataSource.driver.pool;

    if (pool) {
      this.metricsService.updateDbConnectionPoolSize(
        pool.totalCount || 0,
        pool.activeCount || 0,
        pool.idleCount || 0,
      );
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateHeapMetrics() {
    this.metricsService.updateHeapMetrics();
  }
}
```

## Testing Metrics

### Unit Test Example

```typescript
import { Test } from '@nestjs/testing';
import { MetricsService } from '@/modules/metrics';
import { TransferService } from './transfer.service';

describe('TransferService', () => {
  let service: TransferService;
  let metricsService: MetricsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TransferService,
        {
          provide: MetricsService,
          useValue: {
            recordTransaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TransferService>(TransferService);
    metricsService = module.get<MetricsService>(MetricsService);
  });

  it('should record successful transaction metrics', async () => {
    await service.createTransfer({ type: 'internal', amount: 100 });

    expect(metricsService.recordTransaction).toHaveBeenCalledWith(
      'internal',
      'success',
      100,
      expect.any(Number),
    );
  });

  it('should record failed transaction metrics', async () => {
    jest.spyOn(service, 'processTransfer').mockRejectedValue(new Error('Failed'));

    await expect(
      service.createTransfer({ type: 'internal', amount: 100 })
    ).rejects.toThrow();

    expect(metricsService.recordTransaction).toHaveBeenCalledWith(
      'internal',
      'failed',
      100,
      expect.any(Number),
    );
  });
});
```

## Summary

1. **HTTP Metrics**: Automatically collected by interceptor
2. **Transaction Metrics**: Record at transaction start/completion
3. **External API Metrics**: Wrap API calls with timing and status tracking
4. **Cache Metrics**: Track hits, misses, and operation duration
5. **Database Metrics**: Record query timing and errors
6. **Business Metrics**: Track KYC, webhooks, registrations, etc.
7. **Health Checks**: Create custom indicators for external services
8. **Scheduled Updates**: Use cron jobs for periodic metric updates

Remember to:
- Always record both success and failure cases
- Use consistent label values to avoid cardinality issues
- Track duration for all operations
- Update gauges periodically via cron jobs
- Test that metrics are being recorded correctly
