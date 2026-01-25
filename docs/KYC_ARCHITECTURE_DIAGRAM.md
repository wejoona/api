# KYC & Liveness Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Mobile/Web Client                         │
│                                                                     │
│  ┌────────────────────┐              ┌─────────────────────────┐  │
│  │  Document Capture  │              │  Liveness Detection UI  │  │
│  │  - ID Front/Back   │              │  - Challenge Display    │  │
│  │  - Selfie Photo    │              │  - Video Capture        │  │
│  └─────────┬──────────┘              └──────────┬──────────────┘  │
└────────────┼────────────────────────────────────┼──────────────────┘
             │ HTTPS                              │ HTTPS
             │ multipart/form-data                │ JSON
             │                                    │
┌────────────▼────────────────────────────────────▼──────────────────┐
│                        NestJS Application                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    API Gateway Layer                         │  │
│  │  ┌──────────────────────┐   ┌───────────────────────────┐  │  │
│  │  │ JWT Auth Guard       │   │  Rate Limiter             │  │  │
│  │  │ - Verify token       │   │  - Global throttling      │  │  │
│  │  │ - Extract user ID    │   │  - Per-endpoint limits    │  │  │
│  │  └──────────────────────┘   └───────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Controller Layer                          │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │                                                               │  │
│  │  ┌────────────────────┐          ┌──────────────────────┐   │  │
│  │  │ KycUploadController│          │ LivenessController   │   │  │
│  │  │                    │          │                      │   │  │
│  │  │ POST /kyc/         │          │ POST /liveness/      │   │  │
│  │  │   documents        │          │   start              │   │  │
│  │  │                    │          │                      │   │  │
│  │  │ POST /kyc/         │          │ POST /liveness/      │   │  │
│  │  │   documents/single │          │   challenge          │   │  │
│  │  │                    │          │                      │   │  │
│  │  │ Validation:        │          │ POST /liveness/      │   │  │
│  │  │ - File types       │          │   complete           │   │  │
│  │  │ - File sizes (5MB) │          │                      │   │  │
│  │  │ - Required fields  │          │ GET /liveness/       │   │  │
│  │  │                    │          │   :sessionId         │   │  │
│  │  └─────────┬──────────┘          └──────────┬───────────┘   │  │
│  └────────────┼─────────────────────────────────┼───────────────┘  │
│               │                                 │                  │
│  ┌────────────▼─────────────────────────────────▼───────────────┐  │
│  │                     Service Layer                            │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────────────────────┐    │  │
│  │  │           UploadService                             │    │  │
│  │  │                                                      │    │  │
│  │  │  Methods:                                            │    │  │
│  │  │  • uploadDocument(userId, type, file)               │    │  │
│  │  │  • getSignedUrl(key)                                │    │  │
│  │  │  • deleteDocument(key)                              │    │  │
│  │  │                                                      │    │  │
│  │  │  Processing:                                         │    │  │
│  │  │  1. Validate file (type, size)                      │    │  │
│  │  │  2. Process with Sharp                              │    │  │
│  │  │     - Resize: 1200x1200                             │    │  │
│  │  │     - Compress: 85% JPEG                            │    │  │
│  │  │  3. Upload to S3                                    │    │  │
│  │  │  4. Generate signed URL                             │    │  │
│  │  └──────────────────┬───────────────────────────────────┘    │  │
│  │                     │                                        │  │
│  │  ┌──────────────────▼──────────────────────────────────┐    │  │
│  │  │           LivenessService                           │    │  │
│  │  │                                                      │    │  │
│  │  │  Methods:                                            │    │  │
│  │  │  • startSession(userId)                             │    │  │
│  │  │  • submitChallenge(sessionId, challengeId, frame)   │    │  │
│  │  │  • completeSession(sessionId)                       │    │  │
│  │  │  • getSessionStatus(sessionId)                      │    │  │
│  │  │                                                      │    │  │
│  │  │  Session Management:                                │    │  │
│  │  │  • Generate 2-3 random challenges                   │    │  │
│  │  │  • Store in Map (sessionId → LivenessSession)      │    │  │
│  │  │  • Expiry: 5 minutes                                │    │  │
│  │  │  • Per-challenge expiry: 30 seconds                 │    │  │
│  │  │                                                      │    │  │
│  │  │  Mock Verification:                                 │    │  │
│  │  │  • 95% pass rate                                    │    │  │
│  │  │  • Confidence: 70-100 (pass), 0-69 (fail)          │    │  │
│  │  │  • Risk signal detection                            │    │  │
│  │  └──────────────────┬───────────────────────────────────┘    │  │
│  └───────────────────────┼───────────────────────────────────────┘  │
└──────────────────────────┼───────────────────────────────────────────┘
                           │
          ┌────────────────┴─────────────────┐
          │                                  │
┌─────────▼──────────┐          ┌───────────▼────────────┐
│     AWS S3         │          │   In-Memory Storage    │
│                    │          │                        │
│ Bucket Structure:  │          │ Map<sessionId, {...}>  │
│ kyc/               │          │                        │
│  ├─ {userId}/      │          │ Session Data:          │
│  │  ├─ id_front-   │          │ • sessionId            │
│  │  │    {ts}.jpg  │          │ • userId               │
│  │  ├─ id_back-    │          │ • challenges[]         │
│  │  │    {ts}.jpg  │          │ • completedChallenges[]│
│  │  └─ selfie-     │          │ • status               │
│  │       {ts}.jpg  │          │ • createdAt            │
│                    │          │ • expiresAt            │
│ Access:            │          │                        │
│ • Signed URLs      │          │ Cleanup:               │
│ • 1 hour expiry    │          │ • Auto-delete expired  │
│ • Private bucket   │          │ • Periodic sweep       │
└────────────────────┘          └────────────────────────┘
```

## Data Flow Diagrams

### Document Upload Flow

```
┌────────┐                                                      ┌────────┐
│ Client │                                                      │   S3   │
└───┬────┘                                                      └───▲────┘
    │                                                               │
    │ 1. POST /kyc/documents                                        │
    │    (multipart/form-data)                                      │
    ├──────────────────────────────────────────────────┐            │
    │                                                  │            │
    │                                        ┌─────────▼────────┐   │
    │                                        │ KycUploadCtrl    │   │
    │                                        │                  │   │
    │                                        │ 2. Validate:     │   │
    │                                        │    - Auth (JWT)  │   │
    │                                        │    - File types  │   │
    │                                        │    - File sizes  │   │
    │                                        │    - Required    │   │
    │                                        └─────────┬────────┘   │
    │                                                  │            │
    │                                        ┌─────────▼────────┐   │
    │                                        │ UploadService    │   │
    │                                        │                  │   │
    │                                        │ 3. Process:      │   │
    │                                        │    - Sharp resize│   │
    │                                        │    - Compress    │   │
    │                                        │    - Gen key     │   │
    │                                        └─────────┬────────┘   │
    │                                                  │            │
    │                                                  │ 4. Upload  │
    │                                                  ├────────────┤
    │                                                  │            │
    │                                        ┌─────────▼────────┐   │
    │                                        │ Get Signed URL   │   │
    │ 5. Response:                           └─────────┬────────┘   │
    │    {                                             │            │
    │      success: true,                              │            │
    │      documents: {                                │            │
    │        idFront: { key, uploaded },               │            │
    │        idBack: { key, uploaded },                │            │
    │        selfie: { key, uploaded }                 │            │
    │      }                                            │            │
    │    }                                              │            │
    │◄──────────────────────────────────────────────────┘            │
    │                                                                │
```

### Liveness Verification Flow

```
┌────────┐                                              ┌───────────┐
│ Client │                                              │  Service  │
└───┬────┘                                              └─────▲─────┘
    │                                                         │
    │ 1. POST /liveness/start                                 │
    ├─────────────────────────────────────────────────────────┤
    │                                                         │
    │ 2. Generate 2-3 challenges                              │
    │    Create session (Map storage)                         │
    │◄────────────────────────────────────────────────────────┤
    │ {                                                       │
    │   sessionId, currentChallenge,                          │
    │   totalChallenges, expiresAt                            │
    │ }                                                       │
    │                                                         │
    ├─ LOOP for each challenge ─────────────────────────────┐ │
    │                                                        │ │
    │ 3. POST /liveness/challenge                            │ │
    │    { sessionId, challengeId, videoFrameBase64 }        │ │
    ├────────────────────────────────────────────────────────┼─┤
    │                                                        │ │
    │ 4. Validate & Score                                    │ │
    │    - Check expiry                                      │ │
    │    - Verify order                                      │ │
    │    - Mock detection (95% pass)                         │ │
    │    - Calculate confidence                              │ │
    │◄───────────────────────────────────────────────────────┼─┤
    │ {                                                      │ │
    │   passed, confidence,                                  │ │
    │   nextChallenge,                                       │ │
    │   sessionComplete                                      │ │
    │ }                                                      │ │
    │                                                        │ │
    ├─ END LOOP ────────────────────────────────────────────┘ │
    │                                                         │
    │ 5. POST /liveness/complete                              │
    │    { sessionId }                                        │
    ├─────────────────────────────────────────────────────────┤
    │                                                         │
    │ 6. Calculate final result                               │
    │    - All passed? → isLive: true                         │
    │    - Avg confidence                                     │
    │    - Detect risk signals                                │
    │◄────────────────────────────────────────────────────────┤
    │ {                                                       │
    │   sessionId, userId, isLive,                            │
    │   confidence, challenges[],                             │
    │   status, completedAt                                   │
    │ }                                                       │
    │                                                         │
```

## Module Dependencies

```
┌────────────────────────────────────────────────────────────┐
│                      App Module                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ WalletModule │  │ UploadModule │  │LivenessModule│    │
│  │              │  │              │  │              │    │
│  │ • KYC Upload │  │ • S3 Service │  │ • Liveness   │    │
│  │   Controller │  │ • Sharp      │  │   Service    │    │
│  │              │  │   Processing │  │ • Session    │    │
│  │              │  │              │  │   Management │    │
│  └──────┬───────┘  └──────────────┘  └──────────────┘    │
│         │                                                 │
│         │ imports                                         │
│         ▼                                                 │
│  ┌──────────────┐                                         │
│  │ UploadModule │                                         │
│  └──────────────┘                                         │
│                                                            │
│  Global:                                                  │
│  • ConfigModule                                           │
│  • TypeOrmModule                                          │
│  • CacheModule (Redis)                                    │
│  • ThrottlerModule                                        │
│  • JwtAuthGuard                                           │
└────────────────────────────────────────────────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                   Security Stack                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: Network                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • HTTPS/TLS 1.3                                     │   │
│  │ • Rate Limiting (ThrottlerGuard)                    │   │
│  │ • CORS configuration                                │   │
│  │ • Helmet.js security headers                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Layer 2: Authentication                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • JWT token validation (JwtAuthGuard)               │   │
│  │ • User ID extraction from token                     │   │
│  │ • Token expiry checks                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Layer 3: Authorization                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • User ownership validation                         │   │
│  │ • Session belongs to user check                     │   │
│  │ • Resource access control                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Layer 4: Input Validation                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • File type whitelist (JPEG, PNG only)              │   │
│  │ • File size limits (5MB max)                        │   │
│  │ • Required field validation                         │   │
│  │ • Base64 format validation                          │   │
│  │ • UUID format validation                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Layer 5: Business Logic                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • Session expiry enforcement (5 min)                │   │
│  │ • Challenge expiry enforcement (30 sec)             │   │
│  │ • Challenge order validation                        │   │
│  │ • Duplicate submission prevention                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Layer 6: Data Protection                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • S3 signed URLs (1 hour expiry)                    │   │
│  │ • Private S3 bucket                                 │   │
│  │ • Image processing (remove metadata)                │   │
│  │ • In-memory session storage (no DB)                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Production Architecture (Future)

```
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer (ALB)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼─────┐ ┌──────▼──────┐ ┌────▼────────┐
│ NestJS Pod 1│ │ NestJS Pod 2│ │ NestJS Pod 3│
│             │ │             │ │             │
│ • Upload    │ │ • Upload    │ │ • Upload    │
│ • Liveness  │ │ • Liveness  │ │ • Liveness  │
└─────┬───────┘ └──────┬──────┘ └──────┬──────┘
      │                │               │
      └────────────────┼───────────────┘
                       │
        ┌──────────────┼──────────────────┐
        │              │                  │
┌───────▼──────┐ ┌─────▼────────┐ ┌──────▼──────┐
│ Redis Cluster│ │  PostgreSQL  │ │  AWS S3     │
│              │ │              │ │             │
│ • Sessions   │ │ • KYC Results│ │ • Documents │
│ • Cache      │ │ • Audit Logs │ │ • Encrypted │
└──────────────┘ └──────────────┘ └─────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼────────┐ ┌───▼──────────┐ │
│ FaceTec/Onfido │ │ CloudWatch   │ │
│ Liveness API   │ │ Monitoring   │ │
└────────────────┘ └──────────────┘ │
                                    │
                          ┌─────────▼────────┐
                          │ Compliance Store │
                          │ (7-year retention)│
                          └──────────────────┘
```

## Performance Metrics

```
┌──────────────────────────────────────────────────┐
│             Performance Targets                  │
├──────────────────────────────────────────────────┤
│                                                  │
│  Upload Service:                                 │
│  ┌────────────────────────────────────────────┐ │
│  │ • Image Processing:    200-500 ms         │ │
│  │ • S3 Upload:          500-2000 ms         │ │
│  │ • Total Request:      < 3 seconds         │ │
│  │ • Throughput:         100 uploads/sec     │ │
│  │ • Concurrent:         Unlimited           │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  Liveness Service:                               │
│  ┌────────────────────────────────────────────┐ │
│  │ • Session Creation:   < 10 ms             │ │
│  │ • Challenge Submit:   < 50 ms             │ │
│  │ • Session Complete:   < 100 ms            │ │
│  │ • Memory/Session:     ~1 KB               │ │
│  │ • Max Sessions:       10,000+             │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  Database Queries:                               │
│  ┌────────────────────────────────────────────┐ │
│  │ • Connection Pool:    5-20 connections    │ │
│  │ • Query Timeout:      2 seconds           │ │
│  │ • Slow Query Log:     > 1 second          │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
└──────────────────────────────────────────────────┘
```

## Error Flow

```
Request
   │
   ▼
┌──────────────────┐
│  Rate Limiter    │ → 429 Too Many Requests
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Auth Guard      │ → 401 Unauthorized
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Controller      │ → 400 Bad Request
│  Validation      │   404 Not Found
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Service Logic   │ → 400 Bad Request
│  Business Rules  │   500 Internal Error
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  External Call   │ → 500 Internal Error
│  (S3, etc.)      │   503 Service Unavailable
└────────┬─────────┘
         │
         ▼
     Success 200/201
```
