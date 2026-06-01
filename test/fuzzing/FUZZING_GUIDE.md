# API Fuzzing Test Suite Guide

## Overview

This fuzzing test suite uses property-based testing with fast-check to automatically generate and test thousands of inputs against all API endpoints, discovering edge cases, security vulnerabilities, and unexpected behaviors.

## What Gets Tested

### Security Vulnerabilities

- SQL Injection attempts
- XSS (Cross-Site Scripting) attacks
- Path traversal attacks
- Command injection
- Buffer overflow attempts
- Unicode edge cases

### Input Validation

- Invalid data types
- Missing required fields
- Null/undefined values
- Empty strings
- Very long strings
- Special characters
- Malformed JSON

### Boundary Values

- Minimum/maximum amounts
- Date boundaries (past/future)
- Numeric precision
- String length limits
- Array size limits

### Business Logic

- Negative amounts
- Zero values
- Currency mismatches
- Invalid state transitions
- Duplicate requests (idempotency)

### Rate Limiting & Security

- Brute force protection
- Rate limit enforcement
- Account lockout mechanisms
- Timing attack prevention

## Running Tests

### Run All Fuzzing Tests

```bash
npm run test:fuzzing
```

### Run Specific Module

```bash
# Auth fuzzing
npm run test:fuzzing -- auth

# Wallet fuzzing
npm run test:fuzzing -- wallet

# User profile fuzzing
npm run test:fuzzing -- user

# KYC fuzzing
npm run test:fuzzing -- kyc
```

### Adjust Test Intensity

```bash
# Quick run (100 iterations per property test)
npm run test:fuzzing

# Thorough run (1000 iterations)
FUZZING_RUNS=1000 npm run test:fuzzing

# Exhaustive run (10000 iterations - for CI/CD)
FUZZING_RUNS=10000 npm run test:fuzzing
```

### Verbose Output

```bash
FUZZING_VERBOSE=true npm run test:fuzzing
```

### Run with Coverage

```bash
npm run test:fuzzing -- --coverage
```

## Test Structure

### Arbitraries (`common/arbitraries.ts`)

Custom generators that create test data:

```typescript
// Valid phone numbers
phoneArbitraries.valid(); // Generates +2250701234567, etc.

// Invalid phone numbers
phoneArbitraries.invalid(); // Generates malformed numbers

// SQL injection payloads
sqlInjectionStrings(); // Generates "' OR '1'='1", etc.
```

### Helpers (`common/helpers.ts`)

Utility functions for assertions and setup:

```typescript
// Assert no sensitive data leaked
assertHelpers.noSensitiveDataLeak(response);

// Assert proper error structure
assertHelpers.hasProperErrorStructure(response);

// Assert no SQL errors
assertHelpers.noSqlErrors(response);
```

## Writing New Fuzzing Tests

### Basic Template

```typescript
import * as fc from 'fast-check';
import { fuzzConfig, assertHelpers } from '../common/helpers';
import { phoneArbitraries } from '../common/arbitraries';

it('should reject invalid phone numbers', async () => {
  await fc.assert(
    fc.asyncProperty(phoneArbitraries.invalid(), async (invalidPhone) => {
      const response = await request(app.getHttpServer())
        .post('/endpoint')
        .send({ phone: invalidPhone });

      expect(response.status).toBe(400);
      assertHelpers.noSensitiveDataLeak(response);
    }),
    { numRuns: fuzzConfig.numRuns },
  );
});
```

### Advanced: Multiple Generators

```typescript
it('should validate transfer with multiple invalid inputs', async () => {
  await fc.assert(
    fc.asyncProperty(
      phoneArbitraries.invalid(),
      amountArbitraries.invalid(),
      currencyArbitraries.invalid(),
      async (phone, amount, currency) => {
        const response = await request(app.getHttpServer())
          .post('/wallet/transfer/internal')
          .send({ toPhone: phone, amount, currency });

        expect(response.status).toBe(400);
        assertHelpers.noSensitiveDataLeak(response);
      },
    ),
    { numRuns: 100 },
  );
});
```

### Preconditions

```typescript
it('should reject mismatched PINs', async () => {
  await fc.assert(
    fc.asyncProperty(
      pinArbitraries.valid(),
      pinArbitraries.valid(),
      async (pin1, pin2) => {
        // Only test when PINs are different
        fc.pre(pin1 !== pin2);

        const response = await request(app.getHttpServer())
          .post('/wallet/pin/set')
          .send({ pin: pin1, confirmPin: pin2 });

        expect(response.status).toBe(400);
      },
    ),
    { numRuns: 50 },
  );
});
```

## Custom Arbitraries

### Create New Arbitrary

```typescript
// In common/arbitraries.ts
export const transactionIdArbitraries = {
  valid: () => fc.uuid(),
  invalid: () =>
    fc.oneof(
      fc.constant(''),
      fc.constant('not-a-uuid'),
      fc.integer().map(String),
      sqlInjectionStrings(),
    ),
};
```

### Combine Arbitraries

```typescript
const userArbitrary = fc.record({
  phone: phoneArbitraries.valid(),
  username: usernameArbitraries.valid(),
  email: emailArbitraries.valid(),
});
```

## Common Patterns

### Test All Invalid Formats

```typescript
it('should reject all invalid formats', async () => {
  await fc.assert(
    fc.asyncProperty(arbitraries.invalid(), async (invalidValue) => {
      // Test logic
      expect(response.status).toBe(400);
    }),
    { numRuns: fuzzConfig.numRuns },
  );
});
```

### Test Security Payloads

```typescript
it('should handle SQL injection', async () => {
  await fc.assert(
    fc.asyncProperty(sqlInjectionStrings(), async (sqlPayload) => {
      // Test logic
      assertHelpers.noSqlErrors(response);
    }),
    { numRuns: 20 },
  );
});
```

### Test Boundary Values

```typescript
it('should handle boundary values', async () => {
  await fc.assert(
    fc.asyncProperty(amountArbitraries.boundary(), async (boundaryAmount) => {
      // Test logic
      expect([200, 400]).toContain(response.status);
    }),
    { numRuns: 50 },
  );
});
```

## Interpreting Results

### Success

```
✓ should reject invalid phone numbers (125ms)
  Property passed after 100 successful runs
```

### Failure with Shrinking

```
✗ should reject invalid amounts
  Counterexample: [-0.5]
  Shrunk from: [-999999.123456789]
```

The test failed with `-0.5` (simplest failing case), originally found with a more complex value.

### Common Failures

1. **Information Leakage**: Response contains sensitive data
   - Fix: Sanitize error messages
   - Never expose internal paths, stack traces, or database info

2. **SQL Injection Vulnerability**: SQL error in response
   - Fix: Use parameterized queries
   - Validate and sanitize all inputs

3. **XSS Vulnerability**: Unescaped HTML in response
   - Fix: Escape all user input in responses
   - Use Content-Security-Policy headers

4. **Missing Validation**: Invalid input accepted
   - Fix: Add validation rules to DTOs
   - Use class-validator decorators

## Best Practices

### 1. Start Small, Scale Up

```bash
# Development: 100 runs
npm run test:fuzzing

# Pre-commit: 500 runs
FUZZING_RUNS=500 npm run test:fuzzing

# CI/CD: 1000+ runs
FUZZING_RUNS=1000 npm run test:fuzzing
```

### 2. Use Filters Wisely

```typescript
// Filter out obviously invalid cases to save time
fc.asyncProperty(
  fc.integer().filter((n) => n >= 0), // Only positive
  async (amount) => {
    // Test logic
  },
);
```

### 3. Reduce Runs for Expensive Tests

```typescript
// Expensive: API calls with external services
{
  numRuns: 10;
}

// Cheap: Validation-only tests
{
  numRuns: 100;
}

// Rate-limited: Auth attempts
{
  numRuns: 5;
}
```

### 4. Always Check Security

Every test should include:

```typescript
assertHelpers.noSensitiveDataLeak(response);
assertHelpers.noSqlErrors(response);
assertHelpers.hasProperErrorStructure(response);
```

### 5. Test Both Valid and Invalid

```typescript
// Invalid inputs should be rejected
it('should reject invalid', async () => {
  // Test with invalid arbitrary
});

// Valid inputs should work (or fail gracefully)
it('should accept valid', async () => {
  // Test with valid arbitrary
});
```

## Continuous Integration

### GitHub Actions Example

```yaml
- name: Run Fuzzing Tests
  run: FUZZING_RUNS=1000 npm run test:fuzzing
  timeout-minutes: 30

- name: Upload Fuzzing Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage-fuzzing/lcov.info
    flags: fuzzing
```

## Troubleshooting

### Tests Timing Out

- Reduce `numRuns` in test
- Check for infinite loops
- Optimize test setup/teardown

### Too Many Rate Limit Errors

- Reduce `numRuns` for auth tests
- Add delays between requests
- Use separate test database

### Flaky Tests

- Add preconditions with `fc.pre()`
- Handle race conditions
- Use deterministic test data when needed

### Memory Issues

- Reduce `numRuns`
- Run tests in batches
- Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096`

## Resources

- [fast-check Documentation](https://fast-check.dev/)
- [Property-Based Testing Guide](https://fast-check.dev/docs/tutorials/introduction/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
