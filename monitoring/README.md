# USDC Wallet - Monitoring and Observability

This directory contains the monitoring and observability infrastructure for the USDC Wallet application.

## Overview

The monitoring stack consists of:

- **Prometheus** - Metrics collection and storage
- **Grafana** - Visualization and dashboards
- **Custom Metrics** - Application-specific metrics exposed via `/metrics` endpoint
- **Health Checks** - Service health indicators for all dependencies
- **Structured Logging** - JSON-formatted logs with request correlation

## Architecture

```
┌─────────────────┐
│   USDC Wallet   │
│   Application   │
│                 │
│  /metrics       │◄───┐
│  /health        │    │
└─────────────────┘    │
                       │ Scrape
                       │ (every 15s)
                 ┌─────┴──────┐
                 │ Prometheus │
                 │            │
                 │  Storage   │
                 └─────┬──────┘
                       │
                       │ Query
                       │
                 ┌─────▼──────┐
                 │  Grafana   │
                 │            │
                 │ Dashboards │
                 └────────────┘
```

## Quick Start

### 1. Start the Monitoring Stack

```bash
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

### 2. Access the Services

- **Grafana**: http://localhost:3001
  - Username: `admin`
  - Password: `admin`
- **Prometheus**: http://localhost:9090
- **Application Metrics**: http://localhost:3000/metrics
- **Application Health**: http://localhost:3000/api/v1/health

### 3. Import Dashboards

The main dashboard is automatically provisioned:
- **USDC Wallet Overview** - Complete application monitoring dashboard

## Available Metrics

### HTTP Metrics
- `usdc_wallet_http_request_duration_seconds` - Request latency histogram
- `usdc_wallet_http_requests_total` - Total HTTP requests counter
- `usdc_wallet_http_request_errors_total` - HTTP errors counter

### Transaction Metrics
- `usdc_wallet_transactions_total` - Total transactions by type and status
- `usdc_wallet_transaction_amount_usd` - Transaction amounts histogram
- `usdc_wallet_transaction_duration_seconds` - Transaction processing time
- `usdc_wallet_pending_transactions_gauge` - Current pending transactions

### Database Metrics
- `usdc_wallet_db_query_duration_seconds` - Query execution time
- `usdc_wallet_db_queries_total` - Total database queries
- `usdc_wallet_db_errors_total` - Database errors
- `usdc_wallet_db_connection_pool_size` - Connection pool metrics

### Cache Metrics
- `usdc_wallet_cache_hits_total` - Cache hits counter
- `usdc_wallet_cache_misses_total` - Cache misses counter
- `usdc_wallet_cache_operation_duration_seconds` - Cache operation latency

### External API Metrics
- `usdc_wallet_external_api_latency_seconds` - External API call latency
- `usdc_wallet_external_api_calls_total` - Total external API calls
- `usdc_wallet_external_api_errors_total` - External API errors

### Business Metrics
- `usdc_wallet_active_users_gauge` - Active users in last 24h
- `usdc_wallet_user_registrations_total` - User registrations
- `usdc_wallet_kyc_verifications_total` - KYC verifications
- `usdc_wallet_webhook_deliveries_total` - Webhook deliveries
- `usdc_wallet_webhook_failures_total` - Webhook failures

### System Metrics
- `usdc_wallet_nodejs_heap_size_total_bytes` - Total heap size
- `usdc_wallet_nodejs_heap_size_used_bytes` - Used heap size

## Health Check Endpoints

### Basic Health Check
```bash
curl http://localhost:3000/api/v1/health
```

Returns basic health status with database connectivity.

### Readiness Check
```bash
curl http://localhost:3000/api/v1/health/ready
```

Returns readiness status checking all dependencies:
- PostgreSQL database
- Redis cache
- Blnk API
- Circle API

### Liveness Check
```bash
curl http://localhost:3000/api/v1/health/live
```

Simple liveness probe for Kubernetes/Docker.

### Detailed Health Check
```bash
curl http://localhost:3000/api/v1/health/detailed
```

Returns comprehensive health information including:
- Service health with latency
- Environment information
- System uptime
- Memory usage

## Using Metrics in Code

### Recording HTTP Requests

The `MetricsInterceptor` automatically tracks all HTTP requests. No additional code needed.

### Recording Transactions

```typescript
import { MetricsService } from '@/modules/metrics';

@Injectable()
export class TransactionService {
  constructor(private readonly metricsService: MetricsService) {}

  async processTransaction(transaction: Transaction) {
    const startTime = Date.now();

    try {
      // Process transaction
      const result = await this.process(transaction);

      // Record success
      this.metricsService.recordTransaction(
        transaction.type,
        'success',
        transaction.amount,
        Date.now() - startTime
      );

      return result;
    } catch (error) {
      // Record failure
      this.metricsService.recordTransaction(
        transaction.type,
        'failed',
        transaction.amount,
        Date.now() - startTime
      );
      throw error;
    }
  }
}
```

### Recording External API Calls

```typescript
async callExternalApi(provider: string, endpoint: string) {
  const startTime = Date.now();

  try {
    const response = await fetch(endpoint);

    this.metricsService.recordExternalApiCall(
      provider,
      endpoint,
      response.status,
      Date.now() - startTime
    );

    return response;
  } catch (error) {
    this.metricsService.recordExternalApiCall(
      provider,
      endpoint,
      500,
      Date.now() - startTime
    );
    throw error;
  }
}
```

### Recording Cache Operations

```typescript
async getCachedData(key: string) {
  const startTime = Date.now();
  const data = await this.cache.get(key);

  const duration = Date.now() - startTime;
  this.metricsService.recordCacheOperation('get', duration);

  if (data) {
    this.metricsService.recordCacheHit('get', key);
  } else {
    this.metricsService.recordCacheMiss('get', key);
  }

  return data;
}
```

## Alerting Rules

Alert rules are defined in `prometheus/alerts.yml`:

### Critical Alerts
- **ServiceDown**: API is unreachable
- **CriticalErrorRate**: Error rate > 20%
- **DatabaseErrors**: Database error rate > 1/sec

### Warning Alerts
- **HighErrorRate**: Error rate > 5%
- **HighLatency**: p95 latency > 2s
- **SlowDatabaseQueries**: p95 query time > 1s
- **ExternalAPIErrors**: External API error rate > 10%
- **LowCacheHitRate**: Cache hit rate < 70%
- **HighPendingTransactions**: > 100 pending transactions
- **WebhookFailures**: Webhook failure rate > 1/sec
- **HighMemoryUsage**: Memory usage > 90%

## Configuration

### Prometheus Configuration

Edit `prometheus/prometheus.yml` to adjust:
- Scrape intervals
- Target endpoints
- External labels
- Alert rules

### Grafana Dashboard

The dashboard is located at `grafana/dashboards/usdc-wallet-overview.json`.

To modify:
1. Edit in Grafana UI
2. Export JSON
3. Replace the file

### Environment Variables

Set these in your `.env` file:

```env
# Metrics endpoint protection (optional)
METRICS_USERNAME=metrics
METRICS_PASSWORD=your-secret-password

# Enable detailed logging
LOG_LEVEL=info
NODE_ENV=production
```

## Best Practices

### 1. Metric Naming
Follow Prometheus naming conventions:
- Use `_total` suffix for counters
- Use `_seconds` for durations
- Use descriptive labels

### 2. Label Cardinality
Avoid high-cardinality labels:
- ✅ Good: `{method: "GET", path: "/users/:id"}`
- ❌ Bad: `{method: "GET", path: "/users/123"}` (unique IDs)

### 3. Histogram Buckets
Choose appropriate buckets for your metrics:
- HTTP latency: `[0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10]`
- Transaction amounts: `[1, 10, 50, 100, 500, 1000, 5000, 10000]`

### 4. Logging
Use structured JSON logging for better parsing:
```typescript
logger.log(JSON.stringify({
  requestId: 'abc-123',
  userId: 'user-456',
  action: 'transfer',
  amount: 100,
  duration: '234ms'
}));
```

## Troubleshooting

### Metrics Not Showing Up

1. Check if Prometheus is scraping:
   ```bash
   curl http://localhost:9090/api/v1/targets
   ```

2. Check application metrics endpoint:
   ```bash
   curl http://localhost:3000/metrics
   ```

3. Verify Prometheus configuration:
   ```bash
   docker logs usdc-wallet-prometheus
   ```

### High Memory Usage

1. Check retention period in Prometheus config
2. Reduce scrape intervals for less critical metrics
3. Limit number of time series (reduce label cardinality)

### Missing Data in Grafana

1. Check Prometheus data source connection
2. Verify metric names in queries
3. Check time range selection

## Production Deployment

### Security

1. **Protect metrics endpoint**:
   ```typescript
   // Add authentication to /metrics endpoint
   ```

2. **Use HTTPS** for Grafana and Prometheus

3. **Restrict network access** to monitoring services

### Scaling

1. **Prometheus Federation** for multi-region deployments
2. **Remote Storage** (e.g., Thanos, Cortex) for long-term storage
3. **Alert Manager** for alert routing and deduplication

### Backup

1. Backup Grafana dashboards regularly
2. Export Prometheus data for long-term storage
3. Version control alert rules and configurations

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [NestJS Prometheus](https://github.com/willsoto/nestjs-prometheus)
- [Best Practices for Monitoring](https://prometheus.io/docs/practices/naming/)

## Support

For issues or questions:
1. Check application logs
2. Review Prometheus alerts
3. Consult Grafana dashboards
4. Contact DevOps team
