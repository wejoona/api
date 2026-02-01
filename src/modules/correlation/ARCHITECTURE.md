# Correlation Module - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Client Layer                                │
│  (Mobile App, Dashboard, External Services)                          │
│                                                                       │
│  Sends: X-Correlation-ID header (optional)                          │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NestJS Application                                │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │         CorrelationIdMiddleware (First Layer)                │   │
│  │  • Extract X-Correlation-ID from headers                     │   │
│  │  • Generate UUID v4 if not present                           │   │
│  │  • Validate correlation ID format                            │   │
│  │  • Store in req.correlationId                                │   │
│  │  • Add to response headers                                   │   │
│  └────────────────────────┬────────────────────────────────────┘   │
│                            │                                          │
│                            ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │       CorrelationIdInterceptor (Second Layer)                │   │
│  │  • Log request start with correlation ID                     │   │
│  │  • Measure execution time                                    │   │
│  │  • Log request completion/errors                             │   │
│  │  • Add correlation ID to error objects                       │   │
│  └────────────────────────┬────────────────────────────────────┘   │
│                            │                                          │
│                            ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     Controllers                              │   │
│  │  • Access via @CorrelationId() decorator                     │   │
│  │  • Log operations with [correlationId] prefix                │   │
│  └────────────────────────┬────────────────────────────────────┘   │
│                            │                                          │
│                            ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │               Services / Use Cases                           │   │
│  │  • Inject CorrelationService (request-scoped)                │   │
│  │  • Get correlation ID via getCorrelationId()                 │   │
│  │  • Log business logic steps                                  │   │
│  └────────────────────────┬────────────────────────────────────┘   │
│                            │                                          │
│                            ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │             External Service Adapters                        │   │
│  │  • Use withCorrelationId() helper                            │   │
│  │  • Use createCorrelatedHttpClient()                          │   │
│  │  • Propagate correlation ID to downstream services           │   │
│  └────────────────────────┬────────────────────────────────────┘   │
│                            │                                          │
└────────────────────────────┼──────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Downstream Services                                │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │     Blnk     │  │  Yellow Card │  │    Circle    │             │
│  │   Ledger     │  │  Mobile Money│  │     USDC     │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                       │
│  All receive: X-Correlation-ID header                                │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                      CorrelationModule                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │         CorrelationIdMiddleware                          │ │
│  │  - Global middleware applied to all routes               │ │
│  │  - Generates/validates/propagates correlation ID         │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │        CorrelationIdInterceptor                          │ │
│  │  - Global interceptor for logging                        │ │
│  │  - Tracks execution time                                 │ │
│  │  - Logs errors with correlation ID                       │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │           CorrelationService                             │ │
│  │  - Request-scoped service                                │ │
│  │  - Provides getCorrelationId()                           │ │
│  │  - Provides hasCorrelationId()                           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │           @CorrelationId() Decorator                     │ │
│  │  - Parameter decorator for controllers                   │ │
│  │  - Extracts correlation ID from request                  │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │          HTTP Client Helpers                             │ │
│  │  - withCorrelationId()                                   │ │
│  │  - withCorrelationIdFromRequest()                        │ │
│  │  - createCorrelatedHttpClient()                          │ │
│  │  - extractCorrelationIdFromHeaders()                     │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

## Request Flow Sequence

```
Client                  Middleware              Interceptor           Controller           Service            External API
  │                         │                        │                    │                   │                    │
  │ GET /wallet/balance    │                        │                    │                   │                    │
  ├────────────────────────>                        │                    │                   │                    │
  │ X-Correlation-ID: abc  │                        │                    │                   │                    │
  │                         │                        │                    │                   │                    │
  │                    Extract/Generate             │                    │                   │                    │
  │                    Store in request             │                    │                   │                    │
  │                    Add to response              │                    │                   │                    │
  │                         ├─────────────────────────>                  │                   │                    │
  │                         │                    Log request             │                   │                    │
  │                         │                    Start timer             │                   │                    │
  │                         │                        ├───────────────────>                   │                    │
  │                         │                        │              @CorrelationId()         │                    │
  │                         │                        │                    ├──────────────────>                    │
  │                         │                        │                    │            getCorrelationId()         │
  │                         │                        │                    │            Log with [abc]             │
  │                         │                        │                    │                   ├───────────────────>
  │                         │                        │                    │                   │   Blnk API Call   │
  │                         │                        │                    │                   │   X-Correlation-ID: abc
  │                         │                        │                    │                   <───────────────────┤
  │                         │                        │                    <──────────────────┤                    │
  │                         │                        <───────────────────┤                   │                    │
  │                         │                    Log response            │                   │                    │
  │                         │                    Log execution time      │                   │                    │
  │                         <─────────────────────────┤                  │                   │                    │
  <─────────────────────────┤                        │                    │                   │                    │
  │ Response                │                        │                    │                   │                    │
  │ X-Correlation-ID: abc  │                        │                    │                   │                    │
  │                         │                        │                    │                   │                    │
```

## Data Flow

### 1. Correlation ID Generation
```
Request arrives
    ↓
Check headers for X-Correlation-ID
    ↓
┌────────────────┐        ┌────────────────┐
│ Header exists? │  YES   │  Validate ID   │
│                ├───────>│                │
└────────┬───────┘        └────────┬───────┘
         │ NO                      │ VALID
         ↓                          ↓
┌────────────────┐        ┌────────────────┐
│ Generate UUID4 │        │   Use header   │
│                │        │                │
└────────┬───────┘        └────────┬───────┘
         │                          │
         └──────────┬───────────────┘
                    ↓
         Store in req.correlationId
                    ↓
         Add to response headers
```

### 2. Correlation ID Access Patterns

#### Pattern A: Controller Decorator
```typescript
@Get('balance')
async getBalance(@CorrelationId() correlationId: string) {
  // Direct access to correlation ID
}
```

#### Pattern B: Service Injection
```typescript
@Injectable()
export class WalletService {
  constructor(private correlationService: CorrelationService) {}

  async getBalance(userId: string) {
    const correlationId = this.correlationService.getCorrelationId();
    // Use correlation ID
  }
}
```

#### Pattern C: Helper Functions
```typescript
const config = withCorrelationId(correlationId, { timeout: 5000 });
const response = await axios.post(url, data, config);
```

## Logging Architecture

### Log Levels with Correlation ID

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Logs                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [abc-123] DEBUG: Validating user permissions               │
│  [abc-123] LOG: Fetching wallet for user user-456           │
│  [abc-123] LOG: Calling Blnk API for balance                │
│  [abc-123] LOG: Blnk response received: 1000.00 XOF         │
│  [abc-123] LOG: Request completed in 245ms                   │
│                                                              │
│  [def-456] LOG: Creating transfer from user-123 to user-789 │
│  [def-456] WARN: Low balance detected for user-123          │
│  [def-456] LOG: Transfer initiated: transfer-999            │
│  [def-456] ERROR: Ledger API failed: Connection timeout     │
│  [def-456] ERROR: Transfer failed after 5123ms              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Log Filtering

```bash
# View all operations for a single request
grep "abc-123" application.log

# Track a transfer across services
grep "def-456" application.log | grep -E "(Transfer|Ledger|Blnk)"

# Find all failed requests with correlation IDs
grep "ERROR" application.log | grep -oP '\[.*?\]'
```

## Performance Considerations

### Memory Impact
- **Correlation ID Storage**: ~36 bytes per request (UUID v4)
- **Request Object Extension**: Minimal (~100 bytes)
- **Service Scope**: New instance per request (acceptable for stateless service)

### CPU Impact
- **UUID Generation**: ~0.001ms
- **Header Validation**: ~0.0001ms
- **Logging Overhead**: ~0.1ms per log statement

### Total Overhead
- **Per Request**: <1ms additional latency
- **Acceptable for**: All production environments
- **Optimization**: Correlation ID is generated only once per request

## Security Considerations

### Input Validation
```typescript
// Accepts only:
// 1. UUID v4 format
// 2. Alphanumeric with hyphens/underscores (max 255 chars)

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const alphanumericPattern = /^[a-zA-Z0-9_-]{1,255}$/;
```

### Injection Prevention
- Rejects special characters (<, >, ', ", etc.)
- Rejects overly long strings (>255 chars)
- Rejects empty strings
- Logs suspicious correlation IDs

### Privacy
- Correlation IDs are NOT user IDs
- Correlation IDs are NOT sensitive data
- Correlation IDs can be shared in logs
- Correlation IDs are temporary (request-scoped)

## Scalability

### Horizontal Scaling
- Correlation IDs work across multiple instances
- No shared state required
- Load balancer agnostic

### Microservices
```
Mobile App ──[correlation-id-123]──> API Gateway
                                           │
                                           ├──[correlation-id-123]──> Auth Service
                                           ├──[correlation-id-123]──> Wallet Service
                                           │                                 │
                                           │                                 ├──[correlation-id-123]──> Blnk Ledger
                                           │                                 └──[correlation-id-123]──> Circle API
                                           └──[correlation-id-123]──> Notification Service
```

### Distributed Tracing
- Compatible with OpenTelemetry
- Compatible with Jaeger/Zipkin
- Can be used as Trace ID
- Works with APM tools (Datadog, New Relic)

## Integration Points

### External Services
1. **Blnk Ledger**: Receives X-Correlation-ID in all requests
2. **Yellow Card**: Receives X-Correlation-ID for deposits/withdrawals
3. **Circle**: Receives X-Correlation-ID for USDC operations
4. **Twilio**: Receives X-Correlation-ID for SMS operations

### Internal Services
1. **All Controllers**: Can access via @CorrelationId() decorator
2. **All Services**: Can access via CorrelationService
3. **All Repositories**: Can receive as parameter
4. **All Use Cases**: Can access via CorrelationService

### Logging Systems
1. **Winston/NestJS Logger**: Includes [correlationId] in all logs
2. **Logstash**: Can parse correlation ID for indexing
3. **Elasticsearch**: Can query by correlation ID
4. **Kibana**: Can filter/visualize by correlation ID

## Testing Strategy

### Unit Tests
- ✅ Middleware correlation ID generation
- ✅ Middleware correlation ID validation
- ✅ Service correlation ID retrieval
- ✅ Helper function correlation ID propagation

### Integration Tests
```typescript
it('should propagate correlation ID from client to database', async () => {
  const correlationId = 'test-correlation-id';

  const response = await request(app.getHttpServer())
    .get('/wallet/balance')
    .set('Authorization', `Bearer ${token}`)
    .set('X-Correlation-ID', correlationId);

  expect(response.headers['x-correlation-id']).toBe(correlationId);
});
```

### E2E Tests
```typescript
it('should track transfer across multiple services', async () => {
  const correlationId = uuidv4();

  // Initiate transfer
  await createTransfer({ correlationId });

  // Check logs
  const logs = await getLogs();
  const correlatedLogs = logs.filter(log => log.includes(correlationId));

  expect(correlatedLogs).toContain('Creating transfer');
  expect(correlatedLogs).toContain('Calling Blnk API');
  expect(correlatedLogs).toContain('Transfer completed');
});
```

## Maintenance

### Monitoring
- Track correlation IDs in APM tools
- Alert on missing correlation IDs in external calls
- Monitor correlation ID validation failures

### Debugging
1. Search logs by correlation ID
2. Filter APM traces by correlation ID
3. Track request flow across services
4. Identify bottlenecks in distributed systems

### Auditing
- All financial transactions have correlation IDs
- All API calls to external services logged with correlation ID
- All errors include correlation ID
- Compliance reports can filter by correlation ID

## Future Enhancements

### Planned
1. Integration with OpenTelemetry Trace ID
2. Automatic correlation ID in database queries
3. Correlation ID in email/SMS notifications
4. Dashboard correlation ID search

### Potential
1. Correlation ID in audit logs
2. Correlation ID in metrics (Prometheus)
3. Correlation ID in distributed caching (Redis)
4. Correlation ID in message queues (RabbitMQ)
