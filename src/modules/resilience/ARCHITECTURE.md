# Circuit Breaker Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       Application Layer                          │
│  (Controllers, Use Cases, Services)                             │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CircuitBreakerService                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  execute(service, operation, fallback?)                    │  │
│  │  getServiceHealth(service)                                 │  │
│  │  getServiceMetrics(service)                                │  │
│  │  openCircuit(service) / resetCircuit(service)              │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│               CircuitBreakerRegistry (Singleton)                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ Circle  │  │ Yellow  │  │ Twilio  │  │  Blnk   │           │
│  │ Breaker │  │  Card   │  │ Breaker │  │ Breaker │           │
│  │         │  │ Breaker │  │         │  │         │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   External Services                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Circle  │  │ Yellow   │  │  Twilio  │  │   Blnk   │        │
│  │   API    │  │  Card    │  │   API    │  │   API    │        │
│  │          │  │   API    │  │          │  │          │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

## Circuit Breaker State Machine

```
                         ┌──────────────┐
                         │              │
                    ┌────┤    CLOSED    ├────┐
                    │    │  (Normal)    │    │
                    │    └──────┬───────┘    │
                    │           │            │
              Success          │            │ Threshold
              Reset      Failure Count      │ Exceeded
              Counter          │            │
                    │           │            │
                    │           ▼            │
                    │    ┌──────────────┐   │
                    │    │              │   │
                    └────┤  Monitoring  │   │
                         │   Failures   │   │
                         └──────────────┘   │
                                            │
                                            ▼
                    ┌────────────────────────────┐
                    │                            │
                    │          OPEN              │
                    │    (Fail Fast Mode)        │
                    │                            │
                    └────────────┬───────────────┘
                                 │
                                 │ Wait resetTimeout
                                 │ (e.g., 30 seconds)
                                 │
                                 ▼
                    ┌────────────────────────────┐
                    │                            │
              ┌─────┤       HALF_OPEN           │
              │     │   (Testing Recovery)       │
              │     │                            │
              │     └────────────┬───────────────┘
              │                  │
        Failure                 │ Success
        Reopen                  │ Close
        Circuit                 │ Circuit
              │                  │
              │                  ▼
              │         ┌──────────────┐
              │         │              │
              └────────►│    CLOSED    │
                        │  (Normal)    │
                        │              │
                        └──────────────┘
```

## Request Flow

### Normal Operation (Circuit CLOSED)

```
┌────────┐
│ Client │
└───┬────┘
    │
    │ 1. Request
    ▼
┌─────────────────┐
│ Circuit Breaker │──── State: CLOSED ✓
│   (CLOSED)      │
└───┬─────────────┘
    │
    │ 2. Allow
    ▼
┌─────────────────┐
│ External API    │
└───┬─────────────┘
    │
    │ 3. Response (200 OK)
    ▼
┌─────────────────┐
│ Circuit Breaker │──── Record Success ✓
└───┬─────────────┘
    │
    │ 4. Return
    ▼
┌────────┐
│ Client │──── Success! 🎉
└────────┘
```

### Failure Scenario (Circuit OPENS)

```
┌────────┐                    ┌────────┐                    ┌────────┐
│Request │                    │Request │                    │Request │
│   #1   │                    │   #5   │                    │   #6   │
└───┬────┘                    └───┬────┘                    └───┬────┘
    │                             │                             │
    ▼                             ▼                             ▼
┌─────────────┐               ┌─────────────┐               ┌─────────────┐
│   Circuit   │               │   Circuit   │               │   Circuit   │
│   CLOSED    │───failures──►│   CLOSED    │───threshold──►│    OPEN     │
│ Failures: 1 │      +1      │ Failures: 5 │   exceeded   │ Failures: 5 │
└─────────────┘               └─────────────┘               └─────────────┘
    │                             │                             │
    ▼                             ▼                             ▼
┌─────────┐                   ┌─────────┐                   ┌─────────┐
│ API Call│───✗ Fail          │ API Call│───✗ Fail          │ BLOCKED │
└─────────┘                   └─────────┘                   └─────────┘
    │                             │                             │
    │ Error                       │ Error                       │ CircuitOpenError
    ▼                             ▼                             ▼
┌────────┐                    ┌────────┐                    ┌────────┐
│ Client │                    │ Client │                    │ Client │
└────────┘                    └────────┘                    └────────┘
```

### Recovery Flow (HALF_OPEN)

```
    Circuit OPEN
    (30 seconds)
        │
        │ Wait resetTimeout
        ▼
┌─────────────────┐
│   HALF_OPEN     │──── Allow ONE test request
└───┬─────────────┘
    │
    ├─────────┬─────────┐
    │         │         │
    ▼         ▼         ▼
Test Request
    │
    ├───── Success? ────┬───── Failure?
    │                   │
    ▼                   ▼
┌─────────┐       ┌─────────┐
│ CLOSED  │       │  OPEN   │
│ Normal  │       │ Reopen  │
└─────────┘       └─────────┘
```

## Component Relationships

```
┌──────────────────────────────────────────────────────────────┐
│                    ResilienceModule                           │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              CircuitBreakerService                      │  │
│  │                                                          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │  │
│  │  │   Service    │  │   Fallback   │  │   Metrics    │ │  │
│  │  │    Config    │  │   Config     │  │    Store     │ │  │
│  │  │              │  │              │  │              │ │  │
│  │  │ - Circle     │  │ - CACHE      │  │ - Requests   │ │  │
│  │  │ - YellowCard │  │ - DEFAULT    │  │ - Failures   │ │  │
│  │  │ - Twilio     │  │ - RETRY      │  │ - Successes  │ │  │
│  │  │ - Blnk       │  │ - ALTERNATIVE│  │ - Response   │ │  │
│  │  │              │  │ - FAIL_FAST  │  │   Time       │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │         CircuitBreakerController                        │  │
│  │                                                          │  │
│  │  GET  /resilience/health                                │  │
│  │  GET  /resilience/metrics                               │  │
│  │  POST /resilience/:service/reset                        │  │
│  │  POST /resilience/:service/open                         │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Service Integration Pattern

```
┌────────────────────────────────────────────────────────────┐
│              CircleTransferAdapter                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ constructor(                                          │  │
│  │   configService,                                      │  │
│  │   circuitBreaker ← Inject                            │  │
│  │ )                                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  async internalTransfer(data) {                             │
│    return this.circuitBreaker.execute(                      │
│      ExternalService.CIRCLE,                                │
│      async () => {                                          │
│        // Primary API call                                  │
│        return await fetch(...)                              │
│      },                                                      │
│      async () => {                                          │
│        // Fallback                                          │
│        return { status: 'queued' }                          │
│      }                                                       │
│    );                                                        │
│  }                                                           │
└────────────────────────────────────────────────────────────┘
```

## Data Flow: Successful Request

```
Application
    │
    │ 1. call adapter.transfer()
    ▼
Adapter
    │
    │ 2. circuitBreaker.execute(CIRCLE, operation)
    ▼
CircuitBreakerService
    │
    │ 3. Check: isServiceAvailable(CIRCLE)?
    ├── Yes → Continue
    │
    │ 4. Get CircuitBreaker for CIRCLE
    ▼
CircuitBreaker
    │
    │ 5. Check state == CLOSED?
    ├── Yes → Execute
    │
    │ 6. Start timer
    │ 7. Execute operation()
    │ 8. Stop timer
    │
    │ 9. Success → recordSuccess()
    │    - Reset failure count
    │    - Update metrics
    │    - Record response time
    │
    │ 10. Return result
    ▼
Application receives response ✓
```

## Data Flow: Circuit Opens

```
Application                CircuitBreaker                External API
    │                           │                            │
    │ Request #1                │                            │
    ├─────────────────────────► │                            │
    │                           │ Forward ──────────────────►│
    │                           │                            │
    │                           │ ◄────────────── Timeout ✗  │
    │                           │ failures = 1               │
    │ ◄──────────────────────── Error                        │
    │                                                         │
    │ Request #2                                              │
    ├─────────────────────────► │                            │
    │                           │ Forward ──────────────────►│
    │                           │ ◄────────────── Error ✗    │
    │                           │ failures = 2               │
    │ ◄──────────────────────── Error                        │
    │                                                         │
    │        ... (3 more failures) ...                        │
    │                                                         │
    │ Request #5                                              │
    ├─────────────────────────► │                            │
    │                           │ Forward ──────────────────►│
    │                           │ ◄────────────── Error ✗    │
    │                           │ failures = 5               │
    │                           │                            │
    │                           │ !!! THRESHOLD EXCEEDED !!! │
    │                           │ state = OPEN               │
    │                           │ nextAttempt = now + 30s    │
    │                           │                            │
    │ ◄──────────────────────── Error                        │
    │                                                         │
    │ Request #6                                              │
    ├─────────────────────────► │                            │
    │                           │ state == OPEN              │
    │                           │ BLOCK REQUEST ✋            │
    │ ◄──────────────────────── CircuitOpenError             │
    │ (no API call made)        │                            │
```

## Configuration Flow

```
Environment Variables
    │
    │ RESILIENCE_CIRCLE_FAILURE_THRESHOLD=5
    │ RESILIENCE_CIRCLE_RESET_TIMEOUT=30000
    │ RESILIENCE_CIRCLE_REQUEST_TIMEOUT=5000
    ▼
Configuration Service
    │
    │ Read and parse
    ▼
CircuitBreakerService
    │
    │ initializeServiceConfigs()
    ▼
Service Configurations Map
    │
    ├─► Circle:     { threshold: 5, reset: 30s, timeout: 5s }
    ├─► YellowCard: { threshold: 3, reset: 60s, timeout: 10s }
    ├─► Twilio:     { threshold: 5, reset: 45s, timeout: 8s }
    └─► Blnk:       { threshold: 3, reset: 20s, timeout: 5s }
```

## Monitoring Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Monitoring Layer                         │
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Grafana   │  │ Prometheus  │  │   Alerts    │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                 │                 │            │
└─────────┼─────────────────┼─────────────────┼───────────┘
          │                 │                 │
          │ Visualize       │ Scrape          │ Notify
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│            CircuitBreakerController                      │
│                                                           │
│  GET /resilience/health     → Health Status              │
│  GET /resilience/metrics    → Metrics                    │
│                                                           │
│  Response:                                                │
│  {                                                        │
│    service: "circle",                                     │
│    circuitState: "CLOSED",                                │
│    failures: 2,                                           │
│    successes: 1000,                                       │
│    uptime: 99.8%,                                         │
│    avgResponseTime: 245ms                                 │
│  }                                                        │
└─────────────────────────────────────────────────────────┘
```

## Fallback Strategy Decision Tree

```
Circuit Opens
    │
    ▼
Check Fallback Strategy
    │
    ├── CACHE? ────────────┐
    │                      │
    │                      ▼
    │              ┌──────────────┐
    │              │ Return cached│
    │              │    data      │
    │              └──────────────┘
    │
    ├── DEFAULT? ──────────┐
    │                      │
    │                      ▼
    │              ┌──────────────┐
    │              │ Return       │
    │              │ default value│
    │              └──────────────┘
    │
    ├── RETRY? ────────────┐
    │                      │
    │                      ▼
    │              ┌──────────────┐
    │              │ Retry with   │
    │              │ backoff      │
    │              └──────────────┘
    │
    ├── ALTERNATIVE? ──────┐
    │                      │
    │                      ▼
    │              ┌──────────────┐
    │              │ Use backup   │
    │              │ provider     │
    │              └──────────────┘
    │
    └── FAIL_FAST? ────────┐
                           │
                           ▼
                   ┌──────────────┐
                   │ Throw error  │
                   │ immediately  │
                   └──────────────┘
```

## Metrics Collection Flow

```
Each Request
    │
    ├─► Start Timer
    │
    ├─► Increment totalRequests
    │
    ├─► Execute Operation
    │       │
    │       ├─► Success? ──┐
    │       │              │
    │       │              ▼
    │       │      Increment successfulRequests
    │       │      Record response time
    │       │      Update uptime
    │       │
    │       └─► Failure? ──┐
    │                      │
    │                      ▼
    │              Increment failedRequests
    │              Record response time
    │              Check threshold
    │                      │
    │                      └─► Open? ──┐
    │                                   │
    │                                   ▼
    │                       Increment circuitOpenCount
    │
    └─► Stop Timer
        │
        └─► Store in responseTimeStore (last 100)
            │
            └─► Calculate averageResponseTime
```

## Security Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Attack Prevention                      │
└──────────────────────────────────────────────────────────┘
                            │
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Resource   │   │   Cascading  │   │    Attack    │
│  Exhaustion  │   │   Failure    │   │   Surface    │
│  Prevention  │   │  Prevention  │   │  Reduction   │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │   Circuit Breaker      │
              │   Fail Fast Mode       │
              │                        │
              │   No Retry Storms      │
              │   Timeout Protection   │
              │   Request Limiting     │
              └────────────────────────┘
```
