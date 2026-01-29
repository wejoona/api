# Load Testing Suite Structure

```
load-tests/
│
├── 📄 README.md                    # Comprehensive documentation
├── 📄 QUICKSTART.md                # Quick start guide
├── 📄 CHANGELOG.md                 # Version history
├── 📄 STRUCTURE.md                 # This file
├── 📄 .gitignore                   # Git ignore rules
│
├── 📄 config.js                    # Centralized configuration
│   ├── Base URLs (dev/staging/prod)
│   ├── Performance thresholds
│   ├── Test stages
│   ├── Test data
│   └── User behavior patterns
│
├── 🔧 run-all.sh                   # Run all tests sequentially
│
├── 📊 Test Scripts
│   ├── auth-load-test.js          # Authentication & token management
│   │   ├── User registration
│   │   ├── OTP verification
│   │   ├── Token refresh
│   │   ├── Profile retrieval
│   │   └── Logout
│   │   ⏱️  Duration: ~8 minutes
│   │   👥 Load: 100-1000 users
│   │
│   ├── wallet-load-test.js        # Wallet operations
│   │   ├── Get balance (50%)
│   │   ├── Transaction history (35%)
│   │   ├── Transaction details (15%)
│   │   └── Batch requests
│   │   ⏱️  Duration: ~17 minutes
│   │   📈 Target: 1000 req/s
│   │
│   ├── transfer-load-test.js      # Money transfers
│   │   ├── Internal transfers (60%)
│   │   ├── External crypto (25%)
│   │   └── Mobile money (15%)
│   │   ⏱️  Duration: ~15 minutes
│   │   👥 Load: 500-1000 users
│   │
│   ├── kyc-load-test.js           # KYC verification
│   │   ├── Status check
│   │   ├── Info submission
│   │   ├── Document upload (ID, selfie)
│   │   └── Status polling
│   │   ⏱️  Duration: ~13 minutes
│   │   👥 Load: 100 users
│   │
│   ├── full-flow-test.js          # Complete user journey
│   │   ├── Registration → Login
│   │   ├── Check balance
│   │   ├── View transactions
│   │   ├── View profile
│   │   ├── Add recipient
│   │   ├── Send money
│   │   ├── Check updated balance
│   │   ├── Check KYC
│   │   └── Logout
│   │   ⏱️  Duration: ~17 minutes
│   │   👥 Load: 150 users
│   │
│   └── spike-test.js              # Traffic spike & recovery
│       ├── Baseline (100 users)
│       ├── Spike (1000 users in 10s)
│       ├── Maintain (1 min)
│       ├── Recovery (3 min)
│       └── Second spike (500 users)
│       ⏱️  Duration: ~15 minutes
│       📊 Tests: Error recovery
│
├── 🛠️  utils/
│   └── helpers.js                 # Shared utilities
│       ├── generatePhoneNumber()
│       ├── generateName()
│       ├── authenticateUser()
│       ├── randomAmount()
│       ├── generateMockPinToken()
│       ├── generateEthAddress()
│       ├── authHeaders()
│       └── parseResponse()
│
├── 📚 examples/
│   └── basic-example.js           # Simple k6 example
│
└── 📁 reports/                    # Generated reports (gitignored)
    ├── auth-load-test.html
    ├── auth-load-test.json
    ├── wallet-load-test.html
    ├── wallet-load-test.json
    ├── transfer-load-test.html
    ├── transfer-load-test.json
    ├── kyc-load-test.html
    ├── kyc-load-test.json
    ├── full-flow-test.html
    ├── full-flow-test.json
    ├── spike-test.html
    ├── spike-test.json
    └── summary_YYYYMMDD_HHMMSS.txt
```

## NPM Scripts

```json
{
  "load:auth": "k6 run load-tests/auth-load-test.js",
  "load:auth:smoke": "STAGES=smoke k6 run load-tests/auth-load-test.js",
  "load:auth:stress": "STAGES=stress k6 run load-tests/auth-load-test.js",
  "load:wallet": "k6 run load-tests/wallet-load-test.js",
  "load:wallet:prod": "BASE_URL=https://api.joonapay.com k6 run load-tests/wallet-load-test.js",
  "load:transfer": "k6 run load-tests/transfer-load-test.js",
  "load:transfer:load": "TEST_MODE=load k6 run load-tests/transfer-load-test.js",
  "load:kyc": "k6 run load-tests/kyc-load-test.js",
  "load:flow": "k6 run load-tests/full-flow-test.js",
  "load:spike": "k6 run load-tests/spike-test.js",
  "load:spike:extreme": "SPIKE_MULTIPLIER=20 k6 run load-tests/spike-test.js",
  "load:all": "Run all tests sequentially",
  "load:reports": "open load-tests/reports/"
}
```

## Test Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Load Test Suite                         │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
         ┌──────▼──────┐            ┌──────▼──────┐
         │   Smoke     │            │   Stress    │
         │   (5 VUs)   │            │  (1000 VUs) │
         └─────────────┘            └─────────────┘
                │
    ┌───────────┼───────────┬───────────┬───────────┐
    │           │           │           │           │
┌───▼───┐  ┌───▼───┐  ┌───▼───┐  ┌───▼───┐  ┌───▼───┐
│ Auth  │  │Wallet │  │Transfer│ │  KYC  │  │ Flow  │
│ Test  │  │ Test  │  │  Test  │ │ Test  │  │ Test  │
└───┬───┘  └───┬───┘  └───┬───┘  └───┬───┘  └───┬───┘
    │          │          │          │          │
    └──────────┴──────────┴──────────┴──────────┘
                          │
                    ┌─────▼─────┐
                    │   Spike   │
                    │   Test    │
                    └───────────┘
                          │
                    ┌─────▼─────┐
                    │  Reports  │
                    │ (HTML/JSON)│
                    └───────────┘
```

## Test Execution Order

### Recommended Order for First Run

1. **Basic Example** (30s)
   ```bash
   k6 run load-tests/examples/basic-example.js
   ```

2. **Auth Smoke Test** (2 min)
   ```bash
   npm run load:auth:smoke
   ```

3. **Auth Load Test** (8 min)
   ```bash
   npm run load:auth
   ```

4. **Wallet Test** (17 min)
   ```bash
   npm run load:wallet
   ```

5. **Transfer Test** (15 min)
   ```bash
   npm run load:transfer
   ```

6. **KYC Test** (13 min)
   ```bash
   npm run load:kyc
   ```

7. **Full Flow Test** (17 min)
   ```bash
   npm run load:flow
   ```

8. **Spike Test** (15 min)
   ```bash
   npm run load:spike
   ```

**Total Time:** ~87 minutes

### Run All at Once

```bash
./load-tests/run-all.sh
# or
npm run load:all
```

## Metrics Collected

### Standard HTTP Metrics
- `http_req_duration` - Request latency (avg, p95, p99)
- `http_req_failed` - Error rate
- `http_reqs` - Request count and rate
- `http_req_waiting` - Time to first byte
- `http_req_receiving` - Download time
- `http_req_sending` - Upload time
- `http_req_blocked` - Time blocked (queue, DNS, TCP)
- `http_req_connecting` - Connection time
- `http_req_tls_handshaking` - TLS time

### Custom Metrics by Test

**auth-load-test.js:**
- `otp_verify_success` - OTP verification success rate
- `otp_verify_duration` - OTP verification latency
- `token_refresh_success` - Token refresh success rate
- `token_refresh_duration` - Token refresh latency
- `auth_errors` - Total authentication errors

**wallet-load-test.js:**
- `wallet_balance_success` - Balance retrieval success
- `wallet_balance_duration` - Balance retrieval latency
- `transaction_history_success` - History query success
- `transaction_history_duration` - History query latency
- `transaction_detail_success` - Detail retrieval success
- `wallet_errors` - Total wallet errors
- `concurrent_users` - Peak concurrent users

**transfer-load-test.js:**
- `internal_transfer_success` - Internal transfer success
- `internal_transfer_duration` - Internal transfer latency
- `external_transfer_success` - External transfer success
- `external_transfer_duration` - External transfer latency
- `mobile_money_transfer_success` - Mobile money success
- `transfer_errors` - Total transfer errors
- `insufficient_funds_errors` - Balance errors
- `validation_errors` - Validation errors

**kyc-load-test.js:**
- `kyc_submission_success` - Submission success rate
- `kyc_submission_duration` - Submission latency
- `document_upload_success` - Upload success rate
- `document_upload_duration` - Upload latency
- `kyc_status_check_success` - Status check success
- `upload_size_bytes` - Upload size tracking
- `kyc_errors` - Total KYC errors

**full-flow-test.js:**
- `full_flow_success` - Complete journey success
- `full_flow_duration` - End-to-end time
- `login_duration` - Login phase time
- `transfer_duration` - Transfer phase time
- `step_failures` - Individual step failures

**spike-test.js:**
- `spike_recovery_time` - Time to recover from spike
- `errors_during_spike` - Errors under high load
- `errors_after_spike` - Errors after recovery
- `response_time_during_spike` - Latency during spike
- `response_time_after_spike` - Latency after recovery
- `active_users` - Concurrent user tracking

## Thresholds

Each test has predefined thresholds. If any threshold fails, the test fails.

### Common Thresholds
- `http_req_duration: p(95)<500` - 95% under 500ms
- `http_req_duration: p(99)<1000` - 99% under 1000ms
- `http_req_failed: rate<0.01` - Less than 1% errors

### Test-Specific Thresholds
See individual test files for specific thresholds.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | API base URL | `https://api-dev.joonapay.com` |
| `ENVIRONMENT` | Environment (dev/staging/prod) | `dev` |
| `STAGES` | Test profile | `ramp` |
| `TARGET_RPS` | Target requests/second | `1000` |
| `TEST_MODE` | Test mode (load/stress) | `stress` |
| `SPIKE_MULTIPLIER` | Spike multiplier | `10` |

## Integration Points

### CI/CD
- GitHub Actions
- GitLab CI
- Jenkins
- CircleCI

### Monitoring
- Grafana Cloud k6
- Prometheus
- InfluxDB
- Datadog

### Alerting
- Slack notifications
- Email alerts
- PagerDuty
- Custom webhooks

## Report Types

### HTML Reports
Visual reports with:
- Request rate graphs
- Response time distributions
- Error rate charts
- Custom metric visualizations
- Threshold pass/fail indicators

### JSON Reports
Raw data including:
- All metrics with statistics
- Threshold results
- Test configuration
- Environment info
- Timestamp information

### Console Summary
Real-time output showing:
- Progress indicators
- Current VU count
- Request rates
- Errors
- Threshold violations

## Support

- 📖 Full documentation: `README.md`
- 🚀 Quick start: `QUICKSTART.md`
- 📝 Version history: `CHANGELOG.md`
- 🔗 k6 docs: https://k6.io/docs/
- 💬 Team Slack: #performance-testing
- 📧 Email: backend@joonapay.com
