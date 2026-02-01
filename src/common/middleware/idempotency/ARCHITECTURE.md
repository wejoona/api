# Idempotency Middleware - Architecture

## System Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Application                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Idempotency Key Generator                              │   │
│  │  - UUIDv4 generation                                     │   │
│  │  - Key persistence (localStorage/database)               │   │
│  │  - Retry logic with exponential backoff                  │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTP Request
                             │ Header: Idempotency-Key: <uuid>
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway / Load Balancer                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NestJS Application Instance                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Security Headers Middleware                             │   │
│  │  - Request ID generation                                 │   │
│  │  - Security headers                                      │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Idempotency Middleware  ◄─────────────────────────┐    │   │
│  │                                                      │    │   │
│  │  ┌──────────────────────────────────────────────┐  │    │   │
│  │  │ 1. Key Extraction & Validation               │  │    │   │
│  │  │    - Extract from header                     │  │    │   │
│  │  │    - Validate format (16-255 chars)          │  │    │   │
│  │  │    - Check excluded routes                   │  │    │   │
│  │  └──────────────────────────────────────────────┘  │    │   │
│  │                       │                             │    │   │
│  │                       ▼                             │    │   │
│  │  ┌──────────────────────────────────────────────┐  │    │   │
│  │  │ 2. Storage Lookup                            │  │    │   │
│  │  │    - Query Redis for existing record         │  │    │   │
│  │  └────────────────┬─────────────────────────────┘  │    │   │
│  │                   │                                 │    │   │
│  │       ┌───────────┴─────────┐                      │    │   │
│  │       │                     │                      │    │   │
│  │   Found                 Not Found                  │    │   │
│  │       │                     │                      │    │   │
│  │       ▼                     ▼                      │    │   │
│  │  ┌─────────────┐   ┌──────────────────────────┐  │    │   │
│  │  │ 3a. Process │   │ 3b. New Request Handler  │  │    │   │
│  │  │  Existing   │   │                           │  │    │   │
│  │  │             │   │  - Acquire distributed   │  │    │   │
│  │  │ - Validate  │   │    lock (Redis SETNX)    │  │    │   │
│  │  │   fingerprint│   │  - Create PROCESSING    │  │    │   │
│  │  │ - Check     │   │    record                │  │    │   │
│  │  │   status    │   │  - Generate fingerprint  │  │    │   │
│  │  │ - Return    │   │  - Set TTL expiration    │  │    │   │
│  │  │   cached    │   │                           │  │    │   │
│  │  │   response  │   │  Continue to controller  │  │    │   │
│  │  └─────────────┘   └──────────────────────────┘  │    │   │
│  │                                 │                 │    │   │
│  └─────────────────────────────────┼─────────────────┘    │   │
│                                    │                       │   │
│                                    ▼                       │   │
│  ┌─────────────────────────────────────────────────────┐  │   │
│  │  Auth Guard (JWT)                                    │  │   │
│  │  - Verify JWT token                                  │  │   │
│  │  - Extract user context                              │  │   │
│  └──────────────────────┬───────────────────────────────┘  │   │
│                         │                                   │   │
│                         ▼                                   │   │
│  ┌─────────────────────────────────────────────────────┐   │   │
│  │  Idempotency Guard (Optional)                        │   │   │
│  │  - Check @Idempotent decorator                       │   │   │
│  │  - Enforce required key if specified                 │   │   │
│  └──────────────────────┬───────────────────────────────┘   │   │
│                         │                                    │   │
│                         ▼                                    │   │
│  ┌─────────────────────────────────────────────────────┐    │   │
│  │  Controller                                          │    │   │
│  │  @Idempotent({ required: true })                     │    │   │
│  │  async createTransfer(...)                           │    │   │
│  └──────────────────────┬───────────────────────────────┘    │   │
│                         │                                     │   │
│                         ▼                                     │   │
│  ┌─────────────────────────────────────────────────────┐     │   │
│  │  Use Case / Service Layer                            │     │   │
│  │  - Business logic execution                          │     │   │
│  │  - Database operations                               │     │   │
│  │  - External API calls                                │     │   │
│  └──────────────────────┬───────────────────────────────┘     │   │
│                         │                                      │   │
│                         │ Response                             │   │
│                         │                                      │   │
│  ┌──────────────────────▼──────────────────────────────┐      │   │
│  │  Response Interceptor (in Middleware)               │      │   │
│  │                                                      │◄─────┘   │
│  │  - Intercept res.send()                             │          │
│  │  - Store response in Redis                          │          │
│  │  - Update status to COMPLETED/FAILED                │          │
│  │  - Release distributed lock                         │          │
│  └──────────────────────┬──────────────────────────────┘          │
│                         │                                          │
└─────────────────────────┼──────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Redis Cache                              │
│                                                                  │
│  Keys:                                                           │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ idempotency:{key}                                       │    │
│  │ {                                                       │    │
│  │   "key": "550e8400-e29b-41d4-a716-446655440000",       │    │
│  │   "status": "COMPLETED",                               │    │
│  │   "statusCode": 201,                                   │    │
│  │   "responseBody": { ... },                             │    │
│  │   "fingerprint": "sha256-hash",                        │    │
│  │   "createdAt": "2024-01-30T10:00:00Z",                │    │
│  │   "expiresAt": "2024-01-31T10:00:00Z"                 │    │
│  │ }                                                       │    │
│  │ TTL: 86400 seconds (24 hours)                          │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ idempotency:lock:{key}                                  │    │
│  │ Value: timestamp                                        │    │
│  │ TTL: 300 seconds (5 minutes - processing timeout)      │    │
│  └────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. New Request Flow

```
Client → Middleware → Redis
   |         |          |
   |    Check key       |
   |         |          |
   |    Key not found ──┘
   |         |
   |    Acquire lock
   |         |
   |    Create PROCESSING record
   |         |
   |    ✓ Continue to controller
   |         |
   |    Execute business logic
   |         |
   |    Generate response
   |         |
   |    Intercept response
   |         |
   |    Store in Redis (COMPLETED)
   |         |
   |    Release lock
   |         |
   └─────── Return to client
```

### 2. Retry Flow (Completed)

```
Client → Middleware → Redis
   |         |          |
   |    Check key       |
   |         |          |
   |    Key found ──────┘
   |         |
   |    Status: COMPLETED
   |         |
   |    Validate fingerprint
   |         |
   |    Return cached response
   |         |
   └─────── (No controller execution)
```

### 3. Concurrent Request Flow

```
Client A ──┐
           ├──→ Middleware → Redis
Client B ──┘       |          |
                   |     Check key
                   |          |
            Both arrive at same time
                   |
        ┌──────────┴──────────┐
        │                     │
    Client A              Client B
        │                     │
   Acquire lock          Lock failed
        │                     │
   Create record        Return 409 Conflict
        │                     │
   Process request       (Retry later)
        │
   Complete & store
        │
   Release lock
```

## State Machine

### Idempotency Record States

```
                    ┌─────────────┐
                    │   NO KEY    │
                    │  (Initial)  │
                    └──────┬──────┘
                           │
                           │ Lock acquired
                           │ Record created
                           ▼
                    ┌─────────────┐
        ┌───────────│ PROCESSING  │
        │           └──────┬──────┘
        │                  │
        │                  ├──────────┐
        │                  │          │
        │             Success      Failure
        │                  │          │
        │                  ▼          ▼
        │           ┌──────────┐  ┌───────┐
        │           │COMPLETED │  │FAILED │
        │           └──────────┘  └───────┘
        │                  │          │
        │                  └────┬─────┘
        │                       │
        │                   TTL expires
        │                       │
        │                       ▼
        │                  ┌─────────┐
        │                  │ DELETED │
        │                  └─────────┘
        │
        │ Timeout (5 min)
        │
        └─────→ Allow retry (delete key)
```

## Security Architecture

### 1. Request Fingerprinting

```
Fingerprint = SHA256(
  method +
  path +
  userId +
  SHA256(body - excluded_fields)
)

Excluded fields:
- timestamp
- nonce
- requestId
- clientTimestamp
```

### 2. Distributed Locking

```
Lock Key: idempotency:lock:{idempotency-key}
Lock TTL: 300 seconds (processing timeout)

Acquire: Redis SETNX (atomic operation)
Release: Redis DEL

If lock exists:
  → Return 409 Conflict
  → Client retries with exponential backoff

If processing timeout exceeded:
  → Lock auto-expires
  → New attempt allowed
```

### 3. Replay Attack Prevention

```
Request 1:
  Key: abc123
  Body: { amount: 100, recipientId: "user-1" }
  Fingerprint: hash-1
  ✓ Allowed

Request 2 (Replay Attack):
  Key: abc123 (same)
  Body: { amount: 10000, recipientId: "attacker" }
  Fingerprint: hash-2 (different)
  ✗ Rejected: Fingerprint mismatch
```

## Scaling Considerations

### Horizontal Scaling

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Instance 1 │     │  Instance 2 │     │  Instance 3 │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                           │ Shared state
                           │
                    ┌──────▼──────┐
                    │    Redis    │
                    │  (Clustered) │
                    └─────────────┘

All instances share:
- Idempotency records
- Distributed locks
- No instance-local state
```

### Redis Clustering

```
┌─────────────────────────────────────────┐
│          Redis Cluster                   │
│                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │ Master 1 │  │ Master 2 │  │Master 3││
│  │ Slots:   │  │ Slots:   │  │Slots:  ││
│  │ 0-5460   │  │5461-10922│  │10923-  ││
│  │          │  │          │  │16383   ││
│  └────┬─────┘  └────┬─────┘  └───┬────┘│
│       │             │             │     │
│  ┌────▼─────┐  ┌───▼──────┐ ┌────▼───┐│
│  │ Replica 1│  │Replica 2 │ │Replica3││
│  └──────────┘  └──────────┘ └────────┘│
└─────────────────────────────────────────┘

Hash slot calculation:
  slot = CRC16(idempotency-key) mod 16384

Benefits:
- High availability
- Automatic failover
- Data sharding
```

## Performance Characteristics

### Time Complexity

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Key lookup | O(1) | Redis GET |
| Lock acquire | O(1) | Redis SETNX |
| Lock release | O(1) | Redis DEL |
| Record store | O(1) | Redis SET |
| Fingerprint gen | O(n) | n = body size |

### Space Complexity

```
Per request record:
  Key: ~50 bytes (idempotency key)
  Value: ~1-10 KB (depending on response size)

With 1M requests/day:
  Storage: 1-10 GB/day
  With 24h TTL: 1-10 GB total
  With 7d TTL: 7-70 GB total

Recommendation:
  - Use short TTLs (24h) for most operations
  - Don't store response bodies for large responses
  - Set up Redis memory limits with LRU eviction
```

### Latency Impact

```
Without idempotency:
  Request → Controller → Response
  ~50ms

With idempotency (cache miss):
  Request → Redis lookup (1ms) → Lock acquire (1ms)
  → Controller → Response intercept → Redis store (1ms)
  → Release lock (1ms)
  ~54ms (+4ms overhead)

With idempotency (cache hit):
  Request → Redis lookup (1ms) → Return cached response
  ~1ms (99% faster)
```

## Failure Modes

### 1. Redis Unavailable

```
Strategy: Fail-open
  - Log error
  - Continue without idempotency
  - Don't block requests

Rationale:
  - Availability > Perfect idempotency
  - Rare Redis failures shouldn't break API
```

### 2. Processing Timeout

```
Scenario: Request stuck in PROCESSING state

Detection:
  - Check createdAt timestamp
  - If > processingTimeout → Timed out

Recovery:
  - Delete stuck record
  - Allow new processing attempt
  - Log for investigation
```

### 3. Lock Not Released

```
Scenario: Instance crashes before releasing lock

Protection:
  - Lock has TTL (5 minutes)
  - Auto-expires even if not released
  - New requests can proceed after expiry
```

## Monitoring & Observability

### Key Metrics

```
# Request metrics
idempotency_requests_total{status="new|cached|processing"}
idempotency_cache_hit_rate
idempotency_processing_duration_seconds

# Error metrics
idempotency_timeouts_total
idempotency_fingerprint_mismatches_total
idempotency_lock_failures_total

# Storage metrics
idempotency_redis_operations_total{operation="get|set|del"}
idempotency_record_size_bytes
```

### Logging

```json
{
  "level": "info",
  "timestamp": "2024-01-30T10:00:00Z",
  "message": "Idempotency cache hit",
  "context": {
    "key": "550e8400-...",
    "userId": "user-123",
    "path": "/api/v1/transfers",
    "cached": true,
    "originalCreatedAt": "2024-01-30T09:50:00Z"
  }
}
```

## License

Proprietary - JoonaPay 2024
