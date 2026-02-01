# Audit Logging Decorators

Comprehensive audit logging system for compliance tracking in JoonaPay USDC Wallet.

## Features

- Automatic method call logging with user context
- Configurable resource ID extraction
- Sensitive data redaction
- Error logging support
- Predefined decorators for common operations
- Performance tracking (duration)
- IP address and user agent capture

## Installation

### 1. Enable Globally

```typescript
// app.module.ts
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogInterceptor } from './common/decorators/audit';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    AdminModule, // Provides AuditService
    // ... other modules
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
```

### 2. Or Enable Per Controller

```typescript
import { UseInterceptors } from '@nestjs/common';
import { AuditLogInterceptor } from '@/common/decorators/audit';

@Controller('transfers')
@UseInterceptors(AuditLogInterceptor)
export class TransferController {
  // ...
}
```

## Usage

### Basic Usage

```typescript
import { AuditLog } from '@/common/decorators/audit';

@Post()
@AuditLog({
  action: 'wallet.create',
  resourceType: 'wallet',
  resourceIdPath: 'result.id',
  includeArgs: true,
  includeResult: true,
})
async createWallet(@Body() dto: CreateWalletDto, @CurrentUser() user: User) {
  return this.createWalletUseCase.execute(dto, user.id);
}
```

### Using Predefined Decorators

```typescript
import {
  AuditCreate,
  AuditUpdate,
  AuditDelete,
  AuditTransfer,
} from '@/common/decorators/audit';

@Controller('wallets')
export class WalletController {
  @Post()
  @AuditCreate('wallet')
  async create(@Body() dto: CreateWalletDto) {
    return this.createUseCase.execute(dto);
  }

  @Put(':id')
  @AuditUpdate('wallet')
  async update(@Param('id') id: string, @Body() dto: UpdateWalletDto) {
    return this.updateUseCase.execute(id, dto);
  }

  @Delete(':id')
  @AuditDelete('wallet')
  async delete(@Param('id') id: string) {
    return this.deleteUseCase.execute(id);
  }

  @Post('transfer')
  @AuditTransfer()
  async transfer(@Body() dto: CreateTransferDto, @CurrentUser() user: User) {
    return this.transferUseCase.execute(dto, user.id);
  }
}
```

## Decorator Options

### AuditLog Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `action` | `string` | Action name (e.g., 'transfer.create') | Required |
| `resourceType` | `string` | Resource type (e.g., 'transfer') | Required |
| `resourceIdPath` | `string` | Path to extract ID (e.g., 'result.id') | `undefined` |
| `includeArgs` | `boolean \| number[]` | Include method arguments | `false` |
| `includeResult` | `boolean` | Include method result | `false` |
| `detailsExtractor` | `function` | Custom details extractor | `undefined` |
| `logOnError` | `boolean` | Log on method error | `true` |
| `sensitiveFields` | `string[]` | Fields to redact | See below |
| `highRisk` | `boolean` | Mark as high-risk operation | `false` |

### Default Sensitive Fields

```typescript
[
  'password',
  'pin',
  'secret',
  'token',
  'apiKey',
  'apiSecret',
  'privateKey',
  'accessToken',
  'refreshToken',
  'authToken',
]
```

## Resource ID Extraction

The `resourceIdPath` uses dot notation to extract IDs from arguments or results:

```typescript
// From first argument's id property
resourceIdPath: 'args.0.id'

// From second argument directly
resourceIdPath: 'args.1'

// From result's id property
resourceIdPath: 'result.id'

// From nested property in result
resourceIdPath: 'result.data.walletId'
```

## Examples

### Financial Transfer

```typescript
@Post('transfer')
@AuditTransfer()
async createTransfer(@Body() dto: CreateTransferDto, @CurrentUser() user: User) {
  return this.transferUseCase.execute(dto, user.id);
}
```

Logs:
```json
{
  "action": "transfer.create",
  "resourceType": "transfer",
  "resourceId": "550e8400-e29b-41d4-a716-446655440000",
  "actorId": "user-123",
  "actorType": "user",
  "details": {
    "amount": 50000,
    "currency": "XOF",
    "recipientId": "user-456",
    "transferType": "internal",
    "method": "POST",
    "url": "/api/v1/transfer",
    "duration": 234,
    "success": true
  },
  "ipAddress": "197.149.95.234",
  "userAgent": "Mozilla/5.0..."
}
```

### KYC Approval

```typescript
@Post(':id/approve')
@AuditKyc('approve', {
  detailsExtractor: (args, result) => ({
    verificationLevel: result.verificationLevel,
    approvedDocuments: result.documents.map(d => d.type),
  }),
})
async approveKyc(
  @Param('id') id: string,
  @Body() dto: ApproveKycDto,
  @CurrentUser() admin: User,
) {
  return this.approveKycUseCase.execute(id, dto, admin.id);
}
```

### Custom Details Extraction

```typescript
@Post('withdrawal')
@AuditLog({
  action: 'withdrawal.create',
  resourceType: 'withdrawal',
  resourceIdPath: 'result.id',
  includeArgs: [0],
  highRisk: true,
  detailsExtractor: (args, result, context) => ({
    amount: args[0]?.amount,
    currency: args[0]?.currency,
    destination: args[0]?.phoneNumber,
    provider: args[0]?.provider,
    walletBalance: result?.wallet?.balance,
    feeAmount: result?.fee,
    userCountry: context.user?.country,
  }),
})
async createWithdrawal(@Body() dto: CreateWithdrawalDto, @CurrentUser() user: User) {
  return this.withdrawalUseCase.execute(dto, user.id);
}
```

### Sensitive Data Handling

```typescript
@Post('login')
@AuditAuth('login', {
  sensitiveFields: ['password', 'pin', 'token', 'otp'],
  includeArgs: false, // Don't log credentials
  includeResult: false, // Don't log tokens
  detailsExtractor: (args, result) => ({
    phoneNumber: args[0]?.phoneNumber,
    loginMethod: args[0]?.method,
    deviceId: args[0]?.deviceId,
  }),
})
async login(@Body() dto: LoginDto) {
  return this.authService.login(dto);
}
```

## Predefined Decorators

### CRUD Operations

- `@AuditCreate(resourceType, options?)` - Create operations
- `@AuditUpdate(resourceType, options?)` - Update operations
- `@AuditDelete(resourceType, options?)` - Delete operations
- `@AuditRead(resourceType, options?)` - Read operations (sensitive)

### Financial Operations

- `@AuditTransfer(options?)` - Money transfers
- `@AuditWithdrawal(options?)` - Withdrawals
- `@AuditDeposit(options?)` - Deposits

### Authentication

- `@AuditAuth(action, options?)` - Auth operations
  - Actions: `'login' | 'logout' | 'refresh' | 'password_reset' | 'password_change'`

### KYC

- `@AuditKyc(action, options?)` - KYC operations
  - Actions: `'submit' | 'approve' | 'reject' | 'request_review'`

### Admin

- `@AuditAdmin(action, resourceType, options?)` - Admin operations

### Configuration

- `@AuditConfig(action, options?)` - Config changes
  - Actions: `'update' | 'create' | 'delete'`

### Webhooks

- `@AuditWebhook(action, options?)` - Webhook handling
  - Actions: `'received' | 'processed' | 'failed'`

## Best Practices

### 1. Always Audit Financial Operations

```typescript
@Post('transfer')
@AuditTransfer()
async createTransfer() { }

@Post('withdrawal')
@AuditWithdrawal()
async createWithdrawal() { }
```

### 2. Audit High-Risk Actions

```typescript
@Delete('account')
@AuditDelete('account', { highRisk: true })
async deleteAccount() { }

@Post('kyc/:id/approve')
@AuditKyc('approve')
async approveKyc() { }
```

### 3. Don't Log Sensitive Data

```typescript
@Post('login')
@AuditAuth('login', {
  includeArgs: false, // Don't log password
  includeResult: false, // Don't log tokens
})
async login() { }
```

### 4. Extract Meaningful Details

```typescript
@Post('transfer')
@AuditTransfer({
  detailsExtractor: (args, result) => ({
    amount: args[0]?.amount,
    currency: args[0]?.currency,
    recipientCountry: result?.recipient?.country,
    exchangeRate: result?.exchangeRate,
  }),
})
async createTransfer() { }
```

### 5. Use Consistent Naming

```typescript
// Good
action: 'transfer.create'
action: 'transfer.approve'
action: 'transfer.cancel'

// Avoid
action: 'create_transfer'
action: 'approveTransfer'
action: 'TRANSFER_CANCEL'
```

## Querying Audit Logs

```typescript
import { AuditService } from '@/modules/admin/application/services/audit.service';

@Injectable()
export class AuditReportService {
  constructor(private readonly auditService: AuditService) {}

  async getUserActivity(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.auditService.query({
      actorId: userId,
      startDate,
      page: 1,
      limit: 100,
    });
  }

  async getHighRiskActions(days: number = 7) {
    return this.auditService.query({
      action: 'delete%',
      startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
    });
  }

  async getResourceHistory(resourceType: string, resourceId: string) {
    return this.auditService.getResourceHistory(resourceType, resourceId);
  }
}
```

## Compliance Reports

```typescript
@Get('compliance/audit-trail')
@AuditRead('compliance', {
  detailsExtractor: (args) => ({
    reportType: 'audit_trail',
    dateRange: args[0]?.dateRange,
  }),
})
async generateAuditTrail(@Query() query: AuditTrailQueryDto) {
  return this.auditService.query({
    startDate: query.startDate,
    endDate: query.endDate,
    action: query.action,
    resourceType: query.resourceType,
  });
}
```

## Performance Considerations

- Audit logging is asynchronous and won't block requests
- Failed audit logs are logged but don't fail the request
- Sensitive data redaction happens before storage
- Use pagination when querying large audit logs

## Integration with Existing Code

### Transfer Controller Example

```typescript
import { AuditTransfer } from '@/common/decorators/audit';

@Controller('transfers')
export class TransferController {
  @Post()
  @AuditTransfer()
  async create(@Body() dto: CreateTransferDto, @CurrentUser() user: User) {
    return this.createTransferUseCase.execute(dto, user.id);
  }
}
```

### Withdrawal Controller Example

```typescript
import { AuditWithdrawal } from '@/common/decorators/audit';

@Controller('withdrawals')
export class WithdrawalController {
  @Post()
  @AuditWithdrawal()
  async create(@Body() dto: CreateWithdrawalDto, @CurrentUser() user: User) {
    return this.createWithdrawalUseCase.execute(dto, user.id);
  }
}
```

## Security

- All sensitive fields are automatically redacted
- IP addresses and user agents are captured
- Both successful and failed operations are logged
- Actor type (user/admin/system) is tracked
- High-risk operations are flagged

## Retention Policy

Configure retention in your admin service:

```typescript
// Cleanup logs older than 90 days
await this.auditService.cleanupOldLogs(90);
```

## Testing

```typescript
import { Test } from '@nestjs/testing';
import { AuditLogInterceptor } from '@/common/decorators/audit';
import { AuditService } from '@/modules/admin/application/services/audit.service';

describe('AuditLogInterceptor', () => {
  let interceptor: AuditLogInterceptor;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuditLogInterceptor,
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    interceptor = module.get(AuditLogInterceptor);
    auditService = module.get(AuditService);
  });

  it('should log audit event', async () => {
    // Test implementation
  });
});
```
