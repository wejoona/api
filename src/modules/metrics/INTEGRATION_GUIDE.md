# Business Metrics Integration Guide

Quick start guide for integrating business metrics into JoonaPay USDC Wallet.

## Quick Setup

### 1. Verify Module Import

Ensure `MetricsModule` is imported in your `app.module.ts`:

```typescript
import { MetricsModule } from './modules/metrics/metrics.module';

@Module({
  imports: [
    // ... other modules
    MetricsModule,
  ],
})
export class AppModule {}
```

### 2. Inject Service

```typescript
import { BusinessMetricsService } from '@/modules/metrics/business-metrics.service';

@Injectable()
export class YourService {
  constructor(
    private readonly businessMetrics: BusinessMetricsService,
  ) {}
}
```

## Common Integration Patterns

### Pattern 1: Transaction Use Case

```typescript
@Injectable()
export class CreateTransferUseCase {
  constructor(
    private readonly businessMetrics: BusinessMetricsService,
  ) {}

  async execute(dto: CreateTransferDto): Promise<Transfer> {
    try {
      const transfer = await this.processTransfer(dto);

      // Record metrics
      this.businessMetrics.recordTransactionForRate('transfer', transfer.status, 'USD');
      this.businessMetrics.recordTransactionValue(transfer.amount, 'transfer', 'USD');

      if (transfer.fee > 0) {
        this.businessMetrics.recordRevenue(transfer.fee, 'transfer_fee', 'USD');
      }

      return transfer;
    } catch (error) {
      this.businessMetrics.recordFailedTransaction('transfer', error.message);
      throw error;
    }
  }
}
```

### Pattern 2: KYC Flow

```typescript
@Injectable()
export class ProcessKycUseCase {
  constructor(
    private readonly businessMetrics: BusinessMetricsService,
  ) {}

  async execute(dto: KycSubmissionDto): Promise<void> {
    const startTime = Date.now();

    // Record submission
    this.businessMetrics.recordKycSubmission(dto.level, dto.country);

    try {
      const result = await this.verifyKyc(dto);
      const duration = Date.now() - startTime;

      if (result.approved) {
        this.businessMetrics.recordKycCompletion(dto.level, dto.country, duration);
      } else {
        this.businessMetrics.recordKycRejection(dto.level, dto.country, result.reason, duration);
      }
    } catch (error) {
      this.businessMetrics.recordKycRejection(dto.level, dto.country, 'system_error', Date.now() - startTime);
      throw error;
    }
  }
}
```

### Pattern 3: API Controller

```typescript
@Controller('api/v1/transfers')
export class TransferController {
  constructor(
    private readonly businessMetrics: BusinessMetricsService,
    private readonly useCase: CreateTransferUseCase,
  ) {}

  @Post()
  async create(@Body() dto: CreateTransferDto) {
    const startTime = Date.now();

    try {
      const result = await this.useCase.execute(dto);

      this.businessMetrics.recordApiLatency(
        '/api/v1/transfers',
        'POST',
        200,
        Date.now() - startTime
      );

      return result;
    } catch (error) {
      this.businessMetrics.recordApiLatency(
        '/api/v1/transfers',
        'POST',
        error.status || 500,
        Date.now() - startTime
      );
      throw error;
    }
  }
}
```

### Pattern 4: User Registration

```typescript
@Injectable()
export class RegisterUserUseCase {
  constructor(
    private readonly businessMetrics: BusinessMetricsService,
  ) {}

  async execute(dto: RegisterUserDto): Promise<User> {
    try {
      const user = await this.createUser(dto);

      this.businessMetrics.recordUserRegistration(
        dto.channel || 'mobile',
        dto.country,
        'active'
      );

      return user;
    } catch (error) {
      this.businessMetrics.recordUserRegistration(
        dto.channel || 'mobile',
        dto.country,
        'failed'
      );
      throw error;
    }
  }
}
```

### Pattern 5: Scheduled Aggregations

```typescript
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class MetricsAggregationService {
  constructor(
    private readonly businessMetrics: BusinessMetricsService,
    private readonly db: DatabaseService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateBusinessMetrics() {
    // Update average transaction values
    const txStats = await this.db.getTransactionStats();
    this.businessMetrics.updateAverageTransactionValue(
      txStats.totalValue,
      txStats.totalCount,
      'transfer',
      'USD'
    );

    // Update KYC completion rates
    const kycStats = await this.db.getKycStats();
    this.businessMetrics.updateKycCompletionRate(
      kycStats.completions,
      kycStats.submissions,
      'tier2'
    );

    // Update API success rates
    const apiStats = await this.db.getApiStats('/api/v1/transfers');
    this.businessMetrics.updateApiSuccessRate(
      apiStats.successCount,
      apiStats.totalCount,
      '/api/v1/transfers'
    );
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateActiveWallets() {
    const count24h = await this.db.getActiveWalletsCount('24h');
    this.businessMetrics.updateActiveWallets(count24h, '24h');
  }
}
```

## Metric Checklist by Module

### Transfers Module
- [ ] Record transaction for TPM: `recordTransactionForRate()`
- [ ] Record transaction value: `recordTransactionValue()`
- [ ] Record revenue: `recordRevenue()`
- [ ] Record failures: `recordFailedTransaction()`

### KYC Module
- [ ] Record submissions: `recordKycSubmission()`
- [ ] Record completions: `recordKycCompletion()`
- [ ] Record rejections: `recordKycRejection()`
- [ ] Update completion rate (scheduled): `updateKycCompletionRate()`

### Auth Module
- [ ] Record registrations: `recordUserRegistration()`
- [ ] Record activations: `recordUserActivation()`
- [ ] Update rates (scheduled): `updateRegistrationsPerHour()`

### All Controllers
- [ ] Record API latency: `recordApiLatency()`
- [ ] Update success rates (scheduled): `updateApiSuccessRate()`

## Testing Your Integration

### 1. Check Metrics Endpoint

```bash
curl http://localhost:3000/metrics | grep business_
```

### 2. Trigger Events

```bash
# Create a transfer
curl -X POST http://localhost:3000/api/v1/transfers \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "recipientId": "abc123"}'

# Check TPM metric
curl http://localhost:3000/metrics | grep business_transactions_per_minute
```

### 3. Verify in Prometheus

```promql
# Check if metrics are being scraped
usdc_wallet_business_transactions_per_minute

# Check transaction rate
rate(usdc_wallet_business_transactions_rate[1m])
```

### 4. View in Grafana

1. Import dashboard: `/infrastructure/monitoring/grafana/dashboards/business-kpis.json`
2. Navigate to "JoonaPay Business KPIs" dashboard
3. Verify panels are populating with data

## Common Issues

### Metrics Not Appearing

**Problem:** Metrics not showing at `/metrics` endpoint

**Solution:**
1. Verify `MetricsModule` is imported in `app.module.ts`
2. Check `@nestjs/schedule` is installed: `npm install @nestjs/schedule`
3. Restart application

### Incorrect Values

**Problem:** Metric values seem wrong

**Solution:**
1. Verify label names match the provider definition
2. Check that you're calling the right method
3. Add debug logging:
   ```typescript
   console.log('Recording TPM:', type, status, currency);
   this.businessMetrics.recordTransactionForRate(type, status, currency);
   ```

### High Memory Usage

**Problem:** Memory growing over time

**Solution:**
1. Check TPM cache size: `service.getCurrentTPM()`
2. Verify scheduled cleanup is running
3. Monitor metric cardinality:
   ```promql
   count(usdc_wallet_business_transactions_per_minute)
   ```

## Performance Best Practices

### 1. Don't Block on Metrics

```typescript
// Good: Fire and forget
this.businessMetrics.recordTransactionForRate('transfer', 'completed', 'USD');
const result = await this.processTransfer();

// Bad: Unnecessary await
await this.businessMetrics.recordTransactionForRate(...); // No await needed!
```

### 2. Use Scheduled Jobs for Aggregations

```typescript
// Good: Calculate expensive metrics periodically
@Cron(CronExpression.EVERY_5_MINUTES)
async updateMetrics() {
  const stats = await this.db.getStats();
  this.businessMetrics.updateAverageTransactionValue(...);
}

// Bad: Calculate on every request
async handleRequest() {
  const stats = await this.db.getStats(); // Expensive!
  this.businessMetrics.updateAverageTransactionValue(...);
}
```

### 3. Batch Database Queries

```typescript
// Good: Single query for all stats
@Cron(CronExpression.EVERY_5_MINUTES)
async updateAll() {
  const stats = await this.db.getAllStats(); // One query

  this.businessMetrics.updateAverageTransactionValue(stats.tx.total, stats.tx.count, 'transfer', 'USD');
  this.businessMetrics.updateKycCompletionRate(stats.kyc.completions, stats.kyc.submissions, 'tier2');
  this.businessMetrics.updateApiSuccessRate(stats.api.success, stats.api.total, '/api/v1/transfers');
}

// Bad: Multiple queries
@Cron(CronExpression.EVERY_5_MINUTES)
async updateAll() {
  const txStats = await this.db.getTxStats();
  const kycStats = await this.db.getKycStats();
  const apiStats = await this.db.getApiStats();
  // ...
}
```

## Next Steps

1. **Start small:** Integrate TPM tracking in your main transaction flow
2. **Add API latency:** Track all controller endpoints
3. **Enable KYC metrics:** Add to verification flow
4. **Set up aggregations:** Create scheduled job for gauge updates
5. **Configure alerts:** Load Prometheus alerting rules
6. **Import dashboard:** Add Grafana dashboard for visualization

## Support

- **Documentation:** `/modules/metrics/BUSINESS_METRICS_README.md`
- **Examples:** `/modules/metrics/business-metrics.usage.example.ts`
- **Tests:** `/modules/metrics/business-metrics.service.spec.ts`
- **Dashboard:** `/infrastructure/monitoring/grafana/dashboards/business-kpis.json`
- **Alerts:** `/infrastructure/monitoring/prometheus/rules/business-kpi-alerts.yml`
