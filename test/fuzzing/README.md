# API Fuzzing Test Suite

Property-based testing suite using fast-check to discover edge cases, boundary violations, and unexpected behaviors in API endpoints.

## Overview

This suite uses property-based testing (PBT) to automatically generate thousands of test cases with:
- Malformed inputs
- Boundary values
- Edge cases
- Type violations
- SQL injection attempts
- XSS payloads
- Invalid data combinations

## Directory Structure

```
fuzzing/
├── auth/              # Authentication endpoint fuzzing
├── wallet/            # Wallet endpoint fuzzing
├── transfer/          # Transfer endpoint fuzzing
├── kyc/              # KYC endpoint fuzzing
├── user/             # User endpoint fuzzing
└── common/           # Shared arbitraries and helpers
```

## Running Tests

```bash
# Run all fuzzing tests
npm run test:fuzzing

# Run specific module
npm run test:fuzzing -- auth

# Run with verbose output
npm run test:fuzzing -- --verbose

# Adjust number of test runs (default: 100)
FUZZING_RUNS=1000 npm run test:fuzzing
```

## How It Works

1. **Arbitraries**: Custom generators create random but valid/invalid inputs
2. **Properties**: Assert expected behavior for all generated inputs
3. **Shrinking**: When a failure is found, fast-check minimizes it to simplest case

## Example

```typescript
import * as fc from 'fast-check';

it('should reject invalid phone numbers', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string().filter(s => !s.match(/^\+[1-9]\d{6,14}$/)),
      async (invalidPhone) => {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({ phone: invalidPhone });

        expect(response.status).toBe(400);
      }
    ),
    { numRuns: 100 }
  );
});
```

## Security Testing

These tests include:
- SQL injection payloads
- XSS attack vectors
- Path traversal attempts
- Command injection strings
- Buffer overflow attempts
- Unicode edge cases

## Best Practices

1. **Start Small**: Begin with 100 runs, increase for CI/CD
2. **Use Filters**: Filter out obviously invalid cases to save time
3. **Assert Boundaries**: Test min/max values thoroughly
4. **Check Error Messages**: Ensure no sensitive data leaks
5. **Monitor Performance**: Track test execution time
