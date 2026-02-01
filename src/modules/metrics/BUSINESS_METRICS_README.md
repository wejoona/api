# Business Metrics Service

A comprehensive Prometheus-based business KPI tracking service for JoonaPay USDC Wallet.

## Overview

The `BusinessMetricsService` provides real-time tracking of critical business metrics including:

- **Transactions Per Minute (TPM)** - Real-time transaction throughput
- **Average Transaction Value** - Transaction value analytics with percentiles
- **KYC Completion Rate** - Identity verification success metrics
- **User Registration Rate** - User acquisition and activation tracking
- **API Latency by Endpoint** - Performance monitoring per endpoint

## Metrics Categories

### 1. Transactions Per Minute (TPM)

Tracks transaction throughput in real-time using a rolling 1-minute window.

**Metrics:**
- `business_transactions_per_minute` (Gauge) - Current TPM count
- `business_transactions_rate` (Counter) - Transaction rate by type/status/currency

**Usage:**
```typescript
// Record a transaction
businessMetrics.recordTransactionForRate('transfer', 'completed', 'USD');

// Get current TPM
const currentTPM = businessMetrics.getCurrentTPM();
```

**PromQL Queries:**
```promql
# Current TPM
usdc_wallet_business_transactions_per_minute

# Transaction rate per second by type
rate(usdc_wallet_business_transactions_rate[1m])

# Total transactions in last 5 minutes
increase(usdc_wallet_business_transactions_rate[5m])
```

---

### 2. Average Transaction Value

Tracks transaction amounts with percentile analysis and running averages.

**Metrics:**
- `business_transaction_value_summary` (Summary) - Value distribution with percentiles
- `business_transaction_value_total` (Counter) - Cumulative transaction value
- `business_transaction_count_total` (Counter) - Total transaction count
- `business_avg_transaction_value` (Gauge) - Average value by type

**Usage:**
```typescript
// Record transaction value
businessMetrics.recordTransactionValue(150.50, 'transfer', 'USD');

// Update average (typically done in scheduled job)
businessMetrics.updateAverageTransactionValue(
  totalValue,
  totalCount,
  'transfer',
  'USD'
);
```

**PromQL Queries:**
```promql
# Average transaction value
usdc_wallet_business_avg_transaction_value{type="transfer"}

# 95th percentile transaction value
usdc_wallet_business_transaction_value_summary{type="transfer",quantile="0.95"}

# Total transaction volume (last hour)
increase(usdc_wallet_business_transaction_value_total{type="transfer"}[1h])
```

---

### 3. KYC Completion Rate

Tracks KYC verification flow from submission to completion/rejection.

**Metrics:**
- `business_kyc_submissions_total` (Counter) - Total KYC starts
- `business_kyc_completions_total` (Counter) - Successful completions
- `business_kyc_rejections_total` (Counter) - Rejections by reason
- `business_kyc_completion_rate` (Gauge) - Success rate percentage
- `business_kyc_processing_duration_seconds` (Histogram) - Processing time

**Usage:**
```typescript
// Start KYC
businessMetrics.recordKycSubmission('tier2', 'CI');

// Complete successfully
businessMetrics.recordKycCompletion('tier2', 'CI', durationMs);

// Reject
businessMetrics.recordKycRejection('tier2', 'CI', 'document_unclear', durationMs);

// Update rate (in scheduled job)
businessMetrics.updateKycCompletionRate(completions, submissions, 'tier2');
```

**PromQL Queries:**
```promql
# KYC completion rate
usdc_wallet_business_kyc_completion_rate{level="tier2"}

# Completions vs submissions (last 24h)
increase(usdc_wallet_business_kyc_completions_total[24h]) /
increase(usdc_wallet_business_kyc_submissions_total[24h]) * 100

# Average KYC processing time
histogram_quantile(0.5,
  rate(usdc_wallet_business_kyc_processing_duration_seconds_bucket[1h])
)

# Top rejection reasons
topk(5, sum by (reason) (
  increase(usdc_wallet_business_kyc_rejections_total[24h])
))
```

---

### 4. User Registration Rate

Tracks user acquisition and activation metrics.

**Metrics:**
- `business_user_registrations_rate` (Counter) - Registration events
- `business_registrations_per_hour` (Gauge) - Hourly registration rate
- `business_user_activations_total` (Counter) - User activations
- `business_user_activation_rate` (Gauge) - Activation percentage

**Usage:**
```typescript
// Record registration
businessMetrics.recordUserRegistration('mobile', 'CI', 'active');

// Record activation
businessMetrics.recordUserActivation('mobile', 'CI', 'first_transaction');

// Update rates (in scheduled job)
businessMetrics.updateRegistrationsPerHour(count, 'mobile');
businessMetrics.updateUserActivationRate(activations, registrations, 'mobile');
```

**PromQL Queries:**
```promql
# Registrations per hour
usdc_wallet_business_registrations_per_hour{channel="mobile"}

# Registration rate (per second)
rate(usdc_wallet_business_user_registrations_rate[5m])

# Activation rate
usdc_wallet_business_user_activation_rate{channel="mobile"}

# Registrations by country (last 24h)
sum by (country) (
  increase(usdc_wallet_business_user_registrations_rate[24h])
)
```

---

### 5. API Latency by Endpoint

Tracks API performance and reliability per endpoint.

**Metrics:**
- `business_api_latency_by_endpoint` (Histogram) - Response time distribution
- `business_api_success_rate` (Gauge) - Success rate percentage
- `business_api_requests_by_endpoint` (Counter) - Total requests
- `business_api_errors_by_endpoint` (Counter) - Error count

**Usage:**
```typescript
// Record API request
businessMetrics.recordApiLatency('/api/v1/transfers', 'POST', 200, durationMs);

// Update success rate (in scheduled job)
businessMetrics.updateApiSuccessRate(successCount, totalCount, '/api/v1/transfers');
```

**PromQL Queries:**
```promql
# 95th percentile latency by endpoint
histogram_quantile(0.95,
  sum by (endpoint, le) (
    rate(usdc_wallet_business_api_latency_by_endpoint_bucket[5m])
  )
)

# Error rate by endpoint
rate(usdc_wallet_business_api_errors_by_endpoint[5m]) /
rate(usdc_wallet_business_api_requests_by_endpoint[5m])

# Slowest endpoints (p99 latency)
topk(10, histogram_quantile(0.99,
  rate(usdc_wallet_business_api_latency_by_endpoint_bucket[5m])
))

# Success rate by endpoint
usdc_wallet_business_api_success_rate
```

---

## Additional Business Metrics

### Revenue Tracking
```typescript
businessMetrics.recordRevenue(5.50, 'transfer_fee', 'USD');
```

### Active Wallets
```typescript
businessMetrics.updateActiveWallets(1250, '24h');
```

### Transaction Success Rate
```typescript
businessMetrics.updateTransactionSuccessRate(successCount, totalCount, 'transfer');
```

### Mobile Money Provider Usage
```typescript
businessMetrics.recordMobileMoneyProviderUsage('orange_money', 'deposit', 'CI');
```

### Customer Lifetime Value
```typescript
businessMetrics.recordCustomerLifetimeValue(5000, '2024-Q1', 'CI');
```

---

## Integration Patterns

### 1. Use Case Integration

```typescript
@Injectable()
export class CreateTransferUseCase {
  constructor(
    private readonly businessMetrics: BusinessMetricsService,
  ) {}

  async execute(dto: CreateTransferDto) {
    const startTime = Date.now();

    try {
      const transfer = await this.processTransfer(dto);

      // Track TPM
      this.businessMetrics.recordTransactionForRate(
        'transfer',
        transfer.status,
        'USD'
      );

      // Track value
      this.businessMetrics.recordTransactionValue(
        transfer.amount,
        'transfer',
        'USD'
      );

      return transfer;
    } catch (error) {
      this.businessMetrics.recordFailedTransaction('transfer', error.message);
      throw error;
    }
  }
}
```

### 2. Controller Integration

```typescript
@Controller('transfers')
export class TransferController {
  constructor(
    private readonly businessMetrics: BusinessMetricsService,
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

### 3. Scheduled Aggregation

```typescript
@Injectable()
export class MetricsAggregationService {
  constructor(
    private readonly businessMetrics: BusinessMetricsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateMetrics() {
    // Fetch aggregated data from database
    const stats = await this.getStats();

    // Update gauges
    this.businessMetrics.updateAverageTransactionValue(
      stats.totalValue,
      stats.totalCount,
      'transfer',
      'USD'
    );

    this.businessMetrics.updateKycCompletionRate(
      stats.kycCompletions,
      stats.kycSubmissions,
      'tier2'
    );
  }
}
```

---

## Grafana Dashboard Queries

### Dashboard: Business KPIs Overview

**Panel 1: Transactions Per Minute**
```promql
usdc_wallet_business_transactions_per_minute
```

**Panel 2: Average Transaction Value**
```promql
avg(usdc_wallet_business_avg_transaction_value)
```

**Panel 3: KYC Completion Rate**
```promql
usdc_wallet_business_kyc_completion_rate
```

**Panel 4: Registrations Per Hour**
```promql
sum(usdc_wallet_business_registrations_per_hour)
```

**Panel 5: API Latency (P95)**
```promql
histogram_quantile(0.95,
  sum by (endpoint, le) (
    rate(usdc_wallet_business_api_latency_by_endpoint_bucket[5m])
  )
)
```

---

## Alerting Rules

### High API Error Rate
```yaml
- alert: HighAPIErrorRate
  expr: |
    sum by (endpoint) (
      rate(usdc_wallet_business_api_errors_by_endpoint[5m])
    ) /
    sum by (endpoint) (
      rate(usdc_wallet_business_api_requests_by_endpoint[5m])
    ) > 0.05
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High API error rate on {{ $labels.endpoint }}"
```

### Low KYC Completion Rate
```yaml
- alert: LowKYCCompletionRate
  expr: usdc_wallet_business_kyc_completion_rate < 70
  for: 30m
  labels:
    severity: warning
  annotations:
    summary: "KYC completion rate below 70%"
```

### High Transaction Failure Rate
```yaml
- alert: HighTransactionFailureRate
  expr: |
    (1 - usdc_wallet_business_transaction_success_rate) > 0.10
  for: 10m
  labels:
    severity: critical
  annotations:
    summary: "Transaction failure rate above 10%"
```

---

## Best Practices

### 1. Record Events Immediately
```typescript
// Good: Record right after event
const transfer = await this.createTransfer(dto);
this.businessMetrics.recordTransactionForRate('transfer', transfer.status, 'USD');

// Bad: Delayed recording
setTimeout(() => this.businessMetrics.record(...), 1000);
```

### 2. Use Scheduled Jobs for Aggregations
```typescript
// Good: Calculate averages periodically
@Cron(CronExpression.EVERY_5_MINUTES)
async updateAverages() {
  const stats = await this.db.getStats();
  this.businessMetrics.updateAverageTransactionValue(...);
}

// Bad: Calculate on every request
async handleRequest() {
  const stats = await this.db.getStats(); // Expensive!
  this.businessMetrics.updateAverageTransactionValue(...);
}
```

### 3. Add Meaningful Labels
```typescript
// Good: Rich labels for filtering
this.businessMetrics.recordTransactionValue(100, 'transfer', 'USD');

// Bad: Missing context
this.businessMetrics.recordTransactionValue(100);
```

### 4. Handle Errors Gracefully
```typescript
try {
  const result = await this.process();
  this.businessMetrics.record(result);
} catch (error) {
  this.businessMetrics.recordFailure(error);
  throw error; // Don't swallow the error
}
```

---

## Performance Considerations

### Memory Usage
- TPM uses in-memory timestamp array (cleared every 10s)
- Typical memory: ~1KB per 1000 transactions/minute
- Automatic cleanup via scheduled job

### Cardinality
- Avoid high-cardinality labels (user IDs, transaction IDs)
- Use aggregated dimensions (country, type, channel)
- Monitor metric count: `prometheus_tsdb_symbol_table_size_bytes`

### Query Performance
- Use recording rules for expensive queries
- Pre-calculate percentiles and rates
- Cache dashboard queries (5-10 second refresh)

---

## Testing

```typescript
describe('BusinessMetricsService', () => {
  let service: BusinessMetricsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [/* ... */],
    }).compile();

    service = module.get(BusinessMetricsService);
  });

  it('should calculate TPM correctly', () => {
    service.recordTransactionForRate('transfer', 'completed', 'USD');
    service.recordTransactionForRate('transfer', 'completed', 'USD');

    expect(service.getCurrentTPM()).toBe(2);
  });

  it('should clean old timestamps', async () => {
    service.recordTransactionForRate('transfer', 'completed', 'USD');

    // Wait 61 seconds
    await sleep(61000);

    service.handleTransactionsPerMinuteUpdate();
    expect(service.getCurrentTPM()).toBe(0);
  });
});
```

---

## Troubleshooting

### Metrics Not Appearing
1. Check module imports: `MetricsModule` in `app.module.ts`
2. Verify endpoint: `http://localhost:3000/metrics`
3. Check Prometheus scrape config

### Incorrect Values
1. Verify label names match provider definitions
2. Check scheduled jobs are running: `@nestjs/schedule`
3. Review calculation logic in aggregation jobs

### High Memory Usage
1. Check TPM timestamp array size: `service.getCurrentTPM()`
2. Verify scheduled cleanup is running
3. Monitor cardinality: `count(usdc_wallet_business_*)`

---

## Files

- `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/metrics/business-metrics.service.ts` - Main service
- `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/metrics/business-metrics.usage.example.ts` - Usage examples
- `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/metrics/metrics.module.ts` - Module configuration

## Dependencies

- `@willsoto/nestjs-prometheus` - NestJS Prometheus integration
- `prom-client` - Prometheus client library
- `@nestjs/schedule` - Cron job support
