# Load Testing Quick Start Guide

## Prerequisites

Install k6:

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

## Setup

1. Create a test user and get an auth token:

```bash
# Start the API server
npm run start:dev

# In another terminal, request OTP
curl -X POST http://localhost:3000/api/v1/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+2250700000001"}'

# Verify OTP (use test OTP from logs in dev mode)
curl -X POST http://localhost:3000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+2250700000001", "otp": "123456"}'

# Copy the accessToken from the response
```

2. Configure your test environment:

```bash
# Option 1: Use environment variables
export API_URL=http://localhost:3000/api/v1
export TEST_TOKEN=your-access-token-here

# Option 2: Create config.json (recommended)
cd scripts/load-tests
cp config.example.json config.json
# Edit config.json with your API_URL and TEST_TOKEN
```

## Running Tests

### Option 1: Using NPM Scripts (Recommended)

```bash
# From project root
npm run load-test              # Run user journey test
npm run load-test:stress       # Run stress test
```

### Option 2: Using Shell Script

```bash
cd scripts/load-tests

# User journey test (default)
./run-tests.sh user-journey

# Stress test
./run-tests.sh stress

# With custom API URL
./run-tests.sh user-journey http://localhost:3000/api/v1

# With custom API URL and token
./run-tests.sh user-journey http://localhost:3000/api/v1 your-token-here
```

### Option 3: Direct k6 Command

```bash
cd scripts/load-tests

# User journey
k6 run -e API_URL=http://localhost:3000/api/v1 -e TEST_TOKEN=your-token user-journey.js

# Stress test
k6 run -e API_URL=http://localhost:3000/api/v1 -e TEST_TOKEN=your-token stress-test.js
```

## Understanding Results

### User Journey Test

Duration: ~9 minutes
Expected output:

```
scenarios: (100.00%) 1 scenario, 100 max VUs, 10m0s max duration

✓ balance status 200
✓ balance has data
✓ transactions status 200
✓ transactions has data
✓ rate status 200
✓ channels status 200

checks.........................: 100.00% ✓ 18000    ✗ 0
data_received..................: 2.4 MB  4.5 kB/s
data_sent......................: 1.1 MB  2.0 kB/s
http_req_duration..............: avg=145ms min=12ms med=98ms max=890ms p(95)=389ms p(99)=654ms
  { expected_response:true }...: avg=145ms min=12ms med=98ms max=890ms p(95)=389ms p(99)=654ms
http_req_failed................: 0.00%   ✓ 0        ✗ 6000
http_reqs......................: 6000    11.11/s
iteration_duration.............: avg=5.4s  min=5s   med=5.3s  max=6.2s  p(95)=5.8s  p(99)=6s
iterations.....................: 2000    3.70/s
vus............................: 100     min=0      max=100
```

### Stress Test

Duration: ~21 minutes
Expected output:

```
scenarios: (100.00%) 1 scenario, 300 max VUs, 21m30s max duration

checks.........................: 99.87% ✓ 119840  ✗ 160
errors.........................: 0.13%  ✓ 160     ✗ 120000
http_req_duration..............: avg=234ms min=15ms med=189ms max=2.1s p(95)=456ms p(99)=876ms
http_req_failed................: 0.13%  ✓ 160     ✗ 119840
http_reqs......................: 120000  94.33/s
total_requests.................: 120000
failed_requests................: 160
```

## Key Metrics Explained

| Metric | What it means | Good target |
|--------|---------------|-------------|
| `http_req_duration p(95)` | 95% of requests complete within this time | < 500ms |
| `http_req_duration p(99)` | 99% of requests complete within this time | < 1000ms |
| `http_req_failed` | Percentage of failed requests | < 1% |
| `checks` | Percentage of validation checks that passed | > 99% |
| `iterations` | Number of complete user journeys | N/A |
| `vus` | Number of concurrent virtual users | N/A |

## Common Issues

### Issue: High Error Rate

**Symptoms:**
```
http_req_failed................: 15.00%  ✓ 1500    ✗ 8500
```

**Solutions:**
- Check database connection pool size
- Verify rate limiting isn't too aggressive
- Ensure test token is valid
- Check server logs for errors

### Issue: Slow Response Times

**Symptoms:**
```
http_req_duration..............: avg=2.1s p(95)=3.4s
```

**Solutions:**
- Review database query performance
- Enable query logging and check for N+1 queries
- Verify caching is working
- Check external API latency (Yellow Card, Circle)
- Scale server resources

### Issue: Connection Timeouts

**Symptoms:**
```
ERRO[0123] GoError: Get "http://localhost:3000/api/v1/wallet": dial tcp: connect: connection refused
```

**Solutions:**
- Verify API server is running
- Check firewall rules
- Increase server timeout settings
- Ensure correct API_URL in config

### Issue: Authentication Failures

**Symptoms:**
```
✗ balance status 200
     ↳  0% — ✓ 0 / ✗ 2000
```

**Solutions:**
- Verify TEST_TOKEN is set correctly
- Check token hasn't expired
- Generate a new token
- Review authentication logs

## Monitoring During Tests

### Server Metrics to Watch

1. **CPU Usage**
```bash
# macOS
top -pid $(pgrep -f 'node.*nest')

# Linux
htop -p $(pgrep -f 'node.*nest')
```

2. **Memory Usage**
```bash
# Check Node.js memory
node --max-old-space-size=4096 dist/main.js
```

3. **Database Connections**
```sql
-- PostgreSQL
SELECT count(*) FROM pg_stat_activity WHERE datname = 'usdc_wallet';
```

4. **API Logs**
```bash
# Watch for errors
tail -f logs/error.log

# Watch for slow queries
tail -f logs/query.log | grep -E "execution time: [5-9][0-9]{2,}"
```

## Next Steps

1. **Baseline Testing**: Run user journey test to establish baseline performance
2. **Identify Bottlenecks**: Review results and identify slow endpoints
3. **Optimize**: Address performance issues (queries, caching, etc.)
4. **Retest**: Run tests again to verify improvements
5. **Stress Testing**: Run stress test to find breaking points
6. **Production Planning**: Size infrastructure based on test results

## Advanced Configuration

### Custom Thresholds

Edit `user-journey.js`:

```javascript
export const options = {
  thresholds: {
    http_req_duration: ['p(95)<200'],  // Stricter: 95% under 200ms
    http_req_failed: ['rate<0.001'],   // Stricter: 0.1% error rate
  },
};
```

### Custom Load Profile

Edit `user-journey.js`:

```javascript
export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Gentle ramp
    { duration: '2m', target: 20 },    // Sustain
    { duration: '30s', target: 0 },    // Ramp down
  ],
};
```

### Output to File

```bash
k6 run --out json=results.json user-journey.js
```

### Cloud Testing

```bash
k6 cloud user-journey.js
```

## Support

For issues or questions:
- Check logs: `logs/error.log`
- Review API docs: `docs/`
- GitHub Issues: [project-repo]/issues
