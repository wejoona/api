# Testing Guide - JoonaPay Backend

## Quick Start

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage Report
```bash
npm run test:cov
```

### View Coverage in Browser
```bash
npm run test:cov
open coverage/lcov-report/index.html
```

---

## Test Categories

### 1. Unit Tests
Located in `src/` alongside source files (*.spec.ts)

```bash
# Run specific unit test
npm test -- webhook.service.spec.ts

# Run all webhook tests
npm test -- --testPathPattern=webhook

# Run in watch mode
npm run test:watch
```

### 2. Integration Tests (E2E)
Located in `test/integration/`

```bash
# Run all integration tests
npm run test:e2e

# Run specific integration test
npm run test:e2e -- --testPathPattern=auth-flow

# Run with coverage
npm run test:e2e:cov
```

---

## Test Files Overview

### Webhook Tests
```bash
# Webhook processing use case
npm test -- process-webhook.use-case.spec.ts

# Dead letter service
npm test -- webhook-deadletter.service.spec.ts
```

**What's tested:**
- Yellow Card deposit/withdrawal webhooks
- Circle transfer webhooks
- Signature verification
- Idempotency checks
- Error handling and dead letter queue

---

### Rate Limiting Tests
```bash
# Rate limit service
npm test -- rate-limit.service.spec.ts

# Rate limit guard
npm test -- rate-limit.guard.spec.ts
```

**What's tested:**
- Sliding window algorithm
- User-based and IP-based limiting
- Cache operations
- Fail-open behavior
- Header parsing

---

### Auth Tests
```bash
# Login use case (unit)
npm test -- login-user.usecase.spec.ts

# Full auth flow (integration)
npm run test:e2e -- --testPathPattern=auth-flow
```

**What's tested:**
- Registration and login
- OTP verification
- Token refresh
- Logout
- Rate limiting
- Account lockout

---

### Wallet Tests
```bash
# Create wallet use case
npm test -- create-wallet.use-case.spec.ts

# Get balance use case
npm test -- get-balance.use-case.spec.ts
```

**What's tested:**
- Multi-provider wallet creation
- Balance caching
- Provider failover
- Duplicate prevention

---

### Transfer Tests
```bash
# Transfer flow (integration)
npm run test:e2e -- --testPathPattern=transfer-flow
```

**What's tested:**
- Internal transfers
- External transfers
- PIN verification
- Transfer limits
- History and status

---

### KYC Tests
```bash
# Document upload (unit)
npm test -- kyc-upload.controller.spec.ts

# KYC flow (integration)
npm run test:e2e -- --testPathPattern=kyc-flow
```

**What's tested:**
- Document upload
- KYC submission
- Age verification
- Status tracking
- Privacy protection

---

## Coverage Commands

### Generate Coverage Report
```bash
npm run test:cov
```

### Coverage by Module
```bash
# Webhook module coverage
npm test -- --coverage --collectCoverageFrom="src/modules/webhook/**/*.ts"

# Rate limiting coverage
npm test -- --coverage --collectCoverageFrom="src/common/rate-limiting/**/*.ts"

# Wallet module coverage
npm test -- --coverage --collectCoverageFrom="src/modules/wallet/**/*.ts"
```

### Check Coverage Threshold
```bash
# Set threshold in package.json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 70,
        "functions": 70,
        "lines": 70,
        "statements": 70
      }
    }
  }
}
```

---

## Debugging Tests

### Run Single Test in Debug Mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand process-webhook.use-case.spec.ts
```

### Use VSCode Debugger
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "${fileBasename}"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Verbose Output
```bash
npm test -- --verbose

# Show all test names
npm test -- --listTests
```

---

## Test Patterns

### Unit Test Template
```typescript
describe('MyService', () => {
  let service: MyService;
  let mockDependency: jest.Mocked<Dependency>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyService,
        {
          provide: Dependency,
          useValue: {
            method: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MyService>(MyService);
    mockDependency = module.get(Dependency);
  });

  it('should do something', async () => {
    mockDependency.method.mockResolvedValue(expectedResult);
    const result = await service.doSomething();
    expect(result).toEqual(expectedResult);
  });
});
```

### E2E Test Template
```typescript
describe('Feature (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/endpoint (POST)', async () => {
    const response = await request(app.getHttpServer())
      .post('/endpoint')
      .set('Authorization', `Bearer ${authToken}`)
      .send(data)
      .expect(201);

    expect(response.body).toHaveProperty('id');
  });
});
```

---

## Common Test Utilities

### Mock Data Factories
```typescript
// Create in test/factories/
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  phone: '+225123456789',
  email: 'test@example.com',
  ...overrides,
});
```

### Test Helpers
```typescript
// Create in test/helpers/
export async function authenticateTestUser(app: INestApplication) {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ phone: '+225123456789', otp: '123456' });

  return response.body.accessToken;
}
```

---

## CI/CD Integration

### GitHub Actions
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:cov
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

---

## Troubleshooting

### Tests Timing Out
```bash
# Increase timeout
npm test -- --testTimeout=10000
```

### Memory Issues
```bash
# Increase Node memory
NODE_OPTIONS=--max_old_space_size=4096 npm test
```

### Database Issues in E2E Tests
```typescript
// Use test database
beforeAll(async () => {
  // Setup test database
  await setupTestDatabase();
});

afterAll(async () => {
  // Cleanup
  await cleanupTestDatabase();
});
```

### Redis Connection Issues
```typescript
// Mock Redis in tests
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  }));
});
```

---

## Best Practices

### 1. Test Naming
```typescript
// ✅ Good
it('should create wallet when user is authenticated', async () => {});

// ❌ Bad
it('test1', async () => {});
```

### 2. Arrange-Act-Assert Pattern
```typescript
it('should transfer funds', async () => {
  // Arrange
  const sender = createMockUser({ balance: 100 });
  const recipient = createMockUser();

  // Act
  const result = await transferService.transfer(sender, recipient, 50);

  // Assert
  expect(result.success).toBe(true);
  expect(sender.balance).toBe(50);
});
```

### 3. Don't Test Implementation Details
```typescript
// ✅ Test behavior
it('should send notification when transfer completes', async () => {
  await transferService.transfer(data);
  expect(notificationService.send).toHaveBeenCalled();
});

// ❌ Don't test internals
it('should call private method', async () => {
  expect(service['privateMethod']).toHaveBeenCalled();
});
```

### 4. Use Test Data Builders
```typescript
// Create reusable test data
class TransferBuilder {
  private data = { amount: 100, sender: 'user-1', recipient: 'user-2' };

  withAmount(amount: number) {
    this.data.amount = amount;
    return this;
  }

  build() {
    return this.data;
  }
}

// Usage
const transfer = new TransferBuilder().withAmount(500).build();
```

---

## Performance

### Parallel Test Execution
```bash
# Run tests in parallel (default)
npm test

# Run serially (for debugging)
npm test -- --runInBand
```

### Skip Slow Tests in Development
```typescript
it.skip('slow test', async () => {
  // This test will be skipped
});

// Or run only specific tests
it.only('focus on this test', async () => {});
```

---

## Coverage Goals

### Current Coverage
Run to see current coverage:
```bash
npm run test:cov
```

### Target Coverage: 70%+
- **Statements**: 70%
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%

### High Priority Coverage
1. **Critical Business Logic**: 90%+
   - Transfers
   - Auth
   - KYC

2. **Security Features**: 85%+
   - Rate limiting
   - Webhook verification
   - PIN validation

3. **Integration Points**: 75%+
   - Payment gateways
   - External APIs
   - Database operations

---

## Additional Resources

- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
