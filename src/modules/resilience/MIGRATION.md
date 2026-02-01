# Migration Guide: Integrating Circuit Breaker Service

This guide shows how to migrate existing adapters to use the centralized `CircuitBreakerService`.

## Overview

Currently, the Circle Transfer Adapter has its own circuit breaker implementation. This guide will help you migrate to the centralized service for consistent behavior across all external services.

## Step 1: Add ResilienceModule to App

**File:** `/usdc-wallet/src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ResilienceModule } from './modules/resilience';

@Module({
  imports: [
    // ... other modules
    ResilienceModule, // Add this
  ],
})
export class AppModule {}
```

## Step 2: Update Environment Configuration

**File:** `/usdc-wallet/.env`

Add the following variables:

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

## Step 3: Update Configuration Schema

**File:** `/usdc-wallet/src/config/configuration.ts`

```typescript
export default () => ({
  // ... existing config
  resilience: {
    circle: {
      failureThreshold: parseInt(process.env.RESILIENCE_CIRCLE_FAILURE_THRESHOLD || '5', 10),
      resetTimeout: parseInt(process.env.RESILIENCE_CIRCLE_RESET_TIMEOUT || '30000', 10),
      requestTimeout: parseInt(process.env.RESILIENCE_CIRCLE_REQUEST_TIMEOUT || '5000', 10),
      enabled: process.env.RESILIENCE_CIRCLE_ENABLED !== 'false',
    },
    yellowCard: {
      failureThreshold: parseInt(process.env.RESILIENCE_YELLOWCARD_FAILURE_THRESHOLD || '3', 10),
      resetTimeout: parseInt(process.env.RESILIENCE_YELLOWCARD_RESET_TIMEOUT || '60000', 10),
      requestTimeout: parseInt(process.env.RESILIENCE_YELLOWCARD_REQUEST_TIMEOUT || '10000', 10),
      enabled: process.env.RESILIENCE_YELLOWCARD_ENABLED !== 'false',
    },
    twilio: {
      failureThreshold: parseInt(process.env.RESILIENCE_TWILIO_FAILURE_THRESHOLD || '5', 10),
      resetTimeout: parseInt(process.env.RESILIENCE_TWILIO_RESET_TIMEOUT || '45000', 10),
      requestTimeout: parseInt(process.env.RESILIENCE_TWILIO_REQUEST_TIMEOUT || '8000', 10),
      enabled: process.env.RESILIENCE_TWILIO_ENABLED !== 'false',
    },
    blnk: {
      failureThreshold: parseInt(process.env.RESILIENCE_BLNK_FAILURE_THRESHOLD || '3', 10),
      resetTimeout: parseInt(process.env.RESILIENCE_BLNK_RESET_TIMEOUT || '20000', 10),
      requestTimeout: parseInt(process.env.RESILIENCE_BLNK_REQUEST_TIMEOUT || '5000', 10),
      enabled: process.env.RESILIENCE_BLNK_ENABLED !== 'false',
    },
  },
});
```

## Step 4: Migrate Circle Transfer Adapter

**File:** `/usdc-wallet/src/modules/providers/circle/adapters/circle-transfer.adapter.ts`

### Before (Current Implementation)

```typescript
@Injectable()
export class CircleTransferAdapter {
  private readonly circuitBreaker: CircuitBreaker;

  constructor(private readonly configService: ConfigService) {
    // Local circuit breaker
    this.circuitBreaker = new CircuitBreaker({
      name: 'circle-transfer',
      failureThreshold: 5,
      resetTimeout: 30000,
    });
  }

  async internalTransfer(data: InternalTransferData) {
    return this.circuitBreaker.execute(async () => {
      return fetchWithTimeout(url, options);
    });
  }
}
```

### After (Using CircuitBreakerService)

```typescript
import { CircuitBreakerService, ExternalService } from '@/modules/resilience';

@Injectable()
export class CircleTransferAdapter {
  constructor(
    private readonly configService: ConfigService,
    private readonly circuitBreaker: CircuitBreakerService, // Inject service
  ) {
    // Remove local circuit breaker initialization
  }

  async internalTransfer(data: InternalTransferData) {
    return this.circuitBreaker.execute(
      ExternalService.CIRCLE,
      async () => {
        // Your API call here
        const response = await fetch(url, options);
        return response.json();
      },
      async () => {
        // Optional fallback
        return { status: 'queued', id: data.idempotencyKey };
      },
    );
  }
}
```

### Remove Old Imports

```typescript
// Remove these:
import { CircuitBreaker, fetchWithTimeout } from '@common/utils';

// Keep only CircuitOpenError if needed for error handling:
import { CircuitOpenError } from '@common/utils';
```

## Step 5: Migrate Yellow Card Adapter

**File:** `/usdc-wallet/src/modules/providers/yellowcard/adapters/yellowcard-onramp.adapter.ts`

Add circuit breaker protection:

```typescript
import { CircuitBreakerService, ExternalService } from '@/modules/resilience';

@Injectable()
export class YellowCardOnRampAdapter {
  constructor(
    private readonly configService: ConfigService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  async initiateDeposit(data: InitiateDepositData): Promise<DepositResult> {
    return this.circuitBreaker.execute(
      ExternalService.YELLOW_CARD,
      async () => {
        const response = await fetch(`${this.config.apiUrl}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error('Yellow Card API error');
        }

        return response.json();
      },
    );
  }

  async getChannels(country: string): Promise<PaymentChannel[]> {
    return this.circuitBreaker.execute(
      ExternalService.YELLOW_CARD,
      async () => {
        const response = await fetch(`${this.config.apiUrl}/channels`, {
          headers: { Authorization: `Bearer ${this.config.apiKey}` },
        });
        return response.json();
      },
      async () => {
        // Fallback: return empty array
        this.logger.warn('Yellow Card unavailable, returning empty channels');
        return [];
      },
    );
  }
}
```

## Step 6: Migrate Twilio Webhook Service

**File:** `/usdc-wallet/src/modules/webhook/application/services/twilio-webhook.service.ts`

If Twilio service makes outbound API calls, wrap them:

```typescript
import { CircuitBreakerService, ExternalService } from '@/modules/resilience';

@Injectable()
export class TwilioWebhookService {
  constructor(
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  async sendSMS(to: string, body: string) {
    return this.circuitBreaker.execute(
      ExternalService.TWILIO,
      async () => {
        // Twilio API call
        return await this.twilioClient.messages.create({ to, body });
      },
      async () => {
        // Fallback: log and return mock response
        this.logger.warn(`SMS not sent to ${to}: Twilio unavailable`);
        return {
          sid: 'FALLBACK',
          status: 'queued',
          message: 'SMS will be sent when service recovers',
        };
      },
    );
  }
}
```

## Step 7: Update Provider Modules

Add `CircuitBreakerService` to module imports if not using global module.

**File:** `/usdc-wallet/src/modules/providers/circle/circle.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ResilienceModule } from '@/modules/resilience';

@Module({
  imports: [
    ResilienceModule, // Only if not global
  ],
  providers: [CircleTransferAdapter],
  exports: [CircleTransferAdapter],
})
export class CircleModule {}
```

## Step 8: Add Health Check Endpoint

Create or update health check controller:

```typescript
import { Controller, Get } from '@nestjs/common';
import { CircuitBreakerService } from '@/modules/resilience';

@Controller('health')
export class HealthController {
  constructor(
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  @Get('external-services')
  async checkExternalServices() {
    const health = this.circuitBreaker.getAllServicesHealth();

    return {
      status: health.every(s => s.healthy) ? 'healthy' : 'degraded',
      services: health,
    };
  }
}
```

## Step 9: Update Tests

**Before:**

```typescript
describe('CircleTransferAdapter', () => {
  let adapter: CircleTransferAdapter;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [CircleTransferAdapter, ConfigService],
    }).compile();

    adapter = module.get(CircleTransferAdapter);
  });
});
```

**After:**

```typescript
import { CircuitBreakerService } from '@/modules/resilience';

describe('CircleTransferAdapter', () => {
  let adapter: CircleTransferAdapter;
  let circuitBreaker: jest.Mocked<CircuitBreakerService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CircleTransferAdapter,
        ConfigService,
        {
          provide: CircuitBreakerService,
          useValue: {
            execute: jest.fn().mockImplementation((_, fn) => fn()),
            isServiceAvailable: jest.fn().mockReturnValue(true),
            getServiceHealth: jest.fn().mockReturnValue({
              healthy: true,
              circuitState: 'CLOSED',
            }),
          },
        },
      ],
    }).compile();

    adapter = module.get(CircleTransferAdapter);
    circuitBreaker = module.get(CircuitBreakerService);
  });

  it('should execute transfer through circuit breaker', async () => {
    const data = { amount: '100', fromWalletId: 'wallet1' };

    await adapter.internalTransfer(data);

    expect(circuitBreaker.execute).toHaveBeenCalledWith(
      'circle',
      expect.any(Function),
      expect.any(Function),
    );
  });
});
```

## Step 10: Add Monitoring

Set up alerts for circuit breaker state changes:

```typescript
// Example: Slack notification on circuit open
@Injectable()
export class CircuitBreakerMonitor {
  constructor(
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly slackService: SlackService,
  ) {
    // Poll circuit breaker health every minute
    setInterval(() => this.checkHealth(), 60000);
  }

  private async checkHealth() {
    const health = this.circuitBreaker.getAllServicesHealth();

    health.forEach(async (service) => {
      if (!service.healthy) {
        await this.slackService.notify({
          channel: '#alerts',
          message: `🔴 Circuit breaker OPEN for ${service.service}`,
          details: {
            failures: service.failures,
            lastFailure: service.lastFailureTime,
            uptime: service.uptime,
          },
        });
      }
    });
  }
}
```

## Step 11: Verify Migration

Run these checks:

```bash
# 1. Build the application
npm run build

# 2. Run tests
npm run test

# 3. Start development server
npm run start:dev

# 4. Check health endpoint
curl http://localhost:3000/resilience/health

# 5. Check metrics
curl http://localhost:3000/resilience/metrics
```

## Step 12: Gradual Rollout

1. **Staging Environment**
   - Deploy to staging
   - Monitor circuit breaker metrics
   - Test failure scenarios
   - Verify fallback strategies work

2. **Canary Deployment**
   - Deploy to small percentage of production traffic
   - Monitor for 24 hours
   - Check for increased error rates
   - Verify response times are acceptable

3. **Full Production**
   - Deploy to all production servers
   - Monitor closely for first week
   - Set up alerts for circuit state changes
   - Document any issues and resolutions

## Rollback Plan

If issues occur, rollback is simple:

1. Remove `CircuitBreakerService` injection from adapters
2. Restore previous circuit breaker implementation
3. Redeploy previous version
4. Remove `ResilienceModule` from `app.module.ts`

## Benefits After Migration

- **Centralized Configuration**: All circuit breakers configured in one place
- **Consistent Behavior**: Same patterns across all external services
- **Better Monitoring**: Unified health and metrics endpoints
- **Runtime Updates**: Change thresholds without redeploying
- **Improved Fallbacks**: Multiple fallback strategies available
- **Easier Testing**: Mock circuit breaker service instead of individual breakers

## Common Issues

### Issue: CircuitBreakerService not found

**Solution:** Ensure `ResilienceModule` is imported in `AppModule` and marked as `@Global()`.

### Issue: Environment variables not loading

**Solution:** Check `configuration.ts` includes resilience config and `.env` file has all variables.

### Issue: Circuit opens too frequently

**Solution:** Increase `failureThreshold` or `requestTimeout` for the service.

### Issue: Fallback not working

**Solution:** Ensure fallback function is provided as second parameter to `execute()`.

## Next Steps

After migration:

1. Set up monitoring dashboards (Grafana/Prometheus)
2. Configure alerts for circuit state changes
3. Document fallback behaviors for your team
4. Review and tune thresholds based on production data
5. Consider adding caching layer for fallback strategies
