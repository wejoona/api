# E2E Testing Quick Reference Guide

## Quick Start

```bash
# Install dependencies
npm install

# Run all E2E tests
npm run test:e2e

# Run specific test suite
npm run test:e2e:user-journey
npm run test:e2e:security
npm run test:e2e:performance

# Run with coverage
npm run test:e2e:cov

# Watch mode
npm run test:e2e:watch
```

## Test Structure

### 1. User Journey Tests

**File**: `user-journey.e2e-spec.ts`
**Purpose**: Test complete user workflows
**Coverage**:

- User onboarding (registration, OTP, profile)
- Wallet operations (balance, deposits, rates)
- Transfer flows (P2P, external)
- Username system
- Security flows (logout, PIN)
- Error handling

### 2. API Contract Tests

**File**: `api-contracts.e2e-spec.ts`
**Purpose**: Validate API response shapes
**Coverage**:

- Response shape validation
- Error response consistency
- Pagination contracts
- Content-Type headers

### 3. Security Tests

**File**: `security.e2e-spec.ts`
**Purpose**: Test security controls
**Coverage**:

- Authentication & authorization
- Rate limiting
- PIN security
- Input validation & sanitization
- Data exposure prevention
- Idempotency

### 4. Performance Tests

**File**: `performance.e2e-spec.ts`
**Purpose**: Establish performance baselines
**Coverage**:

- Response time baselines
- Concurrent request handling
- Database query performance
- Caching effectiveness
- Load testing scenarios

### 5. Webhook Tests

**File**: `webhooks.e2e-spec.ts`
**Purpose**: Test webhook processing
**Coverage**:

- Circle webhooks
- YellowCard webhooks
- Blnk webhooks
- Webhook security
- Retry logic
- Event ordering

## Common Patterns

### Create Test User

```typescript
const user = await userHelper.createUser('+2250700000001');
// Returns: { id, phone, accessToken, refreshToken, walletId }
```

### Make Authenticated Request

```typescript
const response = await request(app.getHttpServer())
  .get('/wallet')
  .set('Authorization', `Bearer ${user.accessToken}`)
  .expect(200);
```

### Set and Verify PIN

```typescript
await userHelper.setPin(user.accessToken, '1234');
const pinToken = await userHelper.verifyPin(user.accessToken, '1234');
```

### Create Transfer

```typescript
const response = await request(app.getHttpServer())
  .post('/wallet/transfer/internal')
  .set('Authorization', `Bearer ${sender.accessToken}`)
  .set('X-Pin-Token', pinToken)
  .send({
    toPhone: recipient.phone,
    amount: 10,
    currency: 'USDC',
  });
```

### Seed Test Data

```typescript
await dataHelper.createTestDeposit(userId, 100);
await dataHelper.createTestTransfer(fromUserId, toUserId, 50);
```

## Performance Baselines

| Endpoint                       | Target   | Test |
| ------------------------------ | -------- | ---- |
| GET /health                    | < 100ms  | ✓    |
| POST /auth/verify-otp          | < 500ms  | ✓    |
| GET /wallet                    | < 300ms  | ✓    |
| POST /wallet/transfer/internal | < 1000ms | ✓    |
| GET /transfers                 | < 500ms  | ✓    |

## Environment Setup

Tests automatically configure:

- PostgreSQL (via testcontainer)
- Redis (via testcontainer)
- Mock external APIs (Circle, Blnk, YellowCard)
- Test JWT secrets
- Permissive rate limits

## Debugging Tests

### Enable Verbose Logging

```typescript
// In test file
process.env.LOG_LEVEL = 'debug';
```

### Check Container Logs

```bash
docker logs <container-id>
```

### Run Single Test

```bash
npm run test:e2e -- -t "should complete internal P2P transfer"
```

### Debug Mode

```bash
node --inspect-brk node_modules/.bin/jest --config ./test/jest-e2e.json --runInBand
```

## Common Issues

### Container Startup Timeout

**Problem**: Containers take too long to start
**Solution**:

```bash
docker system prune -a
docker pull postgres:15-alpine
docker pull redis:7-alpine
```

### Port Conflicts

**Problem**: Port already in use
**Solution**: Testcontainers uses random ports automatically

### Database Migration Errors

**Problem**: Migrations fail to run
**Solution**:

```bash
npm run migration:run
npm run migration:show
```

### Memory Issues

**Problem**: Tests run out of memory
**Solution**: Increase Node memory

```bash
NODE_OPTIONS=--max_old_space_size=4096 npm run test:e2e
```

## Best Practices

### ✅ DO

- Use unique phone numbers for each test
- Clean database between tests
- Mock external APIs
- Use test helpers
- Set appropriate timeouts
- Test error cases
- Verify response shapes

### ❌ DON'T

- Share data between tests
- Depend on test execution order
- Use production credentials
- Skip cleanup
- Use sleep() for timing
- Hardcode URLs or credentials

## Test Data Conventions

### Phone Numbers

```typescript
// User journey tests: +22507000000XX
const user = await userHelper.createUser('+2250700000001');

// Security tests: +22507000001XX
const user = await userHelper.createUser('+2250700000100');

// Performance tests: +22507000002XX
const user = await userHelper.createUser('+2250700000200');
```

### Test PINs

```typescript
const DEFAULT_PIN = '1234';
const ALTERNATIVE_PIN = '5678';
const INVALID_PIN = '0000';
```

### Test Amounts

```typescript
const SMALL_AMOUNT = 10;
const MEDIUM_AMOUNT = 100;
const LARGE_AMOUNT = 1000;
```

## CI/CD

Tests run automatically on:

- Push to `main` or `develop`
- Pull requests
- Manual workflow dispatch

Workflow file: `.github/workflows/e2e-tests.yml`

### Matrix Strategy

Tests run in parallel for:

- user-journey
- api-contracts
- security
- performance

## Coverage Reports

After running tests with coverage:

```bash
npm run test:e2e:cov

# View HTML report
open coverage-e2e/html/index.html

# View console summary
cat coverage-e2e/coverage-summary.txt
```

## Writing New Tests

### 1. Add Test File

Create file in `test/e2e/my-feature.e2e-spec.ts`

### 2. Setup Boilerplate

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { E2ETestSetup } from './setup';
import { TestUserHelper, setupNock, teardownNock } from './helpers';

describe('My Feature E2E', () => {
  let setup: E2ETestSetup;
  let app: INestApplication;
  let userHelper: TestUserHelper;

  beforeAll(async () => {
    setupNock();
    setup = new E2ETestSetup();
    app = await setup.setup();
    userHelper = new TestUserHelper(app);
  }, 120000);

  afterAll(async () => {
    await setup.teardown();
    teardownNock();
  }, 60000);

  beforeEach(async () => {
    await setup.cleanDatabase();
  });

  it('should test my feature', async () => {
    // Test implementation
  });
});
```

### 3. Add Test Script (Optional)

In `package.json`:

```json
{
  "scripts": {
    "test:e2e:my-feature": "jest --config ./test/jest-e2e.json --runInBand --testPathPattern=my-feature"
  }
}
```

### 4. Update CI Workflow (Optional)

Add to `.github/workflows/e2e-tests.yml` matrix if needed.

## Resources

- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Testcontainers](https://testcontainers.com/)
- [Supertest](https://github.com/visionmedia/supertest)
- [Jest Docs](https://jestjs.io/)

## Maintenance Checklist

- [ ] Update test data when adding features
- [ ] Update mocks when external APIs change
- [ ] Review and update performance baselines quarterly
- [ ] Keep dependencies up to date
- [ ] Monitor test execution times
- [ ] Review coverage reports
- [ ] Update documentation

## Support

For issues or questions:

1. Check this guide
2. Review test examples
3. Check GitHub Issues
4. Ask the team

---

**Last Updated**: January 2026
**Version**: 1.0.0
