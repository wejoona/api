# Idempotency Middleware

Comprehensive request idempotency handling for safe retries of financial operations in the JoonaPay USDC Wallet.

## Overview

This middleware implements industry-standard idempotency patterns to ensure that duplicate requests (due to network issues, client retries, etc.) don't result in duplicate financial transactions.

### Key Features

- **Request Deduplication**: Prevents duplicate processing via `Idempotency-Key` header
- **Response Caching**: Replays cached responses for idempotent retries
- **Distributed Locking**: Prevents concurrent processing of duplicate requests
- **Replay Attack Prevention**: Request fingerprinting ensures keys can't be reused maliciously
- **Automatic Expiration**: TTL-based cleanup of idempotency records
- **Timeout Handling**: Automatic recovery from stuck processing states

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /transfers
       │ Idempotency-Key: abc123
       ▼
┌─────────────────────────────────────┐
│  Idempotency Middleware             │
│  ┌───────────────────────────────┐  │
│  │ 1. Extract Key                │  │
│  │ 2. Check Redis Storage        │  │
│  │ 3. Validate Fingerprint       │  │
│  │ 4. Acquire Lock               │  │
│  │ 5. Process or Replay Response │  │
│  └───────────────────────────────┘  │
└──────────────┬──────────────────────┘
               │
               ▼
       ┌──────────────┐
       │ Redis Cache  │
       │ ┌──────────┐ │
       │ │ Records  │ │
       │ │ Locks    │ │
       │ └──────────┘ │
       └──────────────┘
```

## Usage

### 1. Install and Configure

Add to your `app.module.ts`:

```typescript
import { IdempotencyModule } from './common/middleware/idempotency';

@Module({
  imports: [
    IdempotencyModule,
    // ... other modules
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply to financial endpoints
    consumer
      .apply(IdempotencyMiddleware)
      .forRoutes(
        'api/v1/transfers',
        'api/v1/withdrawals',
        'api/v1/deposits',
      );
  }
}
```

### 2. Environment Configuration

Add to `.env`:

```bash
# Idempotency TTL (how long to keep records) - 24 hours
IDEMPOTENCY_TTL=86400

# Processing timeout (max time in PROCESSING state) - 5 minutes
IDEMPOTENCY_PROCESSING_TIMEOUT=300

# Whether to store full response bodies
IDEMPOTENCY_STORE_RESPONSE_BODY=true

# Whether to validate request fingerprints
IDEMPOTENCY_VALIDATE_FINGERPRINT=true
```

### 3. Use Decorator in Controllers

```typescript
import { Idempotent, IdempotentRequired } from '@/common/middleware/idempotency';

@Controller('transfers')
export class TransferController {
  // Require idempotency key
  @Post()
  @Idempotent({ required: true })
  async createTransfer(@Body() dto: CreateTransferDto) {
    return this.transferService.create(dto);
  }

  // Optional idempotency key
  @Post('internal')
  @Idempotent({ required: false })
  async internalTransfer(@Body() dto: CreateTransferDto) {
    return this.transferService.createInternal(dto);
  }

  // Custom TTL (1 hour instead of default 24 hours)
  @Post('quick-transfer')
  @Idempotent({ required: true, ttl: 3600 })
  async quickTransfer(@Body() dto: CreateTransferDto) {
    return this.transferService.createQuick(dto);
  }
}
```

## Client Usage

### Making an Idempotent Request

```bash
# First request
curl -X POST https://api.joonapay.com/api/v1/transfers \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "user-123",
    "amount": 1000,
    "currency": "XOF"
  }'

# Response (201 Created)
{
  "id": "transfer-789",
  "status": "completed",
  "amount": 1000
}
```

### Retrying the Same Request

```bash
# Retry with same Idempotency-Key
curl -X POST https://api.joonapay.com/api/v1/transfers \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "user-123",
    "amount": 1000,
    "currency": "XOF"
  }'

# Response (200 OK with cached response)
# Headers include: X-Idempotency-Cached: true
{
  "id": "transfer-789",
  "status": "completed",
  "amount": 1000
}
```

## Request States

### 1. PROCESSING

Request is currently being processed.

**Client Behavior**: Retry with same key after a few seconds.

```json
HTTP/1.1 409 Conflict
{
  "error": "Request is currently being processed. Please retry in a few seconds."
}
```

### 2. COMPLETED

Request completed successfully.

**Client Behavior**: Use cached response.

```json
HTTP/1.1 200 OK
X-Idempotency-Cached: true
X-Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000

{
  "id": "transfer-789",
  "status": "completed"
}
```

### 3. FAILED

Request failed (validation error, business logic error, etc.).

**Client Behavior**: Fix the issue and retry with a **new** key.

```json
HTTP/1.1 400 Bad Request
X-Idempotency-Cached: true

{
  "error": "Insufficient funds",
  "code": "INSUFFICIENT_FUNDS"
}
```

## Security Features

### 1. Request Fingerprinting

Prevents replay attacks by validating that the request body, user, and endpoint match the original request.

```typescript
// Original request
POST /transfers
Idempotency-Key: abc123
{ "amount": 100, "recipientId": "user-123" }

// Attacker tries to replay with different amount
POST /transfers
Idempotency-Key: abc123
{ "amount": 10000, "recipientId": "attacker" }

// ❌ Rejected: Request fingerprint mismatch
```

### 2. Distributed Locking

Prevents race conditions when multiple instances receive the same request simultaneously.

```
Instance A: Receives request → Acquires lock → Processes
Instance B: Receives request → Lock exists → Returns 409 Conflict
```

### 3. Timeout Protection

Automatically recovers from stuck processing states.

```
Request starts → Status: PROCESSING
After 5 minutes → Status: Timeout
Client retries → New processing attempt allowed
```

## Best Practices

### 1. Generate Unique Keys

```typescript
// ✅ Good: UUIDv4
const idempotencyKey = crypto.randomUUID();

// ✅ Good: Timestamp + Random
const idempotencyKey = `${Date.now()}-${Math.random().toString(36)}`;

// ❌ Bad: Sequential or predictable
const idempotencyKey = `transfer-${userId}-${counter}`;
```

### 2. Key Lifecycle

- **Generate once per operation attempt**
- **Store client-side** for retries (e.g., localStorage, database)
- **Use same key for all retries** of the same operation
- **Generate new key** if request parameters change

### 3. Retry Strategy

```typescript
// Exponential backoff for 409 Conflict
async function transferWithRetry(dto: CreateTransferDto) {
  const idempotencyKey = crypto.randomUUID();
  let attempt = 0;
  const maxAttempts = 5;

  while (attempt < maxAttempts) {
    try {
      return await api.createTransfer(dto, { idempotencyKey });
    } catch (error) {
      if (error.status === 409 && attempt < maxAttempts - 1) {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        const delay = Math.pow(2, attempt) * 1000;
        await sleep(delay);
        attempt++;
        continue;
      }
      throw error;
    }
  }
}
```

### 4. Error Handling

```typescript
try {
  const result = await api.createTransfer(dto, { idempotencyKey });

  // Check if response is cached
  if (result.headers['x-idempotency-cached'] === 'true') {
    console.log('Retry successful: Using cached response');
  }

  return result.data;
} catch (error) {
  if (error.status === 409) {
    // Still processing - retry later
    return retry();
  } else if (error.status === 400) {
    // Failed validation - fix and use NEW key
    return fixAndRetryWithNewKey();
  } else {
    // Network error - retry with SAME key
    return retryWithSameKey();
  }
}
```

## Testing

### Unit Tests

```bash
npm test -- idempotency.middleware.spec.ts
npm test -- fingerprint.util.spec.ts
```

### Integration Tests

```typescript
describe('Idempotency Integration', () => {
  it('should prevent duplicate transfers', async () => {
    const key = crypto.randomUUID();

    // First request
    const result1 = await request(app)
      .post('/api/v1/transfers')
      .set('Idempotency-Key', key)
      .send({ amount: 100, recipientId: 'user-123' })
      .expect(201);

    // Duplicate request
    const result2 = await request(app)
      .post('/api/v1/transfers')
      .set('Idempotency-Key', key)
      .send({ amount: 100, recipientId: 'user-123' })
      .expect(200);

    expect(result2.headers['x-idempotency-cached']).toBe('true');
    expect(result1.body.id).toBe(result2.body.id);
  });
});
```

## Monitoring

### Metrics to Track

1. **Idempotency Cache Hit Rate**
   - High hit rate indicates clients are retrying effectively
   - Low hit rate may indicate key generation issues

2. **Processing Timeouts**
   - Frequent timeouts indicate performance issues
   - Adjust `IDEMPOTENCY_PROCESSING_TIMEOUT` if needed

3. **Fingerprint Mismatches**
   - Should be rare
   - High rate indicates potential replay attacks or client bugs

### Logging

```typescript
// Example log output
{
  "level": "info",
  "message": "Returning cached response for idempotency key",
  "key": "550e8400-e29b-41d4-a716-446655440000",
  "cached": true,
  "userId": "user-123"
}

{
  "level": "warn",
  "message": "Request fingerprint mismatch",
  "key": "abc123",
  "userId": "user-123",
  "path": "/api/v1/transfers"
}
```

## Troubleshooting

### Issue: Getting 409 Conflicts repeatedly

**Cause**: Request is stuck in PROCESSING state.

**Solution**:
- Wait for processing timeout (default 5 minutes)
- Or manually delete the key from Redis: `DEL idempotency:your-key`

### Issue: Fingerprint mismatch errors

**Cause**: Request body/user differs from original request.

**Solution**:
- Ensure exact same request body for retries
- Don't include dynamic fields like timestamps in the body
- Use a new key if request parameters need to change

### Issue: Keys expiring too quickly

**Cause**: TTL too short for your use case.

**Solution**:
- Increase `IDEMPOTENCY_TTL` in environment variables
- Or use custom TTL in decorator: `@Idempotent({ ttl: 604800 })` (7 days)

## References

- [Stripe's Idempotency Guide](https://stripe.com/docs/api/idempotent_requests)
- [IETF Draft: HTTP Idempotency Key Header](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)
- [RFC 7231: HTTP/1.1 Semantics](https://tools.ietf.org/html/rfc7231#section-4.2.2)

## License

Proprietary - JoonaPay 2024
