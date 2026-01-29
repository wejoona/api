# Performance Monitoring & Profiling

Comprehensive performance monitoring system for the USDC Wallet backend.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [APM Integration](#apm-integration)
- [Performance Profiling](#performance-profiling)
- [Metrics & Monitoring](#metrics--monitoring)
- [Query Optimization](#query-optimization)
- [Cache Optimization](#cache-optimization)
- [API Reference](#api-reference)
- [Grafana Dashboards](#grafana-dashboards)
- [Troubleshooting](#troubleshooting)

## Overview

The performance monitoring system provides:

- **Real-time Performance Tracking**: Monitor request latency, database queries, and cache performance
- **APM Integration**: Support for New Relic and Datadog
- **Automated Profiling**: Automatic detection of slow queries, N+1 problems, and performance bottlenecks
- **Prometheus Metrics**: Export metrics for Grafana dashboards
- **Optimization Recommendations**: AI-powered recommendations for improving performance

## Quick Start

### 1. Enable Performance Profiling

Add to `.env`:

```bash
# Performance Monitoring
APM_ENABLED=true
APM_PROVIDER=datadog  # or 'newrelic', 'none'
APM_SERVICE_NAME=usdc-wallet
APP_VERSION=1.0.0

# Datadog (if using)
DD_API_KEY=your_datadog_api_key
DD_SITE=datadoghq.com

# New Relic (if using)
NEW_RELIC_LICENSE_KEY=your_license_key
NEW_RELIC_APP_NAME=usdc-wallet
```

### 2. Install APM Provider (Optional)

```bash
# For Datadog
npm install dd-trace

# For New Relic
npm install newrelic
```

### 3. Access Profiling Dashboard

Admin/developer endpoints (requires authentication):

```bash
# Performance report
GET /api/v1/profiling/report

# Slow queries
GET /api/v1/profiling/slow-queries

# Cache statistics
GET /api/v1/profiling/cache

# Endpoint performance
GET /api/v1/profiling/endpoints
```

### 4. Prometheus Metrics

```bash
# Available at
GET /metrics
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                       │
├─────────────────────────────────────────────────────────────┤
│  PerformanceInterceptor                                     │
│  ├─ Request Tracking                                        │
│  ├─ Latency Percentiles (p50, p95, p99)                    │
│  ├─ Memory Usage                                            │
│  └─ Slow Request Detection                                  │
├─────────────────────────────────────────────────────────────┤
│  DatabaseProfiler                                           │
│  ├─ Query Duration Tracking                                 │
│  ├─ N+1 Detection                                           │
│  ├─ Slow Query Analysis                                     │
│  └─ Index Recommendations                                   │
├─────────────────────────────────────────────────────────────┤
│  CacheProfiler                                              │
│  ├─ Hit/Miss Tracking                                       │
│  ├─ Cache Efficiency                                        │
│  ├─ TTL Optimization                                        │
│  └─ Key Usage Analysis                                      │
├─────────────────────────────────────────────────────────────┤
│  ProfilingService                                           │
│  ├─ Comprehensive Reports                                   │
│  ├─ Optimization Recommendations                            │
│  ├─ Database Statistics                                     │
│  └─ System Resource Monitoring                              │
├─────────────────────────────────────────────────────────────┤
│  MetricsService (Prometheus)                                │
│  ├─ HTTP Request Metrics                                    │
│  ├─ Database Metrics                                        │
│  ├─ Cache Metrics                                           │
│  ├─ External API Metrics                                    │
│  └─ Business Metrics                                        │
├─────────────────────────────────────────────────────────────┤
│  APM Integration                                            │
│  ├─ Transaction Tracing                                     │
│  ├─ Custom Events                                           │
│  ├─ Error Tracking                                          │
│  └─ User Context                                            │
└─────────────────────────────────────────────────────────────┘
```

## APM Integration

### Datadog

1. **Install Datadog APM**:
   ```bash
   npm install dd-trace
   ```

2. **Configure**:
   ```bash
   APM_ENABLED=true
   APM_PROVIDER=datadog
   DD_API_KEY=your_key
   DD_SITE=datadoghq.com
   ```

3. **Features**:
   - Distributed tracing
   - APM dashboards
   - Log correlation
   - Custom metrics

### New Relic

1. **Install New Relic**:
   ```bash
   npm install newrelic
   ```

2. **Configure**:
   ```bash
   APM_ENABLED=true
   APM_PROVIDER=newrelic
   NEW_RELIC_LICENSE_KEY=your_key
   NEW_RELIC_APP_NAME=usdc-wallet
   ```

3. **Features**:
   - Application monitoring
   - Transaction traces
   - Error analytics
   - Custom dashboards

## Performance Profiling

### Request Performance

The `PerformanceInterceptor` automatically tracks:

- **Latency**: p50, p95, p99 percentiles per endpoint
- **Memory**: Heap usage delta per request
- **Query Count**: Number of database queries per request
- **Slow Requests**: Automatic logging of requests >1s

**Example slow request log**:
```json
{
  "type": "slow_request",
  "method": "POST",
  "endpoint": "/api/v1/transfers",
  "duration": "2543ms",
  "threshold": "1000ms",
  "statusCode": 200,
  "queryCount": 15,
  "memoryDelta": "12.45MB",
  "percentiles": {
    "p50": "234ms",
    "p95": "1834ms",
    "p99": "2543ms"
  },
  "recommendation": [
    "High query count (15) - possible N+1 problem",
    "Add database indexes or use query optimization"
  ]
}
```

### Database Performance

The `DatabaseProfiler` extends TypeORM logger to track:

- **Slow Queries**: Queries >100ms (configurable)
- **N+1 Detection**: Automatically detects repeated queries
- **Query Analysis**: Generates optimization recommendations
- **Index Suggestions**: Recommends missing indexes

**Example slow query log**:
```json
{
  "type": "slow_query",
  "executionTime": "342ms",
  "query": "SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC",
  "table": "transactions",
  "operation": "SELECT",
  "recommendations": [
    "Avoid SELECT * - specify only needed columns",
    "Add index on ORDER BY columns for faster sorting"
  ]
}
```

### Cache Performance

The `CacheProfiler` tracks:

- **Hit/Miss Rates**: Overall and per-key
- **Operation Duration**: GET, SET, DELETE timings
- **Key Usage**: Most/least accessed keys
- **Efficiency**: Cache effectiveness recommendations

## Metrics & Monitoring

### Prometheus Metrics

Available at `/metrics`:

#### HTTP Metrics
- `usdc_wallet_http_request_duration_seconds` - Request latency histogram
- `usdc_wallet_http_requests_total` - Total requests counter
- `usdc_wallet_http_request_errors_total` - Error counter

#### Database Metrics
- `usdc_wallet_db_query_duration_seconds` - Query latency histogram
- `usdc_wallet_db_queries_total` - Total queries counter
- `usdc_wallet_db_errors_total` - Database error counter
- `usdc_wallet_db_connection_pool_size` - Connection pool gauge

#### Cache Metrics
- `usdc_wallet_cache_hits_total` - Cache hits counter
- `usdc_wallet_cache_misses_total` - Cache misses counter
- `usdc_wallet_cache_operation_duration_seconds` - Cache operation latency

#### Transaction Metrics
- `usdc_wallet_transactions_total` - Total transactions
- `usdc_wallet_transaction_amount_usd` - Transaction amounts
- `usdc_wallet_transaction_duration_seconds` - Transaction processing time

#### External API Metrics
- `usdc_wallet_external_api_latency_seconds` - API call latency
- `usdc_wallet_external_api_calls_total` - API call counter
- `usdc_wallet_external_api_errors_total` - API error counter

## Query Optimization

### Finding Slow Queries

```bash
# Get slow queries report
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/profiling/slow-queries
```

**Response**:
```json
{
  "slowQueries": [
    {
      "query": "SELECT * FROM transactions WHERE ...",
      "count": 245,
      "avgDuration": 342,
      "maxDuration": 1234,
      "lastSeen": 1706543210000
    }
  ],
  "n1Patterns": [
    {
      "query": "SELECT * FROM users WHERE id = $1",
      "occurrences": 156,
      "avgDuration": 45,
      "recommendation": "Use eager loading or JOIN to fetch users data..."
    }
  ]
}
```

### Adding Indexes

```bash
# Get index recommendations
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/profiling/database/missing-indexes
```

**Response**:
```json
{
  "recommendations": [
    {
      "table": "transactions",
      "columns": ["user_id", "created_at"],
      "reason": "High sequential scan count (1234) vs index scan (5)",
      "priority": "high",
      "estimatedImpact": "Could reduce 1234 sequential scans"
    }
  ]
}
```

**Create index**:
```sql
-- Example: Add composite index for transactions
CREATE INDEX idx_transactions_user_created
  ON transactions(user_id, created_at DESC);

-- Example: Add index for wallet lookups
CREATE INDEX idx_wallets_user_id
  ON wallets(user_id)
  WHERE deleted_at IS NULL;
```

## Cache Optimization

### Cache Statistics

```bash
# Get cache performance
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/profiling/cache
```

**Response**:
```json
{
  "overall": {
    "totalHits": 15234,
    "totalMisses": 3421,
    "hitRate": 81.67,
    "totalOperations": 18655,
    "avgDuration": 12.34
  },
  "mostAccessed": [
    {
      "key": "wallet::id",
      "totalAccess": 8234,
      "hitRate": 95.2
    }
  ],
  "recommendations": [
    {
      "key": "user_preferences::id",
      "issue": "Low cache hit rate: 42.3%",
      "recommendation": "Review cache invalidation strategy or increase TTL",
      "priority": "high"
    }
  ]
}
```

### Optimization Strategies

1. **Increase TTL** for stable data:
   ```typescript
   await cacheManager.set('key', value, 3600000); // 1 hour
   ```

2. **Pre-warm cache** for frequently accessed data:
   ```typescript
   @Cron('0 */6 * * *') // Every 6 hours
   async warmCache() {
     const popularData = await this.getPopularData();
     await Promise.all(
       popularData.map(data =>
         this.cacheManager.set(`data:${data.id}`, data, 7200000)
       )
     );
   }
   ```

3. **Use cache-aside pattern**:
   ```typescript
   async getData(id: string) {
     const cached = await this.cacheManager.get(`data:${id}`);
     if (cached) return cached;

     const data = await this.repository.findOne(id);
     await this.cacheManager.set(`data:${id}`, data);
     return data;
   }
   ```

## API Reference

### Profiling Endpoints

All endpoints require admin/developer role.

#### GET /profiling/report
Get comprehensive performance report.

**Response**:
```json
{
  "timestamp": "2024-01-29T10:30:00.000Z",
  "endpoints": [...],
  "database": {...},
  "cache": {...},
  "optimizations": [...],
  "system": {...}
}
```

#### GET /profiling/endpoints
Get endpoint latency statistics.

#### GET /profiling/slow-queries
Get slow database queries and N+1 patterns.

#### GET /profiling/cache
Get cache performance statistics.

#### GET /profiling/database/tables
Get database table statistics.

#### GET /profiling/database/active-queries
Get currently running queries.

#### GET /profiling/database/connection-pool
Get connection pool statistics.

#### GET /profiling/database/missing-indexes
Get recommendations for missing indexes.

#### GET /profiling/system
Get system resource statistics.

#### POST /profiling/reset
Reset profiler statistics.

## Grafana Dashboards

See `grafana-dashboard.json` for a pre-configured Grafana dashboard.

### Key Panels

1. **Request Latency**: p50, p95, p99 percentiles
2. **Database Performance**: Query duration, connection pool
3. **Cache Efficiency**: Hit rate, operation duration
4. **External APIs**: Latency by provider
5. **Error Rates**: HTTP errors, database errors
6. **System Resources**: Memory, CPU usage

### Import Dashboard

1. Open Grafana
2. Go to Dashboards → Import
3. Upload `grafana-dashboard.json`
4. Select Prometheus data source
5. Click Import

## Troubleshooting

### High Latency

**Symptoms**: Requests taking >1s

**Diagnosis**:
```bash
# Check slow endpoints
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/profiling/endpoints

# Check slow queries
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/profiling/slow-queries
```

**Solutions**:
- Add database indexes
- Implement caching
- Optimize N+1 queries
- Use eager loading

### High Memory Usage

**Symptoms**: Memory increasing over time

**Diagnosis**:
```bash
# Check system stats
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/profiling/system
```

**Solutions**:
- Check for memory leaks in request handlers
- Review large object allocations
- Implement pagination for large datasets
- Use streaming for file uploads

### Low Cache Hit Rate

**Symptoms**: Hit rate <70%

**Diagnosis**:
```bash
# Check cache stats
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/profiling/cache
```

**Solutions**:
- Increase TTL for stable data
- Pre-warm cache for popular data
- Review cache invalidation strategy
- Add cache for frequently accessed data

### N+1 Query Problems

**Symptoms**: High query count per request

**Diagnosis**:
```bash
# Check N+1 patterns
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/profiling/slow-queries
```

**Solutions**:
```typescript
// Before: N+1 problem
const users = await userRepo.find();
for (const user of users) {
  user.wallet = await walletRepo.findOne({ userId: user.id });
}

// After: Use relations
const users = await userRepo.find({
  relations: ['wallet']
});
```

## Best Practices

### 1. Monitor Key Metrics

Set up alerts for:
- Request latency p95 > 1s
- Database query time p95 > 500ms
- Cache hit rate < 70%
- Error rate > 1%

### 2. Regular Performance Reviews

Weekly:
- Review slow query report
- Check N+1 patterns
- Analyze cache efficiency

Monthly:
- Review and add missing indexes
- Optimize high-traffic endpoints
- Update cache TTL strategies

### 3. Development Guidelines

- Always use eager loading when accessing relations
- Add indexes for WHERE, ORDER BY, JOIN columns
- Cache frequently accessed, rarely changing data
- Paginate large result sets
- Use database transactions for consistency

### 4. Production Monitoring

- Enable APM in production
- Set up Grafana dashboards
- Configure alerting
- Regular performance audits

## Resources

- [TypeORM Query Optimization](https://typeorm.io/select-query-builder#using-pagination)
- [PostgreSQL Performance Tips](https://www.postgresql.org/docs/current/performance-tips.html)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Grafana Documentation](https://grafana.com/docs/)

## Support

For performance issues or questions:
- Check logs: `tail -f logs/performance.log`
- Review Grafana dashboards
- Contact DevOps team
- Create performance issue ticket
