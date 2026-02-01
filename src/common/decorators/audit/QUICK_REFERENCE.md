# Audit Decorators Quick Reference

One-page reference for common audit decorator usage.

## Installation (One-Time)

```typescript
// app.module.ts
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogInterceptor } from './common/decorators/audit';

@Module({
  providers: [
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}
```

## Common Decorators

### Financial Operations

```typescript
import { AuditTransfer, AuditWithdrawal, AuditDeposit } from '@/common/decorators/audit';

@Post('transfer')
@AuditTransfer()
async createTransfer() { }

@Post('withdrawal')
@AuditWithdrawal()
async createWithdrawal() { }

@Post('deposit')
@AuditDeposit()
async createDeposit() { }
```

### CRUD Operations

```typescript
import { AuditCreate, AuditUpdate, AuditDelete, AuditRead } from '@/common/decorators/audit';

@Post()
@AuditCreate('wallet')
async create() { }

@Put(':id')
@AuditUpdate('wallet')
async update(@Param('id') id: string) { }

@Delete(':id')
@AuditDelete('wallet')
async delete(@Param('id') id: string) { }

@Get(':id')
@AuditRead('wallet')
async get(@Param('id') id: string) { }
```

### Authentication

```typescript
import { AuditAuth } from '@/common/decorators/audit';

@Post('login')
@AuditAuth('login')
async login() { }

@Post('logout')
@AuditAuth('logout')
async logout() { }

@Post('password/reset')
@AuditAuth('password_reset')
async resetPassword() { }
```

### KYC

```typescript
import { AuditKyc } from '@/common/decorators/audit';

@Post('submit')
@AuditKyc('submit')
async submitKyc() { }

@Post(':id/approve')
@AuditKyc('approve')
async approveKyc() { }

@Post(':id/reject')
@AuditKyc('reject')
async rejectKyc() { }
```

## Custom Decorator

```typescript
import { AuditLog } from '@/common/decorators/audit';

@Post()
@AuditLog({
  action: 'custom.action',
  resourceType: 'custom',
  resourceIdPath: 'result.id',
  includeArgs: [0],
  includeResult: true,
  detailsExtractor: (args, result) => ({
    customField: 'value',
  }),
})
async customAction() { }
```

## Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `action` | `string` | Required | Action name (e.g., 'transfer.create') |
| `resourceType` | `string` | Required | Resource type (e.g., 'transfer') |
| `resourceIdPath` | `string` | `undefined` | Path to ID (e.g., 'result.id') |
| `includeArgs` | `boolean \| number[]` | `false` | Include method arguments |
| `includeResult` | `boolean` | `false` | Include method result |
| `detailsExtractor` | `function` | `undefined` | Custom details function |
| `logOnError` | `boolean` | `true` | Log on method error |
| `sensitiveFields` | `string[]` | See below | Fields to redact |
| `highRisk` | `boolean` | `false` | Mark as high-risk |

**Default sensitive fields:**
`password`, `pin`, `secret`, `token`, `apiKey`, `apiSecret`, `privateKey`, `accessToken`, `refreshToken`, `authToken`

## Resource ID Paths

```typescript
// From first argument's id property
resourceIdPath: 'args.0.id'

// From second argument directly
resourceIdPath: 'args.1'

// From result's id property (default)
resourceIdPath: 'result.id'

// From nested result property
resourceIdPath: 'result.data.walletId'
```

## Include Arguments

```typescript
// Don't include arguments (default)
includeArgs: false

// Include all arguments
includeArgs: true

// Include specific arguments by index
includeArgs: [0, 2]  // First and third arguments
```

## Custom Details Extractor

```typescript
detailsExtractor: (args, result, context) => ({
  // From arguments
  amount: args[0]?.amount,
  currency: args[0]?.currency,

  // From result
  fee: result?.fee,
  status: result?.status,

  // From context
  userCountry: context.user?.country,
  userLevel: context.user?.verificationLevel,

  // Computed
  isHighValue: args[0]?.amount > 1000000,
})
```

## Common Patterns

### Don't Log Sensitive Data

```typescript
@Post('login')
@AuditAuth('login', {
  includeArgs: false,        // Don't log password
  includeResult: false,      // Don't log tokens
})
async login() { }
```

### Log Financial Details

```typescript
@Post('transfer')
@AuditTransfer({
  detailsExtractor: (args, result) => ({
    amount: args[0]?.amount,
    currency: args[0]?.currency,
    recipientCountry: result?.recipient?.country,
    fee: result?.fee,
  }),
})
async createTransfer() { }
```

### Mark High-Risk Operations

```typescript
@Delete(':id')
@AuditDelete('account', {
  highRisk: true,
  detailsExtractor: (args) => ({
    reason: args[1]?.reason,
  }),
})
async deleteAccount() { }
```

### Admin Operations

```typescript
import { AuditAdmin } from '@/common/decorators/audit';

@Post(':id/suspend')
@AuditAdmin('suspend', 'user', {
  detailsExtractor: (args) => ({
    reason: args[1]?.reason,
    duration: args[1]?.duration,
  }),
})
async suspendUser() { }
```

## Querying Audit Logs

```typescript
import { AuditService } from '@/modules/admin/application/services/audit.service';

constructor(private auditService: AuditService) {}

// User activity
const userLogs = await this.auditService.query({
  actorId: 'user-123',
  startDate: new Date('2024-01-01'),
  page: 1,
  limit: 50,
});

// Resource history
const resourceLogs = await this.auditService.getResourceHistory(
  'transfer',
  'transfer-123'
);

// Recent high-risk actions
const recentLogs = await this.auditService.query({
  action: 'delete%',
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
});
```

## Naming Conventions

### Actions
- Format: `resource.verb`
- Examples: `transfer.create`, `kyc.approve`, `user.suspend`
- Consistent verbs: create, update, delete, read, approve, reject

### Resource Types
- Singular form: `transfer`, `wallet`, `user`
- Lowercase: `transfer` not `Transfer`
- No prefixes: `transfer` not `api_transfer`

## Testing

```typescript
import { Test } from '@nestjs/testing';
import { AuditService } from '@/modules/admin/application/services/audit.service';

// Mock AuditService in tests
const mockAuditService = {
  log: jest.fn(),
  query: jest.fn(),
};

const module = await Test.createTestingModule({
  providers: [
    { provide: AuditService, useValue: mockAuditService },
  ],
}).compile();
```

## Troubleshooting

### Not logging?
1. Check `APP_INTERCEPTOR` is registered
2. Verify `AdminModule` exports `AuditService`
3. Check database connection

### Sensitive data in logs?
```typescript
@AuditAuth('login', {
  includeArgs: false,
  sensitiveFields: ['password', 'pin', 'otp'],
})
```

### Performance issues?
1. Check database indexes exist
2. Implement log retention policy
3. Use pagination in queries

## Complete Example

```typescript
// transfer.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuditTransfer } from '@/common/decorators/audit';
import { CreateTransferDto } from '../dto/create-transfer.dto';

@Controller('transfers')
@UseGuards(JwtAuthGuard)
export class TransferController {
  constructor(
    private readonly createTransferUseCase: CreateTransferUseCase,
  ) {}

  @Post()
  @AuditTransfer({
    detailsExtractor: (args, result) => ({
      amount: args[0]?.amount,
      currency: args[0]?.currency || 'XOF',
      recipientId: args[0]?.recipientId,
      transferType: args[0]?.type || 'internal',
      fee: result?.fee,
      exchangeRate: result?.exchangeRate,
    }),
  })
  async createTransfer(
    @Body() dto: CreateTransferDto,
    @CurrentUser() user: User,
  ) {
    return this.createTransferUseCase.execute(dto, user.id);
  }
}
```

**Logged data:**
```json
{
  "id": "uuid",
  "actorId": "user-123",
  "actorType": "user",
  "action": "transfer.create",
  "resourceType": "transfer",
  "resourceId": "transfer-456",
  "details": {
    "method": "POST",
    "url": "/api/v1/transfers",
    "duration": 234,
    "success": true,
    "amount": 50000,
    "currency": "XOF",
    "recipientId": "user-789",
    "transferType": "internal",
    "fee": 500,
    "exchangeRate": 1.0
  },
  "ipAddress": "197.149.95.234",
  "userAgent": "Mozilla/5.0...",
  "createdAt": "2024-01-30T10:15:30.123Z"
}
```

## Files Reference

| File | Description |
|------|-------------|
| `audit-log.decorator.ts` | Core decorator and options |
| `audit-log.interceptor.ts` | Interceptor implementation |
| `audit-action.decorator.ts` | Predefined decorators |
| `README.md` | Full documentation |
| `SETUP.md` | Setup instructions |
| `examples.md` | Real-world examples |
| `ARCHITECTURE.md` | Technical details |

## Support

- Full docs: `/src/common/decorators/audit/README.md`
- Examples: `/src/common/decorators/audit/examples.md`
- Setup: `/src/common/decorators/audit/SETUP.md`
