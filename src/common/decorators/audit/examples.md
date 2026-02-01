# Audit Decorator Examples

Real-world examples for JoonaPay USDC Wallet.

## Financial Operations

### Transfers

```typescript
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuditTransfer } from '@/common/decorators/audit';
import { CreateTransferDto } from '../dto/create-transfer.dto';
import { CreateTransferUseCase } from '../usecases/create-transfer.use-case';

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
      recipientCountry: result?.recipient?.country,
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

### Withdrawals

```typescript
import { AuditWithdrawal } from '@/common/decorators/audit';

@Controller('withdrawals')
export class WithdrawalController {
  @Post()
  @AuditWithdrawal({
    detailsExtractor: (args, result) => ({
      amount: args[0]?.amount,
      currency: args[0]?.currency || 'XOF',
      provider: args[0]?.provider, // Orange Money, MTN, Wave
      phoneNumber: args[0]?.phoneNumber,
      fee: result?.fee,
      estimatedArrival: result?.estimatedArrival,
      exchangeRate: result?.exchangeRate,
    }),
  })
  async createWithdrawal(
    @Body() dto: CreateWithdrawalDto,
    @CurrentUser() user: User,
  ) {
    return this.withdrawalUseCase.execute(dto, user.id);
  }

  @Post(':id/cancel')
  @AuditLog({
    action: 'withdrawal.cancel',
    resourceType: 'withdrawal',
    resourceIdPath: 'args.0',
    includeArgs: [1],
    highRisk: true,
  })
  async cancelWithdrawal(
    @Param('id') id: string,
    @Body() dto: CancelWithdrawalDto,
    @CurrentUser() user: User,
  ) {
    return this.withdrawalUseCase.cancel(id, dto.reason, user.id);
  }
}
```

### Deposits

```typescript
import { AuditDeposit } from '@/common/decorators/audit';

@Controller('deposits')
export class DepositController {
  @Post()
  @AuditDeposit({
    detailsExtractor: (args, result) => ({
      amount: args[0]?.amount,
      currency: args[0]?.currency || 'XOF',
      method: args[0]?.method, // mobile_money, bank_transfer, card
      provider: args[0]?.provider,
      source: args[0]?.phoneNumber || args[0]?.accountNumber,
      fee: result?.fee,
      expectedCredit: result?.expectedCreditTime,
    }),
  })
  async createDeposit(
    @Body() dto: CreateDepositDto,
    @CurrentUser() user: User,
  ) {
    return this.depositUseCase.execute(dto, user.id);
  }
}
```

## User Management

### Registration

```typescript
import { AuditCreate } from '@/common/decorators/audit';

@Controller('auth')
export class AuthController {
  @Post('register')
  @AuditCreate('user', {
    resourceIdPath: 'result.userId',
    includeArgs: false, // Don't log password/pin
    detailsExtractor: (args, result) => ({
      phoneNumber: args[0]?.phoneNumber,
      country: args[0]?.country,
      registrationMethod: args[0]?.method,
      deviceId: args[0]?.deviceId,
    }),
  })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }
}
```

### Login/Authentication

```typescript
import { AuditAuth } from '@/common/decorators/audit';

@Controller('auth')
export class AuthController {
  @Post('login')
  @AuditAuth('login', {
    includeArgs: false, // Never log credentials
    includeResult: false, // Never log tokens
    detailsExtractor: (args, result) => ({
      phoneNumber: args[0]?.phoneNumber,
      loginMethod: args[0]?.method, // pin, biometric, otp
      deviceId: args[0]?.deviceId,
      deviceName: args[0]?.deviceName,
      newDevice: result?.isNewDevice,
    }),
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @AuditAuth('logout')
  async logout(@CurrentUser() user: User) {
    return this.authService.logout(user.id);
  }

  @Post('password/reset')
  @AuditAuth('password_reset', {
    detailsExtractor: (args) => ({
      phoneNumber: args[0]?.phoneNumber,
      resetMethod: args[0]?.method, // sms, email
    }),
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('password/change')
  @AuditAuth('password_change', {
    includeArgs: false,
  })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: User,
  ) {
    return this.authService.changePassword(user.id, dto);
  }
}
```

## KYC Operations

```typescript
import { AuditKyc } from '@/common/decorators/audit';

@Controller('kyc')
export class KycController {
  @Post('submit')
  @AuditKyc('submit', {
    detailsExtractor: (args, result) => ({
      documentTypes: args[0]?.documents?.map(d => d.type),
      verificationLevel: args[0]?.level, // basic, enhanced
      country: args[0]?.country,
      submissionId: result?.id,
    }),
  })
  async submitKyc(@Body() dto: SubmitKycDto, @CurrentUser() user: User) {
    return this.kycUseCase.submit(dto, user.id);
  }

  @Post(':id/approve')
  @AuditKyc('approve', {
    detailsExtractor: (args, result) => ({
      submissionId: args[0],
      approvedLevel: result?.verificationLevel,
      approvedDocuments: result?.documents?.map(d => d.type),
      verificationScore: result?.verificationScore,
      notes: args[1]?.notes,
    }),
  })
  async approveKyc(
    @Param('id') id: string,
    @Body() dto: ApproveKycDto,
    @CurrentUser() admin: User,
  ) {
    return this.kycUseCase.approve(id, dto, admin.id);
  }

  @Post(':id/reject')
  @AuditKyc('reject', {
    detailsExtractor: (args) => ({
      submissionId: args[0],
      rejectionReason: args[1]?.reason,
      requiredDocuments: args[1]?.requiredDocuments,
      notes: args[1]?.notes,
    }),
  })
  async rejectKyc(
    @Param('id') id: string,
    @Body() dto: RejectKycDto,
    @CurrentUser() admin: User,
  ) {
    return this.kycUseCase.reject(id, dto, admin.id);
  }

  @Post(':id/request-review')
  @AuditKyc('request_review', {
    detailsExtractor: (args) => ({
      submissionId: args[0],
      reviewReason: args[1]?.reason,
      flags: args[1]?.flags,
    }),
  })
  async requestReview(
    @Param('id') id: string,
    @Body() dto: RequestReviewDto,
    @CurrentUser() user: User,
  ) {
    return this.kycUseCase.requestReview(id, dto, user.id);
  }
}
```

## Wallet Management

```typescript
import { AuditCreate, AuditUpdate, AuditRead } from '@/common/decorators/audit';

@Controller('wallets')
export class WalletController {
  @Post()
  @AuditCreate('wallet', {
    detailsExtractor: (args, result) => ({
      currency: args[0]?.currency || 'XOF',
      walletType: args[0]?.type || 'personal',
      initialBalance: result?.balance,
    }),
  })
  async createWallet(@Body() dto: CreateWalletDto, @CurrentUser() user: User) {
    return this.walletUseCase.create(dto, user.id);
  }

  @Get(':id/balance')
  @AuditRead('wallet', {
    resourceIdPath: 'args.0',
    detailsExtractor: (args, result) => ({
      balance: result?.balance,
      currency: result?.currency,
      lastTransaction: result?.lastTransactionAt,
    }),
  })
  async getBalance(@Param('id') id: string, @CurrentUser() user: User) {
    return this.walletUseCase.getBalance(id, user.id);
  }

  @Patch(':id/freeze')
  @AuditUpdate('wallet', {
    resourceIdPath: 'args.0',
    highRisk: true,
    detailsExtractor: (args) => ({
      reason: args[1]?.reason,
      duration: args[1]?.duration,
      adminNote: args[1]?.adminNote,
    }),
  })
  async freezeWallet(
    @Param('id') id: string,
    @Body() dto: FreezeWalletDto,
    @CurrentUser() admin: User,
  ) {
    return this.walletUseCase.freeze(id, dto, admin.id);
  }
}
```

## Admin Operations

```typescript
import { AuditAdmin } from '@/common/decorators/audit';

@Controller('admin/users')
export class AdminUserController {
  @Post(':id/suspend')
  @AuditAdmin('suspend', 'user', {
    resourceIdPath: 'args.0',
    detailsExtractor: (args) => ({
      reason: args[1]?.reason,
      duration: args[1]?.duration,
      notes: args[1]?.notes,
    }),
  })
  async suspendUser(
    @Param('id') id: string,
    @Body() dto: SuspendUserDto,
    @CurrentUser() admin: User,
  ) {
    return this.adminUseCase.suspendUser(id, dto, admin.id);
  }

  @Delete(':id')
  @AuditAdmin('delete', 'user', {
    resourceIdPath: 'args.0',
    highRisk: true,
    detailsExtractor: (args) => ({
      reason: args[1]?.reason,
      dataRetention: args[1]?.retainData,
      notes: args[1]?.notes,
    }),
  })
  async deleteUser(
    @Param('id') id: string,
    @Body() dto: DeleteUserDto,
    @CurrentUser() admin: User,
  ) {
    return this.adminUseCase.deleteUser(id, dto, admin.id);
  }

  @Post(':id/unlock')
  @AuditAdmin('unlock', 'user', {
    resourceIdPath: 'args.0',
    detailsExtractor: (args) => ({
      lockReason: args[1]?.lockReason,
      unlockReason: args[1]?.unlockReason,
    }),
  })
  async unlockUser(
    @Param('id') id: string,
    @Body() dto: UnlockUserDto,
    @CurrentUser() admin: User,
  ) {
    return this.adminUseCase.unlockUser(id, dto, admin.id);
  }
}
```

## Configuration Management

```typescript
import { AuditConfig } from '@/common/decorators/audit';

@Controller('admin/config')
export class ConfigController {
  @Patch('fees')
  @AuditConfig('update', {
    detailsExtractor: (args) => ({
      previousFees: args[1]?.previousValues,
      newFees: args[0],
      changedFields: Object.keys(args[0]),
    }),
  })
  async updateFees(
    @Body() dto: UpdateFeesDto,
    @CurrentUser() admin: User,
  ) {
    return this.configUseCase.updateFees(dto, admin.id);
  }

  @Patch('limits')
  @AuditConfig('update', {
    detailsExtractor: (args) => ({
      previousLimits: args[1]?.previousValues,
      newLimits: args[0],
      affectedUsers: args[1]?.affectedUserCount,
    }),
  })
  async updateLimits(
    @Body() dto: UpdateLimitsDto,
    @CurrentUser() admin: User,
  ) {
    return this.configUseCase.updateLimits(dto, admin.id);
  }
}
```

## Webhook Processing

```typescript
import { AuditWebhook } from '@/common/decorators/audit';

@Controller('webhooks')
export class WebhookController {
  @Post('yellow-card')
  @AuditWebhook('received', {
    detailsExtractor: (args) => ({
      provider: 'yellow_card',
      eventType: args[0]?.type,
      eventId: args[0]?.id,
      transactionId: args[0]?.data?.transactionId,
    }),
  })
  async handleYellowCardWebhook(@Body() dto: YellowCardWebhookDto) {
    return this.webhookUseCase.processYellowCard(dto);
  }

  @Post('circle')
  @AuditWebhook('received', {
    detailsExtractor: (args) => ({
      provider: 'circle',
      eventType: args[0]?.type,
      eventId: args[0]?.id,
      transferId: args[0]?.data?.transferId,
    }),
  })
  async handleCircleWebhook(@Body() dto: CircleWebhookDto) {
    return this.webhookUseCase.processCircle(dto);
  }
}

// In use case
@Injectable()
export class ProcessWebhookUseCase {
  async processYellowCard(dto: YellowCardWebhookDto) {
    try {
      const result = await this.process(dto);

      // Log successful processing
      await this.auditService.log({
        action: 'webhook.processed',
        resourceType: 'webhook',
        resourceId: dto.id,
        actorType: 'system',
        details: {
          provider: 'yellow_card',
          eventType: dto.type,
          processingTime: Date.now() - startTime,
          affectedTransaction: result.transactionId,
        },
      });

      return result;
    } catch (error) {
      // Log failed processing
      await this.auditService.log({
        action: 'webhook.failed',
        resourceType: 'webhook',
        resourceId: dto.id,
        actorType: 'system',
        details: {
          provider: 'yellow_card',
          eventType: dto.type,
          error: error.message,
          retryAttempt: dto.retryCount,
        },
      });

      throw error;
    }
  }
}
```

## Beneficiary Management

```typescript
import { AuditCreate, AuditDelete } from '@/common/decorators/audit';

@Controller('beneficiaries')
export class BeneficiaryController {
  @Post()
  @AuditCreate('beneficiary', {
    detailsExtractor: (args, result) => ({
      beneficiaryName: args[0]?.name,
      phoneNumber: args[0]?.phoneNumber,
      country: args[0]?.country,
      relationship: args[0]?.relationship,
    }),
  })
  async addBeneficiary(
    @Body() dto: AddBeneficiaryDto,
    @CurrentUser() user: User,
  ) {
    return this.beneficiaryUseCase.add(dto, user.id);
  }

  @Delete(':id')
  @AuditDelete('beneficiary', {
    detailsExtractor: (args, result, context) => ({
      beneficiaryName: result?.name,
      phoneNumber: result?.phoneNumber,
      totalTransfersSent: result?.transferCount,
      lastTransferDate: result?.lastTransferAt,
    }),
  })
  async removeBeneficiary(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.beneficiaryUseCase.remove(id, user.id);
  }
}
```

## Reporting and Analytics

```typescript
@Controller('reports')
export class ReportController {
  @Get('audit-trail')
  @AuditRead('report', {
    detailsExtractor: (args) => ({
      reportType: 'audit_trail',
      dateRange: {
        start: args[0]?.startDate,
        end: args[0]?.endDate,
      },
      filters: args[0]?.filters,
      exportFormat: args[0]?.format,
    }),
  })
  async generateAuditTrail(
    @Query() query: AuditTrailQueryDto,
    @CurrentUser() admin: User,
  ) {
    return this.reportUseCase.generateAuditTrail(query, admin.id);
  }

  @Get('transactions')
  @AuditRead('report', {
    detailsExtractor: (args) => ({
      reportType: 'transactions',
      userId: args[0]?.userId,
      dateRange: {
        start: args[0]?.startDate,
        end: args[0]?.endDate,
      },
      transactionTypes: args[0]?.types,
    }),
  })
  async generateTransactionReport(
    @Query() query: TransactionReportQueryDto,
    @CurrentUser() admin: User,
  ) {
    return this.reportUseCase.generateTransactionReport(query, admin.id);
  }
}
```

## Best Practices Summary

1. **Always audit financial operations**
   - Transfers, withdrawals, deposits
   - Include amount, currency, parties involved

2. **Never log sensitive data**
   - Passwords, PINs, tokens
   - Use `includeArgs: false` or `includeResult: false`
   - Add to `sensitiveFields` array

3. **Mark high-risk operations**
   - Deletions, suspensions, approvals
   - Use `highRisk: true`

4. **Extract meaningful context**
   - Use `detailsExtractor` for domain-specific info
   - Include business-relevant details

5. **Use consistent action naming**
   - `resource.action` format
   - `transfer.create`, `kyc.approve`, `user.suspend`
