# Load Testing Suite for USDC Wallet API

This directory contains k6 load testing scripts for the USDC Wallet API.

## Prerequisites

1. Install k6:
   ```bash
   # macOS
   brew install k6

   # Ubuntu/Debian
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6

   # Windows
   choco install k6
   ```

2. Set up test environment variables

## Test Scenarios

### 1. User Journey Test (`user-journey.js`)

Simulates realistic user behavior across multiple endpoints.

**What it tests:**
- Balance checks
- Transaction list retrieval
- Exchange rate queries
- Deposit channel listings
- KYC status checks

**Load profile:**
- Ramp up: 1 min to 50 users
- Sustain: 3 min at 50 users
- Ramp up: 1 min to 100 users
- Sustain: 3 min at 100 users
- Ramp down: 1 min to 0 users

**Thresholds:**
- 95% of requests < 500ms
- Error rate < 1%
- Balance endpoint p95 < 200ms
- Transactions endpoint p95 < 300ms

**Run command:**
```bash
k6 run \
  -e API_URL=http://localhost:3000/api/v1 \
  -e TEST_TOKEN=your-test-token \
  user-journey.js
```

### 2. Stress Test (`stress-test.js`)

Tests system behavior under heavy load and identifies breaking points.

**What it tests:**
- Random endpoint selection to distribute load
- System behavior at 300 concurrent users
- Response times under stress
- Error rates at high load

**Load profile:**
- 100 users for 7 minutes
- 200 users for 7 minutes
- 300 users for 5 minutes (spike)
- Total duration: ~21 minutes

**Thresholds:**
- 99% of requests < 1s
- Error rate < 5%

**Run command:**
```bash
k6 run \
  -e API_URL=http://localhost:3000/api/v1 \
  -e TEST_TOKEN=your-test-token \
  stress-test.js
```

## Setting Up Test Users

Before running load tests, you need valid authentication tokens:

### Option 1: Test Token (Recommended for Load Testing)

Create a dedicated test user with a long-lived token:

```bash
# Request OTP for test user
curl -X POST http://localhost:3000/api/v1/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+2250700000001"}'

# Verify OTP (use test OTP in dev environment)
curl -X POST http://localhost:3000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+2250700000001", "otp": "123456"}'

# Save the returned accessToken
export TEST_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Option 2: Mock Authentication (for CI/CD)

Set up a test environment with auth bypass for load testing:

```typescript
// In your test environment config
if (process.env.NODE_ENV === 'load-test') {
  // Skip JWT validation for requests with specific test token
  // Only enable in isolated test environments!
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_URL` | Base URL of the API | `http://localhost:3000/api/v1` |
| `TEST_TOKEN` | JWT authentication token | `test-token-replace-with-actual` |

## Running Tests

### Local Development

```bash
# Start your API server
npm run start:dev

# In another terminal, run user journey test
cd scripts/load-tests
k6 run -e API_URL=http://localhost:3000/api/v1 -e TEST_TOKEN=your-token user-journey.js
```

### Staging Environment

```bash
k6 run \
  -e API_URL=https://staging-api.example.com/api/v1 \
  -e TEST_TOKEN=$STAGING_TEST_TOKEN \
  user-journey.js
```

### CI/CD Integration

Example GitHub Actions workflow:

```yaml
- name: Run Load Tests
  run: |
    npm install -g k6
    cd scripts/load-tests
    k6 run \
      -e API_URL=${{ secrets.STAGING_API_URL }} \
      -e TEST_TOKEN=${{ secrets.LOAD_TEST_TOKEN }} \
      user-journey.js
```

## Interpreting Results

### Key Metrics

- **http_req_duration**: Time from request start to response end
- **http_req_failed**: Percentage of failed requests
- **iterations**: Number of complete test scenarios
- **vus**: Number of virtual users

### Sample Output

```
scenarios: (100.00%) 1 scenario, 100 max VUs, 10m30s max duration
default: Up to 100 looping VUs for 10m0s over 5 stages

✓ balance status 200
✓ transactions status 200
✓ rate has data

checks.........................: 100.00% ✓ 18000 ✗ 0
data_received..................: 2.4 MB  4.0 kB/s
data_sent......................: 1.1 MB  1.8 kB/s
http_req_blocked...............: avg=1.2ms   p(95)=3ms
http_req_duration..............: avg=145ms   p(95)=389ms
http_reqs......................: 6000    10/s
iterations.....................: 2000    3.33/s
vus............................: 100     min=0  max=100
```

## Best Practices

1. **Gradual Ramp-Up**: Always ramp up load gradually to identify bottlenecks
2. **Realistic Scenarios**: Model actual user behavior, not just endpoint hammering
3. **Monitor Backend**: Watch CPU, memory, database connections during tests
4. **Clean Data**: Reset test data between runs for consistent results
5. **Avoid Production**: Never run load tests against production environments

## Troubleshooting

### High Error Rates

- Check database connection pool size
- Verify rate limiting configuration
- Ensure test token is valid

### Slow Response Times

- Check database query performance
- Review N+1 query patterns
- Verify caching is enabled
- Check external API latency (Yellow Card, Circle)

### Connection Timeouts

- Increase server timeout settings
- Check network connectivity
- Verify firewall rules

## Advanced Usage

### Custom Thresholds

Edit the `options.thresholds` object in test files:

```javascript
thresholds: {
  http_req_duration: ['p(95)<200', 'p(99)<500'],
  http_req_failed: ['rate<0.001'],
}
```

### Cloud Execution

Run tests from k6 Cloud for distributed load testing:

```bash
k6 cloud user-journey.js
```

### Metrics Export

Export results to InfluxDB + Grafana:

```bash
k6 run --out influxdb=http://localhost:8086/k6 user-journey.js
```

## Related Documentation

- [k6 Documentation](https://k6.io/docs/)
- [k6 Thresholds](https://k6.io/docs/using-k6/thresholds/)
- [k6 Metrics](https://k6.io/docs/using-k6/metrics/)
