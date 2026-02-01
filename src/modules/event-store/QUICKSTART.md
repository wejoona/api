# Event Store - Quick Start Guide

Get started with event sourcing in 5 minutes.

## Installation

### 1. Run Migration

```bash
cd usdc-wallet
npm run migration:run
```

### 2. Add Module to App

```typescript
// src/app.module.ts
import { EventStoreModule } from './modules/event-store';

@Module({
  imports: [
    // ... other modules
    EventStoreModule,
  ],
})
export class AppModule {}
```

## Basic Usage

### 1. Append Events

```typescript
import { EventStoreService } from '@/modules/event-store';

@Injectable()
export class WalletService {
  constructor(private readonly eventStore: EventStoreService) {}

  async creditWallet(walletId: string, amount: number) {
    // Get current version
    const version = await this.eventStore.getAggregateVersion(
      walletId,
      'wallet'
    );

    // Append event
    await this.eventStore.appendEvent({
      aggregateId: walletId,
      aggregateType: 'wallet',
      eventType: 'wallet.credited',
      eventData: {
        amount,
        currency: 'XOF',
        timestamp: new Date(),
      },
      metadata: {
        userId: 'current-user-id',
      },
      version: version + 1,
    });
  }
}
```

### 2. Listen to Events

```typescript
import { OnEvent } from '@nestjs/event-emitter';
import { Event } from '@/modules/event-store';

@Injectable()
export class WalletEventListener {
  @OnEvent('wallet.wallet.credited')
  async handleWalletCredited(event: Event) {
    console.log('Wallet credited:', event.eventData.amount);
    // Update projections, send notifications, etc.
  }
}
```

### 3. Query Events

```typescript
// Get all events for a wallet
const events = await eventStore.getEventStream('wallet-123', 'wallet');

// Get latest event
const latest = await eventStore.getLatestEvent('wallet-123', 'wallet');

// Get events by type
const credits = await eventStore.getEventsByType('wallet.credited');

// Get events by time range
const todayEvents = await eventStore.getEventsByTimeRange(
  new Date('2024-01-30T00:00:00'),
  new Date('2024-01-30T23:59:59'),
  'wallet'
);
```

### 4. Use Projections

```typescript
import { ProjectionBuilderService } from '@/modules/event-store';

@Injectable()
export class WalletQueryService {
  constructor(private readonly projectionBuilder: ProjectionBuilderService) {}

  async getWalletBalance(walletId: string) {
    const projection = await this.projectionBuilder.getProjection(
      'wallet_balance',
      walletId
    );
    return projection?.data;
  }

  async getTransactionHistory(walletId: string) {
    const projection = await this.projectionBuilder.getProjection(
      'transaction_history',
      walletId
    );
    return projection?.data;
  }
}
```

### 5. Replay Events

```typescript
import { EventReplayService } from '@/modules/event-store';

@Injectable()
export class DebugService {
  constructor(private readonly replayService: EventReplayService) {}

  async debugWallet(walletId: string) {
    // Replay all events
    await this.replayService.replayAggregate(walletId, 'wallet');
  }
}
```

## Create Custom Projection

```typescript
import { Injectable } from '@nestjs/common';
import { IProjectionHandler, Event } from '@/modules/event-store';

@Injectable()
export class MyCustomProjection implements IProjectionHandler {
  readonly projectionName = 'my_custom_projection';
  readonly eventTypes = ['wallet.credited', 'wallet.debited'];

  buildInitial(event: Event): Record<string, any> {
    return {
      totalCredits: event.eventType === 'wallet.credited' ? 1 : 0,
      totalDebits: event.eventType === 'wallet.debited' ? 1 : 0,
      lastActivity: event.timestamp,
    };
  }

  apply(currentData: Record<string, any>, event: Event): Record<string, any> {
    return {
      totalCredits: currentData.totalCredits +
        (event.eventType === 'wallet.credited' ? 1 : 0),
      totalDebits: currentData.totalDebits +
        (event.eventType === 'wallet.debited' ? 1 : 0),
      lastActivity: event.timestamp,
    };
  }
}
```

Register in module:

```typescript
// In event-store.module.ts
@Module({
  providers: [
    // ... existing providers
    MyCustomProjection,
  ],
})
export class EventStoreModule {
  constructor(
    private readonly projectionBuilder: ProjectionBuilderService,
    private readonly myCustomProjection: MyCustomProjection,
  ) {
    // Register custom projection
    this.projectionBuilder.registerHandler(this.myCustomProjection);
  }
}
```

## Event Naming Convention

```typescript
// Format: {aggregate}.{action_past_tense}

// Good
'wallet.created'
'wallet.credited'
'wallet.debited'
'transaction.completed'
'transaction.failed'
'user.verified'

// Bad
'wallet.create'      // Use past tense
'credit_wallet'      // Use dot notation
'WALLET_CREDITED'    // Use lowercase
```

## API Examples

### Append Event

```bash
curl -X POST http://localhost:3000/event-store/events \
  -H "Content-Type: application/json" \
  -d '{
    "aggregateId": "wallet-123",
    "aggregateType": "wallet",
    "eventType": "wallet.credited",
    "eventData": { "amount": 1000, "currency": "XOF" },
    "metadata": { "userId": "user-123" },
    "version": 1
  }'
```

### Get Events

```bash
# Get event stream
curl "http://localhost:3000/event-store/events/aggregate?aggregateId=wallet-123&aggregateType=wallet"

# Get by type
curl "http://localhost:3000/event-store/events/type?eventType=wallet.credited&limit=10"

# Get projection
curl "http://localhost:3000/event-store/projections?projectionName=wallet_balance&aggregateId=wallet-123"
```

### Replay Events

```bash
curl -X POST http://localhost:3000/event-store/replay \
  -H "Content-Type: application/json" \
  -d '{
    "aggregateId": "wallet-123",
    "aggregateType": "wallet",
    "fromVersion": 0
  }'
```

### Rebuild Projection

```bash
curl -X POST http://localhost:3000/event-store/projections/rebuild \
  -H "Content-Type: application/json" \
  -d '{
    "projectionName": "wallet_balance",
    "aggregateId": "wallet-123",
    "aggregateType": "wallet"
  }'
```

## Common Patterns

### 1. Record Transaction

```typescript
async recordTransaction(tx: Transaction) {
  const version = await this.eventStore.getAggregateVersion(
    tx.id,
    'transaction'
  );

  await this.eventStore.appendEvents([
    {
      aggregateId: tx.id,
      aggregateType: 'transaction',
      eventType: 'transaction.created',
      eventData: { /* tx data */ },
      metadata: { /* metadata */ },
      version: version + 1,
    },
    {
      aggregateId: tx.walletId,
      aggregateType: 'wallet',
      eventType: 'wallet.debited',
      eventData: { amount: tx.amount },
      metadata: { transactionId: tx.id },
      version: version + 2,
      correlationId: tx.id, // Link events together
    },
  ]);
}
```

### 2. Audit Trail

```typescript
async getAuditTrail(aggregateId: string) {
  const events = await this.eventStore.getEventStream(
    aggregateId,
    'transaction'
  );

  return events.map(e => ({
    timestamp: e.timestamp,
    action: e.eventType,
    user: e.metadata.userId,
    data: e.eventData,
  }));
}
```

### 3. State Reconstruction

```typescript
async rebuildWalletState(walletId: string) {
  const events = await this.eventStore.getEventStream(
    walletId,
    'wallet'
  );

  let balance = 0;
  for (const event of events) {
    if (event.eventType === 'wallet.credited') {
      balance += event.eventData.amount;
    } else if (event.eventType === 'wallet.debited') {
      balance -= event.eventData.amount;
    }
  }

  return { walletId, balance };
}
```

## Testing

```typescript
describe('Event Store', () => {
  let eventStore: EventStoreService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [EventStoreModule],
    }).compile();

    eventStore = module.get(EventStoreService);
  });

  it('should append event', async () => {
    const event = await eventStore.appendEvent({
      aggregateId: 'test-123',
      aggregateType: 'test',
      eventType: 'test.created',
      eventData: { value: 'test' },
      metadata: {},
      version: 1,
    });

    expect(event.version).toBe(1);
  });
});
```

## Next Steps

1. Read full [README.md](./README.md) for detailed documentation
2. Check [examples](./examples/) folder for more patterns
3. Implement custom projections for your use case
4. Set up event listeners for side effects
5. Configure snapshot strategy for performance

## Need Help?

- Check README.md for full documentation
- Look at examples/transaction-event-sourcing.example.ts
- Review built-in projections in application/services/projections/

## Common Issues

**Q: Version conflict errors**
A: Ensure you're fetching latest version before appending

**Q: Projections out of sync**
A: Rebuild projection: POST /event-store/projections/rebuild

**Q: Slow queries**
A: Check indexes are created, use snapshots, cache projections

**Q: Event not triggering listener**
A: Verify event name format: `{aggregateType}.{eventType}`
