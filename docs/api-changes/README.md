# API Changes Documentation

This directory contains migration guides for transitioning between API versions.

## Quick Links

| Document | Description |
|----------|-------------|
| [v1-to-v2-migration.md](./v1-to-v2-migration.md) | Complete migration guide from v1 to v2 |
| [auth-migration.md](./auth-migration.md) | Authentication endpoint changes |
| [wallet-migration.md](./wallet-migration.md) | Wallet and transfer endpoint changes |
| [transaction-migration.md](./transaction-migration.md) | Transaction history endpoint changes |
| [kyc-migration.md](./kyc-migration.md) | KYC verification endpoint changes |

## API Versions Overview

| Version | Status | Base URL |
|---------|--------|----------|
| v2 | Current | `https://api.joonapay.com/api/v2` |
| v1 | Deprecated | `https://api.joonapay.com/api/v1` |

## Key Changes Summary

### v1 to v2

1. **Amount Format**: All monetary values changed from float (dollars) to integer (cents)
2. **Pagination**: Changed from offset-based to page-based pagination
3. **Response Structure**: Unified format with nested objects
4. **Error Handling**: Standardized error codes and format
5. **New Headers**: `X-Request-ID`, `X-Device-ID`, `X-Client-Version`

## Migration Priority

1. **High Priority** (Financial Operations)
   - Wallet balance
   - Transfers (internal and external)
   - Deposits

2. **Medium Priority** (User Experience)
   - Transaction history
   - Authentication
   - KYC

3. **Lower Priority** (Optional Features)
   - User profile
   - Notifications
   - Settings

## Testing

### Sandbox Environment

```
https://sandbox.api.joonapay.com/api/v2
```

### Test Credentials

Contact api-support@joonapay.com for sandbox credentials.

## Support

- **Email**: api-support@joonapay.com
- **Documentation**: https://docs.joonapay.com
- **Status Page**: https://status.joonapay.com
