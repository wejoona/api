# Admin Dashboard Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend (React/Vue)                        │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Dashboard   │  │   Charts     │  │  Real-time   │              │
│  │   Stats      │  │  (ApexChart) │  │   Updates    │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                  │                  │                       │
└─────────┼──────────────────┼──────────────────┼───────────────────────┘
          │                  │                  │
          │   HTTP GET       │                  │
          │   /admin/dashboard/enhanced?days=30 │
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        NestJS Backend                                │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │              AdminController                                │    │
│  │  @Get('dashboard/enhanced')                                 │    │
│  │  - JWT Auth Guard                                           │    │
│  │  - Roles Guard (admin)                                      │    │
│  │  - Rate Limiting                                            │    │
│  └─────────────────────┬──────────────────────────────────────┘    │
│                        │                                             │
│                        ▼                                             │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │              AdminService                                   │    │
│  │  getEnhancedDashboardStats(days)                           │    │
│  │                                                             │    │
│  │  1. Check Redis Cache ────────┐                            │    │
│  │     Cache Key: admin:dashboard:enhanced:30                 │    │
│  │     TTL: 60 seconds            │                            │    │
│  │                                │                            │    │
│  │  2. If cache miss:             ▼                            │    │
│  │     ┌─────────────────────────────────┐                    │    │
│  │     │  Parallel Query Execution       │                    │    │
│  │     │  (Promise.all)                  │                    │    │
│  │     │                                 │                    │    │
│  │     │  ├─ getUserStats()              │                    │    │
│  │     │  ├─ getTransactionStats()       │                    │    │
│  │     │  ├─ getTransactionTimeSeries()  │                    │    │
│  │     │  ├─ getUserGrowthTimeSeries()   │                    │    │
│  │     │  ├─ getTransactionCountByType() │                    │    │
│  │     │  └─ getTransactionCountByStatus()                    │    │
│  │     └─────────────────────────────────┘                    │    │
│  │                                                             │    │
│  │  3. Aggregate results                                      │    │
│  │  4. Store in cache                                         │    │
│  │  5. Return to client                                       │    │
│  └─────────────┬──────────────────┬────────────────────┬──────┘    │
│                │                  │                    │             │
│                ▼                  ▼                    ▼             │
│  ┌──────────────────┐  ┌───────────────────┐  ┌─────────────┐     │
│  │  UserRepository  │  │ TransactionRepo   │  │ CacheManager│     │
│  │                  │  │                   │  │             │     │
│  │  - count()       │  │ - getStats()      │  │ - get()     │     │
│  │  - queryBuilder()│  │ - getTimeSeries() │  │ - set()     │     │
│  └─────────┬────────┘  └─────────┬─────────┘  │ - del()     │     │
│            │                     │             └──────┬──────┘     │
│            │                     │                    │             │
└────────────┼─────────────────────┼────────────────────┼─────────────┘
             │                     │                    │
             ▼                     ▼                    ▼
┌────────────────────────────────────────────────────────────────────┐
│                      Data Layer                                     │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │   PostgreSQL     │  │   PostgreSQL     │  │     Redis       │  │
│  │   users table    │  │ transactions tbl │  │   Key-Value     │  │
│  │                  │  │                  │  │     Store       │  │
│  │  Indexes:        │  │  Indexes:        │  │                 │  │
│  │  - id (PK)       │  │  - id (PK)       │  │  Cache Keys:    │  │
│  │  - status        │  │  - status        │  │  - dashboard:*  │  │
│  │  - kycStatus     │  │  - walletId      │  │                 │  │
│  │  - createdAt     │  │  - createdAt     │  │  TTL: 60s       │  │
│  └──────────────────┘  └──────────────────┘  └─────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

## Request Flow Diagram

```
┌─────────┐
│ Client  │
└────┬────┘
     │
     │ 1. GET /admin/dashboard/enhanced?days=30
     │    Authorization: Bearer <token>
     ▼
┌──────────────┐
│   Nginx      │  2. Forward to NestJS
│  (Optional)  │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│  ThrottlerGuard      │  3. Check rate limit
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  JwtAuthGuard        │  4. Validate JWT token
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  RolesGuard          │  5. Check admin role
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  AdminController                      │
│  getDashboard(days: 30)              │  6. Extract query params
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  AdminService                         │
│  getEnhancedDashboardStats(30)       │
└──────┬───────────────────────────────┘
       │
       │ 7. Check cache
       ▼
┌──────────────────────┐
│  Redis Cache         │
│  Key: admin:dashboard:enhanced:30    │
└──────┬───────────────┘
       │
       ├─────────────┐
       │ Cache Hit   │ Cache Miss
       │             │
       ▼             ▼
┌──────────┐   ┌─────────────────────────┐
│  Return  │   │ Execute Parallel Queries│
│  Cached  │   │                         │
│  Data    │   │ ┌────────────────────┐  │
│          │   │ │ Users Stats        │  │
│  ~2ms    │   │ │ - 5 COUNT queries  │  │
│          │   │ └────────────────────┘  │
│          │   │                         │
│          │   │ ┌────────────────────┐  │
│          │   │ │ Transaction Stats  │  │
│          │   │ │ - Aggregations     │  │
│          │   │ │ - GROUP BY queries │  │
│          │   │ └────────────────────┘  │
│          │   │                         │
│          │   │ ┌────────────────────┐  │
│          │   │ │ Time Series        │  │
│          │   │ │ - Daily groups     │  │
│          │   │ └────────────────────┘  │
│          │   │                         │
│          │   │ ~150ms                  │
│          │   └──────┬──────────────────┘
│          │          │
│          │          │ 8. Aggregate results
│          │          ▼
│          │   ┌─────────────┐
│          │   │ Store in    │
│          │   │ Redis Cache │
│          │   │ TTL: 60s    │
│          │   └──────┬──────┘
│          │          │
└──────────┴──────────┘
           │
           │ 9. Return JSON response
           ▼
┌──────────────────────┐
│  Client receives:    │
│  {                   │
│    totalUsers: ...,  │
│    totalTransactions: ...,  │
│    transactionTimeSeries: [...],  │
│    userGrowthTimeSeries: [...]    │
│  }                   │
└──────────────────────┘
```

## Database Query Execution Plan

### User Statistics (Parallel Execution)

```
Query 1: Total Users
┌─────────────────────┐
│ SELECT COUNT(*)     │
│ FROM users          │
└─────────────────────┘
Index: Sequential Scan (small table) or Index-Only Scan

Query 2-5: Filtered Counts
┌─────────────────────────────┐
│ SELECT COUNT(*)             │
│ FROM users                  │
│ WHERE status = 'active'     │
└─────────────────────────────┘
Index: idx_users_status (Index Scan)
```

### Transaction Statistics (Parallel Execution)

```
Query 6: Status Distribution
┌──────────────────────────────────┐
│ SELECT                           │
│   status,                        │
│   COUNT(*) as count              │
│ FROM transactions                │
│ GROUP BY status                  │
└──────────────────────────────────┘
Index: idx_transactions_status (Index Scan + Aggregate)

Query 7: Total Volume
┌──────────────────────────────────┐
│ SELECT                           │
│   SUM(ABS(amount)) as total      │
│ FROM transactions                │
│ WHERE status = 'completed'       │
└──────────────────────────────────┘
Index: idx_transactions_status (Index Scan + Aggregate)

Query 8: Today's Volume
┌──────────────────────────────────┐
│ SELECT                           │
│   SUM(ABS(amount)) as total      │
│ FROM transactions                │
│ WHERE status = 'completed'       │
│   AND created_at >= '2026-01-25' │
└──────────────────────────────────┘
Index: idx_transactions_created_at (Index Scan + Filter + Aggregate)
```

### Time Series Queries

```
Transaction Time Series (30 days)
┌──────────────────────────────────────────┐
│ SELECT                                   │
│   DATE(created_at) as date,              │
│   COUNT(*) as count,                     │
│   SUM(CASE WHEN status = 'completed'     │
│       THEN ABS(amount) ELSE 0 END)       │
│       as volume                          │
│ FROM transactions                        │
│ WHERE created_at >= NOW() - INTERVAL '30 days'  │
│ GROUP BY DATE(created_at)                │
│ ORDER BY date ASC                        │
└──────────────────────────────────────────┘
Index: idx_transactions_created_at
Query Plan: Index Scan → Group Aggregate → Sort

User Growth Time Series (30 days)
┌──────────────────────────────────────────┐
│ SELECT                                   │
│   DATE(created_at) as date,              │
│   COUNT(*) as new_users                  │
│ FROM users                               │
│ WHERE created_at >= NOW() - INTERVAL '30 days'  │
│ GROUP BY DATE(created_at)                │
│ ORDER BY date ASC                        │
└──────────────────────────────────────────┘
Index: idx_users_created_at
Query Plan: Index Scan → Group Aggregate → Sort
```

## Caching Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                     Cache Architecture                       │
│                                                              │
│  Cache Key Strategy:                                         │
│  ┌────────────────────────────────────────────────┐         │
│  │ admin:dashboard:stats           (basic stats)  │         │
│  │ admin:dashboard:enhanced:7      (7-day data)   │         │
│  │ admin:dashboard:enhanced:30     (30-day data)  │         │
│  │ admin:dashboard:enhanced:90     (90-day data)  │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  Cache Population:                                           │
│  ┌────────────────────────────────────────────────┐         │
│  │ 1. Client requests data                        │         │
│  │ 2. Check if key exists in Redis                │         │
│  │ 3. If miss:                                     │         │
│  │    - Query database                             │         │
│  │    - Store in Redis with TTL                    │         │
│  │ 4. Return data                                  │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  Cache Invalidation:                                         │
│  ┌────────────────────────────────────────────────┐         │
│  │ Automatic:                                      │         │
│  │ - TTL expires after 60 seconds                  │         │
│  │                                                 │         │
│  │ Manual:                                         │         │
│  │ - POST /admin/dashboard/cache/invalidate        │         │
│  │ - Deletes all dashboard cache keys              │         │
│  │                                                 │         │
│  │ Event-based (future):                           │         │
│  │ - On transaction completion                     │         │
│  │ - On user creation                              │         │
│  │ - On bulk operations                            │         │
│  └────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## Performance Characteristics

```
┌──────────────────────────────────────────────────────────────┐
│                    Response Time Breakdown                    │
│                                                               │
│  Cache Hit (Hot Path):                                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Request → Auth → Cache Lookup → Response                │  │
│  │   1ms     2ms        1ms          1ms                   │  │
│  │                                                          │  │
│  │ Total: ~5ms                                              │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  Cache Miss (Cold Path):                                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Request → Auth → DB Queries → Cache Store → Response    │  │
│  │   1ms     2ms      100-150ms       2ms        1ms       │  │
│  │                                                          │  │
│  │ Total: ~110-160ms                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  Database Query Breakdown (Parallel):                         │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ User Stats (5 queries):          20-30ms               │  │
│  │ Transaction Stats (3 queries):   30-50ms               │  │
│  │ Time Series (2 queries):         40-70ms               │  │
│  │ Type/Status counts (2 queries):  10-20ms               │  │
│  │                                                          │  │
│  │ Total (executed in parallel):    40-70ms               │  │
│  │ (limited by slowest query)                              │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Scalability Considerations

```
┌─────────────────────────────────────────────────────────────┐
│                     Scaling Strategy                         │
│                                                              │
│  Current Load Capacity:                                      │
│  ┌────────────────────────────────────────────────┐         │
│  │ Concurrent Users: ~500 admins                  │         │
│  │ Cache Hit Rate: 95%+ (60s TTL)                 │         │
│  │ Avg Response Time: 10ms                        │         │
│  │ Peak QPS: 100 requests/sec                     │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  Bottleneck Analysis:                                        │
│  ┌────────────────────────────────────────────────┐         │
│  │ 1. Database (on cache miss)                    │         │
│  │    - Mitigated by caching                      │         │
│  │    - Further: Read replicas                    │         │
│  │                                                 │         │
│  │ 2. Redis (on high traffic)                     │         │
│  │    - Current: Single instance                  │         │
│  │    - Future: Redis Cluster                     │         │
│  │                                                 │         │
│  │ 3. NestJS instances                            │         │
│  │    - Horizontally scalable                     │         │
│  │    - Load balancer distribution                │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  Future Optimizations:                                       │
│  ┌────────────────────────────────────────────────┐         │
│  │ - Materialized views for aggregations          │         │
│  │ - Background job to pre-warm cache             │         │
│  │ - WebSocket for real-time updates              │         │
│  │ - Database read replicas                       │         │
│  │ - CDN caching for static time ranges           │         │
│  └────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                           │
│                                                              │
│  Layer 1: Network                                            │
│  ┌────────────────────────────────────────────────┐         │
│  │ - HTTPS/TLS encryption                         │         │
│  │ - Firewall rules                               │         │
│  │ - DDoS protection (CloudFlare/AWS Shield)      │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  Layer 2: Rate Limiting                                      │
│  ┌────────────────────────────────────────────────┐         │
│  │ - ThrottlerGuard (global)                      │         │
│  │ - 100 requests/minute per IP                   │         │
│  │ - Configurable per endpoint                    │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  Layer 3: Authentication                                     │
│  ┌────────────────────────────────────────────────┐         │
│  │ - JWT token validation                         │         │
│  │ - Token expiration: 24 hours                   │         │
│  │ - Refresh token rotation                       │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  Layer 4: Authorization                                      │
│  ┌────────────────────────────────────────────────┐         │
│  │ - Role-based access control (RBAC)             │         │
│  │ - @Roles('admin') decorator                    │         │
│  │ - Minimum privilege principle                  │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  Layer 5: Data Security                                      │
│  ┌────────────────────────────────────────────────┐         │
│  │ - Parameterized queries (no SQL injection)     │         │
│  │ - Input validation/sanitization                │         │
│  │ - Audit logging of all admin actions           │         │
│  └────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## Monitoring & Observability

```
Recommended Monitoring Stack:

┌─────────────────────────────────────────────────────────────┐
│  Metrics to Track:                                           │
│                                                              │
│  Application Metrics:                                        │
│  - Cache hit/miss ratio                                      │
│  - Average response time                                     │
│  - Request rate (QPS)                                        │
│  - Error rate (4xx, 5xx)                                     │
│                                                              │
│  Database Metrics:                                           │
│  - Query execution time                                      │
│  - Connection pool usage                                     │
│  - Slow queries (>100ms)                                     │
│  - Transaction throughput                                    │
│                                                              │
│  Redis Metrics:                                              │
│  - Memory usage                                              │
│  - Cache hit rate                                            │
│  - Key eviction rate                                         │
│  - Connection count                                          │
│                                                              │
│  Business Metrics:                                           │
│  - Dashboard views per day                                   │
│  - Peak usage times                                          │
│  - Most requested time ranges                                │
│                                                              │
│  Tools:                                                      │
│  - Prometheus (metrics collection)                           │
│  - Grafana (visualization)                                   │
│  - New Relic / DataDog (APM)                                 │
│  - ELK Stack (logging)                                       │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
Production Environment:

┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌──────────────┐                                           │
│  │ Load Balancer│  (AWS ALB / Nginx)                        │
│  └──────┬───────┘                                           │
│         │                                                    │
│    ┌────┴────┐                                              │
│    │         │                                              │
│  ┌─▼─┐     ┌─▼─┐                                            │
│  │App│     │App│  NestJS Instances (Auto-scaling)          │
│  │ 1 │     │ 2 │                                            │
│  └─┬─┘     └─┬─┘                                            │
│    │         │                                              │
│    └────┬────┘                                              │
│         │                                                    │
│    ┌────┴────────┐                                          │
│    │             │                                          │
│  ┌─▼──────┐  ┌──▼────┐                                      │
│  │ Redis  │  │  RDS  │  (Primary + Read Replica)           │
│  │Cluster │  │ PostgreSQL                                   │
│  └────────┘  └───────┘                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

This architecture ensures:
- High availability
- Horizontal scalability
- Low latency responses
- Data consistency
- Fault tolerance
