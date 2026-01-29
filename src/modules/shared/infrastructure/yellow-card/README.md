# Yellow Card Service Refactoring

## Overview

The Yellow Card service has been refactored from a monolithic 647-line service into focused, single-responsibility services following NestJS best practices.

## Architecture

### Before (Monolithic)
```
yellow-card.service.ts (647 lines)
├── Authentication & HTTP requests
├── Subwallet management
├── Balance queries
├── Channel management
├── Deposit operations
├── Transfer operations
├── Rate queries
└── Webhook verification
```

### After (Modular)
```
yellow-card/
├── yellow-card.service.ts (124 lines)        - Facade service
├── yellow-card-auth.service.ts (115 lines)   - Authentication & HTTP
├── yellow-card-rates.service.ts (95 lines)   - Exchange rates
├── yellow-card-payments.service.ts (415 lines) - Payments & transfers
├── yellow-card-channels.service.ts (106 lines) - Channel management
├── yellow-card-webhooks.service.ts (42 lines) - Webhook verification
├── yellow-card.module.ts                     - Module definition
└── yellow-card.types.ts                      - Type definitions
```

## Services

### 1. YellowCardAuthService
**Responsibility:** Authentication, token management, HTTP request orchestration

**Key Methods:**
- `getConfig()`: Get Yellow Card configuration
- `isMockMode()`: Check if running in mock mode
- `generateSignature()`: Generate HMAC signature for API auth
- `makeRequest<T>()`: Make authenticated HTTP requests
- `generateMockAddress()`: Generate mock blockchain addresses

**Dependencies:** ConfigService

### 2. YellowCardRatesService
**Responsibility:** Exchange rate queries and conversions

**Key Methods:**
- `getRate(request)`: Get exchange rate between currencies

**Dependencies:** YellowCardAuthService

**Features:**
- Mock rates for XOF ↔ USD conversions
- Real-time rate fetching from Yellow Card API
- 1.5% fee calculation
- Rate expiration handling

### 3. YellowCardPaymentsService
**Responsibility:** Subwallets, deposits, and transfers

**Key Methods:**
- `createSubwallet(request)`: Create new subwallet
- `getBalance(subwalletId)`: Get subwallet balances
- `initiateDeposit(request)`: Start on-ramp deposit
- `internalTransfer(request)`: Transfer between subwallets
- `externalTransfer(request)`: Withdraw to blockchain address

**Dependencies:** YellowCardAuthService

**Features:**
- Multi-currency balance support (USD, USDC)
- Payment instruction generation
- Transfer status tracking
- Mock implementations for testing

### 4. YellowCardChannelsService
**Responsibility:** Payment channel availability and management

**Key Methods:**
- `getOnRampChannels(country)`: Get available payment channels

**Dependencies:** YellowCardAuthService

**Features:**
- Country-specific channel filtering
- Mobile money support (Orange Money, Wave, MTN)
- Fee and limit information
- Channel type classification

### 5. YellowCardWebhooksService
**Responsibility:** Webhook signature verification

**Key Methods:**
- `verifyWebhookSignature(payload, signature)`: Verify webhook authenticity

**Dependencies:** YellowCardAuthService

**Features:**
- HMAC-SHA256 signature verification
- Automatic mock mode bypass
- Security logging

### 6. YellowCardService (Facade)
**Responsibility:** Main entry point delegating to specialized services

**Pattern:** Facade Pattern

**Key Methods:** Delegates all operations to specialized services

**Dependencies:** All Yellow Card services

**Benefits:**
- Maintains backward compatibility
- Clean public API
- Easy to test and mock
- Single injection point for consumers

## Dependency Graph

```
YellowCardService (Facade)
├── YellowCardAuthService
│   └── ConfigService
├── YellowCardRatesService
│   └── YellowCardAuthService
├── YellowCardPaymentsService
│   └── YellowCardAuthService
├── YellowCardChannelsService
│   └── YellowCardAuthService
└── YellowCardWebhooksService
    └── YellowCardAuthService
```

## Usage

### Option 1: Use Facade (Recommended)
```typescript
import { YellowCardService } from '@/modules/shared/infrastructure/yellow-card';

@Injectable()
export class MyService {
  constructor(private readonly yellowCard: YellowCardService) {}

  async createWallet(userId: string) {
    return this.yellowCard.createSubwallet({
      name: `User ${userId}`,
      country: 'CI',
    });
  }
}
```

### Option 2: Use Specialized Services
```typescript
import {
  YellowCardPaymentsService,
  YellowCardRatesService
} from '@/modules/shared/infrastructure/yellow-card';

@Injectable()
export class MyService {
  constructor(
    private readonly payments: YellowCardPaymentsService,
    private readonly rates: YellowCardRatesService,
  ) {}

  async getQuote(amount: number) {
    return this.rates.getRate({
      sourceCurrency: 'XOF',
      targetCurrency: 'USD',
      amount,
    });
  }
}
```

### Module Import
```typescript
import { Module } from '@nestjs/common';
import { YellowCardModule } from '@/modules/shared/infrastructure/yellow-card';

@Module({
  imports: [YellowCardModule],
  // ...
})
export class MyModule {}
```

## Benefits of Refactoring

### 1. Single Responsibility Principle
Each service has one clear purpose:
- Auth service handles only authentication
- Rates service handles only exchange rates
- etc.

### 2. Improved Testability
- Mock individual services in isolation
- Test specialized logic without HTTP overhead
- Reduced test complexity

### 3. Better Code Organization
- Easier to navigate (100-400 lines vs 647 lines)
- Clear separation of concerns
- Logical grouping of related functionality

### 4. Enhanced Maintainability
- Changes to rates don't affect webhooks
- Can update auth logic without touching payments
- Easier to add new features

### 5. Dependency Injection
- Fine-grained control over what gets injected
- Easier to swap implementations
- Better for unit testing

### 6. Backward Compatibility
- Facade maintains existing API
- No breaking changes for consumers
- Gradual migration path

## Testing Strategy

### Unit Tests
```typescript
describe('YellowCardRatesService', () => {
  let service: YellowCardRatesService;
  let authService: jest.Mocked<YellowCardAuthService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        YellowCardRatesService,
        {
          provide: YellowCardAuthService,
          useValue: {
            isMockMode: jest.fn().mockReturnValue(true),
            makeRequest: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(YellowCardRatesService);
    authService = module.get(YellowCardAuthService);
  });

  it('should return mock rate in mock mode', async () => {
    const result = await service.getRate({
      sourceCurrency: 'XOF',
      targetCurrency: 'USD',
      amount: 10000,
    });

    expect(result.rate).toBe(0.00166);
    expect(authService.makeRequest).not.toHaveBeenCalled();
  });
});
```

### Integration Tests
```typescript
describe('YellowCardService Integration', () => {
  let service: YellowCardService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule, YellowCardModule],
    }).compile();

    service = module.get(YellowCardService);
  });

  it('should create subwallet and check balance', async () => {
    const wallet = await service.createSubwallet({
      name: 'Test User',
      country: 'CI',
    });

    const balance = await service.getBalance(wallet.id);
    expect(balance.subwalletId).toBe(wallet.id);
  });
});
```

## Migration Guide

### For Existing Code
No changes required! The facade maintains the same API:

```typescript
// Before
yellowCardService.createSubwallet(request);

// After (works the same)
yellowCardService.createSubwallet(request);
```

### For New Code
Consider using specialized services for better testability:

```typescript
// Instead of injecting the facade
constructor(private readonly yellowCard: YellowCardService) {}

// Inject only what you need
constructor(private readonly rates: YellowCardRatesService) {}
```

## Configuration

All services read from the same config:

```env
YELLOW_CARD_API_URL=https://api.yellowcard.io
YELLOW_CARD_API_KEY=your_api_key
YELLOW_CARD_SECRET_KEY=your_secret_key
YELLOW_CARD_WEBHOOK_SECRET=your_webhook_secret
YELLOW_CARD_USE_MOCK=false
```

## Future Improvements

1. **Circuit Breaker**: Add resilience patterns to auth service
2. **Caching**: Cache rates in RatesService for performance
3. **Retry Logic**: Add exponential backoff in AuthService
4. **Rate Limiting**: Track and throttle API requests
5. **Metrics**: Add Prometheus metrics to each service
6. **Events**: Emit domain events from PaymentsService

## Related Files

- Gateway Adapter: `/modules/shared/infrastructure/gateways/payment/yellow-card.adapter.ts`
- Domain Gateway Interface: `/modules/shared/domain/gateways/payment.gateway.ts`
- Shared Module: `/modules/shared/shared.module.ts`

## Line Count Comparison

| File | Lines | Responsibility |
|------|-------|---------------|
| **Before** |
| yellow-card.service.ts | 647 | Everything |
| **After** |
| yellow-card.service.ts | 124 | Facade |
| yellow-card-auth.service.ts | 115 | Authentication |
| yellow-card-rates.service.ts | 95 | Exchange rates |
| yellow-card-payments.service.ts | 415 | Payments |
| yellow-card-channels.service.ts | 106 | Channels |
| yellow-card-webhooks.service.ts | 42 | Webhooks |
| yellow-card.module.ts | 42 | Module setup |
| **Total** | **939** | **(+292 lines for better structure)** |

The increase in total lines is due to:
- Service class boilerplate (constructors, decorators)
- Better documentation and comments
- Module definition
- Improved separation of concerns

This tradeoff provides significantly better maintainability, testability, and scalability.
