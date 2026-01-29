# Load Testing Suite Changelog

All notable changes to the JoonaPay load testing suite will be documented in this file.

## [1.0.0] - 2026-01-29

### Added

#### Test Scripts
- `auth-load-test.js` - Authentication flow testing with OTP verification and token refresh
- `wallet-load-test.js` - Wallet operations testing (balance, transactions, details)
- `transfer-load-test.js` - Transfer stress testing (internal, external, mobile money)
- `kyc-load-test.js` - KYC document upload and verification testing
- `full-flow-test.js` - Complete user journey simulation (registration to logout)
- `spike-test.js` - Traffic spike and recovery testing

#### Utilities
- `utils/helpers.js` - Shared helper functions for all tests
  - Phone number generation (West African formats)
  - Name generation (West African names)
  - User authentication
  - Amount generation (USDC and XOF)
  - Date generation
  - Response parsing utilities

#### Configuration
- `config.js` - Centralized configuration for all tests
  - Base URLs for dev/staging/prod
  - Performance thresholds
  - Test stage definitions
  - Rate limits
  - Realistic user behavior patterns

#### Documentation
- `README.md` - Comprehensive guide with all test details
- `QUICKSTART.md` - Quick start guide for new users
- `CHANGELOG.md` - This file
- `.gitignore` - Git ignore for reports and temp files

#### Automation
- `run-all.sh` - Shell script to run all tests sequentially
- `package.json` scripts - NPM commands for easy test execution
  - `npm run load:auth` - Run authentication test
  - `npm run load:wallet` - Run wallet test
  - `npm run load:transfer` - Run transfer test
  - `npm run load:kyc` - Run KYC test
  - `npm run load:flow` - Run full flow test
  - `npm run load:spike` - Run spike test
  - `npm run load:all` - Run all tests

#### Examples
- `examples/basic-example.js` - Basic k6 example for learning

### Features

#### Custom Metrics
Each test tracks specific metrics beyond standard HTTP metrics:
- Success rates for specific operations
- Operation-specific latency
- Error categorization (insufficient funds, validation errors)
- Concurrent user tracking
- Recovery time measurement

#### Test Profiles
Multiple test profiles for different scenarios:
- **Smoke** - Quick validation (5 users)
- **Load** - Normal load (100 users)
- **Stress** - High load (1000 users)
- **Ramp** - Gradual increase (50-200 users)
- **Spike** - Sudden traffic spike

#### Realistic Testing
- West African user data (names, phone numbers)
- Weighted operation distribution
- Realistic think times
- Mixed operation patterns
- Proper authentication flow

#### Reporting
- HTML reports with charts and graphs
- JSON reports for programmatic analysis
- Summary text output to console
- Custom metric summaries
- Threshold validation

#### Performance Targets
- P95 latency < 500ms for most operations
- P99 latency < 1000ms for most operations
- Error rate < 1% for critical operations
- Target: 1000 req/s for wallet operations

### Technical Details

#### Dependencies
- k6 (grafana/k6) - Load testing tool
- k6 HTML reporter - Report generation
- k6 summary library - Text summaries

#### Test Environments
- Development: `https://api-dev.joonapay.com`
- Staging: `https://api-staging.joonapay.com`
- Production: `https://api.joonapay.com`

#### Coverage
Tests cover:
- Authentication (register, verify OTP, refresh token, logout)
- Wallet (balance, transaction history, transaction details)
- Transfers (internal, external, mobile money)
- KYC (status check, submission, document upload, polling)
- User profile
- Recipients management

### Best Practices Implemented
- Setup/teardown for test data
- Proper error handling and logging
- Custom metrics for business operations
- Realistic user behavior simulation
- Think time between operations
- Batched requests where appropriate
- HTML and JSON report generation
- Threshold-based pass/fail criteria

### CI/CD Ready
- Can be integrated into GitHub Actions
- Docker support
- Environment variable configuration
- Exit codes for CI/CD pipelines
- Report artifacts

### Notes
- All tests use dev OTP `123456` for authentication
- Tests create and clean up their own data
- Reports saved to `load-tests/reports/`
- Supports concurrent test execution
- Can be run against any environment via `BASE_URL` env var

### Future Enhancements
- [ ] Grafana Cloud k6 integration
- [ ] Prometheus/InfluxDB output
- [ ] More granular operation timing
- [ ] Network condition simulation
- [ ] Geo-distributed load testing
- [ ] WebSocket testing (for real-time features)
- [ ] GraphQL endpoint testing
- [ ] Rate limit boundary testing
- [ ] Data-driven scenarios from CSV
- [ ] Custom k6 extensions

### Known Limitations
- Mock PIN tokens used (real PIN verification would require PIN setup)
- Document uploads use mock base64 data
- Some operations may fail due to business logic (expected)
- Rate limiting may affect test results if too aggressive
- Database must support test load (connection pool size)

## Version History

**1.0.0** (2026-01-29) - Initial release with full test suite
