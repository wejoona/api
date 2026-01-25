# Webhook Reliability - Quick Start Guide

## Setup

### 1. Run Migration
```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet
npm run migration:run
```

This creates the `webhook_deadletters` table.

### 2. Verify Setup
Check that the table exists:
```bash
# PostgreSQL
psql -d your_database -c "\d webhook_deadletters"
```

## API Endpoints

### Webhook Endpoints (Public)

#### Yellow Card Webhook
```bash
POST /webhooks/payment/yellow-card
Headers:
  x-yc-signature: <signature>
  Content-Type: application/json

Body: <Yellow Card webhook payload>
```

#### Circle Webhook
```bash
POST /webhooks/circle
Headers:
  x-circle-signature: <signature>
  Content-Type: application/json

Body: <Circle webhook payload>
```

### Admin Endpoints (Protected)

#### Get Statistics
```bash
GET /admin/webhooks/deadletters/stats

Response:
{
  "pending": 5,
  "resolved": 120,
  "ignored": 3,
  "total": 128
}
```

#### List Pending Entries
```bash
# All providers
GET /admin/webhooks/deadletters/pending

# Specific provider
GET /admin/webhooks/deadletters/pending?provider=yellowcard
```

#### Retry Failed Webhook
```bash
POST /admin/webhooks/deadletters/{id}/retry

Response:
{
  "success": true,
  "message": "Webhook successfully reprocessed",
  "newStatus": "resolved"
}
```

#### Mark as Resolved
```bash
POST /admin/webhooks/deadletters/{id}/resolve
Content-Type: application/json

{
  "resolvedBy": "admin@joonapay.com",
  "notes": "Manually processed the transaction"
}
```

#### Mark as Ignored
```bash
POST /admin/webhooks/deadletters/{id}/ignore
Content-Type: application/json

{
  "ignoredBy": "admin@joonapay.com",
  "reason": "Duplicate event"
}
```

## Key Features

### 1. Idempotency
- Webhooks are checked for duplicates using Redis
- Duplicate webhooks return: `{ processed: false, message: "Already processed" }`
- TTL: 24 hours

### 2. Dead-Letter Queue
- Failed webhooks are automatically logged
- Includes full payload, error message, and stack trace
- Can be retried later

### 3. Proper Error Codes
- Invalid signature: **401 Unauthorized**
- Processing error: **500 Internal Server Error**
- Success: **200 OK**

### 4. Event Emitters
The system emits events that other modules can listen to:

```typescript
// Deposit completed
eventEmitter.emit('webhook.deposit.completed', {
  userId: string,
  walletId: string,
  amount: string,
  currency: 'USDC',
  externalId: string,
  provider: string,
});

// Withdrawal completed
eventEmitter.emit('webhook.withdrawal.completed', {
  userId: string,
  walletId: string,
  withdrawalId: string,
  amount: string,
  provider: string,
});

// Withdrawal failed
eventEmitter.emit('webhook.withdrawal.failed', {
  userId: string,
  walletId: string,
  withdrawalId: string,
  reason: string,
  provider: string,
});
```

## Monitoring

### Check Dead-Letter Queue
```bash
# Get stats
curl http://localhost:3000/admin/webhooks/deadletters/stats

# List all pending
curl http://localhost:3000/admin/webhooks/deadletters/pending
```

### Database Query
```sql
-- Count by status
SELECT status, COUNT(*)
FROM webhook_deadletters
GROUP BY status;

-- Recent failures
SELECT id, provider, event_type, error_message, created_at
FROM webhook_deadletters
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 10;

-- High retry count (potential issues)
SELECT id, provider, event_type, retry_count, last_retry_at
FROM webhook_deadletters
WHERE retry_count > 3
ORDER BY retry_count DESC;
```

## Common Scenarios

### Scenario 1: Provider Sends Duplicate Webhook
1. First webhook processed successfully
2. Second webhook arrives with same ID
3. System checks Redis idempotency cache
4. Returns: `{ processed: false, message: "Already processed" }`

### Scenario 2: Database Connection Error
1. Webhook arrives and signature is valid
2. Processing fails due to database error
3. Error logged to dead-letter queue with full details
4. System throws 500 error
5. Provider retries webhook (exponential backoff)
6. Database is back online
7. Retry succeeds, webhook processed

### Scenario 3: Invalid Signature
1. Webhook arrives with incorrect signature
2. Signature verification fails
3. System throws UnauthorizedException (401)
4. Provider stops retrying (auth issue)

### Scenario 4: Manual Intervention Required
1. Webhook fails multiple times (logged to DLQ)
2. Admin checks dead-letter queue
3. Admin investigates the issue
4. Admin either:
   - Fixes underlying issue and retries webhook
   - Manually processes and marks as resolved
   - Marks as ignored if duplicate/invalid

## Troubleshooting

### Issue: Webhooks Not Being Processed
1. Check Redis connection (idempotency cache)
2. Check database connection
3. Verify signature configuration

### Issue: High Pending Count
1. Query dead-letter queue for error patterns
2. Check if specific provider is failing
3. Investigate common error messages

### Issue: Retry Fails
1. Check if underlying issue is resolved
2. Verify payload is still valid
3. Check transaction/wallet state

## Development

### Listen to Webhook Events
```typescript
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class MyService {
  @OnEvent('webhook.deposit.completed')
  handleDepositCompleted(payload: any) {
    // Handle deposit completion
    this.logger.log(`Deposit completed: ${payload.amount} USDC`);
  }

  @OnEvent('webhook.withdrawal.failed')
  handleWithdrawalFailed(payload: any) {
    // Handle withdrawal failure
    this.logger.error(`Withdrawal failed: ${payload.reason}`);
  }
}
```

### Testing Webhooks Locally
```bash
# Test with curl
curl -X POST http://localhost:3000/webhooks/payment/yellow-card \
  -H "Content-Type: application/json" \
  -H "x-yc-signature: <valid_signature>" \
  -d '{"event": "deposit.completed", "depositId": "123", "amount": 100}'
```

## Security

### Before Production
1. Uncomment authentication guards in `webhook-admin.controller.ts`:
```typescript
@UseGuards(JwtAuthGuard, AdminGuard)
```

2. Ensure environment variables are set:
- `CIRCLE_WEBHOOK_SECRET`
- `YELLOW_CARD_WEBHOOK_SECRET`
- Redis configuration

3. Set up monitoring alerts:
- High pending count (> 10)
- Old pending entries (> 24 hours)
- High retry failures (retry_count > 5)

## File Locations

**Controllers**:
- `/src/modules/webhook/application/controllers/webhook.controller.ts`
- `/src/modules/webhook/application/controllers/webhook-admin.controller.ts`

**Use Cases**:
- `/src/modules/webhook/application/usecases/process-webhook.use-case.ts`

**Services**:
- `/src/modules/webhook/application/domain/services/webhook-deadletter.service.ts`

**Entity**:
- `/src/modules/webhook/infrastructure/orm-entities/webhook-deadletter.orm-entity.ts`

**Migration**:
- `/src/database/migrations/1737900000000-CreateWebhookDeadletterTable.ts`

**Documentation**:
- `/src/modules/webhook/WEBHOOK_RELIABILITY.md` (comprehensive guide)
- `/WEBHOOK_RELIABILITY_IMPLEMENTATION.md` (implementation summary)
- `/src/modules/webhook/QUICK_START.md` (this file)
