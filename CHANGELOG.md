# API Changelog

All notable changes to the JoonaPay USDC Wallet API are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this API adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Version Policy

- **Major version** (v1 -> v2): Breaking changes requiring client updates
- **Minor version** (v1.1 -> v1.2): New features, backward compatible
- **Patch version** (v1.1.0 -> v1.1.1): Bug fixes, backward compatible

## API Versions

| Version | Status       | Released   | Deprecated | Sunset     |
|---------|--------------|------------|------------|------------|
| v2      | Current      | 2026-07-01 | -          | -          |
| v1      | Deprecated   | 2026-01-01 | 2026-07-01 | 2027-07-01 |

---

## [v2.0.0] - 2026-07-01

### Overview

API v2 introduces significant improvements to response formats, enhanced error handling, and new endpoints for advanced features. This version focuses on consistency, extensibility, and better mobile SDK integration.

### Breaking Changes

#### Wallet Module

- **GET /wallet** - Response format changed
  ```diff
  - { "walletId": "...", "balance": 100.50, "currency": "USD" }
  + {
  +   "walletId": "...",
  +   "balances": [
  +     { "currency": "USD", "available": 100.50, "pending": 0, "total": 100.50 }
  +   ],
  +   "limits": { "daily": 10000, "monthly": 50000, "remaining": { "daily": 8500, "monthly": 45000 } }
  + }
  ```

- **POST /wallet/transfer/internal** - Request and response restructured
  ```diff
  - { "toPhone": "+225...", "amount": 50, "currency": "USD" }
  + { "recipient": { "phone": "+225...", "type": "phone" }, "amount": { "value": 5000, "currency": "USDC" }, "note": "..." }
  ```
  - Amount now in cents (integer) instead of dollars (float)
  - Recipient is now an object supporting multiple identifier types

- **POST /wallet/transfer/external** - Amount format changed
  ```diff
  - { "toAddress": "0x...", "amount": 50.00, "currency": "USD", "network": "polygon" }
  + { "destination": { "address": "0x...", "network": "polygon" }, "amount": { "value": 5000, "currency": "USDC" } }
  ```

- **POST /wallet/deposit** - Response structure enhanced
  ```diff
  - { "transactionId": "...", "depositId": "...", "amount": 10000, ... }
  + {
  +   "deposit": {
  +     "id": "...",
  +     "reference": "DEP-ABC123",
  +     "amount": { "source": { "value": 10000, "currency": "XOF" }, "target": { "value": 1645, "currency": "USDC" } },
  +     "rate": { "value": 0.00166, "expiresAt": "..." },
  +     "fee": { "value": 150, "currency": "XOF" },
  +     "instructions": { ... },
  +     "status": "pending",
  +     "expiresAt": "..."
  +   }
  + }
  ```

#### Transaction Module

- **GET /wallet/transactions** - Response pagination changed
  ```diff
  - { "transactions": [...], "total": 50, "limit": 20, "offset": 0, "hasMore": true }
  + {
  +   "data": [...],
  +   "pagination": { "page": 1, "limit": 20, "total": 50, "totalPages": 3, "hasNext": true, "hasPrev": false },
  +   "meta": { "currency": "USDC", "timezone": "UTC" }
  + }
  ```
  - Changed from offset-based to page-based pagination
  - Query params: `?offset=20` -> `?page=2`

- **GET /wallet/transactions/:id** - Response structure enhanced
  ```diff
  - { "id": "...", "type": "deposit", "amount": 16.45, "currency": "USD", ... }
  + {
  +   "transaction": {
  +     "id": "...",
  +     "reference": "TXN-ABC123",
  +     "type": "deposit",
  +     "amount": { "value": 1645, "currency": "USDC" },
  +     "counterparty": { ... },
  +     "status": { "code": "completed", "updatedAt": "..." },
  +     "metadata": { ... },
  +     "timestamps": { "created": "...", "completed": "..." }
  +   }
  + }
  ```

#### Authentication Module

- **POST /auth/verify-otp** - Response includes additional fields
  ```diff
  - { "accessToken": "...", "refreshToken": "...", "user": {...}, "kycStatus": "..." }
  + {
  +   "tokens": { "access": "...", "refresh": "...", "expiresIn": 900 },
  +   "user": { ... },
  +   "session": { "id": "...", "deviceId": "...", "createdAt": "..." },
  +   "kyc": { "status": "...", "tier": 1, "limits": {...} }
  + }
  ```

- **POST /auth/refresh** - Response format aligned with verify-otp
  ```diff
  - { "accessToken": "...", "refreshToken": "..." }
  + { "tokens": { "access": "...", "refresh": "...", "expiresIn": 900 } }
  ```

#### KYC Module

- **GET /kyc/status** - Enhanced response with tier information
  ```diff
  - { "status": "approved", "score": 92, "submittedAt": "...", "approvedAt": "...", "canResubmit": false }
  + {
  +   "kyc": {
  +     "status": "approved",
  +     "tier": 2,
  +     "verification": { "score": 92, "method": "auto", "provider": "onfido" },
  +     "timestamps": { "submitted": "...", "approved": "..." },
  +     "limits": { "daily": 10000, "monthly": 50000 },
  +     "documents": { "idVerified": true, "selfieVerified": true },
  +     "canResubmit": false
  +   }
  + }
  ```

- **POST /kyc/submit** - Request field names standardized
  ```diff
  - { "idFrontKey": "...", "idBackKey": "...", "selfieKey": "..." }
  + { "documents": { "idFront": "...", "idBack": "...", "selfie": "..." }, "identity": { "firstName": "...", ... } }
  ```

#### Transfer Module

- **GET /transfers** - Response format aligned with transactions
  ```diff
  - { "transfers": [...], "total": 50, "limit": 20, "offset": 0 }
  + {
  +   "data": [...],
  +   "pagination": { "page": 1, "limit": 20, "total": 50, "totalPages": 3 }
  + }
  ```

- **POST /transfers/internal** and **POST /transfers/external** - Unified with wallet endpoints
  - These endpoints now mirror `/wallet/transfer/internal` and `/wallet/transfer/external`
  - Amount in cents, structured request/response

#### Error Response Format

- All error responses now use a consistent format:
  ```diff
  - { "message": "Invalid PIN", "remainingAttempts": 3 }
  + {
  +   "error": {
  +     "code": "PIN_INVALID",
  +     "message": "The provided PIN is incorrect",
  +     "details": { "remainingAttempts": 3, "lockoutThreshold": 5 },
  +     "hint": "Please verify your PIN and try again"
  +   },
  +   "requestId": "req_abc123",
  +   "timestamp": "2026-07-01T12:00:00Z"
  + }
  ```

### Added

#### New Endpoints

- **GET /wallet/limits** - Get current transaction limits based on KYC tier
- **GET /wallet/activity** - Get wallet activity feed with rich metadata
- **POST /wallet/transfer/preview** - Preview transfer before execution (fees, rate, estimated arrival)
- **GET /transfers/:id/receipt** - Generate transfer receipt (PDF)
- **POST /kyc/documents/upload** - Direct document upload with pre-signed URLs
- **GET /kyc/requirements** - Get KYC requirements for user's country
- **GET /user/devices** - List user's registered devices
- **DELETE /user/devices/:id** - Remove a registered device
- **GET /notifications/preferences** - Get notification preferences
- **PUT /notifications/preferences** - Update notification preferences
- **GET /rates/history** - Get historical exchange rates
- **POST /beneficiaries** - Add saved beneficiary
- **GET /beneficiaries** - List saved beneficiaries
- **DELETE /beneficiaries/:id** - Remove beneficiary

#### New Headers

- `X-Request-ID` - Unique request identifier for tracing
- `X-Client-Version` - Mobile app version for compatibility checks
- `X-Device-ID` - Device identifier for security checks
- `X-Timezone` - Client timezone for date formatting

#### New Query Parameters

- All list endpoints now support:
  - `sort` - Sort field (e.g., `createdAt`, `amount`)
  - `order` - Sort order (`asc`, `desc`)
  - `filter[status]` - Filter by status
  - `filter[type]` - Filter by type
  - `filter[dateFrom]` - Filter by start date
  - `filter[dateTo]` - Filter by end date

### Changed

- All monetary amounts are now returned as integers in cents/smallest currency unit
- All timestamps are now in ISO 8601 format with timezone
- Rate limits are now communicated via `X-RateLimit-*` headers
- Pagination defaults changed from 20 to 25 items per page

### Deprecated

- None (v2 is the latest version)

### Removed

- **GET /wallet/deposit/channels** - Merged into **GET /wallet/channels**
- **POST /wallet/kyc/submit** - Use **POST /kyc/submit** instead
- **GET /wallet/kyc/status** - Use **GET /kyc/status** instead

### Security

- PIN tokens now expire after 2 minutes (previously 5 minutes)
- Added device binding for sensitive operations
- Enhanced rate limiting on financial endpoints
- Added request signing requirement for amounts > $1000

---

## [v1.3.0] - 2026-06-15

### Added

- **GET /wallet/transactions** - Advanced filtering with date range, amount range, and text search
- **POST /wallet/withdraw** - Direct withdrawal endpoint (alias for external transfer)
- **GET /user/limits** - Get user transaction limits based on KYC status
- **GET /health/detailed** - Detailed health check for monitoring
- Idempotency support via `X-Idempotency-Key` header on all POST requests

### Changed

- Improved error messages with actionable hints
- Enhanced rate limiting with sliding window algorithm
- Transaction search now supports partial matching

### Fixed

- Fixed race condition in concurrent transfer requests
- Fixed timezone handling in transaction timestamps
- Fixed pagination count for filtered queries

---

## [v1.2.0] - 2026-04-01

### Added

- **POST /transfers/internal** - New transfer endpoint with enhanced response
- **POST /transfers/external** - New external transfer endpoint
- **GET /transfers** - Transfer history with pagination
- **GET /transfers/:id** - Get transfer by ID
- **POST /wallet/pin/set** - Set or update transaction PIN
- **POST /wallet/pin/verify** - Verify PIN and get authorization token
- PIN verification guard for sensitive operations
- `X-Pin-Token` header for PIN-protected endpoints

### Changed

- Internal transfers now require PIN verification
- External transfers now require PIN verification
- Improved transfer status tracking

### Security

- Added PIN-based transaction authorization
- PIN lockout after 5 failed attempts (15-minute lockout)
- PIN tokens valid for 5 minutes

---

## [v1.1.0] - 2026-02-15

### Added

- **GET /wallet/rate** - Get exchange rate quote with fee breakdown
- **GET /wallet/deposit/channels** - Get available deposit channels
- **POST /wallet/deposit** - Initiate deposit with payment instructions
- **GET /wallet/transactions/:id** - Get transaction details
- **GET /wallet/transactions/deposit/:id/status** - Live deposit status
- Username-based transfers (find user by @username)
- **GET /user/username/check/:username** - Check username availability
- **GET /user/username/search** - Search users by username
- **GET /user/by-username/:username** - Find user by username

### Changed

- Deposit flow now returns structured payment instructions
- Transaction history includes deposit source details

### Fixed

- Fixed rate expiration not being enforced
- Fixed deposit channel availability for different countries

---

## [v1.0.0] - 2026-01-01

### Initial Release

#### Authentication

- **POST /auth/register** - Register new user with phone number
- **POST /auth/verify-otp** - Verify OTP and get access token
- **POST /auth/login** - Request login OTP
- **POST /auth/refresh** - Refresh access token
- **POST /auth/logout** - Logout and invalidate refresh token
- **POST /auth/logout-all** - Logout from all devices

#### User

- **GET /user/profile** - Get current user profile
- **PUT /user/profile** - Update user profile

#### Wallet

- **GET /wallet** - Get wallet balance
- **POST /wallet/create** - Create/activate wallet
- **POST /wallet/transfer/internal** - Transfer to another user
- **POST /wallet/transfer/external** - Transfer to external wallet

#### KYC

- **GET /kyc/status** - Get KYC verification status
- **POST /kyc/submit** - Submit KYC documents

#### Transactions

- **GET /wallet/transactions** - Get transaction history

---

## Migration Guides

For detailed migration instructions between versions, see:

- [v1 to v2 Migration Guide](docs/api-changes/v1-to-v2-migration.md)
- [Authentication Changes](docs/api-changes/auth-migration.md)
- [Wallet API Changes](docs/api-changes/wallet-migration.md)
- [Transaction API Changes](docs/api-changes/transaction-migration.md)
- [KYC API Changes](docs/api-changes/kyc-migration.md)

---

## Deprecation Notices

### API v1 Deprecation (Effective 2026-07-01)

API v1 is deprecated as of July 1, 2026. Key dates:

- **2026-07-01**: v1 deprecated, v2 released
- **2027-01-01**: v1 will return deprecation warnings in response headers
- **2027-07-01**: v1 sunset (returns 410 Gone)

**Action Required**: Migrate to v2 before 2027-07-01

When using deprecated endpoints, you will receive these headers:

```http
X-API-Version: 1
X-API-Latest-Version: 2
X-API-Deprecated: true
X-API-Deprecation-Info: API version 1 is deprecated. Please migrate to v2. Sunset date: 2027-07-01
X-API-Sunset-Date: 2027-07-01
```

---

## Support

- **Documentation**: https://docs.joonapay.com
- **API Status**: https://status.joonapay.com
- **Developer Support**: api-support@joonapay.com
- **Migration Help**: Contact your account manager or submit a support ticket
