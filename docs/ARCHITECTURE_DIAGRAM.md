# Architecture Diagrams

## Transaction Export Flow

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ GET /wallet/export/transactions?format=csv&startDate=2026-01-01
       │ Authorization: Bearer <token>
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│                     ExportController                        │
│  - Validates JWT token                                      │
│  - Validates date parameters                                │
│  - Calls ExportTransactionsUseCase                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               ExportTransactionsUseCase                     │
│  - Fetches wallet by userId                                 │
│  - Retrieves transactions with date filter                  │
│  - Formats data as CSV or JSON                              │
│  - Returns formatted data with metadata                     │
└──────────────────┬───────────────────┬──────────────────────┘
                   │                   │
                   ▼                   ▼
         ┌──────────────────┐  ┌──────────────────────┐
         │ WalletRepository │  │ TransactionRepository│
         │                  │  │                      │
         │ findByUserId()   │  │ findByWalletId      │
         │                  │  │   WithDateRange()    │
         └────────┬─────────┘  └─────────┬────────────┘
                  │                      │
                  ▼                      ▼
         ┌─────────────────────────────────────┐
         │           PostgreSQL                │
         │                                     │
         │  wallets table                      │
         │  transactions table                 │
         │    - idx_transactions_wallet_date   │
         └─────────────────────────────────────┘
```

## Load Testing Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      k6 Load Tester                          │
│                                                              │
│  ┌─────────────────┐          ┌─────────────────┐          │
│  │  user-journey.js│          │  stress-test.js │          │
│  │                 │          │                 │          │
│  │ • Balance       │          │ • Random        │          │
│  │ • Transactions  │          │   endpoint      │          │
│  │ • Rates         │          │   selection     │          │
│  │ • Channels      │          │ • High load     │          │
│  │ • KYC Status    │          │ • 300 VUs       │          │
│  └────────┬────────┘          └────────┬────────┘          │
│           │                            │                    │
└───────────┼────────────────────────────┼────────────────────┘
            │                            │
            │ HTTP Requests              │
            ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    USDC Wallet API                          │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   Wallet    │  │ Transaction │  │    Auth     │       │
│  │ Controller  │  │ Controller  │  │ Controller  │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
│         │                │                 │               │
│         ▼                ▼                 ▼               │
│  ┌─────────────────────────────────────────────┐          │
│  │           Use Cases & Services              │          │
│  └──────────────────┬──────────────────────────┘          │
│                     │                                      │
└─────────────────────┼──────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │      PostgreSQL        │
         │                        │
         │  • Connection Pool     │
         │  • Query Performance   │
         │  • Indexes             │
         └────────────────────────┘
```

## Export Data Flow (CSV Format)

```
User Request
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ Input Validation                                        │
│  • Parse startDate, endDate                             │
│  • Validate date range                                  │
│  • Check format parameter                               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Data Retrieval                                          │
│  • Find wallet by userId                                │
│  • Query transactions with date filter                  │
│  • Order by createdAt DESC                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ CSV Generation                                          │
│  • Create header row                                    │
│  • Map transactions to rows                             │
│  • Escape special characters (quotes, commas)           │
│  • Join with newlines                                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Response Preparation                                    │
│  • Set Content-Type: text/csv                           │
│  • Set Content-Disposition: attachment; filename=...    │
│  • Convert to StreamableFile                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
              Browser Download
```

## Service Boundaries

```
┌──────────────────────────────────────────────────────────────┐
│                        API Gateway Layer                     │
│  • Authentication (JWT)                                      │
│  • Rate Limiting                                             │
│  • Request Validation                                        │
└───────────────────────────┬──────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│    Wallet    │   │ Transaction  │   │     User     │
│    Module    │   │    Module    │   │    Module    │
│              │   │              │   │              │
│ • Balance    │   │ • List       │   │ • Auth       │
│ • Deposit    │   │ • Export     │   │ • Profile    │
│ • Transfer   │   │ • Details    │   │ • KYC        │
│ • Export     │   │              │   │              │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
                          ▼
         ┌────────────────────────────┐
         │   Shared Infrastructure    │
         │                            │
         │ • Database (PostgreSQL)    │
         │ • Cache (Redis)            │
         │ • Payment Gateway          │
         │ • File Storage (S3)        │
         └────────────────────────────┘
```

## Database Schema (Relevant Tables)

```
┌─────────────────────────────────────────────────────────┐
│                        users                            │
├─────────────────────────────────────────────────────────┤
│ id (PK)                 UUID                            │
│ phone                   VARCHAR(20) UNIQUE              │
│ created_at              TIMESTAMP                       │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ 1:1
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│                       wallets                           │
├─────────────────────────────────────────────────────────┤
│ id (PK)                 UUID                            │
│ user_id (FK)            UUID → users.id                 │
│ currency                VARCHAR(3)                      │
│ kyc_status              VARCHAR(20)                     │
│ created_at              TIMESTAMP                       │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ 1:N
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│                    transactions                         │
├─────────────────────────────────────────────────────────┤
│ id (PK)                 UUID                            │
│ wallet_id (FK)          UUID → wallets.id               │
│ type                    VARCHAR(50)                     │
│ amount                  DECIMAL(10,2)                   │
│ currency                VARCHAR(3)                      │
│ status                  VARCHAR(20)                     │
│ yellow_card_ref         VARCHAR(255)                    │
│ created_at              TIMESTAMP                       │
│ completed_at            TIMESTAMP                       │
│                                                         │
│ INDEX: idx_transactions_wallet_date                     │
│        (wallet_id, created_at DESC)                     │
└─────────────────────────────────────────────────────────┘
```

## Load Testing Metrics Flow

```
┌──────────────┐
│   k6 Test    │
│   Script     │
└──────┬───────┘
       │
       │ HTTP Requests
       │
       ▼
┌──────────────────────────────────────┐
│         API Server                   │
│  • Process Request                   │
│  • Query Database                    │
│  • Return Response                   │
└──────┬───────────────────────────────┘
       │
       │ Response
       │
       ▼
┌──────────────────────────────────────┐
│     k6 Metrics Collection            │
│  • http_req_duration                 │
│  • http_req_failed                   │
│  • Custom metrics (balance_duration) │
└──────┬───────────────────────────────┘
       │
       │ Aggregation
       │
       ▼
┌──────────────────────────────────────┐
│     Threshold Evaluation             │
│  • p(95) < 500ms ?                   │
│  • Error rate < 1% ?                 │
│  • Pass/Fail                         │
└──────┬───────────────────────────────┘
       │
       │ Results
       │
       ▼
┌──────────────────────────────────────┐
│       Console Output                 │
│  • Summary Statistics                │
│  • Pass/Fail Status                  │
│  • Performance Metrics               │
└──────────────────────────────────────┘
```

## Scaling Considerations

```
┌────────────────────────────────────────────────────────┐
│                   Load Balancer                        │
│              (HAProxy / Nginx / ALB)                   │
└───────────────────┬────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ API Node │  │ API Node │  │ API Node │
│    1     │  │    2     │  │    3     │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     └─────────────┼─────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌──────────────┐      ┌──────────────┐
│  PostgreSQL  │      │    Redis     │
│   Primary    │      │    Cache     │
│              │      │              │
│  Read        │      │  Session     │
│  Replicas    │      │  Data        │
└──────────────┘      └──────────────┘
```

## Export Feature Bottlenecks & Solutions

```
┌─────────────────────────────────────────────────────────┐
│              Potential Bottlenecks                      │
└─────────────────────────────────────────────────────────┘

1. Large Transaction History (10k+ transactions)
   │
   ├─ Solution 1: Implement pagination in CSV export
   ├─ Solution 2: Stream CSV generation
   └─ Solution 3: Background job for large exports

2. Database Query Performance
   │
   ├─ Solution 1: Ensure proper indexes exist
   ├─ Solution 2: Use read replicas for exports
   └─ Solution 3: Add database-level date partitioning

3. Memory Usage (large CSV generation)
   │
   ├─ Solution 1: Use Node.js streams
   ├─ Solution 2: Generate CSV in chunks
   └─ Solution 3: Set row limits with pagination

4. Concurrent Export Requests
   │
   ├─ Solution 1: Implement rate limiting
   ├─ Solution 2: Use queue for export jobs
   └─ Solution 3: Cache recent exports (with TTL)
```

## Security Layers

```
┌──────────────────────────────────────────────────────────┐
│                    Client Request                        │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│ Layer 1: Rate Limiting                                   │
│  • Max requests per IP                                   │
│  • Max requests per user                                 │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│ Layer 2: Authentication (JWT)                            │
│  • Verify token signature                                │
│  • Check token expiration                                │
│  • Extract user ID                                       │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│ Layer 3: Input Validation                                │
│  • Sanitize date inputs                                  │
│  • Validate format parameter                             │
│  • Check date range validity                             │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│ Layer 4: Authorization                                   │
│  • Verify user owns wallet                               │
│  • Check user permissions                                │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│ Layer 5: Data Access Control                             │
│  • Query only user's transactions                        │
│  • No cross-user data leakage                            │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
                ┌──────────┐
                │ Response │
                └──────────┘
```
