# Performance Profiling Implementation Summary

Complete performance monitoring system for USDC Wallet backend.

## 📦 What Was Implemented

### 1. Core Components

#### Performance Interceptor
**File**: `/src/common/interceptors/performance.interceptor.ts`

- Tracks request latency (p50, p95, p99 percentiles)
- Monitors memory usage per request
- Detects slow requests (>1s threshold)
- Counts database queries per request
- Provides optimization recommendations

#### Database Profiler
**File**: `/src/common/profilers/database.profiler.ts`

- Extends TypeORM logger for query tracking
- Detects slow queries (>100ms)
- Identifies N+1 query patterns
- Generates index recommendations
- Tracks query statistics and trends

#### Cache Profiler
**File**: `/src/common/profilers/cache.profiler.ts`

- Monitors cache hit/miss rates
- Tracks operation durations
- Analyzes cache efficiency
- Provides TTL optimization suggestions
- Reports most/least accessed keys

#### APM Integration
**File**: `/src/common/apm/apm.service.ts`

- Unified interface for APM providers
- Supports New Relic and Datadog
- Transaction tracing
- Custom events and metrics
- Error tracking with context

#### Profiling Service
**File**: `/src/modules/profiling/profiling.service.ts`

- Comprehensive performance reports
- Database statistics and analysis
- Missing index detection
- Connection pool monitoring
- System resource tracking

#### Profiling Controller
**File**: `/src/modules/profiling/profiling.controller.ts`

Admin/developer endpoints:
- `GET /profiling/report` - Full performance report
- `GET /profiling/slow-queries` - Slow query analysis
- `GET /profiling/cache` - Cache statistics
- `GET /profiling/endpoints` - Endpoint latency
- `GET /profiling/database/tables` - Table statistics
- `GET /profiling/database/missing-indexes` - Index recommendations
- `POST /profiling/reset` - Reset statistics

### 2. Configuration

#### Environment Variables
**File**: `.env.example.profiling`

```bash
APM_ENABLED=true
APM_PROVIDER=datadog  # or newrelic
APM_SERVICE_NAME=usdc-wallet
DD_API_KEY=your_key
```

#### App Module Updates
**File**: `/src/app.module.ts`

- Added ProfilingModule
- Registered ApmService globally
- Integrated DatabaseProfiler

#### Config Updates
**File**: `/src/config/configuration.ts`

Added APM configuration section.

### 3. Metrics & Monitoring

#### Prometheus Metrics
**Endpoint**: `/metrics`

Tracks:
- HTTP request duration and count
- Database query performance
- Cache hit/miss rates
- External API latency
- Transaction volumes
- System resources

#### Grafana Dashboard
**File**: `grafana-dashboard.json`

Pre-configured panels for:
- Request latency percentiles
- Database performance
- Cache efficiency
- Error rates
- Transaction volumes
- System resources

### 4. Documentation

#### Main Documentation
**File**: `PERFORMANCE_MONITORING.md`

- Complete monitoring guide
- APM integration instructions
- Query optimization strategies
- Cache optimization patterns
- API reference
- Troubleshooting guide

#### Optimization Guide
**File**: `docs/OPTIMIZATION_GUIDE.md`

- Database indexing strategies
- Query optimization patterns
- N+1 prevention techniques
- Caching best practices
- Memory optimization

#### Quick Start Guide
**File**: `docs/profiling/QUICK_START.md`

- 5-minute setup guide
- Common commands
- Example outputs
- Troubleshooting

#### Database Indexes
**File**: `docs/profiling/DATABASE_INDEXES.md`

- Migration template
- Essential indexes
- Index verification queries
- Maintenance guide

## 🚀 Quick Start

### 1. Install Dependencies (Optional)

```bash
# For Datadog
npm install dd-trace

# For New Relic
npm install newrelic
```

### 2. Configure Environment

```bash
# Copy profiling env example
cat .env.example.profiling >> .env

# Edit with your APM keys
vim .env
```

### 3. Start Server

```bash
npm run start:dev
```

### 4. Access Profiling

```bash
# Get metrics
curl http://localhost:3000/metrics

# Get performance report (needs admin auth)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/profiling/report
```

## 📊 What Gets Tracked

### Automatically Logged

✅ **Slow Requests** (>1s):
```json
{
  "type": "slow_request",
  "method": "POST",
  "endpoint": "/api/v1/transfers",
  "duration": "2543ms",
  "queryCount": 15,
  "memoryDelta": "12.45MB",
  "recommendation": ["High query count - possible N+1 problem"]
}
```

✅ **Slow Queries** (>100ms):
```json
{
  "type": "slow_query",
  "executionTime": "342ms",
  "query": "SELECT * FROM transactions WHERE ...",
  "recommendations": [
    "Add index on WHERE clause columns",
    "Avoid SELECT * - specify needed columns"
  ]
}
```

✅ **N+1 Detection**:
```json
{
  "type": "n1_detection",
  "query": "SELECT * FROM users WHERE id = $1",
  "occurrences": 156,
  "recommendation": "Use eager loading or JOIN"
}
```

### Prometheus Metrics

**HTTP**:
- `usdc_wallet_http_request_duration_seconds`
- `usdc_wallet_http_requests_total`
- `usdc_wallet_http_request_errors_total`

**Database**:
- `usdc_wallet_db_query_duration_seconds`
- `usdc_wallet_db_queries_total`
- `usdc_wallet_db_connection_pool_size`

**Cache**:
- `usdc_wallet_cache_hits_total`
- `usdc_wallet_cache_misses_total`
- `usdc_wallet_cache_operation_duration_seconds`

**Business**:
- `usdc_wallet_transactions_total`
- `usdc_wallet_transaction_amount_usd`
- `usdc_wallet_external_api_latency_seconds`

## 🔍 Key Features

### 1. Request Performance Tracking

- **Latency Percentiles**: p50, p95, p99 per endpoint
- **Memory Tracking**: Heap usage delta per request
- **Query Counting**: Detects high query count
- **Automatic Alerts**: Logs slow requests with recommendations

### 2. Database Profiling

- **Slow Query Detection**: Configurable threshold (default 100ms)
- **N+1 Detection**: Identifies repeated query patterns
- **Index Analysis**: Recommends missing indexes
- **Query History**: Tracks query performance over time

### 3. Cache Analysis

- **Hit Rate Tracking**: Overall and per-key metrics
- **Efficiency Analysis**: Identifies underutilized cache
- **TTL Optimization**: Suggests better caching strategies
- **Key Usage**: Reports most/least accessed keys

### 4. APM Integration

- **Distributed Tracing**: Track requests across services
- **Custom Events**: Business metric tracking
- **Error Context**: Detailed error reporting
- **User Tracking**: Correlate performance with users

### 5. Optimization Recommendations

The system automatically generates recommendations:

- Add database indexes for slow queries
- Use eager loading for N+1 patterns
- Increase cache TTL for stable data
- Implement pagination for large datasets
- Optimize query structure

## 📈 Performance Impact

Expected improvements after implementing recommendations:

- **Query Times**: 50-90% reduction
- **API Response**: 30-60% faster
- **Cache Hit Rate**: 70-95%
- **Database CPU**: 20-40% reduction
- **Memory Usage**: More stable, fewer leaks

## 🎯 Common Use Cases

### Finding Slow Endpoints

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/profiling/endpoints
```

Returns endpoints sorted by p99 latency.

### Identifying Missing Indexes

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/profiling/database/missing-indexes
```

Returns tables with high sequential scan counts.

### Optimizing Cache

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/profiling/cache
```

Returns cache efficiency metrics and recommendations.

### Monitoring Production

```bash
# View Grafana dashboard
http://localhost:3000/grafana

# Check Prometheus metrics
http://localhost:3000/metrics

# View APM dashboard
# Datadog: https://app.datadoghq.com
# New Relic: https://one.newrelic.com
```

## 🔧 Customization

### Adjust Thresholds

```typescript
// src/common/interceptors/performance.interceptor.ts
private readonly slowRequestThreshold = 2000; // 2 seconds

// src/common/profilers/database.profiler.ts
private readonly slowQueryThreshold = 200; // 200ms

// src/common/profilers/cache.profiler.ts
private readonly slowCacheThreshold = 100; // 100ms
```

### Add Custom Metrics

```typescript
// In your service
constructor(private readonly metricsService: MetricsService) {}

async processPayment(amount: number) {
  const startTime = Date.now();

  // Your logic here

  // Record custom metric
  this.metricsService.recordTransaction(
    'payment',
    'completed',
    amount,
    Date.now() - startTime
  );
}
```

### Custom APM Events

```typescript
// In your service
constructor(private readonly apmService: ApmService) {}

async criticalOperation() {
  this.apmService.recordEvent('CriticalOperation', {
    userId: 'user_id',
    operationType: 'transfer',
    amount: 1000
  });
}
```

## 📋 Maintenance Checklist

### Daily
- [ ] Check error rates in Grafana
- [ ] Review slow request logs

### Weekly
- [ ] Review slow query report
- [ ] Check N+1 patterns
- [ ] Monitor cache efficiency
- [ ] Review APM dashboards

### Monthly
- [ ] Add missing indexes
- [ ] Optimize high-traffic endpoints
- [ ] Update cache TTL strategies
- [ ] Review and remove unused indexes

### Quarterly
- [ ] Database VACUUM and ANALYZE
- [ ] Performance load testing
- [ ] Capacity planning review
- [ ] Schema optimization

## 🐛 Troubleshooting

### Profiling endpoints return 403

Grant admin role:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

### No metrics in Prometheus

Check:
1. `/metrics` endpoint is accessible
2. Prometheus scrape config
3. `METRICS_PATH` in `.env`

### APM not working

Verify:
1. `APM_ENABLED=true` in `.env`
2. API keys are correct
3. Provider package is installed
4. Check server logs for errors

### High memory usage

1. Check slow requests with high memory delta
2. Review large object allocations
3. Implement pagination
4. Use streaming for large files

## 📚 Resources

- [PERFORMANCE_MONITORING.md](PERFORMANCE_MONITORING.md) - Full guide
- [OPTIMIZATION_GUIDE.md](docs/OPTIMIZATION_GUIDE.md) - Optimization tips
- [QUICK_START.md](docs/profiling/QUICK_START.md) - Quick setup
- [DATABASE_INDEXES.md](docs/profiling/DATABASE_INDEXES.md) - Index guide

## 🎉 Summary

You now have:

✅ Comprehensive performance monitoring
✅ APM integration (Datadog/New Relic)
✅ Automatic profiling and recommendations
✅ Prometheus metrics export
✅ Grafana dashboards
✅ Database query optimization tools
✅ Cache performance analysis
✅ N+1 query detection
✅ Complete documentation

The system is production-ready and will help identify and fix performance issues proactively.

## Next Steps

1. **Enable in staging**: Test with staging data
2. **Add indexes**: Run migration from DATABASE_INDEXES.md
3. **Configure alerts**: Set up Grafana alerts
4. **Enable APM**: Configure Datadog or New Relic
5. **Monitor**: Review weekly performance reports
6. **Optimize**: Implement recommendations from profiling

---

**Questions?** Check the documentation or review the inline code comments.
