# Correlation Module - Quick Reference Card

## TL;DR

Correlation IDs are now automatically added to all requests. Use them to track requests across services.

## Import Statement

```typescript
import { CorrelationId, CorrelationService, withCorrelationId } from '@/modules/correlation';
```

## Quick Usage

### In Controllers
```typescript
@Get('balance')
async getBalance(
  @CurrentUser() user: User,
  @CorrelationId() correlationId: string,  // Add this line
) {
  this.logger.log(`[${correlationId}] Getting balance for ${user.id}`);
  return this.service.getBalance(user.id);
}
```

### In Services
```typescript
@Injectable()
export class WalletService {
  constructor(
    private readonly correlationService: CorrelationService,  // Add this
    private readonly walletRepository: WalletRepository,
  ) {}

  async getBalance(userId: string) {
    const correlationId = this.correlationService.getCorrelationId();  // Add this
    this.logger.log(`[${correlationId}] Fetching balance for ${userId}`);
    return this.walletRepository.findByUserId(userId);
  }
}
```

### In External API Calls
```typescript
async callExternalAPI(data: any) {
  const correlationId = this.correlationService.getCorrelationId();
  const config = withCorrelationId(correlationId);  // Add this
  return axios.post('https://api.external.com/data', data, config);
}
```

## Cheat Sheet

| Task | Code |
|------|------|
| Get correlation ID in controller | `@CorrelationId() correlationId: string` |
| Get correlation ID in service | `this.correlationService.getCorrelationId()` |
| Check if correlation ID exists | `this.correlationService.hasCorrelationId()` |
| Add to single HTTP request | `withCorrelationId(correlationId, config)` |
| Create HTTP client with auto-injection | `createCorrelatedHttpClient(correlationId, config)` |
| Extract from response headers | `extractCorrelationIdFromHeaders(headers)` |
| Log with correlation ID | `this.logger.log(\`[${correlationId}] Message\`)` |

## Common Patterns

### Pattern 1: Controller + Service
```typescript
// Controller
@Post('transfer')
async createTransfer(
  @Body() dto: CreateTransferDto,
  @CurrentUser() user: User,
  @CorrelationId() correlationId: string,
) {
  this.logger.log(`[${correlationId}] Creating transfer`);
  return this.transferService.create(dto, user.id);
}

// Service
async create(dto: CreateTransferDto, userId: string) {
  const correlationId = this.correlationService.getCorrelationId();
  this.logger.log(`[${correlationId}] Validating transfer`);
  // ... business logic
}
```

### Pattern 2: Service + External API
```typescript
async recordTransaction(tx: Transaction) {
  const correlationId = this.correlationService.getCorrelationId();

  this.logger.log(`[${correlationId}] Calling Blnk API`);

  const config = withCorrelationId(correlationId, { timeout: 5000 });
  const response = await axios.post(
    'https://api.blnk.io/transactions',
    tx,
    config,
  );

  this.logger.log(`[${correlationId}] Blnk API response received`);
  return response.data;
}
```

### Pattern 3: Multiple Service Calls
```typescript
async executeTransfer(dto: TransferDto) {
  const correlationId = this.correlationService.getCorrelationId();

  this.logger.log(`[${correlationId}] Starting transfer flow`);

  // All these calls will share the same correlation ID
  const wallet = await this.walletService.getBalance(dto.senderId);
  const recipient = await this.userService.getUser(dto.recipientId);
  const ledger = await this.ledgerService.recordTransaction(dto);
  const notification = await this.notificationService.send(dto.recipientId);

  this.logger.log(`[${correlationId}] Transfer flow completed`);
}
```

## Testing

### Manual Test
```bash
# Without correlation ID (auto-generated)
curl http://localhost:3000/api/v1/wallet/balance \
  -H "Authorization: Bearer TOKEN"

# With custom correlation ID
curl http://localhost:3000/api/v1/wallet/balance \
  -H "Authorization: Bearer TOKEN" \
  -H "X-Correlation-ID: my-test-id-123"
```

### Log Verification
```bash
# View logs for specific correlation ID
cat logs/application.log | grep "my-test-id-123"

# View all correlation IDs
cat logs/application.log | grep -oP '\[.*?\]' | sort | uniq
```

## Common Mistakes

### ❌ Don't Do This
```typescript
// Don't hardcode correlation IDs
const correlationId = 'hardcoded-id';

// Don't skip correlation ID in external calls
axios.post(url, data);  // Missing correlation ID!

// Don't forget to inject CorrelationService
constructor() {}  // Missing dependency

// Don't use in background jobs without check
const correlationId = this.correlationService.getCorrelationId();  // Will be 'unknown'
```

### ✅ Do This
```typescript
// Get correlation ID from service
const correlationId = this.correlationService.getCorrelationId();

// Always include in external calls
const config = withCorrelationId(correlationId);
axios.post(url, data, config);

// Inject CorrelationService
constructor(private readonly correlationService: CorrelationService) {}

// Check if correlation ID exists in background jobs
if (this.correlationService.hasCorrelationId()) {
  const correlationId = this.correlationService.getCorrelationId();
  this.logger.log(`[${correlationId}] Processing`);
} else {
  this.logger.log('[background-job] Processing');
}
```

## Log Format

### Standard Format
```
[correlation-id] Level: Message
```

### Examples
```
[abc-123] LOG: Fetching wallet for user user-456
[abc-123] LOG: Wallet balance: 1000.00 XOF
[abc-123] LOG: Request completed in 125ms

[def-456] LOG: Creating transfer from user-123 to user-789
[def-456] WARN: Low balance detected
[def-456] ERROR: Transfer failed: Insufficient balance
```

## HTTP Headers

### Request Headers (Client → Server)
```
X-Correlation-ID: abc-123-def-456  (optional, auto-generated if missing)
```

### Response Headers (Server → Client)
```
X-Correlation-ID: abc-123-def-456  (always present)
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Correlation ID is "unknown" | You're in a background job or outside request scope |
| Correlation ID not in logs | Add `[${correlationId}]` prefix to log messages |
| External API not receiving ID | Use `withCorrelationId()` helper |
| Can't inject CorrelationService | Make sure CorrelationModule is imported |
| Tests failing | Mock CorrelationService in test providers |

## Environment Setup

Already configured! No setup needed. The module is active in:
- `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/app.module.ts`

## Files to Update

### High Priority
1. Blnk adapter: `/src/modules/providers/blnk/`
2. Circle adapter: `/src/modules/providers/circle/`
3. Yellow Card adapter: `/src/modules/providers/yellowcard/`
4. Transfer module: `/src/modules/transfer/`
5. Webhook handlers: `/src/modules/webhook/`

### Medium Priority
6. Transaction module: `/src/modules/transaction/`
7. Wallet module: `/src/modules/wallet/`
8. KYC module: `/src/modules/kyc/`

## Example Code

See complete examples:
- `/src/modules/correlation/examples/wallet.controller.example.ts`
- `/src/modules/correlation/examples/wallet.service.example.ts`
- `/src/modules/correlation/examples/external-adapter.example.ts`

## Full Documentation

- **README**: `/src/modules/correlation/README.md`
- **Integration Guide**: `/src/modules/correlation/INTEGRATION.md`
- **Architecture**: `/src/modules/correlation/ARCHITECTURE.md`

## Support

Questions? Check:
1. Examples folder (see above)
2. Full documentation (see above)
3. Test files for usage patterns
