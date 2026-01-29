# Quick Start Guide - JoonaPay Load Testing

## Installation

### Install k6

```bash
# macOS
brew install k6

# Linux
curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xvz --strip-components 1
sudo cp k6 /usr/local/bin/

# Windows
choco install k6

# Docker
docker pull grafana/k6:latest
```

Verify installation:
```bash
k6 version
```

## Run Your First Test

### 1. Quick Smoke Test (5 users, 2 minutes)

```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet
npm run load:auth:smoke
```

### 2. Standard Load Test

```bash
# Auth test
npm run load:auth

# Wallet test
npm run load:wallet

# Transfer test
npm run load:transfer
```

### 3. View Results

Reports are saved to `load-tests/reports/`:

```bash
# Open HTML report
open load-tests/reports/auth-load-test.html

# View JSON data
cat load-tests/reports/wallet-load-test.json | jq '.metrics.http_req_duration'
```

## Common Commands

```bash
# Run specific test
k6 run load-tests/auth-load-test.js

# Change environment
BASE_URL=https://api.joonapay.com k6 run load-tests/wallet-load-test.js

# Run stress test
STAGES=stress k6 run load-tests/auth-load-test.js

# Run all tests
npm run load:all
```

## Understanding Results

### Key Metrics

**Response Time:**
- `http_req_duration (avg)` - Average response time
- `p(95)` - 95% of requests completed within this time
- `p(99)` - 99% of requests completed within this time

**Success Rate:**
- `http_req_failed` - Percentage of failed requests
- `http_reqs` - Total requests and rate (req/s)

**Custom Metrics:**
- `{operation}_success` - Success rate for specific operations
- `{operation}_duration` - Latency for specific operations

### What's Good?

✅ **Passing Test:**
```
http_req_duration............: avg=245ms p(95)=420ms p(99)=680ms
http_req_failed..............: 0.12%
http_reqs....................: 12453 (138.21/s)
wallet_balance_success.......: 99.8%
```

❌ **Failing Test:**
```
http_req_duration............: avg=1240ms p(95)=2800ms p(99)=5200ms
http_req_failed..............: 3.45%
http_reqs....................: 5234 (58.15/s)
wallet_balance_success.......: 92.3%
```

## Test Progression

Follow this order to gradually increase load:

1. **Smoke Test** (5 users, 2 min)
   ```bash
   npm run load:auth:smoke
   ```

2. **Load Test** (100 users, 9 min)
   ```bash
   npm run load:auth
   ```

3. **Stress Test** (1000 users, 12 min)
   ```bash
   npm run load:auth:stress
   ```

4. **Spike Test** (sudden 10x spike)
   ```bash
   npm run load:spike
   ```

## Interpreting Thresholds

Each test has predefined thresholds. If a threshold fails, you'll see:

```
✓ http_req_duration..............: p(95) < 500ms
✗ http_req_failed................: rate < 1%
```

**Common Failures:**

| Failure | Likely Cause | Action |
|---------|-------------|--------|
| High `http_req_duration` | Slow queries, CPU bottleneck | Check DB indexes, optimize queries |
| High `http_req_failed` | API errors, timeouts | Check logs, increase timeouts |
| Low success rate | Business logic failures | Review validation, check data |
| Low `http_reqs` rate | Not reaching target load | Increase VUs, check network |

## Troubleshooting

### Test fails immediately

Check API availability:
```bash
curl https://api-dev.joonapay.com/health
```

### Authentication errors

Verify OTP configuration:
- Dev OTP should be `123456`
- Check rate limiting settings

### High error rates

Check backend logs:
```bash
cd ../usdc-wallet
npm run start:dev
# Watch for errors during test
```

### Connection timeouts

Increase timeout in test file or use:
```bash
K6_HTTP_TIMEOUT=60s k6 run load-tests/transfer-load-test.js
```

## Next Steps

1. ✅ Run smoke test successfully
2. ✅ Review HTML report
3. ✅ Run full load test
4. ✅ Identify bottlenecks
5. ✅ Optimize and re-test
6. ✅ Run stress test
7. ✅ Document findings

## CI/CD Integration

Add to GitHub Actions:

```yaml
- name: Run Load Tests
  run: |
    npm run load:auth
    npm run load:wallet
```

## Getting Help

- 📖 Full docs: `load-tests/README.md`
- 🔧 k6 docs: https://k6.io/docs/
- 💬 Team Slack: #performance-testing
