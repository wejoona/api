# Resilience Module

Provides fault tolerance and resilience patterns for external service integrations using the Circuit Breaker pattern.

## Features

- **Circuit Breaker Pattern**: Prevents cascading failures by failing fast when services are degraded
- **Configurable Thresholds**: Different settings per service (Circle, Yellow Card, Twilio, Blnk)
- **Multiple Fallback Strategies**: Cache, default values, retry, alternative services, or fail-fast
- **Health Monitoring**: Real-time health status and metrics for all external services
- **Runtime Configuration**: Update thresholds and settings without restarting
- **Automatic Recovery**: Tests service recovery after timeout periods

## Service Configurations

### Circle API (USDC Transfers)
```typescript
{
  failureThreshold: 5,      // Open after 5 consecutive failures
  resetTimeout: 30000,      // Wait 30s before testing recovery
  requestTimeout: 5000,     // 5s timeout per request
  fallbackStrategy: 'cache' // Use cached data if available
}
```

### Yellow Card API (Mobile Money)
```typescript
{
  failureThreshold: 3,      // Open after 3 consecutive failures
  resetTimeout: 60000,      // Wait 1 minute before testing recovery
  requestTimeout: 10000,    // 10s timeout per request
  fallbackStrategy: 'retry' // Retry with exponential backoff
}
```

### Twilio API (SMS)
```typescript
{
  failureThreshold: 5,          // Open after 5 consecutive failures
  resetTimeout: 45000,          // Wait 45s before testing recovery
  requestTimeout: 8000,         // 8s timeout per request
  fallbackStrategy: 'default'   // Return default error response
}
```

### Blnk API (Ledger)
```typescript
{
  failureThreshold: 3,          // Open after 3 consecutive failures
  resetTimeout: 20000,          // Wait 20s before testing recovery
  requestTimeout: 5000,         // 5s timeout per request
  fallbackStrategy: 'fail_fast' // Critical service, fail immediately
}
```

## Usage

### Basic Usage

```typescript
import { Injectable } from '@nestjs/common';
import { CircuitBreakerService, ExternalService } from '@/modules/resilience';

@Injectable()
export class MyService {
  constructor(
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  async callExternalService() {
    return this.circuitBreaker.execute(
      ExternalService.CIRCLE,
      async () => {
        // Your API call here
        return await fetch('https://api.circle.com/...');
      },
    );
  }
}
```

### With Custom Fallback

```typescript
async callWithFallback() {
  return this.circuitBreaker.execute(
    ExternalService.YELLOW_CARD,
    async () => {
      // Primary API call
      return await this.yellowCardApi.getChannels();
    },
    async () => {
      // Fallback: return cached data
      return await this.cache.get('yellowcard:channels');
    },
  );
}
```

### Error Handling

```typescript
import { CircuitOpenError } from '@common/utils';

async makeRequest() {
  try {
    return await this.circuitBreaker.execute(
      ExternalService.TWILIO,
      async () => this.twilioClient.sendSMS(...)
    );
  } catch (error) {
    if (error instanceof CircuitOpenError) {
      // Circuit is open, service temporarily unavailable
      this.logger.warn(`Twilio service unavailable: ${error.message}`);
      return { success: false, retryAfter: error.retryAfterMs };
    }
    throw error;
  }
}
```

## Monitoring Endpoints

All endpoints require authentication (JWT).

### Health Status

```bash
# All services
GET /resilience/health

Response:
{
  "timestamp": "2026-01-30T10:00:00.000Z",
  "healthy": true,
  "services": [
    {
      "service": "circle",
      "healthy": true,
      "circuitState": "CLOSED",
      "failures": 0,
      "successes": 125,
      "lastFailureTime": null,
      "lastSuccessTime": "2026-01-30T09:59:30.000Z",
      "averageResponseTime": 245,
      "uptime": 98.5
    }
  ]
}

# Specific service
GET /resilience/health/circle
```

### Metrics

```bash
# All services
GET /resilience/metrics

Response:
{
  "timestamp": "2026-01-30T10:00:00.000Z",
  "metrics": {
    "circle": {
      "totalRequests": 1000,
      "successfulRequests": 985,
      "failedRequests": 15,
      "circuitOpenCount": 2,
      "averageResponseTime": 245,
      "lastHourRequests": 50
    }
  }
}

# Specific service
GET /resilience/metrics/circle
```

### Configuration

```bash
# Get configuration
GET /resilience/config/circle

Response:
{
  "service": "circle",
  "circuitConfig": {
    "failureThreshold": 5,
    "resetTimeout": 30000,
    "requestTimeout": 5000,
    "enabled": true
  },
  "fallbackConfig": {
    "strategy": "cache",
    "cacheTTL": 300,
    "maxRetries": 2,
    "retryBaseDelay": 1000
  }
}
```

### Management

```bash
# Reset circuit breaker
POST /resilience/circle/reset

# Manually open circuit (for maintenance)
POST /resilience/circle/open

# Update configuration at runtime
POST /resilience/circle/config
{
  "failureThreshold": 10,
  "resetTimeout": 60000
}

# Reset all circuits
POST /resilience/reset-all

# Check availability
GET /resilience/circle/available
```

## Environment Variables

```bash
# Circle
RESILIENCE_CIRCLE_FAILURE_THRESHOLD=5
RESILIENCE_CIRCLE_RESET_TIMEOUT=30000
RESILIENCE_CIRCLE_REQUEST_TIMEOUT=5000
RESILIENCE_CIRCLE_ENABLED=true

# Yellow Card
RESILIENCE_YELLOWCARD_FAILURE_THRESHOLD=3
RESILIENCE_YELLOWCARD_RESET_TIMEOUT=60000
RESILIENCE_YELLOWCARD_REQUEST_TIMEOUT=10000
RESILIENCE_YELLOWCARD_ENABLED=true

# Twilio
RESILIENCE_TWILIO_FAILURE_THRESHOLD=5
RESILIENCE_TWILIO_RESET_TIMEOUT=45000
RESILIENCE_TWILIO_REQUEST_TIMEOUT=8000
RESILIENCE_TWILIO_ENABLED=true

# Blnk
RESILIENCE_BLNK_FAILURE_THRESHOLD=3
RESILIENCE_BLNK_RESET_TIMEOUT=20000
RESILIENCE_BLNK_REQUEST_TIMEOUT=5000
RESILIENCE_BLNK_ENABLED=true
```

## Circuit Breaker States

### CLOSED (Normal Operation)
- All requests flow through
- Failures are counted
- Opens when threshold is reached

### OPEN (Service Degraded)
- All requests fail fast with `CircuitOpenError`
- No actual API calls are made
- Transitions to HALF_OPEN after `resetTimeout`

### HALF_OPEN (Testing Recovery)
- Single test request is allowed
- Success → Circuit CLOSES
- Failure → Circuit reopens

## Fallback Strategies

### CACHE
Uses cached data if available. Useful for read operations that can tolerate stale data.

```typescript
{
  strategy: FallbackStrategy.CACHE,
  cacheTTL: 300 // seconds
}
```

### DEFAULT
Returns a predefined default value. Useful for non-critical operations.

```typescript
{
  strategy: FallbackStrategy.DEFAULT,
  defaultValue: { success: false, message: 'Service unavailable' }
}
```

### RETRY
Retries with exponential backoff before giving up.

```typescript
{
  strategy: FallbackStrategy.RETRY,
  maxRetries: 3,
  retryBaseDelay: 1000 // ms
}
```

### ALTERNATIVE
Uses an alternative service provider.

```typescript
{
  strategy: FallbackStrategy.ALTERNATIVE,
  alternativeService: 'backup-sms-provider'
}
```

### FAIL_FAST
Throws error immediately. For critical services where failure must be explicit.

```typescript
{
  strategy: FallbackStrategy.FAIL_FAST
}
```

## Integration Examples

### Circle Transfer Adapter

```typescript
@Injectable()
export class CircleTransferAdapter {
  constructor(
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  async transfer(data: TransferData) {
    return this.circuitBreaker.execute(
      ExternalService.CIRCLE,
      async () => {
        const response = await fetch(`${this.apiUrl}/transfer`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return response.json();
      },
      async () => {
        // Fallback: queue for later processing
        await this.queue.add('circle-transfer', data);
        return { status: 'queued', id: data.idempotencyKey };
      },
    );
  }
}
```

### Yellow Card Deposit

```typescript
async initiateDeposit(data: DepositData) {
  return this.circuitBreaker.execute(
    ExternalService.YELLOW_CARD,
    async () => {
      return await this.yellowCardApi.createPayment(data);
    },
    async () => {
      // Fallback: use cached rate and mark as pending
      const rate = await this.cache.get('yellowcard:rate');
      return {
        status: 'pending',
        rate,
        message: 'Payment provider temporarily unavailable',
      };
    },
  );
}
```

### Twilio SMS

```typescript
async sendSMS(to: string, body: string) {
  return this.circuitBreaker.execute(
    ExternalService.TWILIO,
    async () => {
      return await this.twilioClient.messages.create({ to, body });
    },
    async () => {
      // Fallback: log and return mock success
      this.logger.warn(`SMS not sent to ${to}: Twilio unavailable`);
      return {
        sid: 'FALLBACK',
        status: 'queued',
        message: 'SMS will be sent when service recovers',
      };
    },
  );
}
```

## Best Practices

1. **Choose Appropriate Thresholds**: Critical services (Blnk) should have lower thresholds than non-critical ones (Twilio)

2. **Set Realistic Timeouts**: Account for network latency and service SLAs

3. **Monitor Circuit State**: Alert when circuits open frequently

4. **Test Fallbacks**: Ensure fallback strategies work as expected

5. **Log Context**: Include correlation IDs in logs for debugging

6. **Use Idempotency**: All operations should be idempotent since they may be retried

7. **Cache Strategically**: Cache read operations but not writes

8. **Fail Gracefully**: Provide meaningful error messages to clients

9. **Alert on Degradation**: Set up alerts for circuit state changes

10. **Load Test**: Test circuit breakers under load to tune thresholds

## Testing

```typescript
describe('MyService', () => {
  let service: MyService;
  let circuitBreaker: jest.Mocked<CircuitBreakerService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MyService,
        {
          provide: CircuitBreakerService,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(MyService);
    circuitBreaker = module.get(CircuitBreakerService);
  });

  it('should handle circuit open error', async () => {
    circuitBreaker.execute.mockRejectedValue(
      new CircuitOpenError('Circuit open', 30000),
    );

    const result = await service.makeRequest();
    expect(result.success).toBe(false);
  });
});
```

## Architecture Diagram

```
┌─────────────────┐
│   Application   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ CircuitBreakerService   │
│  - execute()            │
│  - getHealth()          │
│  - getMetrics()         │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  CircuitBreaker         │
│  (per service)          │
│  ┌──────────────────┐   │
│  │ CLOSED → OPEN    │   │
│  │   ↓        ↑     │   │
│  │   └─HALF_OPEN─┘  │   │
│  └──────────────────┘   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  External Service       │
│  - Circle               │
│  - Yellow Card          │
│  - Twilio               │
│  - Blnk                 │
└─────────────────────────┘
```

## Troubleshooting

### Circuit Opens Frequently
- Check service health and availability
- Review failure threshold (may be too low)
- Examine request timeout (may be too short)
- Check for network issues

### Slow Response Times
- Increase request timeout
- Check external service performance
- Consider adding caching layer
- Review database queries

### Fallback Not Working
- Verify fallback function is provided
- Check fallback configuration
- Ensure cache is populated
- Test fallback in isolation

### Circuit Stuck Open
- Check if resetTimeout is too long
- Manually reset circuit via API
- Verify service has actually recovered
- Check logs for underlying issues
