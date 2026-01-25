# Webhook Module

Handles incoming webhooks from payment providers (Yellow Card, Circle) with comprehensive reliability features.

## Quick Start

### Processing Webhooks

Webhooks are automatically processed when received at these endpoints:

- `POST /webhooks/payment/yellow-card` - Yellow Card deposits/withdrawals
- `POST /webhooks/circle` - Circle transfers

### Monitoring Dead-Letter Queue

Check for failed webhooks:

```bash
# Get statistics
curl http://localhost:3000/admin/webhooks/deadletters/stats

# List pending entries
curl http://localhost:3000/admin/webhooks/deadletters/pending

# Filter by provider
curl http://localhost:3000/admin/webhooks/deadletters/pending?provider=yellowcard
```

### Retry Failed Webhooks

```bash
# Retry a specific entry
curl -X POST http://localhost:3000/admin/webhooks/deadletters/{id}/retry

# Resolve manually (if fixed outside system)
curl -X POST http://localhost:3000/admin/webhooks/deadletters/{id}/resolve \
  -H "Content-Type: application/json" \
  -d '{"resolvedBy": "admin@example.com", "notes": "Fixed manually"}'

# Ignore (if not relevant)
curl -X POST http://localhost:3000/admin/webhooks/deadletters/{id}/ignore \
  -H "Content-Type: application/json" \
  -d '{"ignoredBy": "admin@example.com", "reason": "Duplicate event"}'
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Webhook Controller                       │
│  POST /webhooks/payment/yellow-card                         │
│  POST /webhooks/circle                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              ProcessWebhookUseCase                          │
│  1. Verify signature (401 if invalid)                       │
│  2. Check idempotency (Redis)                               │
│  3. Process webhook                                         │
│  4. Mark as processed (after success)                       │
│  5. On failure: Log to DLQ + re-throw                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                    ┌────┴────┐
                    │         │
            Success │         │ Failure
                    ▼         ▼
        ┌─────────────┐  ┌──────────────────┐
        │ Event       │  │ Dead-Letter      │
        │ Emitter     │  │ Queue            │
        │             │  │                  │
        │ - deposit   │  │ - Log failure    │
        │ - transfer  │  │ - Store payload  │
        │ - withdrawal│  │ - Manual retry   │
        └─────────────┘  └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Admin Controller │
                    │ - Stats          │
                    │ - List pending   │
                    │ - Retry          │
                    │ - Resolve        │
                    │ - Ignore         │
                    └──────────────────┘
```

## Key Features

### 1. Idempotency Protection
- Uses Redis to track processed webhooks
- Key: `webhook:processed:{webhookId}`
- TTL: 24 hours
- Prevents duplicate processing

### 2. Signature Verification
- Yellow Card: `x-yc-signature` header
- Circle: `x-circle-signature` header with HMAC-SHA256
- Returns 401 for invalid signatures

### 3. Dead-Letter Queue
- Failed webhooks stored with full context
- Includes error message and stack trace
- Manual retry capability
- Statistics and filtering

### 4. Event-Driven Architecture
- Emits events for downstream services
- Ledger service handles balance updates
- Notification service sends alerts

## Event Types

### Yellow Card Events
```typescript
// Deposits
'deposit.pending'
'deposit.completed'
'deposit.failed'
'deposit.expired'

// Withdrawals
'withdrawal.pending'
'withdrawal.completed'
'withdrawal.failed'
```

### Circle Events
```typescript
// Transfers
'transfers.complete'
'transfers.failed'

// Transactions (on-chain)
'transactions.complete'
'transactions.failed'

// Inbound
'inboundTransfers.complete'
```

## Integration Example

### Listen to Webhook Events

```typescript
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class LedgerService {
  @OnEvent('webhook.deposit.completed')
  async handleDepositCompleted(event: {
    userId: string;
    walletId: string;
    amount: string;
    currency: string;
    externalId: string;
    provider: string;
  }) {
    // Record deposit in ledger
    await this.recordDeposit(event);
  }

  @OnEvent('webhook.withdrawal.completed')
  async handleWithdrawalCompleted(event: {
    userId: string;
    walletId: string;
    withdrawalId: string;
    amount: string;
    provider: string;
  }) {
    // Commit withdrawal in ledger
    await this.commitWithdrawal(event);
  }

  @OnEvent('webhook.withdrawal.failed')
  async handleWithdrawalFailed(event: {
    userId: string;
    walletId: string;
    withdrawalId: string;
    amount: string;
    reason: string;
    provider: string;
  }) {
    // Void/refund withdrawal in ledger
    await this.voidWithdrawal(event);
  }
}
```

### Use Dead-Letter Service

```typescript
import { WebhookDeadletterService } from '@modules/webhook';

@Injectable()
export class CustomService {
  constructor(
    private readonly deadletterService: WebhookDeadletterService,
  ) {}

  async processExternalEvent(event: any) {
    try {
      // Process event
    } catch (error) {
      // Log to dead-letter queue
      await this.deadletterService.log({
        provider: 'custom_provider',
        eventType: 'custom.event',
        payload: event,
        error: error,
      });
      throw error;
    }
  }
}
```

## Database Schema

See migration: `1738400000000-CreateWebhookDeadlettersTable.ts`

Table: `webhook_deadletters`
- `id` - UUID primary key
- `provider` - Provider name (indexed)
- `event_type` - Event type (indexed)
- `webhook_id` - Webhook identifier (indexed)
- `payload` - Full webhook payload (JSONB)
- `error_message` - Error description
- `error_stack` - Stack trace
- `status` - pending/resolved/ignored (indexed)
- `retry_count` - Number of retry attempts
- `last_retry_at` - Last retry timestamp
- `resolved_at` - Resolution timestamp
- `resolved_by` - Admin who resolved
- `resolution_notes` - Notes about resolution
- `created_at` - Creation timestamp

## Configuration

### Environment Variables

```env
# Circle
CIRCLE_WEBHOOK_SECRET=your_circle_webhook_secret

# Yellow Card
YELLOWCARD_WEBHOOK_SECRET=your_yc_webhook_secret

# Redis (for idempotency)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional_password
```

## Troubleshooting

### Webhooks Not Processing

1. Check signature verification:
   - Ensure webhook secret is correctly configured
   - Verify signature header is being sent

2. Check Redis connection:
   - Idempotency checks require Redis
   - System degrades gracefully if Redis is down

3. Check dead-letter queue:
   - Failed webhooks are logged for investigation
   - Use admin endpoints to view pending entries

### Dead-Letter Queue Growing

1. Check error patterns:
   - Similar errors might indicate systemic issue
   - Group by `error_message` to find common problems

2. Retry failed entries:
   - Use retry endpoint after fixing underlying issue
   - Batch retry by provider if needed

3. Clean up old entries:
   - Resolved/ignored entries can be deleted
   - Use `WebhookDeadletterRepository.deleteOldEntries()`

## Security

### Admin Endpoints
Currently, admin endpoints are not protected. To secure them:

1. Uncomment auth guards in `webhook-admin.controller.ts`:
```typescript
@UseGuards(JwtAuthGuard, AdminGuard)
```

2. Ensure user has admin role to access endpoints

3. Consider additional IP whitelisting for production

### Webhook Endpoints
- Always verify signatures
- Use HTTPS in production
- Rate limit by IP address
- Monitor for suspicious patterns

## Maintenance

### Cleanup Old Entries

Add to your cron jobs:

```typescript
import { Cron } from '@nestjs/schedule';
import { WebhookDeadletterRepository } from '@modules/webhook';

@Injectable()
export class WebhookCleanupService {
  constructor(
    private readonly repository: WebhookDeadletterRepository,
  ) {}

  @Cron('0 0 * * 0') // Weekly on Sunday at midnight
  async cleanupOldDeadletters() {
    const deleted = await this.repository.deleteOldEntries(90);
    console.log(`Cleaned up ${deleted} old dead-letter entries`);
  }
}
```

## Monitoring

### Metrics to Track
- Dead-letter queue size (pending count)
- Retry success rate
- Webhook processing latency
- Failed webhooks by provider
- Failed webhooks by event type

### Example Prometheus Metrics
```typescript
import { Counter, Histogram } from 'prom-client';

const webhookProcessed = new Counter({
  name: 'webhook_processed_total',
  help: 'Total webhooks processed',
  labelNames: ['provider', 'event_type', 'status'],
});

const webhookLatency = new Histogram({
  name: 'webhook_processing_duration_seconds',
  help: 'Webhook processing duration',
  labelNames: ['provider', 'event_type'],
});

const deadletterQueueSize = new Gauge({
  name: 'webhook_deadletter_queue_size',
  help: 'Number of pending dead-letter entries',
  labelNames: ['provider'],
});
```

## Testing

### Manual Testing

1. Send test webhook to Yellow Card endpoint:
```bash
curl -X POST http://localhost:3000/webhooks/payment/yellow-card \
  -H "Content-Type: application/json" \
  -H "x-yc-signature: test_signature" \
  -d '{
    "event": "deposit.completed",
    "depositId": "test-123",
    "amount": "100.00"
  }'
```

2. Check if webhook was processed:
```bash
curl http://localhost:3000/admin/webhooks/deadletters/stats
```

### Unit Testing

```typescript
describe('ProcessWebhookUseCase', () => {
  it('should process valid webhook', async () => {
    const result = await useCase.execute({
      payload: mockPayload,
      signature: validSignature,
      rawBody: JSON.stringify(mockPayload),
      provider: 'yellowcard',
    });
    
    expect(result.success).toBe(true);
    expect(result.processed).toBe(true);
  });

  it('should log to DLQ on failure', async () => {
    // Mock processing failure
    jest.spyOn(transactionRepo, 'findByProviderRef').mockRejectedValue(
      new Error('Database error')
    );

    await expect(
      useCase.execute({ payload, signature, rawBody, provider })
    ).rejects.toThrow();

    expect(deadletterService.log).toHaveBeenCalled();
  });
});
```

## Support

For issues or questions:
1. Check dead-letter queue for failed webhooks
2. Review logs for error messages
3. Contact payment provider support if signature issues
4. Escalate to development team for code issues
