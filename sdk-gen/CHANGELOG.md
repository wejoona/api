# SDK Changelog

All notable changes to the JoonaPay SDKs will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial SDK generation configuration
- TypeScript/Axios SDK for web dashboard
- Dart/Dio SDK for Flutter mobile app
- Automated generation scripts
- CI/CD integration with GitHub Actions
- Publishing scripts for NPM and pub.dev

## [1.0.0] - 2026-01-30

### Added
- Initial release of TypeScript SDK
- Initial release of Dart SDK
- Support for all API endpoints:
  - Authentication (register, login, verify OTP)
  - User profile management
  - Wallet operations (balance, deposits, withdrawals)
  - Internal and external transfers
  - Transaction history
  - Beneficiary management
  - KYC verification
  - Session management
  - Device management
  - Feature flags
  - Bill payments
  - Merchant operations
  - Payment links
  - Health checks

### Features
- Full TypeScript type definitions
- Null-safe Dart implementation
- Automatic request/response serialization
- JWT authentication support
- Axios HTTP client (TypeScript)
- Dio HTTP client (Dart)
- Comprehensive error handling
- Request interceptors support
- Token refresh mechanism

### Documentation
- Installation guides
- Integration examples
- API usage documentation
- Authentication flows
- Error handling patterns

## Version Numbering

SDKs follow semantic versioning:

- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality in a backwards compatible manner
- **PATCH** version for backwards compatible bug fixes

## Migration Guides

### From 0.x to 1.0

First official release - no migration needed.

---

**Note**: Generated SDKs are tracked in version control to provide transparency on API changes. Each API update triggers automatic SDK regeneration.
