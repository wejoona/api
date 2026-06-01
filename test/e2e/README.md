# E2E Test Suite

Comprehensive End-to-End testing suite for the USDC Wallet API.

## Overview

This E2E test suite provides comprehensive testing coverage for:

- Complete user journeys from registration to transfers
- API contract validation
- Security testing (authentication, authorization, rate limiting)
- Performance baselines and load testing

## Architecture

### Test Infrastructure

The E2E tests use **Testcontainers** to provide isolated test environments:

- PostgreSQL container for database
- Redis container for caching
- Mock external APIs (Circle, Blnk, YellowCard)

### Directory Structure

```
test/e2e/
├── setup.ts                    # Test infrastructure setup
├── helpers/                    # Test utilities
│   ├── test-user.helper.ts    # User management utilities
│   ├── test-data.helper.ts    # Database seeding utilities
│   └── mock-providers.helper.ts # External API mocks
├── user-journey.e2e-spec.ts   # User journey tests
├── api-contracts.e2e-spec.ts  # API contract tests
├── security.e2e-spec.ts       # Security tests
└── performance.e2e-spec.ts    # Performance tests
```

## Running Tests

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Specific Test Suite

```bash
# User journey tests
npm run test:e2e:user-journey

# Security tests
npm run test:e2e:security

# Performance tests
npm run test:e2e:performance
```

### Run with Coverage

```bash
npm run test:e2e:cov
```

### Watch Mode

```bash
npm run test:e2e:watch
```

## Test Suites

### 1. User Journey Tests (`user-journey.e2e-spec.ts`)

Tests complete user workflows:

**User Onboarding**

- User registration with phone number
- OTP verification
- Profile updates
- PIN setup

**Wallet Operations**

- Get wallet balance
- Get deposit channels
- Get exchange rates

**Transfer Operations**

- Internal P2P transfers
- Transfer history
- PIN verification flow

**Username System**

- Check username availability
- Search users by username
- Find user by username

**Security Flows**

- Logout
- OTP validation
- Authentication token validation
- PIN locking after failed attempts

**Error Handling**

- Phone number validation
- Transfer amount validation
- Non-existent recipient handling

### 2. API Contract Tests (`api-contracts.e2e-spec.ts`)

Validates API response shapes and consistency:

**Response Shape Validation**

- Authentication endpoints
- User endpoints
- Wallet endpoints
- Transfer endpoints

**Error Response Consistency**

- 401 Unauthorized
- 400 Bad Request
- 404 Not Found
- No sensitive data in errors

**Pagination**

- Limit parameter handling
- Offset parameter handling
- Default values

**Headers**

- Content-Type validation
- CORS headers

### 3. Security Tests (`security.e2e-spec.ts`)

Tests security controls and protections:

**Authentication Security**

- Reject requests without tokens
- Validate JWT signatures
- Handle expired tokens

**Rate Limiting**

- Sensitive endpoints (OTP, registration)
- Transfer endpoints
- General API endpoints

**PIN Security**

- PIN locking mechanism
- PIN requirement for transfers
- PIN token expiration
- PIN hashing in storage

**Input Validation**

- Phone number sanitization
- Transfer amount validation
- Blockchain address validation
- SQL injection prevention
- XSS prevention

**Authorization**

- User data access control
- Transfer access control
- Profile modification control

**Data Exposure**

- No sensitive data in errors
- No PII in logs
- No internal system information

**Idempotency**

- Duplicate transfer prevention

### 4. Performance Tests (`performance.e2e-spec.ts`)

Establishes performance baselines:

**Response Time Baselines**

- Health check: < 100ms
- Authentication: < 500ms
- Wallet balance: < 300ms
- Transfers: < 1000ms
- Transaction history: < 500ms

**Concurrent Requests**

- 50 concurrent balance requests
- Concurrent transfers from multiple users
- Concurrent user registrations

**Database Performance**

- Pagination efficiency
- Username search performance

**Caching Performance**

- Wallet balance caching
- Exchange rate caching

**Load Testing**

- Sustained load (100 iterations)
- Burst traffic handling
- Memory leak detection

**Resource Usage**

- Database connection pooling
- Memory efficiency with large datasets

## Test Helpers

### TestUserHelper

Utilities for creating and managing test users:

```typescript
const userHelper = new TestUserHelper(app);

// Create a user with automatic OTP verification
const user = await userHelper.createUser('+2250700000001');

// Create multiple users
const users = await userHelper.createUsers(10);

// Set PIN
await userHelper.setPin(user.accessToken, '1234');

// Verify PIN and get token
const pinToken = await userHelper.verifyPin(user.accessToken, '1234');
```

### TestDataHelper

Utilities for seeding and managing test data:

```typescript
const dataHelper = new TestDataHelper(app);

// Seed wallet balance
await dataHelper.seedWalletBalance(userId, 1000);

// Create test transactions
await dataHelper.createTestDeposit(userId, 100);
await dataHelper.createTestWithdrawal(userId, 50);
await dataHelper.createTestTransfer(fromUserId, toUserId, 25);

// Clear all data
await dataHelper.clearAllData();
```

### MockProvidersHelper

Mocks external API providers:

```typescript
const mockProviders = new MockProvidersHelper();

// Setup default mocks
mockProviders.setupDefaultMocks();

// Reset mocks between tests
mockProviders.resetMocks();

// Clear all mocks
mockProviders.clearMocks();
```

## Configuration

### Environment Variables

The test setup automatically configures:

- `NODE_ENV=test`
- Database connection (from testcontainer)
- Redis connection (from testcontainer)
- JWT secrets
- Rate limiting (more permissive for tests)
- Mock external service URLs

### Timeouts

- Individual test timeout: 30 seconds
- Container startup: 120 seconds
- Container teardown: 60 seconds

### Test Isolation

- Each test suite gets fresh containers
- Database is cleared between tests
- Mocks are reset between tests

## Writing New Tests

### Basic Test Structure

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { E2ETestSetup } from './setup';
import {
  TestUserHelper,
  MockProvidersHelper,
  setupNock,
  teardownNock,
} from './helpers';

describe('My New E2E Test', () => {
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

  it('should do something', async () => {
    const user = await userHelper.createUser('+2250700000001');

    const response = await request(app.getHttpServer())
      .get('/some-endpoint')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('someField');
  });
});
```

### Best Practices

1. **Use Helpers**: Leverage test helpers for common operations
2. **Clean State**: Always clean database between tests
3. **Unique Data**: Use unique phone numbers to avoid conflicts
4. **Assertions**: Be specific with assertions
5. **Timeouts**: Set appropriate timeouts for async operations
6. **Mock External APIs**: Always mock external services
7. **Test Isolation**: Don't depend on test execution order

## Troubleshooting

### Container Startup Issues

If containers fail to start:

```bash
# Check Docker is running
docker ps

# Clean up old containers
docker system prune -a
```

### Port Conflicts

If you see port conflicts:

- Testcontainers automatically assigns random ports
- Check for other services using ports 5432 (Postgres) or 6379 (Redis)

### Timeout Errors

If tests timeout:

- Increase timeout in `jest-e2e.json`
- Check container logs for startup issues
- Verify Docker has sufficient resources

### Database Migration Errors

If migrations fail:

```bash
# Run migrations manually
npm run migration:run

# Check migration status
npm run migration:show
```

## CI/CD Integration

E2E tests run automatically on:

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual workflow dispatch

See `.github/workflows/e2e-tests.yml` for configuration.

## Coverage Reports

Coverage reports are generated in `coverage-e2e/`:

- `lcov.info`: LCOV format for CI tools
- `html/`: HTML coverage report
- `text`: Console output

View HTML report:

```bash
open coverage-e2e/html/index.html
```

## Performance Baselines

Current performance targets:

- Health check: < 100ms
- Authentication: < 500ms
- Wallet balance: < 300ms
- Internal transfer: < 1000ms
- Transaction history: < 500ms

If tests fail performance baselines:

1. Check database indexes
2. Review N+1 query issues
3. Check caching configuration
4. Profile slow endpoints

## Maintenance

### Updating Test Data

When adding new features:

1. Add test data to `TestFixtures` in `test-data.helper.ts`
2. Update helpers if needed
3. Add new test cases
4. Update this README

### Updating Mocks

When external APIs change:

1. Update mock responses in `mock-providers.helper.ts`
2. Verify all tests still pass
3. Update API contract tests if needed

## Resources

- [Testcontainers Documentation](https://testcontainers.com/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Jest Documentation](https://jestjs.io/)
- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
