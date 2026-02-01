# Database Query Benchmarks

Comprehensive benchmark suite for measuring and optimizing database query performance in the JoonaPay USDC Wallet backend.

## Overview

This benchmark suite measures query execution times, memory usage, and throughput for critical database operations across three main modules:

- **Transaction Queries** - Payment transaction operations (deposits, transfers, withdrawals)
- **User Queries** - User management and authentication operations
- **Wallet Queries** - Wallet management and provider integration queries

## Features

- Query execution time measurement (milliseconds)
- Database query count tracking
- Memory usage monitoring
- Throughput calculation (queries/second)
- Cache performance analysis (for user queries)
- Concurrent query performance testing
- Slow query identification
- Performance threshold validation
- Detailed benchmark reports with color-coded results

## Running Benchmarks

### Run All Benchmarks

```bash
npm run test:benchmark
```

### Run Specific Benchmark

```bash
# Transaction queries
npm run test:benchmark:transactions

# User queries
npm run test:benchmark:users

# Wallet queries
npm run test:benchmark:wallets
```

### Run with Custom Database

```bash
DB_HOST=localhost \
DB_PORT=5432 \
DB_USERNAME=postgres \
DB_PASSWORD=postgres \
DB_NAME=joonapay_bench \
npm run test:benchmark
```

## Performance Thresholds

### Transaction Queries

| Operation | Threshold | Description |
|-----------|-----------|-------------|
| findById | 50ms | Single transaction lookup by ID |
| findByWalletId | 100ms | Get all transactions for a wallet |
| findByWalletIdPaginated | 150ms | Paginated transaction history |
| findByWalletIdFiltered | 200ms | Advanced filtering with search |
| getDailyTransferVolume | 100ms | Calculate daily transfer totals |
| getTransactionStats | 300ms | Aggregate statistics |
| getTransactionTimeSeries | 500ms | 30-day time series data |
| findByDateRange | 250ms | Date range queries |
| bulkInsert | 1000ms | Insert 100 transactions |

### User Queries

| Operation | Threshold | Description |
|-----------|-----------|-------------|
| findById | 30ms | User lookup by ID (cache miss) |
| findByIdCached | 5ms | User lookup by ID (cache hit) |
| findByPhone | 40ms | User lookup by phone number |
| findByUsername | 40ms | User lookup by username |
| searchByUsername | 100ms | Username search with LIKE |
| existsByPhone | 30ms | Check phone number existence |
| existsByUsername | 30ms | Check username existence |
| findAll | 200ms | Get all users |
| concurrentReads | 150ms | 10 concurrent read operations |

### Wallet Queries

| Operation | Threshold | Description |
|-----------|-----------|-------------|
| findById | 30ms | Wallet lookup by ID |
| findByUserId | 40ms | Wallet lookup by user ID |
| findByCircleWalletId | 40ms | Circle wallet integration lookup |
| findByYellowCardWalletId | 40ms | Yellow Card integration lookup |
| findByProviderWalletId | 50ms | Generic provider lookup (tries both) |
| findAll | 200ms | Get all wallets |
| save | 50ms | Insert or update wallet |
| bulkInsert | 500ms | Insert 50 wallets |
| concurrentReads | 100ms | 20 concurrent read operations |

## Benchmark Report Format

```
================================================================================
TRANSACTION QUERY BENCHMARK REPORT
================================================================================

Total Tests: 15 | PASS: 12 | WARN: 2 | FAIL: 1

Operation                                     Time (ms)   Queries   Records   Memory (MB)   Status
----------------------------------------------------------------------------------------------------
findById                                      12.45       1         1         0.12          PASS (threshold: 50ms)
findByWalletId                                78.32       1         50        0.45          WARN (threshold: 100ms)
findByWalletIdPaginated                       45.67       1         20        0.23          PASS (threshold: 150ms)
getTransactionStats                           245.89      3         1         0.67          PASS (threshold: 300ms)
...

SLOW QUERIES DETECTED:

  - findByWalletIdFiltered: 215.34ms (threshold: 200ms)
    Recommendation: Review query optimization, add indexes, or increase resources
```

## Status Indicators

- **PASS** (Green) - Execution time < 70% of threshold
- **WARN** (Yellow) - Execution time between 70-100% of threshold
- **FAIL** (Red) - Execution time > threshold

## Optimization Recommendations

### Transaction Queries

**Slow findByWalletId:**
- Ensure composite index exists: `idx_transactions_wallet_date (walletId, createdAt DESC)`
- Consider partitioning by date for large transaction volumes
- Use pagination for large result sets

**Slow aggregate queries:**
- Add materialized views for frequently accessed statistics
- Implement incremental aggregation with triggers
- Use Redis caching for real-time stats

**Slow search queries:**
- Add GIN index for full-text search on text columns
- Implement ElasticSearch for complex search requirements
- Limit search to recent transactions with date filters

### User Queries

**Slow findById (cache miss):**
- Verify Redis connection and performance
- Increase cache TTL for frequently accessed users
- Add connection pooling for Redis

**Slow searchByUsername:**
- Add GIN index on username column: `CREATE INDEX idx_users_username_gin ON users USING GIN(username gin_trgm_ops)`
- Limit search results with appropriate pagination
- Implement autocomplete with dedicated search service

**Slow findByPhone/findByUsername:**
- Verify indexes exist on phone and username columns
- Ensure UNIQUE constraints leverage index
- Consider case-insensitive indexes for username

### Wallet Queries

**Slow findByUserId:**
- Add index: `CREATE INDEX idx_wallets_user_id ON wallets(userId)`
- Ensure one-to-one relationship is enforced
- Cache wallet lookups by user ID

**Slow findByProviderWalletId:**
- Add composite index: `CREATE INDEX idx_wallets_providers ON wallets(circleWalletId, yellowCardWalletId)`
- Separate Circle and Yellow Card lookups into distinct queries
- Cache provider wallet mappings

**Slow concurrent operations:**
- Increase database connection pool size
- Enable connection pooling in TypeORM config
- Consider read replicas for read-heavy workloads

## Database Indexes

### Required Indexes

```sql
-- Transactions
CREATE INDEX idx_transactions_wallet_date ON transactions(walletId, createdAt DESC);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_provider_ref ON transactions(yellowCardRef);

-- Users
CREATE UNIQUE INDEX idx_users_phone ON users(phone);
CREATE UNIQUE INDEX idx_users_username ON users(LOWER(username));
CREATE INDEX idx_users_username_gin ON users USING GIN(username gin_trgm_ops);

-- Wallets
CREATE UNIQUE INDEX idx_wallets_user_id ON wallets(userId);
CREATE INDEX idx_wallets_circle_wallet_id ON wallets(circleWalletId);
CREATE INDEX idx_wallets_yellow_card_wallet_id ON wallets(yellowCardWalletId);
```

## Test Data

Each benchmark suite creates isolated test data:

- **Transactions:** 200 test transactions across multiple wallets
- **Users:** 100 test users with varied attributes
- **Wallets:** 100 test wallets with provider integrations

Test data is automatically cleaned up after each benchmark run.

## Continuous Integration

Add benchmarks to your CI/CD pipeline to track performance regressions:

```yaml
# .github/workflows/benchmark.yml
name: Performance Benchmarks

on:
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 0 * * 0' # Weekly

jobs:
  benchmark:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: joonapay_bench
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run benchmarks
        run: npm run test:benchmark
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USERNAME: postgres
          DB_PASSWORD: postgres
          DB_NAME: joonapay_bench
```

## Interpreting Results

### Query Count
- **1 query:** Optimal - direct index lookup
- **2-3 queries:** Acceptable - includes joins or fallback queries
- **> 3 queries:** Review - may indicate N+1 problem

### Memory Usage
- **< 1 MB:** Excellent - efficient memory usage
- **1-10 MB:** Good - reasonable for collection queries
- **> 10 MB:** High - consider pagination or optimization

### Queries Per Second (QPS)
- **> 100 QPS:** Excellent throughput
- **10-100 QPS:** Good performance
- **< 10 QPS:** Needs optimization

## Troubleshooting

### Benchmark Timeout

If benchmarks timeout (> 5 minutes):
1. Reduce test data size
2. Increase `testTimeout` in `jest-benchmark.json`
3. Check database connection

### Inconsistent Results

Benchmarks may vary due to:
- Database cache warming
- System resource availability
- Network latency
- Concurrent operations

Run benchmarks multiple times and compare averages.

### Database Connection Errors

Ensure PostgreSQL is running and accessible:
```bash
psql -h localhost -U postgres -d joonapay_test
```

## Future Enhancements

- [ ] Add load testing with K6 integration
- [ ] Implement automated performance regression detection
- [ ] Add query plan analysis (EXPLAIN ANALYZE)
- [ ] Track benchmark history over time
- [ ] Add database-specific optimizations (connection pooling, prepared statements)
- [ ] Implement real-time monitoring integration (Prometheus, Grafana)

## References

- [TypeORM Performance Best Practices](https://typeorm.io/#/select-query-builder)
- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [Node.js Performance Hooks](https://nodejs.org/api/perf_hooks.html)
