# Webhook Testing Utilities

Comprehensive testing tools for Circle, Yellow Card, and Twilio webhooks.

## Directory Structure

```
test/webhooks/
├── server/               # Mock webhook server
│   └── mock-webhook-server.ts
├── replay/               # Record and replay tools
│   └── webhook-replay.ts
├── fixtures/             # Sample webhook payloads
│   ├── circle-webhooks.ts
│   ├── yellowcard-webhooks.ts
│   ├── twilio-webhooks.ts
│   └── index.ts
├── utils/                # Testing utilities
│   ├── signature-verifier.spec.ts
│   └── payload-validator.spec.ts
└── README.md
```

## Quick Start

### 1. Mock Webhook Server

Simulate external webhook providers for testing:

```typescript
import { MockWebhookServer } from './server/mock-webhook-server';

// Start mock server
const server = new MockWebhookServer();
await server.start(3001);

// Configure secrets
server.setSecrets({
  circle: 'your-circle-webhook-secret',
  yellowcard: 'your-yellowcard-webhook-secret',
  twilio: 'your-twilio-auth-token',
});

// Send webhooks
await server.sendCircleWebhook('http://localhost:3000/webhooks/circle', {
  notificationType: 'wallets.transfer.complete',
  notification: { id: 'txn_123', state: 'COMPLETE' },
});

await server.sendYellowCardWebhook(
  'http://localhost:3000/webhooks/payment/yellow-card',
  {
    id: 'evt_123',
    type: 'payment.complete',
    data: { id: 'pay_456', status: 'complete' },
  },
);

await server.sendTwilioWebhook(
  'http://localhost:3000/webhooks/twilio/sms-status',
  {
    MessageSid: 'SM123',
    MessageStatus: 'delivered',
    To: '+2250701234567',
    From: '+14155551234',
  },
);

// Stop server
await server.stop();
```

### 2. Webhook Replay

Record and replay webhook payloads:

```typescript
import { WebhookReplay } from './replay/webhook-replay';
import { MockWebhookServer } from './server/mock-webhook-server';

const replay = new WebhookReplay();
const server = new MockWebhookServer();
await server.start();

// Record a webhook
await replay.record(
  'circle-transfer-complete',
  { notificationType: 'wallets.transfer.complete', notification: { ... } },
  'circle'
);

// Replay a webhook
await replay.replayOne(
  'circle-transfer-complete',
  server,
  'http://localhost:3000/webhooks/circle'
);

// Record a scenario (sequence of webhooks)
await replay.recordScenario('deposit-flow', [
  {
    name: 'payment-awaiting',
    payload: { ... },
    provider: 'yellowcard',
    delayMs: 0,
  },
  {
    name: 'payment-complete',
    payload: { ... },
    provider: 'yellowcard',
    delayMs: 5000,
  },
  {
    name: 'transfer-complete',
    payload: { ... },
    provider: 'circle',
    delayMs: 2000,
  },
]);

// Replay scenario
await replay.replayScenario('deposit-flow', server, 'http://localhost:3000');
```

### 3. Using Fixtures

Pre-built webhook payloads for all providers:

```typescript
import {
  circleWebhookFixtures,
  yellowCardWebhookFixtures,
  twilioWebhookFixtures,
} from './fixtures';

// Use in tests
const payload = circleWebhookFixtures.transferComplete;
const response = await request(app)
  .post('/webhooks/circle')
  .set('X-Circle-Signature', generateSignature(payload))
  .send(payload);

// Get fixtures by type
import { getCircleFixturesByType } from './fixtures/circle-webhooks';
const completeEvents = getCircleFixturesByType('complete');
const failedEvents = getCircleFixturesByType('failed');

// Yellow Card by network
import { getYellowCardFixturesByNetwork } from './fixtures/yellowcard-webhooks';
const orangePayments = getYellowCardFixturesByNetwork('orange');

// Twilio by status
import { getTwilioFixturesByStatus } from './fixtures/twilio-webhooks';
const deliveredMessages = getTwilioFixturesByStatus('delivered');
```

## Testing Examples

### Integration Test with Mock Server

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MockWebhookServer } from '../test/webhooks/server/mock-webhook-server';
import { AppModule } from '../src/app.module';

describe('Webhook Integration Tests', () => {
  let app: INestApplication;
  let mockServer: MockWebhookServer;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    mockServer = new MockWebhookServer();
    await mockServer.start(3001);
  });

  afterAll(async () => {
    await mockServer.stop();
    await app.close();
  });

  it('should handle Circle transfer complete webhook', async () => {
    const response = await mockServer.sendCircleWebhook(
      'http://localhost:3000/webhooks/circle',
      {
        notificationType: 'wallets.transfer.complete',
        notification: {
          id: 'txn_123',
          state: 'COMPLETE',
          walletId: 'wallet_abc',
        },
      },
    );

    expect(response.success).toBe(true);
    expect(response.statusCode).toBe(200);
  });

  it('should retry failed webhooks', async () => {
    mockServer.setRetryConfig({
      maxRetries: 3,
      retryDelays: [100, 200, 400],
      retryOnStatusCodes: [500, 502, 503],
    });

    const response = await mockServer.sendYellowCardWebhook(
      'http://localhost:3000/webhooks/payment/yellow-card',
      {
        id: 'evt_123',
        type: 'payment.complete',
        data: { id: 'pay_456' },
      },
    );

    expect(response.attempts).toBeGreaterThan(1);
  });
});
```

### Unit Test with Fixtures

```typescript
import { circleWebhookFixtures } from '../test/webhooks/fixtures';
import { ProcessWebhookUseCase } from './process-webhook.use-case';

describe('ProcessWebhookUseCase', () => {
  let useCase: ProcessWebhookUseCase;

  it('should process Circle transfer complete webhook', async () => {
    const payload = circleWebhookFixtures.transferComplete;
    const rawBody = JSON.stringify(payload);
    const signature = generateCircleSignature(rawBody);

    const result = await useCase.execute({
      payload,
      signature,
      rawBody,
      provider: 'circle',
    });

    expect(result.success).toBe(true);
    expect(result.eventType).toBe('wallets.transfer.complete');
  });

  it('should handle all Circle event types', async () => {
    const fixtures = [
      circleWebhookFixtures.transferComplete,
      circleWebhookFixtures.transferFailed,
      circleWebhookFixtures.inboundComplete,
    ];

    for (const fixture of fixtures) {
      const result = await useCase.execute({
        payload: fixture,
        signature: generateSignature(fixture),
        rawBody: JSON.stringify(fixture),
        provider: 'circle',
      });

      expect(result.success).toBe(true);
    }
  });
});
```

### E2E Test with Replay

```typescript
import { WebhookReplay } from '../test/webhooks/replay/webhook-replay';
import { MockWebhookServer } from '../test/webhooks/server/mock-webhook-server';

describe('Deposit Flow E2E', () => {
  let replay: WebhookReplay;
  let server: MockWebhookServer;

  beforeAll(async () => {
    replay = new WebhookReplay();
    server = new MockWebhookServer();
    await server.start();

    // Record scenario
    await replay.recordScenario('complete-deposit-flow', [
      {
        name: 'yc-payment-awaiting',
        payload: yellowCardWebhookFixtures.paymentAwaitingPayment,
        provider: 'yellowcard',
        delayMs: 0,
      },
      {
        name: 'yc-payment-complete',
        payload: yellowCardWebhookFixtures.paymentCompleteOrangeMoney,
        provider: 'yellowcard',
        delayMs: 30000, // 30 second delay
      },
      {
        name: 'circle-transfer-complete',
        payload: circleWebhookFixtures.transferComplete,
        provider: 'circle',
        delayMs: 5000, // 5 second delay
      },
      {
        name: 'twilio-sms-delivered',
        payload: twilioWebhookFixtures.depositConfirmation,
        provider: 'twilio',
        delayMs: 1000,
      },
    ]);
  });

  it('should complete full deposit flow', async () => {
    const results = await replay.replayScenario(
      'complete-deposit-flow',
      server,
      'http://localhost:3000',
    );

    expect(results).toHaveLength(4);
    expect(results.every((r) => r.success)).toBe(true);
  });
});
```

## Signature Verification Tests

Run signature verification tests:

```bash
npm test -- test/webhooks/utils/signature-verifier.spec.ts
```

Tests cover:

- Circle HMAC SHA256 signatures
- Yellow Card HMAC SHA256 signatures
- Twilio HMAC SHA1 signatures with URL
- Timing-safe comparisons
- Edge cases and security

## Payload Validation Tests

Run payload validation tests:

```bash
npm test -- test/webhooks/utils/payload-validator.spec.ts
```

Tests cover:

- Required field validation
- Enum validation
- Format validation (amounts, phone numbers, etc.)
- Currency validation
- Edge cases (empty, large, special characters)
- Security (XSS, injection)

## Recording Production Webhooks

Import webhooks from production logs:

```typescript
import { WebhookReplay } from './replay/webhook-replay';

const replay = new WebhookReplay();

// Import from log file
await replay.importFromLogs(
  '/path/to/production.log',
  (log) => log.level === 'info' && log.message.includes('webhook'),
);

// List imported webhooks
const webhooks = await replay.list();
console.log('Imported webhooks:', webhooks);
```

## Best Practices

1. **Use fixtures for unit tests** - Fast and deterministic
2. **Use mock server for integration tests** - Test full HTTP flow
3. **Use replay for E2E tests** - Test real-world scenarios
4. **Record production webhooks** - Reproduce issues
5. **Test retry logic** - Ensure resilience
6. **Test signature verification** - Prevent spoofing
7. **Test payload validation** - Prevent bad data

## Configuration

### Retry Configuration

```typescript
mockServer.setRetryConfig({
  maxRetries: 3,
  retryDelays: [1000, 2000, 4000], // ms
  retryOnStatusCodes: [500, 502, 503, 504],
});
```

### Custom Secrets

```typescript
mockServer.setSecrets({
  circle: process.env.CIRCLE_WEBHOOK_SECRET,
  yellowcard: process.env.YELLOWCARD_WEBHOOK_SECRET,
  twilio: process.env.TWILIO_AUTH_TOKEN,
});
```

## Troubleshooting

### Webhook not received

1. Check server is running: `http://localhost:3001/health`
2. Verify target URL is correct
3. Check signature is valid
4. Review webhook history: `http://localhost:3001/history`

### Signature verification failed

1. Ensure raw body is used (not parsed JSON)
2. Check secret matches
3. Verify header name is correct
4. Review signature generation algorithm

### Replay not working

1. Check recording exists: `await replay.list()`
2. Verify provider matches
3. Ensure server is running
4. Check target URL is correct

## Contributing

When adding new webhook providers:

1. Add fixtures in `fixtures/{provider}-webhooks.ts`
2. Add signature generation in `mock-webhook-server.ts`
3. Add validation tests in `utils/payload-validator.spec.ts`
4. Update this README
