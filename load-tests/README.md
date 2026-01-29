# JoonaPay Load Testing Suite

Comprehensive k6 load testing scripts for the JoonaPay USDC Wallet backend API.

## Prerequisites

### Install k6

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```bash
choco install k6
```

**Docker:**
```bash
docker pull grafana/k6:latest
```

## Test Suite Overview

| Test | Purpose | Duration | Target Load |
|------|---------|----------|-------------|
| `auth-load-test.js` | Authentication flow & token management | 8 min | 100-1000 users |
| `wallet-load-test.js` | Wallet operations (balance, transactions) | 17 min | 1000 req/s |
| `transfer-load-test.js` | Money transfer stress testing | 15 min | 500-1000 users |
| `kyc-load-test.js` | KYC document upload & verification | 13 min | 100 users |
| `full-flow-test.js` | Complete user journey simulation | 17 min | 150 users |
| `spike-test.js` | Traffic spike & recovery testing | 15 min | 100-1000 users |

## Quick Start

### Run Individual Tests

```bash
# Test authentication endpoints
npm run load:auth

# Test wallet operations
npm run load:wallet

# Test transfers
npm run load:transfer

# Test KYC flow
npm run load:kyc

# Test complete user journey
npm run load:flow

# Test spike handling
npm run load:spike
```

### Run All Tests

```bash
npm run load:all
```

### Run with Custom Configuration

```bash
# Use production URL
BASE_URL=https://api.joonapay.com k6 run load-tests/auth-load-test.js

# Change test profile
STAGES=stress k6 run load-tests/auth-load-test.js

# Set target RPS
TARGET_RPS=2000 k6 run load-tests/wallet-load-test.js

# Increase spike multiplier
SPIKE_MULTIPLIER=20 k6 run load-tests/spike-test.js
```

## Test Profiles

### Auth Load Test

**Profiles:**
- `smoke` - 5 users, 2 minutes
- `load` - 100 users, 9 minutes
- `stress` - 100-1000 users, 12 minutes
- `ramp` - 50-200 users, 8 minutes (default)

**What it tests:**
- User registration
- OTP verification
- Token refresh
- Profile retrieval
- Logout

**Thresholds:**
- P95 latency < 500ms
- P99 latency < 1000ms
- Error rate < 1%
- OTP verify success > 99%
- Token refresh success > 99%

### Wallet Load Test

**What it tests:**
- Get wallet balance (50% of requests)
- Transaction history with pagination (35%)
- Transaction detail retrieval (15%)
- Concurrent batch requests

**Thresholds:**
- Target: 1000 req/s
- P95 balance latency < 400ms
- P95 history latency < 600ms
- Success rate > 99%

### Transfer Load Test

**Modes:**
- `load` - 100 users, normal conditions
- `stress` - 1000 users, extreme load (default)

**What it tests:**
- Internal transfers (60%)
- External crypto transfers (25%)
- Mobile money transfers (15%)

**Thresholds:**
- P95 internal transfer < 1000ms
- P95 external transfer < 1500ms
- Success rate > 95%

### KYC Load Test

**What it tests:**
- KYC status check
- Personal information submission
- Document upload (ID front/back, selfie)
- Status polling

**Thresholds:**
- P95 submission < 1500ms
- P95 upload < 5000ms
- Document upload success > 95%

### Full Flow Test

**User Journey:**
1. Registration & Login
2. Check wallet balance
3. View transaction history
4. View profile
5. Add recipient
6. Send money
7. Check updated balance
8. Check KYC status
9. Logout

**Thresholds:**
- Full flow success > 98%
- P95 complete flow < 15s
- P95 login < 1000ms
- P95 transfer < 1500ms

### Spike Test

**Spike Pattern:**
- Baseline: 100 users
- Spike: 1000 users (10x) in 10 seconds
- Maintain: 1 minute
- Recovery: Monitor for 3 minutes
- Second spike: 500 users
- Final recovery

**What it measures:**
- Response time degradation during spike
- Error rate during spike
- Recovery time to normal performance
- System stability after spike

**Thresholds:**
- Allow 5% errors during spike
- P95 response time after spike < 600ms
- Very few errors after recovery

## Reports

Reports are generated in `load-tests/reports/`:

- `{test-name}.html` - Visual HTML report with charts
- `{test-name}.json` - Raw JSON data for analysis

### View Reports

```bash
# Open HTML report in browser
open load-tests/reports/auth-load-test.html

# Analyze JSON data
cat load-tests/reports/wallet-load-test.json | jq '.metrics'
```

## Custom Metrics

Each test tracks custom metrics beyond standard HTTP metrics:

### Auth Test
- `otp_verify_success` - OTP verification success rate
- `otp_verify_duration` - OTP verification latency
- `token_refresh_success` - Token refresh success rate
- `auth_errors` - Authentication error counter

### Wallet Test
- `wallet_balance_success` - Balance retrieval success rate
- `wallet_balance_duration` - Balance retrieval latency
- `transaction_history_success` - History query success rate
- `concurrent_users` - Peak concurrent users

### Transfer Test
- `internal_transfer_success` - Internal transfer success rate
- `external_transfer_success` - External transfer success rate
- `insufficient_funds_errors` - Count of insufficient balance errors
- `validation_errors` - Count of validation errors

### KYC Test
- `kyc_submission_success` - KYC submission success rate
- `document_upload_success` - Document upload success rate
- `upload_size_bytes` - Average upload size

### Full Flow Test
- `full_flow_success` - Complete journey success rate
- `full_flow_duration` - End-to-end journey time
- `step_failures` - Individual step failure counter

### Spike Test
- `spike_recovery_time` - Time to recover from spike
- `errors_during_spike` - Errors during high load
- `errors_after_spike` - Errors after recovery
- `response_time_during_spike` - Latency during spike
- `response_time_after_spike` - Latency after recovery

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | API base URL | `https://api-dev.joonapay.com` |
| `STAGES` | Test profile (smoke/load/stress/ramp) | `ramp` |
| `TARGET_RPS` | Target requests per second | `1000` |
| `TEST_MODE` | Transfer test mode (load/stress) | `stress` |
| `SPIKE_MULTIPLIER` | Spike increase factor | `10` |

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Load Tests

on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install k6
        run: |
          curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xvz --strip-components 1

      - name: Run auth load test
        run: ./k6 run load-tests/auth-load-test.js
        env:
          BASE_URL: ${{ secrets.API_URL }}

      - name: Upload reports
        uses: actions/upload-artifact@v3
        with:
          name: load-test-reports
          path: load-tests/reports/
```

### Docker Example

```bash
# Run test in Docker
docker run --rm -i -v $(pwd):/workspace grafana/k6:latest run /workspace/load-tests/auth-load-test.js

# Run with environment variables
docker run --rm -i \
  -e BASE_URL=https://api.joonapay.com \
  -v $(pwd):/workspace \
  grafana/k6:latest run /workspace/load-tests/wallet-load-test.js
```

## Performance Targets

### Response Time SLAs

| Endpoint | P95 | P99 | Target RPS |
|----------|-----|-----|------------|
| Auth (OTP verify) | < 600ms | < 1000ms | 100 |
| Wallet balance | < 400ms | < 800ms | 1000 |
| Transaction history | < 600ms | < 1200ms | 500 |
| Internal transfer | < 1000ms | < 2000ms | 100 |
| External transfer | < 1500ms | < 3000ms | 50 |
| KYC submission | < 1500ms | < 3000ms | 10 |
| Document upload | < 5000ms | < 10000ms | 5 |

### Error Rate SLAs

- Authentication: < 1%
- Wallet operations: < 1%
- Transfers: < 2% (business logic failures expected)
- KYC: < 2%

## Monitoring Integration

### Grafana Cloud k6

```bash
# Sign up at https://grafana.com/products/cloud/k6/
k6 login cloud

# Run test with cloud output
k6 run --out cloud load-tests/auth-load-test.js
```

### Prometheus + Grafana

```bash
# Export metrics to Prometheus format
k6 run --out experimental-prometheus-rw load-tests/wallet-load-test.js
```

### InfluxDB

```bash
# Export to InfluxDB
k6 run --out influxdb=http://localhost:8086/k6 load-tests/transfer-load-test.js
```

## Troubleshooting

### High Error Rates

1. Check API availability
2. Verify BASE_URL is correct
3. Check rate limiting settings
4. Review backend logs for errors

### Slow Response Times

1. Check database connection pool
2. Review query performance
3. Check Redis cache hit rate
4. Monitor CPU/memory usage

### Connection Timeouts

1. Increase k6 timeout settings
2. Check network latency
3. Verify load balancer configuration
4. Review backend thread pool size

### Setup Failures

If users fail to authenticate during setup:
1. Check OTP service availability
2. Verify phone number format
3. Check database constraints
4. Review rate limiting

## Best Practices

1. **Start small**: Run smoke tests before full load tests
2. **Monitor resources**: Watch CPU, memory, DB connections during tests
3. **Test incrementally**: Gradually increase load to find breaking points
4. **Use realistic data**: Phone numbers, names, amounts should match production patterns
5. **Clean up**: Remove test data after load tests
6. **Schedule wisely**: Run load tests during off-peak hours
7. **Track trends**: Save reports and compare over time
8. **Set alerts**: Configure monitoring alerts before load testing

## Contributing

When adding new load tests:

1. Follow existing file structure
2. Add custom metrics for key operations
3. Set reasonable thresholds based on SLAs
4. Include HTML and JSON report generation
5. Update this README with test description
6. Add npm script in package.json

## Support

For issues or questions:
- Backend team: backend@joonapay.com
- DevOps: devops@joonapay.com
- Slack: #performance-testing
