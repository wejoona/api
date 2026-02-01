# Event Store Architecture

Complete technical architecture for the event sourcing foundation.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Event Store Module                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────┐    ┌────────────────┐    ┌──────────────┐  │
│  │   Event Store  │    │ Event Replay   │    │  Projection  │  │
│  │    Service     │───▶│    Service     │───▶│   Builder    │  │
│  └────────────────┘    └────────────────┘    └──────────────┘  │
│          │                      │                     │          │
│          ▼                      ▼                     ▼          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │            EventStoreRepository (Interface)                │ │
│  └────────────────────────────────────────────────────────────┘ │
│          │                                                        │
│          ▼                                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │        TypeOrmEventStoreRepository (Implementation)        │ │
│  └────────────────────────────────────────────────────────────┘ │
│          │                                                        │
│          ▼                                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  PostgreSQL Database                       │ │
│  │    ┌─────────┐   ┌───────────┐   ┌─────────────┐         │ │
│  │    │ Events  │   │ Snapshots │   │ Projections │         │ │
│  │    └─────────┘   └───────────┘   └─────────────┘         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Layer Architecture

### 1. Domain Layer (`domain/`)

Pure business logic with no framework dependencies.

```
domain/
├── entities/
│   ├── event.entity.ts          # Immutable event record
│   ├── snapshot.entity.ts       # Aggregate state snapshot
│   └── projection.entity.ts     # Materialized view
│
├── repositories/
│   ├── event-store.repository.ts     # Event persistence interface
│   └── projection.repository.ts      # Projection storage interface
│
├── events/
│   └── event-store.events.ts    # Domain events for event store itself
│
└── value-objects/
    └── (future: EventMetadata, AggregateId, etc.)
```

**Key Principles:**
- Immutability: Events never change once created
- Framework-agnostic: No NestJS or TypeORM dependencies
- Type-safe: Full TypeScript type definitions

### 2. Application Layer (`application/`)

Business use cases and orchestration.

```
application/
├── services/
│   ├── event-store.service.ts        # Main event store operations
│   ├── event-replay.service.ts       # Event replay & state rebuild
│   ├── projection-builder.service.ts # Projection management
│   │
│   └── projections/                  # Built-in projection handlers
│       ├── transaction-history.projection.ts
│       ├── wallet-balance.projection.ts
│       └── audit-trail.projection.ts
│
├── controllers/
│   └── event-store.controller.ts     # HTTP API endpoints
│
└── dto/
    ├── append-event.dto.ts           # Input validation
    ├── replay-events.dto.ts
    ├── get-events.dto.ts
    └── rebuild-projection.dto.ts
```

**Responsibilities:**
- Coordinate between domain and infrastructure
- Handle business workflows
- Manage transactions
- Emit domain events

### 3. Infrastructure Layer (`infrastructure/`)

Framework-specific implementations.

```
infrastructure/
├── orm-entities/
│   ├── event.orm-entity.ts      # TypeORM event entity
│   ├── snapshot.orm-entity.ts   # TypeORM snapshot entity
│   └── projection.orm-entity.ts # TypeORM projection entity
│
├── repositories/
│   ├── typeorm-event-store.repository.ts    # PostgreSQL implementation
│   └── typeorm-projection.repository.ts     # Projection storage
│
├── mappers/
│   ├── event.mapper.ts          # Domain ↔ ORM conversion
│   ├── snapshot.mapper.ts
│   └── projection.mapper.ts
│
└── migrations/
    └── create-event-store-tables.migration.ts
```

**Responsibilities:**
- Database persistence (TypeORM)
- External service integrations
- Framework-specific implementations

## Data Flow

### Event Append Flow

```
Client Request
    │
    ▼
EventStoreController.appendEvent()
    │
    ▼
EventStoreService.appendEvent()
    │
    ├─▶ Event.create() (Domain Entity)
    │
    ├─▶ EventStoreRepository.append()
    │       │
    │       ├─▶ EventMapper.toOrmEntity()
    │       ├─▶ TypeORM.save()
    │       └─▶ EventMapper.toDomain()
    │
    ├─▶ EventEmitter.emit('aggregate.event')
    │       │
    │       └─▶ EventListeners (update projections, send notifications)
    │
    └─▶ Return Event
```

### Event Replay Flow

```
Replay Request
    │
    ▼
EventReplayService.replayAggregate()
    │
    ├─▶ EventStoreRepository.getEventsByAggregate()
    │       │
    │       └─▶ Query events from DB
    │
    ├─▶ Emit events
    │       │
    │       └─▶ EventEmitter.emit() for each event
    │
    └─▶ Return events
```

### Projection Update Flow

```
Event Emitted
    │
    ▼
EventListener.handleEvent()
    │
    ▼
ProjectionBuilderService.updateProjection()
    │
    ├─▶ Get projection handler
    │
    ├─▶ ProjectionRepository.findByName()
    │
    ├─▶ Handler.apply(currentData, event)
    │       │
    │       └─▶ Build new projection data
    │
    ├─▶ Projection.update()
    │
    └─▶ ProjectionRepository.save()
```

### State Rebuild Flow

```
Rebuild Request
    │
    ▼
EventReplayService.rebuildAggregateState()
    │
    ├─▶ Get latest snapshot (optional)
    │       │
    │       └─▶ EventStoreRepository.getLatestSnapshot()
    │
    ├─▶ Get events after snapshot
    │       │
    │       └─▶ EventStoreRepository.getEventsByAggregate(fromVersion)
    │
    ├─▶ Apply events to state
    │       │
    │       └─▶ state = applyEvent(state, event) for each event
    │
    └─▶ Return final state
```

## Database Schema

### Events Table

```sql
┌─────────────────────────────────────────────────┐
│                     events                      │
├─────────────────┬──────────────┬────────────────┤
│ Column          │ Type         │ Constraints    │
├─────────────────┼──────────────┼────────────────┤
│ id              │ UUID         │ PRIMARY KEY    │
│ aggregate_id    │ UUID         │ NOT NULL       │
│ aggregate_type  │ VARCHAR(100) │ NOT NULL       │
│ event_type      │ VARCHAR(100) │ NOT NULL       │
│ event_data      │ JSONB        │ NOT NULL       │
│ metadata        │ JSONB        │ NOT NULL       │
│ version         │ INTEGER      │ NOT NULL       │
│ timestamp       │ TIMESTAMP    │ DEFAULT NOW()  │
│ user_id         │ UUID         │ NULLABLE       │
│ correlation_id  │ UUID         │ NULLABLE       │
│ causation_id    │ UUID         │ NULLABLE       │
└─────────────────┴──────────────┴────────────────┘

Indexes:
- UNIQUE (aggregate_id, aggregate_type, version)
- INDEX (aggregate_id, aggregate_type)
- INDEX (event_type)
- INDEX (correlation_id)
- INDEX (timestamp)
```

**Design Decisions:**
- **JSONB for flexibility**: Event data schema can evolve
- **Version-based ordering**: Ensures event sequence integrity
- **Composite unique constraint**: Prevents duplicate versions
- **Correlation ID**: Enables distributed tracing

### Snapshots Table

```sql
┌─────────────────────────────────────────────────┐
│                   snapshots                     │
├─────────────────┬──────────────┬────────────────┤
│ Column          │ Type         │ Constraints    │
├─────────────────┼──────────────┼────────────────┤
│ id              │ UUID         │ PRIMARY KEY    │
│ aggregate_id    │ UUID         │ NOT NULL       │
│ aggregate_type  │ VARCHAR(100) │ NOT NULL       │
│ version         │ INTEGER      │ NOT NULL       │
│ state           │ JSONB        │ NOT NULL       │
│ timestamp       │ TIMESTAMP    │ DEFAULT NOW()  │
└─────────────────┴──────────────┴────────────────┘

Indexes:
- UNIQUE (aggregate_id, aggregate_type, version)
- INDEX (aggregate_id, aggregate_type)
```

**Purpose:**
- Store aggregate state at specific version
- Optimize replay (snapshot + remaining events)
- Reduce computation for long event streams

### Projections Table

```sql
┌─────────────────────────────────────────────────┐
│                  projections                    │
├──────────────────┬──────────────┬───────────────┤
│ Column           │ Type         │ Constraints   │
├──────────────────┼──────────────┼───────────────┤
│ id               │ UUID         │ PRIMARY KEY   │
│ name             │ VARCHAR(100) │ NOT NULL      │
│ aggregate_id     │ UUID         │ NULLABLE      │
│ aggregate_type   │ VARCHAR(100) │ NULLABLE      │
│ data             │ JSONB        │ NOT NULL      │
│ last_event_id    │ UUID         │ NOT NULL      │
│ last_event_ver   │ INTEGER      │ NOT NULL      │
│ last_processed   │ TIMESTAMP    │ NOT NULL      │
│ created_at       │ TIMESTAMP    │ DEFAULT NOW() │
│ updated_at       │ TIMESTAMP    │ DEFAULT NOW() │
└──────────────────┴──────────────┴───────────────┘

Indexes:
- UNIQUE (name, aggregate_id)
- INDEX (name)
- INDEX (last_event_version)
```

**Purpose:**
- Store materialized views
- Track last processed event
- Enable fast queries without event replay

## Event Processing

### Synchronous Flow

```
┌──────────────┐
│ Client       │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Append Event         │ ← Synchronous (waits for DB write)
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Save to Events Table │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Emit Domain Event    │ ← Fire-and-forget
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Return to Client     │
└──────────────────────┘
```

### Asynchronous Flow (Event Listeners)

```
┌──────────────────────┐
│ Domain Event Emitted │
└──────┬───────────────┘
       │
       ├─▶ Update Projections (async)
       │
       ├─▶ Send Notifications (async)
       │
       ├─▶ Update Analytics (async)
       │
       └─▶ Trigger Webhooks (async)
```

## Concurrency Control

### Optimistic Locking

Events use version-based optimistic concurrency control:

```typescript
// Thread 1
const v1 = await getAggregateVersion('wallet-123', 'wallet'); // v1 = 5
await appendEvent({ version: v1 + 1 }); // Success: version 6

// Thread 2 (concurrent)
const v2 = await getAggregateVersion('wallet-123', 'wallet'); // v2 = 5
await appendEvent({ version: v2 + 1 }); // Error: version 6 already exists
```

**Unique constraint prevents conflicts:**
```sql
UNIQUE (aggregate_id, aggregate_type, version)
```

### Retry Strategy

```typescript
async function appendEventWithRetry(event, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Get latest version
      const version = await getAggregateVersion();
      event.version = version + 1;

      // Attempt append
      return await appendEvent(event);
    } catch (error) {
      if (error instanceof ConflictException && i < maxRetries - 1) {
        // Retry with new version
        continue;
      }
      throw error;
    }
  }
}
```

## Performance Optimization

### 1. Indexing Strategy

```sql
-- Fast aggregate lookup
CREATE INDEX idx_events_aggregate ON events(aggregate_id, aggregate_type);

-- Fast event type queries
CREATE INDEX idx_events_type ON events(event_type);

-- Distributed tracing
CREATE INDEX idx_events_correlation ON events(correlation_id);

-- Time-based queries
CREATE INDEX idx_events_timestamp ON events(timestamp);
```

### 2. Snapshot Strategy

```typescript
// Create snapshot every N events (e.g., 10)
if (event.version % 10 === 0) {
  const state = await rebuildState(aggregateId);
  await createSnapshot(aggregateId, event.version, state);
}

// Rebuild from snapshot
const snapshot = await getLatestSnapshot(aggregateId);
const events = await getEventsByAggregate(aggregateId, snapshot.version + 1);
const state = applyEvents(snapshot.state, events);
```

### 3. Projection Caching

```typescript
// Cache frequently accessed projections
const projection = await cache.getOrSet(
  `projection:${name}:${aggregateId}`,
  () => projectionRepository.findByName(name, aggregateId),
  { ttl: 60 } // 60 seconds
);
```

### 4. Batch Processing

```typescript
// Batch event appends
await eventStore.appendEvents([
  { /* event 1 */ },
  { /* event 2 */ },
  { /* event 3 */ },
]);
```

## Scalability

### Horizontal Scaling

```
┌─────────────────────────────────────────────┐
│              Load Balancer                  │
└─────────────┬───────────────────────────────┘
              │
    ┌─────────┼─────────┬──────────┐
    │         │         │          │
    ▼         ▼         ▼          ▼
┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐
│ API │   │ API │   │ API │   │ API │
│  1  │   │  2  │   │  3  │   │  4  │
└──┬──┘   └──┬──┘   └──┬──┘   └──┬──┘
   │         │         │          │
   └─────────┴─────────┴──────────┘
              │
              ▼
    ┌─────────────────────┐
    │   PostgreSQL        │
    │   (with replicas)   │
    └─────────────────────┘
```

**Read Scaling:**
- Use read replicas for event queries
- Cache projections in Redis
- Serve projections from read-only nodes

**Write Scaling:**
- Partition by aggregate_type
- Shard by aggregate_id hash
- Use connection pooling

### Data Partitioning

```sql
-- Partition by aggregate type
CREATE TABLE events_wallet PARTITION OF events
  FOR VALUES IN ('wallet');

CREATE TABLE events_transaction PARTITION OF events
  FOR VALUES IN ('transaction');

-- Partition by time (for archival)
CREATE TABLE events_2024_01 PARTITION OF events
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

## Monitoring & Observability

### Key Metrics

```typescript
// Event throughput
metrics.counter('event_store.events_appended', { aggregate_type });

// Event replay performance
metrics.histogram('event_store.replay_duration', duration);

// Projection lag
metrics.gauge('event_store.projection_lag', lastEventVersion - currentVersion);

// Error rates
metrics.counter('event_store.append_errors', { error_type });
```

### Logging

```typescript
logger.log({
  event: 'event_appended',
  aggregateId,
  aggregateType,
  eventType,
  version,
  correlationId,
});
```

### Tracing

```typescript
// Distributed tracing via correlation IDs
const correlationId = generateUuid();

await appendEvent({
  // ... event data
  correlationId, // Links related events
});

// Query all events in distributed transaction
const relatedEvents = await getEventsByCorrelationId(correlationId);
```

## Security

### Access Control

```typescript
// Only internal services can append events
@Controller('event-store')
@UseGuards(InternalServiceGuard)
export class EventStoreController {
  @Post('events')
  async appendEvent() { }
}

// Admin-only access to replay
@UseGuards(AdminGuard)
@Post('replay')
async replay() { }
```

### Data Encryption

```typescript
// Encrypt sensitive event data
eventData: {
  ssn: encrypt(user.ssn),
  accountNumber: encrypt(user.accountNumber),
  amount: user.amount, // Non-sensitive
}
```

### Audit Logging

```typescript
// All event operations are logged
@Injectable()
export class EventStoreAuditLogger {
  @OnEvent('event_store.event_appended')
  async logEventAppend(event: EventAppendedEvent) {
    await auditLog.create({
      action: 'event_append',
      userId: event.event.userId,
      timestamp: new Date(),
      details: { eventType: event.event.eventType },
    });
  }
}
```

## Disaster Recovery

### Backup Strategy

```bash
# Daily full backup
pg_dump -Fc usdc_wallet > backup_$(date +%Y%m%d).dump

# Continuous archiving (WAL)
archive_mode = on
archive_command = 'cp %p /archive/%f'
```

### Point-in-Time Recovery

```typescript
// Replay events up to specific timestamp
const events = await getEventsByTimeRange(
  new Date('2024-01-01'),
  new Date('2024-01-30T12:00:00'),
);
```

### Event Versioning

```typescript
// Support multiple event versions
interface WalletCreditedEventV1 {
  amount: number;
}

interface WalletCreditedEventV2 {
  amount: number;
  currency: string; // Added field
}

// Upcaster
function upcast(event: Event): Event {
  if (event.eventData.version === 1) {
    return {
      ...event,
      eventData: {
        ...event.eventData,
        currency: 'XOF', // Default for v1 events
        version: 2,
      },
    };
  }
  return event;
}
```

## Best Practices

1. **Immutability**: Never modify events
2. **Versioning**: Always increment version sequentially
3. **Idempotency**: Handle duplicate events gracefully
4. **Metadata**: Include rich context (user, IP, device)
5. **Correlation**: Link related events via correlation_id
6. **Testing**: Test event handlers and projections
7. **Monitoring**: Track event throughput and lag
8. **Documentation**: Document event schemas

## Future Enhancements

- [ ] Event schema registry
- [ ] Event versioning/migration tools
- [ ] Saga pattern support
- [ ] Dead letter queue for failed events
- [ ] Event compaction
- [ ] Multi-tenant support
- [ ] GraphQL subscriptions for real-time events
- [ ] Event sourcing debugger UI
