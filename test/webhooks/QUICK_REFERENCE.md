# Webhook Testing - Quick Reference

## One-Liner Examples

### Start Mock Server

```typescript
const server = new MockWebhookServer();
await server.start(3001);
```

### Send Circle Webhook

```typescript
await server.sendCircleWebhook('http://localhost:3000/webhooks/circle', {
  notificationType: 'wallets.transfer.complete',
  notification: { id: 'txn_123', state: 'COMPLETE' },
});
```

### Send Yellow Card Webhook

```typescript
await server.sendYellowCardWebhook(
  'http://localhost:3000/webhooks/payment/yellow-card',
  {
    id: 'evt_123',
    type: 'payment.complete',
    data: { id: 'pay_456', status: 'complete' },
  },
);
```

### Send Twilio Webhook

```typescript
await server.sendTwilioWebhook(
  'http://localhost:3000/webhooks/twilio/sms-status',
  {
    MessageSid: 'SM123',
    MessageStatus: 'delivered',
    To: '+2250701234567',
    From: '+14155551234',
  },
);
```

### Use Fixtures

```typescript
import { circleWebhookFixtures } from './test/webhooks/fixtures';
const payload = circleWebhookFixtures.transferComplete;
```

### Record Webhook

```typescript
const replay = new WebhookReplay();
await replay.record('my-webhook', payload, 'circle');
```

### Replay Webhook

```typescript
await replay.replayOne(
  'my-webhook',
  server,
  'http://localhost:3000/webhooks/circle',
);
```

### Record Scenario

```typescript
await replay.recordScenario('deposit-flow', [
  { name: 'payment-start', payload: {...}, provider: 'yellowcard', delayMs: 0 },
  { name: 'payment-complete', payload: {...}, provider: 'yellowcard', delayMs: 5000 },
]);
```

### Replay Scenario

```typescript
await replay.replayScenario('deposit-flow', server, 'http://localhost:3000');
```

## Common Test Patterns

### Integration Test

```typescript
describe('Webhooks', () => {
  let server: MockWebhookServer;

  beforeAll(async () => {
    server = new MockWebhookServer();
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should handle webhook', async () => {
    const result = await server.sendCircleWebhook(url, payload);
    expect(result.success).toBe(true);
  });
});
```

### Unit Test with Fixtures

```typescript
import { circleWebhookFixtures } from './test/webhooks/fixtures';

it('should process webhook', async () => {
  const payload = circleWebhookFixtures.transferComplete;
  const result = await processWebhook(payload);
  expect(result.processed).toBe(true);
});
```

### E2E Test with Replay

```typescript
const replay = new WebhookReplay();
await replay.recordScenario('flow', [...]);
const results = await replay.replayScenario('flow', server, baseUrl);
expect(results.every(r => r.success)).toBe(true);
```

## Fixture Shortcuts

### Circle

```typescript
// Get all complete events
getCircleFixturesByType('complete');

// Available fixtures
circleWebhookFixtures.transferComplete;
circleWebhookFixtures.transferFailed;
circleWebhookFixtures.inboundComplete;
```

### Yellow Card

```typescript
// Get by type
getYellowCardFixturesByType('payment');
getYellowCardFixturesByType('payout');

// Get by network
getYellowCardFixturesByNetwork('orange');
getYellowCardFixturesByNetwork('mtn');
getYellowCardFixturesByNetwork('wave');

// Available fixtures
yellowCardWebhookFixtures.paymentCompleteOrangeMoney;
yellowCardWebhookFixtures.payoutCompleteOrangeMoney;
yellowCardWebhookFixtures.paymentFailed;
```

### Twilio

```typescript
// Get by status
getTwilioFixturesByStatus('delivered');
getTwilioFixturesByStatus('failed');

// Get by country
getTwilioFixturesByCountry('CI'); // Ivory Coast
getTwilioFixturesByCountry('SN'); // Senegal

// Get errors
getTwilioFixturesWithErrors();

// Available fixtures
twilioWebhookFixtures.deliveredIvoryCoast;
twilioWebhookFixtures.failedInvalidNumber;
twilioWebhookFixtures.depositConfirmation;
```

## Configuration

### Retry Config

```typescript
server.setRetryConfig({
  maxRetries: 3,
  retryDelays: [1000, 2000, 4000],
  retryOnStatusCodes: [500, 502, 503, 504],
});
```

### Custom Secrets

```typescript
server.setSecrets({
  circle: 'your-secret',
  yellowcard: 'your-secret',
  twilio: 'your-token',
});
```

## Signature Verification

### Generate Signature

```typescript
// Circle & Yellow Card (HMAC SHA256)
const signature = crypto
  .createHmac('sha256', secret)
  .update(rawBody)
  .digest('hex');

// Twilio (HMAC SHA1 with URL)
const data = url + sortedParams;
const signature = crypto
  .createHmac('sha1', authToken)
  .update(data)
  .digest('base64');
```

### Verify Signature

```typescript
const expected = generateSignature(payload, secret);
const isValid = crypto.timingSafeEqual(
  Buffer.from(signature),
  Buffer.from(expected),
);
```

## Provider-Specific Headers

### Circle

```
X-Circle-Signature: <hmac-sha256-hex>
Content-Type: application/json
```

### Yellow Card

```
X-YC-Signature: <hmac-sha256-hex>
Content-Type: application/json
```

### Twilio

```
X-Twilio-Signature: <hmac-sha1-base64>
Content-Type: application/x-www-form-urlencoded
```

## Common Error Codes

### Circle

- `INSUFFICIENT_FUNDS` - Wallet balance too low
- `DENIED` - Failed risk screening
- `FAILED` - Generic failure

### Yellow Card

- Payment: `pending`, `awaiting_payment`, `processing`, `complete`, `failed`, `expired`
- Payout: `pending`, `processing`, `complete`, `failed`, `cancelled`

### Twilio

- `21211` - Invalid "To" Phone Number
- `30004` - Message blocked
- `30006` - Landline or unreachable carrier
- `30007` - Message filtered by carrier
- `30008` - Unknown error

## Run Tests

```bash
# All webhook tests
npm test -- test/webhooks

# Specific test file
npm test -- test/webhooks/utils/signature-verifier.spec.ts
npm test -- test/webhooks/utils/payload-validator.spec.ts

# Run example
npx ts-node test/webhooks/examples/replay-example.ts
```

## Troubleshooting

### Webhook not received?

1. Check server: `curl http://localhost:3001/health`
2. Check history: `curl http://localhost:3001/history`
3. Verify signature header matches provider

### Signature failed?

1. Use raw body (not parsed JSON)
2. Check secret matches
3. Verify algorithm (SHA256 vs SHA1)

### Replay not found?

```typescript
const recordings = await replay.list();
console.log(recordings);
```

## Links

- Full README: `test/webhooks/README.md`
- Circle Docs: https://developers.circle.com/w3s/docs/webhooks
- Yellow Card API: (Contact Yellow Card)
- Twilio Webhooks: https://www.twilio.com/docs/usage/webhooks
