# Yellow Card Services - Quick Reference

## Service Overview

| Service | Purpose | Key Methods |
|---------|---------|-------------|
| **YellowCardService** | Facade for all operations | All methods (delegates to others) |
| **YellowCardAuthService** | Authentication & HTTP | `makeRequest()`, `generateSignature()` |
| **YellowCardRatesService** | Exchange rates | `getRate()` |
| **YellowCardPaymentsService** | Wallets & transfers | `createSubwallet()`, `initiateDeposit()`, `internalTransfer()`, `externalTransfer()` |
| **YellowCardChannelsService** | Payment channels | `getOnRampChannels()` |
| **YellowCardWebhooksService** | Webhook verification | `verifyWebhookSignature()` |

---

## Usage Examples

### Get Exchange Rate
```typescript
import { YellowCardRatesService } from './yellow-card';

@Injectable()
export class MyService {
  constructor(private readonly rates: YellowCardRatesService) {}

  async getQuote(amount: number) {
    return this.rates.getRate({
      sourceCurrency: 'XOF',
      targetCurrency: 'USD',
      amount,
    });
  }
}
```

### Create Subwallet
```typescript
import { YellowCardPaymentsService } from './yellow-card';

@Injectable()
export class WalletService {
  constructor(private readonly payments: YellowCardPaymentsService) {}

  async createUserWallet(userId: string, country: string) {
    return this.payments.createSubwallet({
      name: `User ${userId}`,
      country,
      email: `user${userId}@example.com`,
    });
  }
}
```

### Initiate Deposit
```typescript
import { YellowCardPaymentsService } from './yellow-card';

@Injectable()
export class DepositService {
  constructor(private readonly payments: YellowCardPaymentsService) {}

  async startDeposit(subwalletId: string, amount: number, channelId: string) {
    return this.payments.initiateDeposit({
      subwalletId,
      amount,
      sourceCurrency: 'XOF',
      channelId,
      customerPhone: '+2250700000000',
    });
  }
}
```

### Get Available Channels
```typescript
import { YellowCardChannelsService } from './yellow-card';

@Injectable()
export class ChannelService {
  constructor(private readonly channels: YellowCardChannelsService) {}

  async getPaymentMethods(country: string) {
    return this.channels.getOnRampChannels(country);
  }
}
```

### Verify Webhook
```typescript
import { YellowCardWebhooksService } from './yellow-card';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhooks: YellowCardWebhooksService) {}

  @Post('yellow-card')
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-signature') signature: string,
  ) {
    if (!this.webhooks.verifyWebhookSignature(JSON.stringify(payload), signature)) {
      throw new UnauthorizedException('Invalid signature');
    }
    // Process webhook...
  }
}
```

### Use Facade (All Operations)
```typescript
import { YellowCardService } from './yellow-card';

@Injectable()
export class AllInOneService {
  constructor(private readonly yellowCard: YellowCardService) {}

  async performOperation() {
    // All methods available
    const rate = await this.yellowCard.getRate({...});
    const wallet = await this.yellowCard.createSubwallet({...});
    const channels = await this.yellowCard.getOnRampChannels('CI');
    // etc.
  }
}
```

---

## Module Import

```typescript
import { Module } from '@nestjs/common';
import { YellowCardModule } from '@/modules/shared/infrastructure/yellow-card';

@Module({
  imports: [YellowCardModule],
  // Now all Yellow Card services are available for injection
})
export class MyModule {}
```

---

## Testing

### Mock a Specific Service
```typescript
import { Test } from '@nestjs/testing';
import { YellowCardRatesService } from './yellow-card';

describe('MyService', () => {
  let mockRates: Partial<YellowCardRatesService>;

  beforeEach(async () => {
    mockRates = {
      getRate: jest.fn().mockResolvedValue({
        rate: 0.00166,
        sourceAmount: 10000,
        targetAmount: 16.6,
        fee: 150,
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        MyService,
        {
          provide: YellowCardRatesService,
          useValue: mockRates,
        },
      ],
    }).compile();

    service = module.get(MyService);
  });

  it('should get rate', async () => {
    const result = await service.getQuote(10000);
    expect(mockRates.getRate).toHaveBeenCalled();
  });
});
```

---

## Configuration

```env
# Yellow Card API Configuration
YELLOW_CARD_API_URL=https://api.yellowcard.io
YELLOW_CARD_API_KEY=your_api_key_here
YELLOW_CARD_SECRET_KEY=your_secret_key_here
YELLOW_CARD_WEBHOOK_SECRET=your_webhook_secret_here

# Use mock mode for development/testing
YELLOW_CARD_USE_MOCK=true
```

---

## Service Dependencies

```
ConfigService (from @nestjs/config)
    ↓
YellowCardAuthService
    ↓
┌───────────────┬──────────────┬─────────────────┬─────────────────┐
│               │              │                 │                 │
Rates        Payments      Channels         Webhooks
Service      Service       Service          Service
    ↓            ↓             ↓                 ↓
         YellowCardService (Facade)
```

---

## Common Patterns

### Pattern 1: Rate + Channel Selection
```typescript
async prepareDeposit(amount: number, country: string) {
  // 1. Get available channels
  const channels = await this.channels.getOnRampChannels(country);

  // 2. Get rate for each channel
  const ratesPromises = channels.map(channel =>
    this.rates.getRate({
      sourceCurrency: 'XOF',
      targetCurrency: 'USD',
      amount,
    })
  );
  const rates = await Promise.all(ratesPromises);

  // 3. Return channels with rates
  return channels.map((channel, i) => ({
    ...channel,
    rate: rates[i],
  }));
}
```

### Pattern 2: Create Wallet + Get Balance
```typescript
async setupNewUser(userId: string, country: string) {
  // 1. Create subwallet
  const wallet = await this.payments.createSubwallet({
    name: `User ${userId}`,
    country,
  });

  // 2. Get initial balance
  const balance = await this.payments.getBalance(wallet.id);

  return { wallet, balance };
}
```

### Pattern 3: Transfer with Rate Check
```typescript
async transferWithRateCheck(fromId: string, toId: string, amount: number) {
  // 1. Get current rate
  const rate = await this.rates.getRate({
    sourceCurrency: 'USD',
    targetCurrency: 'USD',
    amount,
  });

  // 2. Execute transfer if rate is acceptable
  if (rate.fee < amount * 0.02) { // Max 2% fee
    return this.payments.internalTransfer({
      fromSubwalletId: fromId,
      toSubwalletId: toId,
      amount,
      currency: 'USD',
    });
  }

  throw new Error('Fee too high');
}
```

---

## Error Handling

All services throw errors that should be caught:

```typescript
try {
  const result = await this.payments.createSubwallet(request);
  return result;
} catch (error) {
  if (error.message.includes('Yellow Card API error')) {
    // Handle API errors
    this.logger.error('Yellow Card API failed', error);
    throw new ServiceUnavailableException('Payment service unavailable');
  }
  throw error;
}
```

---

## Mock Data Reference

### Mock Rates
- XOF → USD: `0.00166`
- USD → XOF: `602.41`
- Fee: `1.5%` of source amount

### Mock Channels (Côte d'Ivoire)
```typescript
[
  {
    id: 'orange_money_ci',
    name: 'Orange Money',
    minAmount: 1000,    // XOF
    maxAmount: 500000,  // XOF
    fee: 1.5,           // percentage
  },
  {
    id: 'wave_ci',
    name: 'Wave',
    minAmount: 500,
    maxAmount: 1000000,
    fee: 1.0,
  },
  {
    id: 'mtn_momo_ci',
    name: 'MTN Mobile Money',
    minAmount: 1000,
    maxAmount: 500000,
    fee: 1.5,
  },
]
```

---

## When to Use Which Service

| Need | Use This Service | Method |
|------|------------------|--------|
| Get exchange rate | YellowCardRatesService | `getRate()` |
| Create wallet | YellowCardPaymentsService | `createSubwallet()` |
| Check balance | YellowCardPaymentsService | `getBalance()` |
| List payment methods | YellowCardChannelsService | `getOnRampChannels()` |
| Start deposit | YellowCardPaymentsService | `initiateDeposit()` |
| Transfer between wallets | YellowCardPaymentsService | `internalTransfer()` |
| Withdraw to blockchain | YellowCardPaymentsService | `externalTransfer()` |
| Verify webhook | YellowCardWebhooksService | `verifyWebhookSignature()` |
| Do everything | YellowCardService (Facade) | Any method |

---

## Performance Tips

1. **Parallel Requests**: Use `Promise.all()` for independent operations
2. **Cache Rates**: Rates expire in 5 minutes, cache accordingly
3. **Batch Operations**: Group related API calls
4. **Mock Mode**: Always use mock mode in development

---

## Common Issues

### Issue: Services not injecting
**Solution:** Import `YellowCardModule` in your module

### Issue: Mock mode not working
**Solution:** Check `YELLOW_CARD_USE_MOCK=true` in `.env`

### Issue: Type errors
**Solution:** Import types from `./yellow-card.types`

### Issue: Circular dependencies
**Solution:** Services are designed to avoid this, but if it occurs, use `forwardRef()`
