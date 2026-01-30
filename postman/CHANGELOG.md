# Postman Collection - Changelog

All notable changes to the JoonaPay API Postman collection will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] - 2026-01-29

### Added

#### Collection
- Complete API collection with 70+ endpoints across 12 categories
- Auto-save tokens (access, refresh, PIN) to environment variables
- Auto-refresh expired access tokens via pre-request script
- Comprehensive test scripts for response validation
- Idempotency key generation using `{{$guid}}`
- West African test data (phone numbers, amounts, names)

#### Endpoints

**Authentication (6 endpoints)**
- `POST /auth/register` - Register new user
- `POST /auth/verify-otp` - Verify OTP and login
- `POST /auth/login` - Request login OTP
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout single session
- `POST /auth/logout-all` - Logout all sessions

**User (6 endpoints)**
- `GET /user/profile` - Get current user
- `PUT /user/profile` - Update profile
- `GET /user/username/check/:username` - Check availability
- `GET /user/username/search` - Search users
- `GET /user/by-username/:username` - Find by username
- `GET /user/limits` - Get transaction limits

**Wallet (10 endpoints)**
- `GET /wallet` - Get balance
- `POST /wallet/create` - Create wallet
- `POST /wallet/pin/set` - Set/update PIN
- `POST /wallet/pin/verify` - Verify PIN (get token)
- `GET /wallet/rate` - Get exchange rate
- `GET /wallet/deposit/channels` - Get deposit channels
- `POST /wallet/deposit` - Initiate deposit
- `POST /wallet/transfer/internal` - P2P transfer
- `POST /wallet/transfer/external` - External transfer
- `POST /wallet/withdraw` - Withdraw to external wallet

**Transactions (3 endpoints)**
- `GET /wallet/transactions` - Transaction history
- `GET /wallet/transactions/:id` - Transaction details
- `GET /wallet/transactions/deposit/:id/status` - Deposit status

**Transfers (4 endpoints)**
- `POST /transfers/internal` - Create P2P transfer
- `POST /transfers/external` - Create external transfer
- `GET /transfers` - Transfer history
- `GET /transfers/:id` - Transfer details

**Beneficiaries (6 endpoints)**
- `GET /beneficiaries` - List beneficiaries
- `GET /beneficiaries/:id` - Get beneficiary
- `POST /beneficiaries` - Create beneficiary
- `PUT /beneficiaries/:id` - Update beneficiary
- `POST /beneficiaries/:id/favorite` - Toggle favorite
- `DELETE /beneficiaries/:id` - Delete beneficiary

**Sessions (4 endpoints)**
- `GET /sessions` - Active sessions
- `GET /sessions/all` - All sessions
- `DELETE /sessions/:id` - Revoke session
- `DELETE /sessions` - Revoke all sessions

**Devices (8 endpoints)**
- `POST /devices/register` - Register device
- `POST /devices/fcm-token` - Update FCM token
- `GET /devices` - Active devices
- `GET /devices/all` - All devices
- `POST /devices/:id/trust` - Trust device
- `POST /devices/:id/untrust` - Untrust device
- `DELETE /devices/:id` - Revoke device
- `DELETE /devices` - Revoke all devices

**Merchants (9 endpoints)**
- `POST /merchants/register` - Register merchant
- `GET /merchants/me` - My merchant profile
- `GET /merchants/:id` - Merchant details
- `GET /merchants/:id/qr` - Merchant QR code
- `POST /merchants/decode-qr` - Decode QR
- `POST /merchants/:id/payment-request` - Create payment request
- `POST /merchants/pay` - Pay merchant
- `GET /merchants/:id/transactions` - Merchant transactions
- `GET /merchants/:id/analytics` - Merchant analytics

**Bill Payments (7 endpoints)**
- `GET /bill-payments/categories` - Bill categories
- `GET /bill-payments/providers` - Payment providers
- `POST /bill-payments/validate` - Validate account
- `POST /bill-payments/pay` - Pay bill
- `GET /bill-payments/history` - Payment history
- `GET /bill-payments/:id/receipt` - Payment receipt
- `GET /bill-payments/:id` - Payment details

**Feature Flags (2 endpoints)**
- `GET /feature-flags/check/:key` - Check feature
- `GET /feature-flags/me` - All enabled features

**Health (5 endpoints)**
- `GET /health` - Basic health check
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe
- `GET /health/detailed` - Detailed health
- `GET /health/providers` - Provider health

#### Environments

**Local Development**
- Base URL: `http://localhost:3000`
- Test phone: `+2250701234567`
- Hardcoded OTP: `123456`
- Test PIN: `1234`

**Staging**
- Base URL: `https://api-staging.joonapay.com`
- Test phone: `+2250707777777`
- Real SMS OTP delivery

**Production**
- Base URL: `https://api.joonapay.com`
- Production environment (use with caution)

#### Documentation
- **POSTMAN_GUIDE.md** - Comprehensive setup and usage guide
- **README.md** - Quick start and overview
- **QUICK_REFERENCE.md** - One-page API reference card
- **CHANGELOG.md** - This file

#### Scripts & CI/CD
- **run-tests.sh** - Newman test runner script
- **package.json** - npm scripts for testing
- **.github-workflows-example.yml** - GitHub Actions example
- **.gitlab-ci-example.yml** - GitLab CI example

#### Features
- Token auto-refresh on expiry
- PIN token management (5-minute validity)
- Idempotency key generation
- Request/response logging
- Test result validation
- Environment variable auto-save

### Documentation

Added comprehensive documentation covering:
- Import and setup instructions
- Authentication workflows
- Common use cases (deposit, transfer, bill pay, merchant pay)
- Collection Runner usage
- Newman CLI commands
- CI/CD integration examples
- Troubleshooting guide
- West African test data
- Rate limiting information
- Best practices

### Test Scripts

Added test assertions for:
- HTTP status code validation
- Response structure validation
- Token existence checks
- Auto-save tokens to environment
- Error handling validation

---

## Upcoming Features

### [1.1.0] - Planned

#### New Endpoints
- KYC submission endpoints
- Document upload endpoints
- Recurring transfers
- Payment links
- Compliance screening
- Support ticket system

#### Improvements
- Mock server for offline testing
- Pre-populated test data for faster setup
- Performance benchmarking tests
- Load testing scenarios
- Security testing suite

#### Documentation
- Video tutorials
- Interactive examples
- API changelog integration
- Error code reference

---

## Contributing

To update the collection:

1. Make changes in Postman
2. Export collection: **Collections** > **...** > **Export** > **Collection v2.1**
3. Save to `JoonaPay_API.postman_collection.json`
4. Export environment if changed
5. Update this changelog
6. Commit changes

---

## Notes

- Collection version matches backend API version
- Breaking changes will increment major version
- New endpoints increment minor version
- Bug fixes increment patch version
