# Webhook Reliability Implementation Summary

## Overview
This document summarizes the webhook reliability improvements implemented for the USDC Wallet backend. The implementation ensures no payment events are lost, even when webhook processing fails, through a comprehensive dead-letter queue system.

## Architecture

### Components Implemented

1. **Dead-Letter Queue Entity** (`webhook_deadletters` table)
   - Location: `/src/modules/webhook/infrastructure/orm-entities/webhook-deadletter.orm-entity.ts`
   - Stores failed webhooks with full context for debugging and retry

2. **Dead-Letter Repository**
   - Location: `/src/modules/webhook/infrastructure/repositories/webhook-deadletter.repository.ts`
   - Provides data access layer for dead-letter operations
   - Includes methods for querying, filtering, and cleanup

3. **Dead-Letter Service**
   - Location: `/src/modules/webhook/application/domain/services/webhook-deadletter.service.ts`
   - Business logic for logging, resolving, and managing failed webhooks
   - Integrated with TypeORM repository pattern

4. **Webhook Processing Use Case**
   - Location: `/src/modules/webhook/application/usecases/process-webhook.use-case.ts`
   - Implements correct idempotency ordering
   - Webhooks marked as processed AFTER successful processing
   - Failed webhooks automatically logged to dead-letter queue

5. **Admin Management System**
   - Query Handlers: Get stats, list pending entries
   - Command Handlers: Resolve, ignore, retry dead-letter entries
   - Admin Controller: RESTful endpoints for DLQ management

## Database Schema

### webhook_deadletters Table

```sql
CREATE TABLE webhook_deadletters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider VARCHAR(50) NOT NULL,           -- 'yellowcard' | 'circle' | 'generic'
  event_type VARCHAR(100) NOT NULL,        -- e.g., 'deposit.completed'
  webhook_id VARCHAR(255),                 -- Unique identifier from provider
  payload JSONB NOT NULL,                  -- Full webhook payload
  error_message TEXT NOT NULL,             -- Error description
  error_stack TEXT,                        -- Stack trace for debugging
  status VARCHAR(20) DEFAULT 'pending',    -- 'pending' | 'resolved' | 'ignored'
  retry_count INTEGER DEFAULT 0,           -- Number of retry attempts
  last_retry_at TIMESTAMP,                 -- Last retry timestamp
  resolved_at TIMESTAMP,                   -- Resolution timestamp
  resolved_by VARCHAR(255),                -- Admin who resolved
  resolution_notes TEXT,                   -- Notes about resolution
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IDX_webhook_deadletters_provider ON webhook_deadletters(provider);
CREATE INDEX IDX_webhook_deadletters_event_type ON webhook_deadletters(event_type);
CREATE INDEX IDX_webhook_deadletters_webhook_id ON webhook_deadletters(webhook_id);
CREATE INDEX IDX_webhook_deadletters_status ON webhook_deadletters(status);
```

## Webhook Processing Flow

### 1. Signature Verification (Security First)
```
Webhook Received → Verify Signature → 401 if invalid
                                    → Continue if valid
```

### 2. Idempotency Check (Prevent Duplicates)
```
Check Redis: webhook:processed:{webhookId}
  → If exists: Return 200 (already processed)
  → If not: Continue processing
```

### 3. Process Webhook
```
try {
  Process business logic (update transaction, emit events, etc.)
  Mark as processed in Redis (TTL: 24h)
  Return 200 OK
} catch (error) {
  Log to dead-letter queue
  Re-throw error (provider will retry)
}
```

### Key Features:
- **Signature verification happens FIRST** (prevents malicious webhooks)
- **Idempotency check happens BEFORE processing** (prevents duplicates)
- **Mark as processed happens AFTER success** (ensures retry on failure)
- **Failed webhooks logged to DLQ** (no events lost)

## Supported Providers & Events

### Yellow Card (On-Ramp/Off-Ramp)
**Deposit Events:**
- `deposit.pending` - Deposit initiated
- `deposit.completed` - Deposit successful
- `deposit.failed` - Deposit failed
- `deposit.expired` - Deposit expired

**Withdrawal Events:**
- `withdrawal.pending` - Withdrawal initiated
- `withdrawal.completed` - Withdrawal successful
- `withdrawal.failed` - Withdrawal failed (funds refunded)

### Circle (USDC Transfer Provider)
**Transfer Events:**
- `transfers.complete` - Transfer completed
- `transfers.failed` - Transfer failed

**Transaction Events:**
- `transactions.complete` - On-chain transaction confirmed
- `transactions.failed` - On-chain transaction failed

**Inbound Events:**
- `inboundTransfers.complete` - Deposit received

## API Endpoints

### Webhook Ingestion
```
POST /webhooks/payment/yellow-card
Header: x-yc-signature
Body: Yellow Card webhook payload

POST /webhooks/circle
Header: x-circle-signature
Body: Circle webhook payload
```

### Admin Management
```
GET /admin/webhooks/deadletters/stats
→ Returns: { pending, resolved, ignored, total }

GET /admin/webhooks/deadletters/pending?provider=yellowcard
→ Returns: Array of pending dead-letter entries

POST /admin/webhooks/deadletters/:id/resolve
Body: { resolvedBy, notes }
→ Marks entry as resolved

POST /admin/webhooks/deadletters/:id/ignore
Body: { ignoredBy, reason }
→ Marks entry as ignored

POST /admin/webhooks/deadletters/:id/retry
→ Attempts to reprocess the webhook
→ Returns: { success, message, newStatus }
```

## Event Emissions

The webhook processor emits events for downstream services:

### Deposit Events
```typescript
// For ledger service
this.eventEmitter.emit('webhook.deposit.completed', {
  userId,
  walletId,
  amount,
  currency: 'USDC',
  externalId,
  provider
});

// For notification service
this.eventEmitter.emit('deposit.completed', {
  userId,
  amount,
  currency: 'USDC',
  reference
});
```

### Withdrawal Events
```typescript
// For ledger service (commit transaction)
this.eventEmitter.emit('webhook.withdrawal.completed', {
  userId,
  walletId,
  withdrawalId,
  amount,
  provider
});

// For ledger service (void/refund transaction)
this.eventEmitter.emit('webhook.withdrawal.failed', {
  userId,
  walletId,
  withdrawalId,
  amount,
  reason,
  provider
});
```

### Transfer Events
```typescript
// For transfer service
this.eventEmitter.emit('webhook.transfer.completed', {
  transferId,
  provider: 'circle',
  txHash
});
```

## Error Handling & Reliability

### Dead-Letter Queue Logging
When webhook processing fails, the system:
1. Captures full payload and error context
2. Stores in `webhook_deadletters` table
3. Re-throws error (HTTP 500) so provider retries
4. Admin can investigate and manually retry later

### Retry Mechanism
- Manual retry via admin endpoint
- Increments `retry_count` on each attempt
- Updates `last_retry_at` timestamp
- If retry succeeds, marks as `resolved`
- If retry fails, remains `pending` for further investigation

### Idempotency Protection
- Uses Redis with 24-hour TTL
- Key format: `webhook:processed:{webhookId}`
- Prevents duplicate processing if provider resends
- Graceful degradation if Redis is unavailable

## Repository Methods

### WebhookDeadletterRepository

```typescript
// Create new dead-letter entry
create(data: Partial<WebhookDeadletterOrmEntity>): Promise<WebhookDeadletterOrmEntity>

// Find by ID
findById(id: string): Promise<WebhookDeadletterOrmEntity | null>

// Find with filters
findAll(filters?: { status?, provider? }): Promise<WebhookDeadletterOrmEntity[]>

// Find pending entries
findPending(provider?: string): Promise<WebhookDeadletterOrmEntity[]>

// Find by provider
findByProvider(provider: string): Promise<WebhookDeadletterOrmEntity[]>

// Update entry
update(id: string, data: Partial<WebhookDeadletterOrmEntity>): Promise<void>

// Mark as resolved
markResolved(id: string, resolvedBy: string, notes?: string): Promise<void>

// Mark as ignored
markIgnored(id: string, ignoredBy: string, reason?: string): Promise<void>

// Increment retry count
incrementRetryCount(id: string): Promise<void>

// Get statistics
getStats(): Promise<{ pending, resolved, ignored, total }>

// Cleanup old entries
deleteOldEntries(olderThanDays: number): Promise<number>
```

## Service Methods

### WebhookDeadletterService

```typescript
// Log failed webhook
log(params: LogDeadletterParams): Promise<WebhookDeadletterOrmEntity>

// Find pending entries
findPending(): Promise<WebhookDeadletterOrmEntity[]>

// Find by provider
findByProvider(provider: string): Promise<WebhookDeadletterOrmEntity[]>

// Mark as resolved
resolve(id: string, resolvedBy: string, notes?: string): Promise<void>

// Mark as ignored
ignore(id: string, ignoredBy: string, reason?: string): Promise<void>

// Increment retry count
incrementRetry(id: string): Promise<void>

// Get statistics
getStats(): Promise<{ pending, resolved, ignored, total }>
```

## Files Modified/Created

### Created Files
1. `/src/modules/webhook/infrastructure/repositories/webhook-deadletter.repository.ts` - NEW

### Modified Files
1. `/src/modules/webhook/infrastructure/repositories/index.ts` - Added repository export
2. `/src/modules/webhook/webhook.module.ts` - Added repository to providers and exports

### Existing Files (Already Implemented)
- `/src/modules/webhook/infrastructure/orm-entities/webhook-deadletter.orm-entity.ts`
- `/src/modules/webhook/application/domain/services/webhook-deadletter.service.ts`
- `/src/modules/webhook/application/usecases/process-webhook.use-case.ts`
- `/src/modules/webhook/application/controllers/webhook.controller.ts`
- `/src/modules/webhook/application/controllers/webhook-admin.controller.ts`
- `/src/modules/webhook/application/commands/resolve-deadletter.command.ts`
- `/src/modules/webhook/application/commands/ignore-deadletter.command.ts`
- `/src/modules/webhook/application/commands/retry-deadletter.command.ts`
- `/src/modules/webhook/application/queries/get-deadletter-stats.query.ts`
- `/src/modules/webhook/application/queries/get-pending-deadletters.query.ts`
- `/src/database/migrations/1738400000000-CreateWebhookDeadlettersTable.ts`

## Implementation Status

All requested features have been verified as implemented:

1. ✅ Dead-letter queue entity created with proper schema
2. ✅ Dead-letter repository created with comprehensive methods
3. ✅ Dead-letter service created with all required methods
4. ✅ Idempotency ordering is CORRECT (mark AFTER success, not before)
5. ✅ Withdrawal event handlers implemented (YC withdrawal completed/failed)
6. ✅ Webhook module updated to include all providers and repositories
7. ✅ Build succeeds without errors

## Next Steps (Optional Enhancements)

1. **Add Automated Retry**
   - Implement exponential backoff for automatic retries
   - Configure max retry attempts before requiring manual intervention

2. **Add Monitoring Alerts**
   - Alert when dead-letter queue size exceeds threshold
   - Alert on repeated failures for same event type

3. **Add Batch Operations**
   - Bulk resolve/ignore entries
   - Batch retry by provider or event type

4. **Add Webhook Replay**
   - Ability to replay webhooks from specific time range
   - Useful for recovering from extended outages

5. **Add Rate Limiting**
   - Protect webhook endpoints from abuse
   - Per-provider rate limits

6. **Enable Auth Guards**
   - Uncomment `@UseGuards(JwtAuthGuard, AdminGuard)` in admin controller
   - Restrict admin endpoints to authorized users only
