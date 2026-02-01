# Correlation Module Integration Guide

Quick guide for integrating correlation ID tracking into the JoonaPay backend.

## Installation Steps

### 1. Module is already imported in AppModule

The `CorrelationModule` has been added to `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/app.module.ts`.

### 2. Start using in your code

No additional configuration needed. The middleware is automatically applied to all routes.

## Quick Start

### Controllers

```typescript
import { CorrelationId } from '@/modules/correlation';

@Controller('wallet')
export class WalletController {
  @Get('balance')
  async getBalance(
    @CurrentUser() user: User,
    @CorrelationId() correlationId: string, // Add this
  ) {
    this.logger.log(`[${correlationId}] Getting balance for ${user.id}`);
    // ... your logic
  }
}
```

### Services & Use Cases

```typescript
import { CorrelationService } from '@/modules/correlation';

@Injectable()
export class WalletService {
  constructor(private readonly correlationService: CorrelationService) {}

  async getBalance(userId: string) {
    const correlationId = this.correlationService.getCorrelationId();
    this.logger.log(`[${correlationId}] Fetching balance for ${userId}`);
    // ... your logic
  }
}
```

### External API Calls

```typescript
import { withCorrelationId } from '@/modules/correlation';
import axios from 'axios';

async callBlnkAPI(data: any) {
  const correlationId = this.correlationService.getCorrelationId();

  const config = withCorrelationId(correlationId, {
    timeout: 5000,
  });

  return axios.post('https://api.blnk.io/transactions', data, config);
}
```

## Migrating Existing Code

### Step 1: Add to Controllers (Optional but Recommended)

Find all controllers and add `@CorrelationId()` parameter:

**Before:**
```typescript
@Get('balance')
async getBalance(@CurrentUser() user: User) {
  this.logger.log(`Getting balance for ${user.id}`);
  return this.service.getBalance(user.id);
}
```

**After:**
```typescript
@Get('balance')
async getBalance(
  @CurrentUser() user: User,
  @CorrelationId() correlationId: string,
) {
  this.logger.log(`[${correlationId}] Getting balance for ${user.id}`);
  return this.service.getBalance(user.id);
}
```

### Step 2: Update Services

Add `CorrelationService` to services that make external calls or need tracking:

**Before:**
```typescript
@Injectable()
export class WalletService {
  constructor(private readonly walletRepository: WalletRepository) {}

  async getBalance(userId: string) {
    this.logger.log(`Fetching balance for ${userId}`);
    return this.walletRepository.findByUserId(userId);
  }
}
```

**After:**
```typescript
@Injectable()
export class WalletService {
  constructor(
    private readonly correlationService: CorrelationService,
    private readonly walletRepository: WalletRepository,
  ) {}

  async getBalance(userId: string) {
    const correlationId = this.correlationService.getCorrelationId();
    this.logger.log(`[${correlationId}] Fetching balance for ${userId}`);
    return this.walletRepository.findByUserId(userId);
  }
}
```

### Step 3: Update External API Adapters

**Critical**: Add correlation ID to all external service calls (Blnk, Yellow Card, Circle, etc.)

**Before:**
```typescript
async recordTransaction(transaction: Transaction) {
  return axios.post('https://api.blnk.io/transactions', transaction);
}
```

**After:**
```typescript
async recordTransaction(transaction: Transaction) {
  const correlationId = this.correlationService.getCorrelationId();
  const config = withCorrelationId(correlationId);

  return axios.post('https://api.blnk.io/transactions', transaction, config);
}
```

## Priority Areas to Update

### High Priority (Update First)

1. **Provider Adapters** - Blnk, Circle, Yellow Card, Twilio
   - `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/providers/blnk/`
   - `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/providers/circle/`
   - `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/providers/yellowcard/`
   - `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/twilio/`

2. **Transfer & Transaction Modules** - Critical for tracing money flow
   - `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/transfer/`
   - `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/transaction/`

3. **Webhook Handlers** - For tracking async operations
   - `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/webhook/`

### Medium Priority

4. **Wallet Module**
   - `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/wallet/`

5. **KYC Module** - For compliance tracking
   - `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/kyc/`

6. **Compliance Module**
   - `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/compliance/`

### Low Priority (Nice to Have)

7. **User Module**
8. **Notification Module**
9. **Referral Module**

## Testing

### Manual Testing

1. Start the backend:
```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet
npm run start:dev
```

2. Make a request without correlation ID:
```bash
curl -X GET http://localhost:3000/api/v1/wallet/balance \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Check logs - you should see a generated correlation ID:
```
[a1b2c3d4-e5f6-4789-g0h1-i2j3k4l5m6n7] Incoming request: GET /api/v1/wallet/balance
```

3. Make a request with correlation ID:
```bash
curl -X GET http://localhost:3000/api/v1/wallet/balance \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Correlation-ID: my-custom-correlation-id"
```

Check logs - you should see your custom ID:
```
[my-custom-correlation-id] Incoming request: GET /api/v1/wallet/balance
```

### Unit Tests

Run correlation module tests:
```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet
npm test correlation
```

## Troubleshooting

### Correlation ID shows as "unknown"

**Problem**: Logs show `[unknown]` instead of actual correlation ID.

**Solution**: Make sure you're in a request context. Background jobs won't have correlation IDs unless you manually set them.

### Request-scoped service issues

**Problem**: `CorrelationService` throws errors about scope.

**Solution**: `CorrelationService` is request-scoped. Don't inject it into singleton-scoped services. Instead, pass correlation ID as parameter or use the decorator in controllers.

### External API not receiving correlation ID

**Problem**: Downstream service logs don't show correlation ID.

**Solution**: Make sure you're using `withCorrelationId()` or `createCorrelatedHttpClient()` helper functions.

## Best Practices

1. **Always include correlation ID in logs**: Use `[${correlationId}]` prefix
2. **Propagate to all external calls**: Never call external APIs without correlation ID
3. **Don't use in background jobs**: Background jobs don't have request context
4. **Include in error messages**: Helps with debugging production issues
5. **Log key operations**: Log important steps (validation, API calls, database updates)

## Examples

See `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/correlation/examples/` for complete examples:

- `wallet.controller.example.ts` - Controller usage
- `wallet.service.example.ts` - Service usage
- `external-adapter.example.ts` - External API integration

## Monitoring

### Log Filtering

Filter logs by correlation ID:
```bash
# View all logs for a specific request
cat logs/application.log | grep "a1b2c3d4-e5f6-4789-g0h1-i2j3k4l5m6n7"
```

### APM Integration

If using Datadog/New Relic/Sentry, add correlation ID to custom attributes:
```typescript
// In your APM setup
apm.addCustomAttribute('correlationId', correlationId);
```

## Next Steps

1. Update provider adapters (Blnk, Circle, Yellow Card)
2. Update transfer and transaction modules
3. Update webhook handlers
4. Gradually add to other modules
5. Update mobile app to send correlation IDs
6. Configure APM tools to track correlation IDs

## Support

For questions or issues, check:
- `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/correlation/README.md` - Full documentation
- `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/correlation/examples/` - Code examples
