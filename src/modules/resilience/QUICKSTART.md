# Circuit Breaker Quick Start Guide

Get up and running with circuit breakers in 5 minutes.

## 1. Install (1 minute)

Add to `app.module.ts`:

```typescript
import { ResilienceModule } from './modules/resilience';

@Module({
  imports: [
    ResilienceModule, // Add this line
    // ... other modules
  ],
})
export class AppModule {}
```

Add to `.env`:

```bash
RESILIENCE_CIRCLE_ENABLED=true
RESILIENCE_YELLOWCARD_ENABLED=true
RESILIENCE_TWILIO_ENABLED=true
RESILIENCE_BLNK_ENABLED=true
```

## 2. Use in Service (2 minutes)

```typescript
import { Injectable } from '@nestjs/common';
import { CircuitBreakerService, ExternalService } from '@/modules/resilience';

@Injectable()
export class MyService {
  constructor(
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  async callExternalAPI() {
    return this.circuitBreaker.execute(
      ExternalService.CIRCLE,
      async () => {
        // Your API call here
        const response = await fetch('https://api.circle.com/v1/transfer', {
          method: 'POST',
          body: JSON.stringify({ amount: '100' }),
        });
        return response.json();
      },
    );
  }
}
```

## 3. Add Fallback (Optional)

```typescript
async callWithFallback() {
  return this.circuitBreaker.execute(
    ExternalService.CIRCLE,
    async () => {
      // Primary API call
      return await this.circleApi.transfer(data);
    },
    async () => {
      // Fallback if circuit is open
      return { status: 'queued', message: 'Service unavailable' };
    },
  );
}
```

## 4. Check Health (1 minute)

Start your app and check:

```bash
# Health of all services
curl http://localhost:3000/resilience/health

# Metrics
curl http://localhost:3000/resilience/metrics
```

## 5. Test Circuit Breaker (1 minute)

```typescript
// Manually open circuit for testing
await this.circuitBreaker.openCircuit(ExternalService.CIRCLE);

// Check if available
const available = this.circuitBreaker.isServiceAvailable(ExternalService.CIRCLE);
console.log(available); // false

// Reset circuit
await this.circuitBreaker.resetCircuit(ExternalService.CIRCLE);
```

## Done!

Your external service calls are now protected with circuit breakers.

## What Happens Now?

- **Normal operation**: Requests flow through normally
- **After 5 failures**: Circuit opens, requests fail fast
- **After 30 seconds**: Circuit tests recovery
- **On success**: Circuit closes, normal operation resumes

## Service Configurations

| Service | Failures | Reset Time | Request Timeout |
|---------|----------|------------|-----------------|
| Circle | 5 | 30s | 5s |
| Yellow Card | 3 | 60s | 10s |
| Twilio | 5 | 45s | 8s |
| Blnk | 3 | 20s | 5s |

## Common Patterns

### Pattern 1: API Call with Fallback
```typescript
async getData() {
  return this.circuitBreaker.execute(
    ExternalService.CIRCLE,
    () => this.api.get(),
    () => this.cache.get(), // Fallback to cache
  );
}
```

### Pattern 2: Error Handling
```typescript
import { CircuitOpenError } from '@common/utils';

try {
  await this.circuitBreaker.execute(
    ExternalService.CIRCLE,
    () => this.api.call()
  );
} catch (error) {
  if (error instanceof CircuitOpenError) {
    return { error: 'Service unavailable', retryAfter: error.retryAfterMs };
  }
  throw error;
}
```

### Pattern 3: Check Before Call
```typescript
async makeRequest() {
  if (!this.circuitBreaker.isServiceAvailable(ExternalService.CIRCLE)) {
    return { error: 'Service unavailable' };
  }

  return this.circuitBreaker.execute(
    ExternalService.CIRCLE,
    () => this.api.call()
  );
}
```

## Next Steps

1. Read [README.md](./README.md) for detailed documentation
2. Check [MIGRATION.md](./MIGRATION.md) to migrate existing adapters
3. Review [examples/](./examples/) for real-world usage
4. Set up monitoring dashboards

## Need Help?

- **Usage questions**: See README.md
- **Integration help**: See MIGRATION.md
- **Examples**: See examples/ directory
- **Configuration**: See .env.example
