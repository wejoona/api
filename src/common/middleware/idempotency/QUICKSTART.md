# Idempotency Middleware - Quick Start Guide

Get up and running with idempotency protection in 5 minutes.

## Installation

Already installed! The idempotency middleware is built into the JoonaPay USDC Wallet.

## Step 1: Add Environment Variables

Add to your `.env` file:

```bash
# Idempotency Configuration
IDEMPOTENCY_TTL=86400                      # 24 hours
IDEMPOTENCY_PROCESSING_TIMEOUT=300         # 5 minutes
IDEMPOTENCY_STORE_RESPONSE_BODY=true
IDEMPOTENCY_VALIDATE_FINGERPRINT=true
IDEMPOTENCY_EXCLUDE_ROUTES=/health,/metrics,/docs
```

## Step 2: Apply Middleware

In `app.module.ts`:

```typescript
import { IdempotencyModule, IdempotencyMiddleware } from '@/common/middleware/idempotency';

@Module({
  imports: [
    IdempotencyModule,
    // ... other modules
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
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

## Step 3: Protect Your Endpoints

In your controller:

```typescript
import { Idempotent } from '@/common/middleware/idempotency';

@Controller('api/v1/transfers')
export class TransferController {
  @Post()
  @Idempotent({ required: true })
  async createTransfer(@Body() dto: CreateTransferDto) {
    // Your business logic here
    // This will only execute once per unique Idempotency-Key
    return this.transferService.create(dto);
  }
}
```

## Step 4: Make Idempotent Requests

### From Client (cURL)

```bash
curl -X POST https://api.joonapay.com/api/v1/transfers \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "user-123",
    "amount": 1000,
    "currency": "XOF"
  }'
```

### From JavaScript/TypeScript

```typescript
const idempotencyKey = crypto.randomUUID();

const response = await fetch('/api/v1/transfers', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Idempotency-Key': idempotencyKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    recipientId: 'user-123',
    amount: 1000,
    currency: 'XOF',
  }),
});

const result = await response.json();

// Check if response was cached (retry)
if (response.headers.get('X-Idempotency-Cached') === 'true') {
  console.log('Retry successful - using cached response');
}
```

### From Flutter/Dart (Mobile)

```dart
import 'package:uuid/uuid.dart';

final idempotencyKey = Uuid().v4();

final response = await dio.post(
  '/api/v1/transfers',
  data: {
    'recipientId': 'user-123',
    'amount': 1000,
    'currency': 'XOF',
  },
  options: Options(
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
  ),
);

// Check if cached
final isCached = response.headers.value('x-idempotency-cached') == 'true';
if (isCached) {
  print('Retry successful - using cached response');
}
```

## Step 5: Handle Retries

### Automatic Retry with Exponential Backoff

```typescript
async function transferWithRetry(dto: CreateTransferDto) {
  const idempotencyKey = crypto.randomUUID();
  let attempt = 0;
  const maxAttempts = 5;

  while (attempt < maxAttempts) {
    try {
      const response = await fetch('/api/v1/transfers', {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dto),
      });

      if (response.ok) {
        return await response.json();
      }

      // 409 Conflict: Still processing, retry
      if (response.status === 409 && attempt < maxAttempts - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s, 8s, 16s
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
        continue;
      }

      // Other errors: throw
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      // Network error: retry with same key
      if (attempt < maxAttempts - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
        continue;
      }
      throw error;
    }
  }
}
```

## Common Use Cases

### 1. P2P Transfers

```typescript
@Post('transfers')
@Idempotent({ required: true, ttl: 86400 }) // 24 hours
async createTransfer(@Body() dto: CreateTransferDto) {
  return this.transferService.create(dto);
}
```

### 2. Withdrawals

```typescript
@Post('withdrawals')
@Idempotent({ required: true, ttl: 172800 }) // 48 hours
async createWithdrawal(@Body() dto: CreateWithdrawalDto) {
  return this.withdrawalService.create(dto);
}
```

### 3. Bill Payments

```typescript
@Post('bill-payments')
@Idempotent({ required: true, ttl: 604800 }) // 7 days
async payBill(@Body() dto: PayBillDto) {
  return this.billPaymentService.pay(dto);
}
```

### 4. Merchant Payouts

```typescript
@Post('payouts')
@Idempotent({ required: true, ttl: 2592000 }) // 30 days
async createPayout(@Body() dto: CreatePayoutDto) {
  return this.payoutService.create(dto);
}
```

## Testing

### Unit Test Example

```typescript
import { Test } from '@nestjs/testing';
import { IdempotencyModule } from '@/common/middleware/idempotency';

describe('Transfer Idempotency', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [IdempotencyModule, TransferModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('should prevent duplicate transfers', async () => {
    const key = crypto.randomUUID();
    const dto = {
      recipientId: 'user-123',
      amount: 1000,
      currency: 'XOF',
    };

    // First request
    const response1 = await request(app.getHttpServer())
      .post('/api/v1/transfers')
      .set('Idempotency-Key', key)
      .send(dto)
      .expect(201);

    // Retry with same key
    const response2 = await request(app.getHttpServer())
      .post('/api/v1/transfers')
      .set('Idempotency-Key', key)
      .send(dto)
      .expect(200);

    expect(response2.headers['x-idempotency-cached']).toBe('true');
    expect(response1.body.id).toBe(response2.body.id);
  });
});
```

## Troubleshooting

### Issue: Getting 400 "Idempotency-Key is required"

**Solution**: Add `@Idempotent({ required: false })` if key is optional, or ensure client sends the header.

### Issue: Getting 409 Conflict repeatedly

**Solution**: Request is still processing. Wait 5-10 seconds and retry with the same key.

### Issue: Fingerprint mismatch error

**Solution**: Ensure the request body is identical for retries. Don't change amounts, recipients, etc.

### Issue: Keys expiring too quickly

**Solution**: Increase TTL in decorator: `@Idempotent({ ttl: 172800 })` (48 hours)

## Next Steps

- Read [README.md](./README.md) for complete documentation
- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system design details
- Check [examples/](./examples/) for more usage patterns
- Run tests: `npm test -- idempotency`

## Support

For issues or questions, contact the JoonaPay engineering team.
