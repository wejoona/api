# Consumer-Driven Contract Tests

This directory contains Pact-style consumer-driven contract tests that validate API responses
match mobile app expectations.

## Overview

These tests ensure that the backend API responses conform to the contracts expected by the
mobile Flutter application. They validate:

- Response shape (required vs optional fields)
- Field types (string, number, boolean, arrays, objects)
- Enum values where applicable
- Nullable fields
- Date formats

## Structure

```
contracts/
├── README.md                           # This file
├── jest-contracts.json                 # Jest configuration for contract tests
├── matchers/
│   └── contract-matchers.ts            # Custom matchers for contract validation
├── schemas/
│   ├── auth.contract.ts                # Auth endpoint contracts
│   ├── wallet.contract.ts              # Wallet endpoint contracts
│   ├── transaction.contract.ts         # Transaction endpoint contracts
│   ├── kyc.contract.ts                 # KYC endpoint contracts
│   ├── contact.contract.ts             # Contact endpoint contracts
│   ├── beneficiary.contract.ts         # Beneficiary endpoint contracts
│   └── user.contract.ts                # User endpoint contracts
├── validators/
│   └── schema-validator.ts             # JSON Schema validation utilities
└── specs/
    ├── auth.contract.spec.ts           # Auth contract tests
    ├── wallet.contract.spec.ts         # Wallet contract tests
    ├── transaction.contract.spec.ts    # Transaction contract tests
    ├── kyc.contract.spec.ts            # KYC contract tests
    ├── contact.contract.spec.ts        # Contact contract tests
    ├── beneficiary.contract.spec.ts    # Beneficiary contract tests
    └── user.contract.spec.ts           # User contract tests
```

## Running Tests

```bash
# Run all contract tests
npm run test:contracts

# Run with coverage
npm run test:contracts:cov

# Run specific contract test
npm run test:contracts -- --testPathPattern=auth
```

## Contract Format

Each contract defines:
1. **Request** - HTTP method, path, headers, body
2. **Response** - Status code, body schema
3. **Mobile Expectation** - What the Flutter app expects

## Adding New Contracts

1. Define the contract schema in `schemas/`
2. Create the test spec in `specs/`
3. Ensure mobile app models match the contract

## Mobile App Integration

The mobile app (Flutter) should use the same contracts to:
- Generate mock responses for testing
- Validate API responses at runtime (debug mode)
- Document expected API shapes

See `mobile/lib/mocks/contracts/` for mobile-side implementation.
