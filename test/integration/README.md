# Integration Tests

End-to-end integration tests using testcontainers for isolated PostgreSQL and Redis instances.

## Test Files

| File                                 | Description                                                              |
| ------------------------------------ | ------------------------------------------------------------------------ |
| `user-registration-flow.e2e-spec.ts` | Complete user registration journey (register, OTP, profile, wallet, PIN) |
| `deposit-flow.e2e-spec.ts`           | Deposit journey (channels, quote, initiate, webhook, balance)            |
| `transfer-flow.e2e-spec.ts`          | Transfer journeys (P2P phone/username, external blockchain, limits)      |
| `auth-flow.e2e-spec.ts`              | Authentication flows (login, token refresh, logout)                      |
| `kyc-flow.e2e-spec.ts`               | KYC verification flows                                                   |

## Setup

The tests use [testcontainers](https://testcontainers.com/) to spin up isolated database instances:

- **PostgreSQL 15**: Clean database for each test run
- **Redis 7**: Cache and session storage

### Prerequisites

- Docker Desktop running
- Node.js 18+
- At least 4GB RAM available for containers

## Running Tests

```bash
# Run all integration tests
npm run test:e2e -- --testPathPattern=integration

# Run specific test file
npm run test:e2e -- --testPathPattern=user-registration

# Run with verbose output
npm run test:e2e -- --testPathPattern=integration --verbose

# Run with coverage
npm run test:e2e:cov -- --testPathPattern=integration
```

## Test Structure

Each test file follows this pattern:

```typescript
import {
  IntegrationTestSetup,
  TestUserFactory,
  ExternalApiMocker,
} from './setup';

describe('Feature Flow (Integration)', () => {
  let setup: IntegrationTestSetup;
  let userFactory: TestUserFactory;
  let apiMocker: ExternalApiMocker;

  jest.setTimeout(120000); // Container startup timeout

  beforeAll(async () => {
    setup = new IntegrationTestSetup();
    await setup.init();

    userFactory = new TestUserFactory(setup.getApp());
    apiMocker = new ExternalApiMocker();
    apiMocker.setupAllMocks();
  });

  afterAll(async () => {
    await setup.teardown();
  });

  beforeEach(async () => {
    await setup.cleanDatabase();
    apiMocker.resetMocks();
  });

  it('should complete flow', async () => {
    const user = await userFactory.createUserWithPin('+2250700000001');
    // ... test logic
  });
});
```

## Utilities

### IntegrationTestSetup

Manages test infrastructure:

```typescript
const setup = new IntegrationTestSetup();
await setup.init(); // Start containers, create app
await setup.cleanDatabase(); // Truncate all tables
await setup.teardown(); // Stop containers
```

### TestUserFactory

Creates test users with common setups:

```typescript
const factory = new TestUserFactory(app);

// Basic user
const user = await factory.createUser('+2250700000001');

// User with PIN
const userWithPin = await factory.createUserWithPin('+2250700000001', '1234');

// Multiple users
const users = await factory.createUsers(5);
```

### ExternalApiMocker

Mocks external APIs (Blnk, Circle, YellowCard):

```typescript
const mocker = new ExternalApiMocker();
mocker.setupAllMocks(); // Setup all mocks
mocker.mockBlnkApi(); // Mock only Blnk
mocker.mockCircleApi(); // Mock only Circle
mocker.mockYellowCardApi(); // Mock only YellowCard
mocker.resetMocks(); // Clear and re-setup
```

### TestFixtures

Common test data:

```typescript
import { TestFixtures } from './setup';

TestFixtures.phones.sender; // '+2250700000001'
TestFixtures.pins.valid; // '1234'
TestFixtures.otps.valid; // '123456'
TestFixtures.amounts.medium; // 100
TestFixtures.addresses.validPolygon;
TestFixtures.networks.polygon;
```

## Test Coverage

The integration tests cover:

### User Registration Flow

- Phone registration with OTP
- OTP verification (valid/invalid/expired)
- Account lockout after failed attempts
- Profile completion and validation
- Username uniqueness
- Wallet creation
- PIN setup and verification
- Token refresh and logout

### Deposit Flow

- Deposit channel listing
- Rate quote calculation
- Deposit initiation
- Payment instructions
- Webhook processing
- Balance updates
- Deposit history
- Deposit cancellation

### Transfer Flow

- Internal P2P transfers (phone)
- Internal P2P transfers (username)
- External blockchain transfers
- Amount validation
- Balance validation
- Transfer limits
- Transaction history
- Concurrent transfer handling
- Double-spend prevention

## Environment Variables

Tests automatically configure:

```
NODE_ENV=test
DATABASE_HOST=<container>
DATABASE_PORT=<container>
REDIS_HOST=<container>
REDIS_PORT=<container>
JWT_SECRET=test-jwt-secret
BLNK_API_URL=http://localhost:3999/blnk
CIRCLE_API_URL=http://localhost:3999/circle
YELLOWCARD_API_URL=http://localhost:3999/yellowcard
NOTIFICATION_ENABLED=false
```

## Debugging

### Container Issues

```bash
# Check Docker is running
docker ps

# Check container logs if tests fail to start
docker logs <container_id>
```

### Test Isolation

Each test file spins up its own containers. If running multiple test files:

```bash
# Run sequentially to avoid port conflicts
npm run test:e2e -- --runInBand --testPathPattern=integration
```

### Database State

To inspect database state during debugging:

```typescript
const data = await setup.executeQuery('SELECT * FROM users');
console.log(data);
```

## Adding New Tests

1. Create `feature-flow.e2e-spec.ts`
2. Import setup utilities
3. Follow the beforeAll/afterAll pattern
4. Use `cleanDatabase()` in beforeEach
5. Use TestUserFactory for user creation
6. Use ExternalApiMocker for API mocking
