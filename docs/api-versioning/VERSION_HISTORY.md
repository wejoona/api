# JoonaPay API Version History

This document tracks all versions of the JoonaPay USDC Wallet API, including release dates, changes, and deprecation timelines.

## Version Overview

| Version | Status | Release Date | Deprecation Date | Sunset Date | Support Level |
|---------|--------|--------------|------------------|-------------|---------------|
| v1.0 | Current | 2026-01-01 | - | - | Full Support |
| v2.0 | Planned | 2026-07-01 | - | - | - |

## Version 1.0 (Current)

**Release Date:** January 1, 2026
**Status:** Current, Fully Supported
**Base URL:** `https://api.joonapay.com/api/v1`

### Initial Release Features

#### Authentication & Authorization
- Phone-based OTP authentication
- JWT access tokens (15-minute expiry)
- Refresh token mechanism (7-day expiry)
- Device fingerprinting
- PIN verification for sensitive operations

#### Wallet Management
- USDC wallet creation
- Balance inquiries
- Transaction history (offset-based pagination)
- Multi-currency support (USDC, XOF)
- Transaction export (CSV, PDF)

#### Transfers
- Internal transfers (phone-to-phone)
- External transfers (blockchain withdrawals)
- Beneficiary management
- Transfer limits and controls
- Real-time transfer status

#### Deposits & Withdrawals
- Mobile money deposits (Orange Money, MTN, Wave)
- Bank transfer deposits
- Crypto withdrawals (Polygon, Ethereum, Solana)
- Exchange rate quotes
- Fee calculation

#### KYC (Know Your Customer)
- Tier-based verification (1-3)
- Document upload (ID, Selfie, Proof of Address)
- Liveness detection
- Automated verification
- Manual review process

#### Security
- PIN management (creation, change, reset)
- Device whitelisting
- Address whitelisting
- Session management
- Rate limiting

#### Webhooks
- Transaction events
- Deposit confirmations
- Withdrawal updates
- KYC status changes
- Webhook retry mechanism

### v1.0 Technical Specifications

#### Request/Response Format
```json
// Standard success response
{
  "data": { /* resource data */ },
  "message": "Success"
}

// Standard error response
{
  "message": "Error description",
  "statusCode": 400,
  "error": "Bad Request"
}
```

#### Amount Representation
- **Currency:** USD (converted from USDC 1:1)
- **Format:** Decimal (floating-point)
- **Precision:** 2 decimal places
- **Example:** `50.00` = $50.00

#### Pagination
- **Method:** Offset-based
- **Parameters:** `limit`, `offset`
- **Default limit:** 20
- **Max limit:** 100

#### Authentication Headers
```http
Authorization: Bearer <access_token>
X-Pin-Token: <pin_token>  # For sensitive operations
```

### v1.0 Endpoint Summary

#### Authentication (`/auth`)
- `POST /auth/request-otp` - Request OTP for login/registration
- `POST /auth/verify-otp` - Verify OTP and authenticate
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout current session

#### Wallet (`/wallet`)
- `GET /wallet` - Get wallet balance
- `GET /wallet/transactions` - Get transaction history
- `GET /wallet/transactions/:id` - Get transaction details
- `POST /wallet/export` - Export transactions

#### Transfers (`/wallet/transfer`)
- `POST /wallet/transfer/internal` - Internal transfer (phone-to-phone)
- `POST /wallet/transfer/external` - External transfer (crypto withdrawal)
- `GET /wallet/transfer/:id` - Get transfer status

#### Deposits (`/wallet/deposit`)
- `GET /wallet/deposit/channels` - Get available deposit channels
- `POST /wallet/deposit/initiate` - Initiate deposit
- `GET /wallet/deposit/:id` - Get deposit status

#### KYC (`/wallet/kyc`)
- `GET /wallet/kyc/status` - Get KYC status
- `POST /wallet/kyc/submit` - Submit KYC documents
- `POST /wallet/kyc/upload` - Upload KYC document

#### Recipients (`/recipients`)
- `GET /recipients` - List saved recipients
- `POST /recipients` - Add recipient
- `DELETE /recipients/:id` - Delete recipient

#### Security (`/security`)
- `POST /security/pin/create` - Create PIN
- `POST /security/pin/change` - Change PIN
- `POST /security/pin/reset` - Reset PIN
- `GET /security/devices` - List trusted devices
- `DELETE /security/devices/:id` - Remove device

### v1.0 Known Limitations

1. **Floating-Point Precision**
   - Currency amounts use floating-point numbers
   - Can cause rounding errors in calculations
   - Example: `0.1 + 0.2 = 0.30000000000000004`

2. **Inconsistent Response Formats**
   - Some endpoints return data directly
   - Others wrap data in `data` field
   - Error formats vary across endpoints

3. **Limited Pagination**
   - Offset-based pagination inefficient for large datasets
   - No cursor-based pagination
   - No sorting options

4. **Single Currency Balance**
   - Wallet returns single currency balance
   - No multi-currency support in response
   - Assumes USD/USDC only

5. **Basic Error Messages**
   - String-based error messages
   - No structured error codes
   - Difficult to programmatically handle errors

6. **No Idempotency**
   - Duplicate requests can cause duplicate transactions
   - No idempotency key support

7. **Limited Filtering**
   - Transaction history has basic filters only
   - No advanced query capabilities

## Version 2.0 (Planned)

**Planned Release:** July 1, 2026
**Status:** In Development
**Base URL:** `https://api.joonapay.com/api/v2`

### Major Changes from v1.0

#### 1. Integer-Based Amounts (Breaking Change)
**Why:** Eliminate floating-point precision issues

```diff
// v1
- "amount": 50.00

// v2
+ "amount": { "value": 5000, "currency": "USDC" }  // 5000 cents
```

#### 2. Structured Response Format (Breaking Change)
**Why:** Consistency across all endpoints

```diff
// v1
- { "balance": 100.50, "currency": "USD" }

// v2
+ {
+   "data": {
+     "walletId": "wallet-123",
+     "balances": [
+       { "currency": "USDC", "available": 10050, "pending": 0, "total": 10050 }
+     ]
+   },
+   "meta": { "timestamp": "2026-07-01T10:00:00Z" }
+ }
```

#### 3. Structured Error Codes (Breaking Change)
**Why:** Programmatic error handling

```diff
// v1
- { "message": "Invalid PIN", "statusCode": 400 }

// v2
+ {
+   "error": {
+     "code": "PIN_INVALID",
+     "message": "The PIN you entered is incorrect",
+     "hint": "Please try again or reset your PIN"
+   },
+   "requestId": "req-abc123"
+ }
```

#### 4. Page-Based Pagination (Breaking Change)
**Why:** Better UX and performance

```diff
// v1
- GET /wallet/transactions?limit=20&offset=40

// v2
+ GET /wallet/transactions?page=3&limit=20&sort=createdAt&order=desc
```

#### 5. Idempotency Support (New Feature)
**Why:** Prevent duplicate transactions

```diff
// v2 only
+ POST /wallet/transfer/internal
+ Headers:
+   X-Idempotency-Key: unique-key-123
```

#### 6. Enhanced Transfer Object (Breaking Change)
**Why:** Support multiple recipient types

```diff
// v1
- { "toPhone": "+2250701234567", "amount": 50.00 }

// v2
+ {
+   "recipient": {
+     "type": "phone",
+     "phone": "+2250701234567"
+   },
+   "amount": { "value": 5000, "currency": "USDC" }
+ }
```

#### 7. Multi-Currency Balance (Breaking Change)
**Why:** Prepare for future multi-currency support

```diff
// v1
- { "balance": 100.50, "currency": "USD" }

// v2
+ {
+   "balances": [
+     { "currency": "USDC", "available": 10050, "pending": 0, "total": 10050 }
+   ]
+ }
```

#### 8. Enhanced Webhook Payloads (Non-Breaking)
**Why:** More context in webhook events

New fields:
- `event.metadata` - Additional event context
- `event.idempotencyKey` - For deduplication
- `event.retryCount` - Number of delivery attempts

#### 9. Request Tracing (New Feature)
**Why:** Better debugging and support

New headers:
```http
X-Request-ID: <uuid>         # Client-generated request ID
X-Trace-ID: <uuid>           # Server-generated trace ID
```

#### 10. Rate Limit Information (New Feature)
**Why:** Help clients manage rate limits

Response headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1625097600
```

### v2.0 New Endpoints

#### GraphQL Support (Experimental)
- `POST /graphql` - GraphQL endpoint for complex queries

#### Batch Operations
- `POST /wallet/transfers/batch` - Batch transfer creation
- `GET /wallet/transactions/batch` - Batch transaction lookup

#### Analytics
- `GET /wallet/analytics/summary` - Spending analytics
- `GET /wallet/analytics/trends` - Transaction trends

#### Recurring Transfers
- `POST /wallet/recurring` - Create recurring transfer
- `GET /wallet/recurring` - List recurring transfers
- `PUT /wallet/recurring/:id` - Update recurring transfer
- `DELETE /wallet/recurring/:id` - Cancel recurring transfer

#### Payment Links
- `POST /payment-links` - Create payment link
- `GET /payment-links/:id` - Get payment link
- `POST /payment-links/:id/pay` - Pay via payment link

### v2.0 Removed Endpoints

| Removed v1 Endpoint | v2 Replacement |
|---------------------|----------------|
| `GET /wallet/deposit/channels` | `GET /wallet/channels` |
| `POST /wallet/kyc/submit` | `POST /kyc/submit` |
| `GET /wallet/kyc/status` | `GET /kyc/status` |

### v2.0 Technical Specifications

#### Amount Object
```typescript
interface Amount {
  value: number;      // Integer in cents
  currency: string;   // "USDC", "XOF", etc.
}
```

#### Pagination Object
```typescript
interface Pagination {
  page: number;       // Current page (1-based)
  limit: number;      // Items per page (default: 25, max: 100)
  total: number;      // Total items
  totalPages: number; // Total pages
  hasNext: boolean;   // Has next page
  hasPrev: boolean;   // Has previous page
}
```

#### Error Object
```typescript
interface ApiError {
  error: {
    code: string;         // Machine-readable error code
    message: string;      // User-friendly message
    details?: object;     // Additional error context
    hint?: string;        // Suggested resolution
  };
  requestId: string;      // For support tickets
  timestamp: string;      // ISO 8601 timestamp
}
```

## Version Support Policy

### Support Levels

1. **Full Support**
   - Active development and feature additions
   - Bug fixes and security patches
   - Performance improvements
   - 24/7 support availability

2. **Maintenance Mode**
   - Security patches only
   - Critical bug fixes
   - No new features
   - Standard support hours

3. **Deprecated**
   - Security patches for critical vulnerabilities
   - No bug fixes for non-security issues
   - No support except for migration assistance
   - Deprecation warnings in responses

4. **Sunset**
   - API returns 410 Gone
   - No support
   - Redirects to migration documentation

### Version Lifecycle

```
Development (3-6 months)
    ↓
Beta/Preview (1-2 months)
    ↓
General Availability (12+ months)
    ↓
Maintenance Mode (6 months after next version release)
    ↓
Deprecated (6 months notice)
    ↓
Sunset (12+ months after deprecation)
```

### Deprecation Timeline

- **Minimum notice:** 6 months before sunset
- **Minimum support:** 12 months after deprecation announcement
- **Migration assistance:** Available throughout deprecation period
- **Sunset extensions:** Available on request for enterprise clients

### Example Timeline (v1 → v2)

| Date | Event | v1 Status | v2 Status |
|------|-------|-----------|-----------|
| 2026-01-01 | v1 GA | Full Support | - |
| 2026-04-01 | v2 Beta | Full Support | Beta |
| 2026-07-01 | v2 GA | Maintenance | Full Support |
| 2027-01-01 | v1 Deprecation Notice | Deprecated | Full Support |
| 2027-07-01 | v1 Sunset | Sunset | Full Support |

## Breaking Changes Summary

### v1.0 → v2.0 Breaking Changes

| Category | v1 Behavior | v2 Behavior | Impact |
|----------|-------------|-------------|--------|
| Amounts | Float (50.00) | Integer in cents (5000) | High |
| Pagination | Offset-based | Page-based | Medium |
| Error Format | String message | Structured error code | High |
| Response Structure | Inconsistent | Standardized `data` wrapper | High |
| Balance | Single currency | Multi-currency array | High |
| Transfer Request | Flat object | Nested recipient object | Medium |
| Query Parameters | Direct filters | `filter[]` prefix | Low |
| Default Limit | 20 | 25 | Low |

## Migration Support

### Resources Available

1. **Migration Guide**
   - Step-by-step migration instructions
   - Code examples for all endpoints
   - Before/after comparisons
   - Located: `/docs/api-versioning/MIGRATION_GUIDE_V1_V2.md`

2. **Sandbox Environment**
   - Test v2 API before production migration
   - URL: `https://sandbox.api.joonapay.com/api/v2`
   - Same test data across v1 and v2

3. **Migration Scripts**
   - Request/response transformers
   - Amount conversion utilities
   - Error code mappers
   - Available in SDK packages

4. **Developer Support**
   - Migration assistance via email: `migration@joonapay.com`
   - Office hours: Tuesdays 2-4 PM WAT
   - Discord channel: `#api-migration`

### Migration Checklist

- [ ] Review breaking changes documentation
- [ ] Test endpoints in sandbox environment
- [ ] Update amount handling (dollars → cents)
- [ ] Update pagination logic (offset → page)
- [ ] Update error handling (messages → codes)
- [ ] Update response parsing (flat → nested)
- [ ] Add idempotency keys to transfers
- [ ] Add request ID headers
- [ ] Test parallel running (v1 + v2)
- [ ] Monitor deprecation headers
- [ ] Full regression testing
- [ ] Deploy to production

## Changelog Format

All changes follow this format:

```markdown
### Version X.Y.Z - YYYY-MM-DD

#### Added
- New features or endpoints

#### Changed
- Changes in existing functionality

#### Deprecated
- Features scheduled for removal

#### Removed
- Features removed in this version

#### Fixed
- Bug fixes

#### Security
- Security patches or improvements
```

## Version Numbering

JoonaPay API uses semantic versioning (SemVer):

- **Major version (X.0.0):** Breaking changes
- **Minor version (0.X.0):** New features, backwards-compatible
- **Patch version (0.0.X):** Bug fixes, backwards-compatible

### URI Versioning
- Only major versions appear in URI (`/api/v1`, `/api/v2`)
- Minor and patch versions tracked in documentation
- Version header shows full version: `X-API-Version: 1.2.3`

## Monitoring & Analytics

### Version Usage Metrics

Track these metrics per version:

1. **Request Volume**
   - Total requests per version
   - Requests per endpoint
   - Peak usage times

2. **Error Rates**
   - Error rate by version
   - Error rate by endpoint
   - Common error codes

3. **Response Times**
   - Average response time per version
   - P95/P99 latency
   - Slow endpoints

4. **Client Adoption**
   - Active clients per version
   - Client versions (mobile app, SDK)
   - Migration progress

5. **Deprecation Impact**
   - Requests to deprecated endpoints
   - Clients still on deprecated version
   - Migration blockers

### Version Headers

All responses include:

```http
X-API-Version: 1.0.0              # Current version used
X-API-Latest-Version: 2.0.0       # Latest available version
X-API-Deprecated: true            # If version is deprecated
X-API-Sunset-Date: 2027-07-01     # Planned sunset date
X-API-Deprecation-Info: ...       # Migration information
```

## Contact & Support

- **API Documentation:** https://docs.joonapay.com
- **Developer Portal:** https://developers.joonapay.com
- **Support Email:** api-support@joonapay.com
- **Migration Email:** migration@joonapay.com
- **Status Page:** https://status.joonapay.com
- **Developer Discord:** https://discord.gg/joonapay
- **GitHub Issues:** https://github.com/joonapay/api-issues

## References

- [API Versioning Strategy](/docs/API_VERSIONING.md)
- [Deprecation Policy](/docs/api-versioning/DEPRECATION_POLICY.md)
- [Migration Guide v1→v2](/docs/api-versioning/MIGRATION_GUIDE_V1_V2.md)
- [OpenAPI Specification](/docs/openapi/v1.yaml)

---

**Last Updated:** January 30, 2026
**Next Review:** April 30, 2026
