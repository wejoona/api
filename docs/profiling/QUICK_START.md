# Performance Profiling - Quick Start

Get started with performance profiling in 5 minutes.

## Step 1: Enable Profiling

Add to `.env`:

```bash
# Enable APM (optional but recommended)
APM_ENABLED=true
APM_PROVIDER=datadog  # or 'newrelic'
APM_SERVICE_NAME=usdc-wallet

# Datadog (if using)
DD_API_KEY=your_api_key
```

## Step 2: Start the Server

```bash
npm run start:dev
```

The profiling system is now active and collecting metrics.

## Step 3: Access Metrics

### Prometheus Metrics
```bash
curl http://localhost:3000/metrics
```

### Performance Report (requires admin auth)
```bash
# Get auth token first
TOKEN=$(curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@joonapay.com","password":"your_password"}' \
  | jq -r '.accessToken')

# Get performance report
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/profiling/report | jq
```

## Step 4: View Slow Queries

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/profiling/slow-queries | jq
```

**Example output**:
```json
{
  "slowQueries": [
    {
      "query": "SELECT * FROM transactions WHERE ...",
      "count": 245,
      "avgDuration": 342,
      "maxDuration": 1234
    }
  ],
  "n1Patterns": [
    {
      "query": "SELECT * FROM users WHERE id = $1",
      "occurrences": 156,
      "recommendation": "Use eager loading or JOIN"
    }
  ]
}
```

## Step 5: Check Cache Performance

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/profiling/cache | jq
```

**Example output**:
```json
{
  "overall": {
    "totalHits": 15234,
    "totalMisses": 3421,
    "hitRate": 81.67
  },
  "recommendations": [
    {
      "key": "user_preferences::id",
      "issue": "Low cache hit rate: 42.3%",
      "recommendation": "Review cache invalidation strategy",
      "priority": "high"
    }
  ]
}
```

## Step 6: Setup Grafana (Optional)

1. Import the dashboard:
   ```bash
   # Copy the dashboard JSON
   cat grafana-dashboard.json
   ```

2. In Grafana:
   - Go to Dashboards → Import
   - Paste JSON
   - Select Prometheus data source
   - Click Import

3. View metrics in real-time at:
   `http://localhost:3000/grafana`

## Common Commands

### Get Endpoint Performance
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/profiling/endpoints
```

### Get Database Statistics
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/profiling/database/tables
```

### Get Missing Indexes
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/profiling/database/missing-indexes
```

### Reset Profiler Statistics
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/profiling/reset
```

## What Gets Tracked?

### Automatically Tracked:
- ✅ Request latency (p50, p95, p99)
- ✅ Database query duration
- ✅ Cache hit/miss rates
- ✅ External API calls
- ✅ Memory usage
- ✅ N+1 query detection

### Logged Automatically:
- 🐌 Slow requests (>1s)
- 🐌 Slow queries (>100ms)
- 🐌 Slow cache operations (>50ms)
- ⚠️ N+1 query patterns
- ❌ Database errors
- ❌ API errors

## Next Steps

1. **Review slow queries** and add indexes
2. **Check N+1 patterns** and use eager loading
3. **Optimize cache** TTL and pre-warm popular data
4. **Setup alerts** in Grafana for critical metrics
5. **Enable APM** in production for detailed tracing

## Troubleshooting

### Profiling endpoints return 403
You need admin or developer role:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

### No metrics showing in Prometheus
- Check `/metrics` endpoint is accessible
- Verify Prometheus is scraping the correct port
- Check `METRICS_PATH` in `.env`

### APM not working
- Verify `APM_ENABLED=true` in `.env`
- Check API keys are correct
- Review logs for APM initialization errors

## Documentation

- Full guide: [PERFORMANCE_MONITORING.md](../../PERFORMANCE_MONITORING.md)
- Optimization tips: [OPTIMIZATION_GUIDE.md](../OPTIMIZATION_GUIDE.md)
- Database indexes: [migration guide](./DATABASE_INDEXES.md)
