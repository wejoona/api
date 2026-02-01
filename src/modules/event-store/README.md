# Event Store Module

Comprehensive event sourcing foundation for critical financial operations in JoonaPay USDC Wallet.

## Overview

This module provides a complete event sourcing infrastructure with:
- **Event Persistence**: Immutable event storage with version control
- **Event Replay**: Replay events to rebuild state or recover from failures
- **Projections**: Build materialized views from event streams
- **Snapshots**: Optimize performance with periodic state snapshots
- **Audit Trail**: Complete audit capability for compliance

## Architecture

```
event-store/
├── domain/                       # Business logic layer
│   ├── entities/                 # Domain entities
│   │   ├── event.entity.ts       # Immutable event
│   │   ├── snapshot.entity.ts    # Point-in-time state
│   │   └── projection.entity.ts  # Materialized view
│   ├── repositories/             # Repository interfaces
│   └── events/                   # Domain events
│
├── infrastructure/               # Implementation details
│   ├── orm-entities/             # TypeORM entities
│   ├── repositories/             # Repository implementations
│   ├── mappers/                  # Domain <-> ORM mappers
│   └── migrations/               # Database migrations
│
└── application/                  # Application layer
    ├── services/                 # Core services
    │   ├── event-store.service.ts
    │   ├── event-replay.service.ts
    │   ├── projection-builder.service.ts
    │   └── projections/          # Projection handlers
    ├── controllers/              # HTTP endpoints
    └── dto/                      # Data transfer objects
```

## Core Concepts

### Events

Immutable facts that represent state changes:

```typescript
const event = await eventStoreService.appendEvent({
  aggregateId: 'wallet-123',
  aggregateType: 'wallet',
  eventType: 'wallet.credited',
  eventData: {
    amount: 1000,
    currency: 'XOF',
    transactionId: 'tx-456',
  },
  metadata: {
    userId: 'user-789',
    ipAddress: '192.168.1.1',
    deviceId: 'device-abc',
  },
  version: 1,
});
```

### Event Stream

All events for a specific aggregate:

```typescript
const events = await eventStoreService.getEventStream(
  'wallet-123',
  'wallet',
  0 // from version
);
```

### Snapshots

Point-in-time state for performance optimization:

```typescript
// Create snapshot every 10 events
const snapshot = await eventStoreService.createSnapshot(
  'wallet-123',
  'wallet',
  10,
  { balance: 5000, currency: 'XOF' }
);

// Retrieve latest snapshot
const latest = await eventStoreService.getLatestSnapshot('wallet-123', 'wallet');
```

### Projections

Materialized views built from event streams:

```typescript
// Register custom projection
@Injectable()
export class MyProjection implements IProjectionHandler {
  readonly projectionName = 'my_projection';
  readonly eventTypes = ['event.type1', 'event.type2'];

  buildInitial(event: Event): Record<string, any> {
    return { /* initial state */ };
  }

  apply(currentData: Record<string, any>, event: Event): Record<string, any> {
    return { /* updated state */ };
  }
}

// Get projection data
const projection = await projectionBuilder.getProjection(
  'transaction_history',
  'wallet-123'
);
```

## Built-in Projections

### 1. Transaction History
Maintains complete transaction history:

```typescript
{
  transactions: [
    {
      id: 'tx-123',
      type: 'transfer',
      status: 'completed',
      amount: 1000,
      currency: 'XOF',
      timestamp: '2024-01-30T...',
    }
  ],
  totalCount: 150,
  totalVolume: 150000,
  byType: { transfer: 100, deposit: 30, withdrawal: 20 },
  byStatus: { completed: 140, failed: 10 }
}
```

### 2. Wallet Balance
Real-time balance tracking:

```typescript
{
  walletId: 'wallet-123',
  balance: 5000,
  currency: 'XOF',
  lastUpdated: '2024-01-30T...',
  version: 45,
  history: [/* last 50 changes */]
}
```

### 3. Audit Trail
Comprehensive audit logs for compliance:

```typescript
{
  aggregateId: 'wallet-123',
  events: [/* all events with metadata */],
  startDate: '2024-01-01T...',
  endDate: '2024-01-30T...',
  eventCount: 150,
  userActions: ['user-1', 'user-2'],
  criticalEvents: 45
}
```

## Event Replay

Replay events for debugging or recovery:

```typescript
// Replay all events for an aggregate
await eventReplayService.replayAggregate(
  'wallet-123',
  'wallet',
  0,  // from version
  50  // to version (optional)
);

// Replay by time range
await eventReplayService.replayByTimeRange(
  new Date('2024-01-01'),
  new Date('2024-01-31'),
  'wallet' // optional aggregate type filter
);

// Replay by correlation ID (distributed transaction)
await eventReplayService.replayByCorrelationId('correlation-123');
```

## State Rebuilding

Rebuild aggregate state from events:

```typescript
// From scratch
const state = await eventReplayService.rebuildAggregateState(
  'wallet-123',
  'wallet',
  { balance: 0 }, // initial state
  (state, event) => {
    // Apply event logic
    if (event.eventType === 'wallet.credited') {
      return { balance: state.balance + event.eventData.amount };
    }
    return state;
  }
);

// From snapshot + events
const state = await eventReplayService.rebuildAggregateStateFromSnapshot(
  'wallet-123',
  'wallet',
  (state, event) => { /* apply logic */ }
);
```

## API Endpoints

### Events

```http
# Append event
POST /event-store/events
{
  "aggregateId": "wallet-123",
  "aggregateType": "wallet",
  "eventType": "wallet.credited",
  "eventData": { "amount": 1000 },
  "metadata": {},
  "version": 1
}

# Get event stream
GET /event-store/events/aggregate?aggregateId=wallet-123&aggregateType=wallet

# Get events by type
GET /event-store/events/type?eventType=wallet.credited&limit=100

# Get events by correlation
GET /event-store/events/correlation/{correlationId}

# Get events by time range
GET /event-store/events/time-range?startTime=2024-01-01&endTime=2024-01-31

# Get latest event
GET /event-store/events/aggregate/{aggregateId}/{aggregateType}/latest

# Get event count
GET /event-store/events/aggregate/{aggregateId}/{aggregateType}/count
```

### Snapshots

```http
# Get latest snapshot
GET /event-store/snapshots/{aggregateId}/{aggregateType}/latest
```

### Projections

```http
# Get projection
GET /event-store/projections?projectionName=transaction_history&aggregateId=wallet-123

# Get all projections by name
GET /event-store/projections/{projectionName}/all

# Rebuild projection
POST /event-store/projections/rebuild
{
  "projectionName": "transaction_history",
  "aggregateId": "wallet-123",
  "aggregateType": "wallet"
}
```

### Replay

```http
# Replay events
POST /event-store/replay
{
  "aggregateId": "wallet-123",
  "aggregateType": "wallet",
  "fromVersion": 0,
  "toVersion": 50
}
```

## Usage Examples

### 1. Recording Financial Transactions

```typescript
// In your transaction service
async createTransfer(dto: CreateTransferDto) {
  const version = await eventStoreService.getAggregateVersion(
    dto.walletId,
    'wallet'
  );

  await eventStoreService.appendEvent({
    aggregateId: dto.walletId,
    aggregateType: 'wallet',
    eventType: 'wallet.debited',
    eventData: {
      amount: dto.amount,
      currency: 'XOF',
      transferId: dto.transferId,
    },
    metadata: {
      userId: dto.userId,
      ipAddress: dto.ipAddress,
    },
    version: version + 1,
    correlationId: dto.requestId,
  });
}
```

### 2. Listening to Events

```typescript
@Injectable()
export class TransactionListener {
  @OnEvent('wallet.debited')
  async handleWalletDebited(event: Event) {
    // Update projection
    await projectionBuilder.updateProjection('wallet_balance', event);

    // Send notification
    await notificationService.send(event.userId, {
      type: 'transaction',
      data: event.eventData,
    });
  }
}
```

### 3. Compliance Auditing

```typescript
// Get complete audit trail
const auditTrail = await projectionBuilder.getProjection(
  'audit_trail',
  'wallet-123'
);

// Get all events for a user action
const events = await eventStoreService.getEventsByCorrelationId(
  'request-id-123'
);
```

## Database Schema

### Events Table

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  aggregate_id UUID NOT NULL,
  aggregate_type VARCHAR(100) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  metadata JSONB NOT NULL,
  version INTEGER NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  user_id UUID,
  correlation_id UUID,
  causation_id UUID,
  UNIQUE (aggregate_id, aggregate_type, version)
);

CREATE INDEX idx_events_aggregate ON events(aggregate_id, aggregate_type);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_correlation ON events(correlation_id);
CREATE INDEX idx_events_timestamp ON events(timestamp);
```

### Snapshots Table

```sql
CREATE TABLE snapshots (
  id UUID PRIMARY KEY,
  aggregate_id UUID NOT NULL,
  aggregate_type VARCHAR(100) NOT NULL,
  version INTEGER NOT NULL,
  state JSONB NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  UNIQUE (aggregate_id, aggregate_type, version)
);
```

### Projections Table

```sql
CREATE TABLE projections (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  aggregate_id UUID,
  aggregate_type VARCHAR(100),
  data JSONB NOT NULL,
  last_event_id UUID NOT NULL,
  last_event_version INTEGER NOT NULL,
  last_processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (name, aggregate_id)
);
```

## Performance Considerations

### Indexing Strategy

All critical queries are indexed:
- Aggregate lookups: `(aggregate_id, aggregate_type)`
- Version control: `(aggregate_id, aggregate_type, version)`
- Event type queries: `(event_type)`
- Distributed tracing: `(correlation_id)`
- Time-based queries: `(timestamp)`

### Snapshot Strategy

- Create snapshots every 10 events (configurable)
- Reduces replay time for long event streams
- Rebuild state from snapshot + remaining events

### Projection Updates

- Update projections asynchronously via event listeners
- Batch projection updates for better performance
- Rebuild projections during off-peak hours

## Scaling Considerations

### Horizontal Scaling

- **Read replicas**: Event queries can use read replicas
- **Partitioning**: Partition events table by aggregate_type or timestamp
- **Caching**: Cache frequently accessed projections

### Write Scaling

- **Batch writes**: Use `appendEvents()` for multiple events
- **Async processing**: Projections update asynchronously
- **Event versioning**: Optimistic concurrency control prevents conflicts

### Data Retention

- Archive old events to separate table/storage
- Keep projections and snapshots for active aggregates
- Implement data retention policies per compliance requirements

## Security

### Access Control

- Event append: Internal services only
- Event queries: Admin users or specific roles
- Projection access: Based on aggregate ownership

### Data Privacy

- Sensitive data in `eventData` should be encrypted
- Metadata tracks user actions for audit
- PII should follow data retention policies

## Testing

```typescript
describe('EventStoreService', () => {
  it('should append event with correct version', async () => {
    const event = await eventStoreService.appendEvent({
      aggregateId: 'test-123',
      aggregateType: 'wallet',
      eventType: 'wallet.created',
      eventData: { balance: 0 },
      metadata: {},
      version: 1,
    });

    expect(event.version).toBe(1);
    expect(event.aggregateId).toBe('test-123');
  });

  it('should prevent version conflicts', async () => {
    // Append version 1
    await eventStoreService.appendEvent({ /* ... */ version: 1 });

    // Try to append version 1 again
    await expect(
      eventStoreService.appendEvent({ /* ... */ version: 1 })
    ).rejects.toThrow(ConflictException);
  });
});
```

## Migration

Run the migration to create tables:

```bash
npm run migration:run
```

## Integration

Add to `app.module.ts`:

```typescript
import { EventStoreModule } from './modules/event-store/event-store.module';

@Module({
  imports: [
    // ... other modules
    EventStoreModule,
  ],
})
export class AppModule {}
```

## Best Practices

1. **Event Naming**: Use past tense (`wallet.credited` not `wallet.credit`)
2. **Immutability**: Never modify events once stored
3. **Version Control**: Always increment version sequentially
4. **Correlation IDs**: Use for distributed tracing
5. **Metadata**: Include context for audit (userId, IP, device)
6. **Projections**: Keep them simple and focused
7. **Snapshots**: Balance frequency with storage costs
8. **Testing**: Test event handlers and projections thoroughly

## Troubleshooting

### Version Conflicts

If you get version conflicts, ensure:
- You're fetching the latest version before appending
- No concurrent writes to the same aggregate
- Using optimistic locking correctly

### Projection Out of Sync

If projections are outdated:
1. Check event listeners are running
2. Rebuild projection: `POST /event-store/projections/rebuild`
3. Verify event ordering

### Performance Issues

If queries are slow:
1. Check indexes are created
2. Consider snapshot strategy
3. Partition large event streams
4. Use projection caching

## License

Internal use only - JoonaPay
