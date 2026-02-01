# Fuzzing Tests - Quick Start

## What is this?

Automated security and validation testing using property-based testing. Tests thousands of edge cases, malformed inputs, and attack vectors automatically.

## Run Tests

```bash
# Run all fuzzing tests (takes ~2 minutes)
npm run test:fuzzing

# Run specific module (30 seconds each)
npm run test:fuzzing:auth     # Authentication
npm run test:fuzzing:wallet   # Wallet operations
npm run test:fuzzing:user     # User profile
npm run test:fuzzing:kyc      # KYC verification
```

## What Gets Tested?

### Security
- SQL Injection
- XSS (Cross-Site Scripting)
- Path Traversal
- Command Injection
- Buffer Overflow

### Validation
- Invalid data types
- Missing fields
- Null values
- Boundary values
- Very long strings

### Business Logic
- Negative amounts
- Invalid currencies
- Malformed phone numbers
- Weak PINs
- Rate limiting

## Understanding Results

### Success
```
✓ should reject invalid phone numbers (125ms)
  100/100 passed
```

### Failure
```
✗ should reject invalid amounts
  Counterexample: [-0.5]
```
Fix the validation to handle `-0.5`

## Common Commands

```bash
# Quick test (10 runs per test)
FUZZING_RUNS=10 npm run test:fuzzing

# Thorough test (1000 runs per test)
FUZZING_RUNS=1000 npm run test:fuzzing

# With coverage report
npm run test:fuzzing:cov

# Verbose output
FUZZING_VERBOSE=true npm run test:fuzzing
```

## Files

| File | Purpose |
|------|---------|
| `README.md` | Overview |
| `FUZZING_GUIDE.md` | Detailed guide |
| `QUICK_START.md` | This file |
| `auth/*.ts` | Auth endpoint tests |
| `wallet/*.ts` | Wallet endpoint tests |
| `user/*.ts` | User endpoint tests |
| `kyc/*.ts` | KYC endpoint tests |
| `common/arbitraries.ts` | Test data generators |
| `common/helpers.ts` | Test utilities |

## Adding Tests

Copy pattern from existing tests:

```typescript
import * as fc from 'fast-check';
import { phoneArbitraries } from '../common/arbitraries';

it('should reject invalid phone numbers', async () => {
  await fc.assert(
    fc.asyncProperty(
      phoneArbitraries.invalid(), // Generator
      async (invalidPhone) => {
        const response = await request(app.getHttpServer())
          .post('/endpoint')
          .send({ phone: invalidPhone });

        expect(response.status).toBe(400);
      }
    ),
    { numRuns: 100 } // Run 100 times
  );
});
```

## Troubleshooting

### Tests failing
1. Check validation in DTOs
2. Check error handling in controllers
3. Review error messages for leaks

### Tests timing out
- Reduce `FUZZING_RUNS`
- Check for infinite loops
- Optimize database queries

### Rate limit errors
- Reduce runs for auth tests
- Add delays between requests

## Need Help?

1. Read `FUZZING_GUIDE.md` for details
2. Check fast-check docs: https://fast-check.dev
3. Review existing test patterns

## CI/CD

Add to GitHub Actions:

```yaml
- name: Fuzzing Tests
  run: FUZZING_RUNS=1000 npm run test:fuzzing
  timeout-minutes: 30
```

## Coverage

Run with coverage:
```bash
npm run test:fuzzing:cov
open coverage-fuzzing/index.html
```
