# Correlation Module

End-to-end request tracking with correlation IDs for distributed tracing across microservices.

## Features

- **Automatic ID Generation**: Generates UUID v4 if no correlation ID provided
- **ID Propagation**: Accepts and propagates existing correlation IDs from clients
- **Request/Response Logging**: Logs all requests and responses with correlation ID
- **Service Integration**: Easy access to correlation ID in controllers, services, and use cases
- **Downstream Propagation**: Helpers for including correlation ID in HTTP calls to external services
- **Error Tracking**: Includes correlation ID in error logs and exception context

## Installation

Import `CorrelationModule` in your `AppModule`:

```typescript
import { CorrelationModule } from './modules/correlation';

@Module({
  imports: [
    // ... other modules
    CorrelationModule,
  ],
})
export class AppModule {}
```

## Usage

### 1. In Controllers (using decorator)

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CorrelationId } from '@/modules/correlation';
import { User } from '@/modules/user/domain/entities/user.entity';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly logger: Logger) {}

  @Get('balance')
  async getBalance(
    @CurrentUser() user: User,
    @CorrelationId() correlationId: string,
  ) {
    this.logger.log(`[${correlationId}] Getting balance for user ${user.id}`);
    // ... rest of the logic
  }
}
```

### 2. In Services (using CorrelationService)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { CorrelationService } from '@/modules/correlation';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly correlationService: CorrelationService,
    private readonly walletRepository: WalletRepository,
  ) {}

  async getBalance(userId: string) {
    const correlationId = this.correlationService.getCorrelationId();
    this.logger.log(`[${correlationId}] Fetching balance for user ${userId}`);

    const wallet = await this.walletRepository.findByUserId(userId);
    return wallet.balance;
  }
}
```

### 3. In Use Cases

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { CorrelationService } from '@/modules/correlation';

@Injectable()
export class CreateTransferUseCase {
  private readonly logger = new Logger(CreateTransferUseCase.name);

  constructor(
    private readonly correlationService: CorrelationService,
    private readonly transferRepository: TransferRepository,
    private readonly ledgerAdapter: BlnkLedgerAdapter,
  ) {}

  async execute(dto: CreateTransferDto, userId: string) {
    const correlationId = this.correlationService.getCorrelationId();

    this.logger.log(
      `[${correlationId}] Creating transfer from ${userId} to ${dto.recipientId}`,
    );

    // Create transfer
    const transfer = await this.transferRepository.create({
      senderId: userId,
      recipientId: dto.recipientId,
      amount: dto.amount,
    });

    // Call ledger with correlation ID
    await this.ledgerAdapter.recordTransaction(transfer, correlationId);

    return transfer;
  }
}
```

### 4. Propagating to Downstream Services

#### Option A: Using Helper Functions

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { withCorrelationId } from '@/modules/correlation/http-client.helper';
import axios from 'axios';

@Injectable()
export class BlnkLedgerAdapter {
  private readonly logger = new Logger(BlnkLedgerAdapter.name);

  constructor(private readonly correlationService: CorrelationService) {}

  async recordTransaction(transaction: Transaction) {
    const correlationId = this.correlationService.getCorrelationId();

    const config = withCorrelationId(correlationId, {
      timeout: 5000,
    });

    const response = await axios.post(
      'https://api.blnk.io/transactions',
      transaction,
      config,
    );

    this.logger.log(`[${correlationId}] Transaction recorded in ledger`);
    return response.data;
  }
}
```

#### Option B: Using Correlated HTTP Client

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { createCorrelatedHttpClient } from '@/modules/correlation/http-client.helper';

@Injectable()
export class YellowCardAdapter {
  private readonly logger = new Logger(YellowCardAdapter.name);
  private readonly baseURL = 'https://api.yellowcard.io';

  constructor(private readonly correlationService: CorrelationService) {}

  async initiateDeposit(data: DepositData) {
    const correlationId = this.correlationService.getCorrelationId();

    // Create HTTP client with correlation ID
    const client = createCorrelatedHttpClient(correlationId, {
      baseURL: this.baseURL,
      timeout: 10000,
    });

    // All requests will automatically include X-Correlation-ID
    const response = await client.post('/deposits', data);

    this.logger.log(`[${correlationId}] Deposit initiated via Yellow Card`);
    return response.data;
  }
}
```

#### Option C: Direct Request Object Access

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { withCorrelationIdFromRequest } from '@/modules/correlation/http-client.helper';
import { Request } from 'express';
import axios from 'axios';

@Injectable()
export class CircleAdapter {
  private readonly logger = new Logger(CircleAdapter.name);

  async createWallet(req: Request, userId: string) {
    // Extract correlation ID from request
    const config = withCorrelationIdFromRequest(req);

    const response = await axios.post(
      'https://api.circle.com/wallets',
      { userId },
      config,
    );

    return response.data;
  }
}
```

## Client-Side Usage

### Sending Correlation ID from Client

Clients can send their own correlation ID or let the backend generate one:

```typescript
// Mobile app or web client
const response = await fetch('https://api.joonapay.com/wallet/balance', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'X-Correlation-ID': 'mobile-app-correlation-id-123',
  },
});

// Backend will use the provided correlation ID
const correlationId = response.headers.get('X-Correlation-ID');
console.log('Request tracked with:', correlationId);
```

### Tracking Multi-Step Operations

```typescript
// Step 1: Initiate transfer
const transferResponse = await fetch('/transfers', {
  method: 'POST',
  headers: {
    'X-Correlation-ID': uuid(),
  },
  body: JSON.stringify(transferData),
});

const correlationId = transferResponse.headers.get('X-Correlation-ID');

// Step 2: Check status using same correlation ID
const statusResponse = await fetch(`/transfers/${transferId}/status`, {
  headers: {
    'X-Correlation-ID': correlationId,
  },
});
```

## Log Examples

### Request Log
```json
{
  "correlationId": "a1b2c3d4-e5f6-4789-g0h1-i2j3k4l5m6n7",
  "method": "POST",
  "path": "/transfers",
  "url": "/transfers",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2026-01-30T10:30:00.000Z"
}
```

### Response Log
```json
{
  "correlationId": "a1b2c3d4-e5f6-4789-g0h1-i2j3k4l5m6n7",
  "method": "POST",
  "path": "/transfers",
  "statusCode": 201,
  "executionTime": "245ms",
  "timestamp": "2026-01-30T10:30:00.245Z"
}
```

### Error Log
```json
{
  "correlationId": "a1b2c3d4-e5f6-4789-g0h1-i2j3k4l5m6n7",
  "executionTime": "123ms",
  "method": "POST",
  "path": "/transfers",
  "error": "Insufficient balance",
  "stack": "Error: Insufficient balance\n    at WalletService.transfer..."
}
```

## Architecture

```
┌─────────────┐
│   Client    │ ──X-Correlation-ID──┐
└─────────────┘                      │
                                     ▼
┌────────────────────────────────────────────────┐
│            CorrelationIdMiddleware             │
│  • Extract or generate correlation ID          │
│  • Store in request object                     │
│  • Add to response headers                     │
└────────────────┬───────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────┐
│          CorrelationIdInterceptor              │
│  • Log execution time with correlation ID      │
│  • Log errors with correlation ID              │
└────────────────┬───────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────┐
│              Controllers                       │
│  • Access via @CorrelationId() decorator       │
└────────────────┬───────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────┐
│            Services / Use Cases                │
│  • Access via CorrelationService               │
│  • Propagate to downstream services            │
└────────────────┬───────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────┐
│         External Services (Blnk, Circle)       │
│  • Receive X-Correlation-ID header             │
│  • Continue distributed tracing                │
└────────────────────────────────────────────────┘
```

## Benefits

1. **End-to-End Tracing**: Track a single request across multiple services
2. **Easier Debugging**: Filter logs by correlation ID to see entire request flow
3. **Performance Monitoring**: Analyze request latency across service boundaries
4. **Error Investigation**: Quickly find all logs related to a failed request
5. **Distributed Systems**: Essential for microservices architecture
6. **Compliance**: Meet observability and audit requirements

## Best Practices

1. **Always Propagate**: Include correlation ID in all downstream service calls
2. **Log Consistently**: Always include `[${correlationId}]` prefix in logs
3. **Client Integration**: Mobile/web apps should send correlation IDs for better tracking
4. **Error Handling**: Ensure correlation ID is included in error responses
5. **Monitoring**: Use correlation IDs in APM tools (Datadog, New Relic, etc.)

## Integration with APM Tools

### Datadog
```typescript
import { datadogRum } from '@datadog/browser-rum';

// Add correlation ID to RUM context
datadogRum.addRumGlobalContext('correlationId', correlationId);
```

### Sentry
```typescript
import * as Sentry from '@sentry/node';

// Add correlation ID to Sentry context
Sentry.setContext('correlation', {
  id: correlationId,
});
```

### New Relic
```typescript
import newrelic from 'newrelic';

// Add correlation ID to transaction
newrelic.addCustomAttribute('correlationId', correlationId);
```
