# Audit Logging Setup Guide

Step-by-step guide to enable audit logging in JoonaPay USDC Wallet.

## Prerequisites

Ensure you have the Admin module with AuditService already set up:
- `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/admin/application/services/audit.service.ts`
- `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/admin/infrastructure/persistence/typeorm/entities/audit-log.entity.ts`

## Step 1: Enable Audit Interceptor Globally

### Option A: Global Setup (Recommended)

Edit your `app.module.ts`:

```typescript
// /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/app.module.ts

import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogInterceptor } from './common/decorators/audit';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    AdminModule, // Required: provides AuditService
    // ... other modules
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    // ... other providers
  ],
})
export class AppModule {}
```

### Option B: Per-Module Setup

If you only want audit logging on specific modules:

```typescript
// /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/transfers/transfer.module.ts

import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogInterceptor } from '@/common/decorators/audit';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
      scope: Scope.REQUEST,
    },
  ],
})
export class TransferModule {}
```

### Option C: Per-Controller Setup

```typescript
import { Controller, UseInterceptors } from '@nestjs/common';
import { AuditLogInterceptor } from '@/common/decorators/audit';

@Controller('transfers')
@UseInterceptors(AuditLogInterceptor)
export class TransferController {
  // ...
}
```

## Step 2: Ensure Admin Module is Properly Configured

Make sure your Admin module exports AuditService:

```typescript
// /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/admin/admin.module.ts

import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './application/services/audit.service';
import { AuditLogEntity } from './infrastructure/persistence/typeorm/entities/audit-log.entity';

@Global() // Make AuditService available globally
@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  providers: [AuditService],
  exports: [AuditService], // Export for use in other modules
})
export class AdminModule {}
```

## Step 3: Start Using Audit Decorators

### Example 1: Transfer Controller

```typescript
// /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/transfers/application/controllers/transfer.controller.ts

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
  @AuditTransfer()
  async createTransfer(
    @Body() dto: CreateTransferDto,
    @CurrentUser() user: User,
  ) {
    return this.createTransferUseCase.execute(dto, user.id);
  }
}
```

### Example 2: Withdrawal Controller

```typescript
// /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/withdrawals/application/controllers/withdrawal.controller.ts

import { AuditWithdrawal } from '@/common/decorators/audit';

@Controller('withdrawals')
@UseGuards(JwtAuthGuard)
export class WithdrawalController {
  @Post()
  @AuditWithdrawal()
  async createWithdrawal(
    @Body() dto: CreateWithdrawalDto,
    @CurrentUser() user: User,
  ) {
    return this.createWithdrawalUseCase.execute(dto, user.id);
  }
}
```

### Example 3: KYC Controller

```typescript
// /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/kyc/application/controllers/kyc.controller.ts

import { AuditKyc } from '@/common/decorators/audit';

@Controller('kyc')
export class KycController {
  @Post('submit')
  @AuditKyc('submit')
  async submitKyc(@Body() dto: SubmitKycDto, @CurrentUser() user: User) {
    return this.kycUseCase.submit(dto, user.id);
  }

  @Post(':id/approve')
  @AuditKyc('approve')
  async approveKyc(
    @Param('id') id: string,
    @Body() dto: ApproveKycDto,
    @CurrentUser() admin: User,
  ) {
    return this.kycUseCase.approve(id, dto, admin.id);
  }
}
```

## Step 4: Verify Setup

### 1. Run the Application

```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet
npm run start:dev
```

### 2. Test Audit Logging

Make a request to an audited endpoint:

```bash
curl -X POST http://localhost:3000/api/v1/transfers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "recipientId": "recipient-123",
    "amount": 50000,
    "currency": "XOF",
    "note": "Test transfer"
  }'
```

### 3. Check Audit Logs

Query the database:

```sql
SELECT * FROM audit_logs
WHERE action = 'transfer.create'
ORDER BY created_at DESC
LIMIT 10;
```

Or use the AuditService:

```typescript
const logs = await this.auditService.query({
  action: 'transfer.create',
  startDate: new Date('2024-01-01'),
  limit: 10,
});

console.log(logs);
```

## Step 5: Migration (If Needed)

If the `audit_logs` table doesn't exist, create a migration:

```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet
npm run migration:generate -- -n CreateAuditLogsTable
```

Migration file:

```typescript
import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAuditLogsTable1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'actor_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'actor_type',
            type: 'varchar',
            length: '20',
            default: "'user'",
          },
          {
            name: 'action',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'resource_type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'resource_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'details',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create indexes for performance
    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_actor_id',
        columnNames: ['actor_id'],
      }),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_action',
        columnNames: ['action'],
      }),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_resource_type',
        columnNames: ['resource_type'],
      }),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_resource_id',
        columnNames: ['resource_id'],
      }),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_created_at',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('audit_logs');
  }
}
```

Run migration:

```bash
npm run migration:run
```

## Step 6: Configure Retention Policy (Optional)

Set up a cron job to clean old audit logs:

```typescript
// /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/admin/application/services/audit-cleanup.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuditService } from './audit.service';

@Injectable()
export class AuditCleanupService {
  private readonly logger = new Logger(AuditCleanupService.name);

  constructor(private readonly auditService: AuditService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldLogs() {
    this.logger.log('Starting audit log cleanup...');

    const retentionDays = parseInt(
      process.env.AUDIT_LOG_RETENTION_DAYS || '90',
      10,
    );

    const deletedCount = await this.auditService.cleanupOldLogs(retentionDays);

    this.logger.log(`Cleaned up ${deletedCount} audit logs older than ${retentionDays} days`);
  }
}
```

Add to your module:

```typescript
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [AuditCleanupService],
})
export class AdminModule {}
```

## Environment Variables

Add to your `.env` file:

```env
# Audit logging configuration
AUDIT_LOG_RETENTION_DAYS=90
AUDIT_LOG_SENSITIVE_FIELDS=password,pin,secret,token,apiKey
```

## Testing

Create a test to verify audit logging:

```typescript
// /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/test/audit/audit-logging.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AuditService } from '../../src/modules/admin/application/services/audit.service';

describe('Audit Logging (e2e)', () => {
  let app: INestApplication;
  let auditService: AuditService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    auditService = moduleFixture.get<AuditService>(AuditService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should log transfer creation', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/transfers')
      .set('Authorization', 'Bearer valid-token')
      .send({
        recipientId: 'recipient-123',
        amount: 50000,
        currency: 'XOF',
      })
      .expect(201);

    // Wait for async logging
    await new Promise((resolve) => setTimeout(resolve, 500));

    const logs = await auditService.query({
      action: 'transfer.create',
      resourceId: response.body.id,
    });

    expect(logs.total).toBeGreaterThan(0);
    expect(logs.logs[0]).toMatchObject({
      action: 'transfer.create',
      resourceType: 'transfer',
      resourceId: response.body.id,
    });
  });
});
```

## Troubleshooting

### Issue: Audit logs not appearing

**Solution:**
1. Check that AdminModule is imported and exports AuditService
2. Verify AuditLogInterceptor is registered globally or on the controller
3. Check database connection and `audit_logs` table exists
4. Look for errors in application logs

### Issue: "AuditService not found" error

**Solution:**
```typescript
// Make AdminModule global
@Global()
@Module({
  // ...
  exports: [AuditService],
})
export class AdminModule {}
```

### Issue: Sensitive data appearing in logs

**Solution:**
```typescript
@Post('login')
@AuditAuth('login', {
  includeArgs: false, // Don't log request body
  includeResult: false, // Don't log response
  sensitiveFields: ['password', 'pin', 'token'], // Add more fields
})
```

### Issue: Performance degradation

**Solution:**
1. Ensure indexes are created on `audit_logs` table
2. Implement log retention policy to limit table size
3. Consider async processing or message queue for high-volume operations

## Next Steps

1. Add audit decorators to all sensitive endpoints
2. Create compliance reports using audit logs
3. Set up monitoring/alerts for suspicious activities
4. Implement audit log export functionality
5. Create admin dashboard to view audit trail

## Quick Reference

```typescript
// Common imports
import {
  AuditLog,
  AuditCreate,
  AuditUpdate,
  AuditDelete,
  AuditTransfer,
  AuditWithdrawal,
  AuditDeposit,
  AuditKyc,
  AuditAuth,
  AuditAdmin,
  AuditConfig,
  AuditWebhook,
} from '@/common/decorators/audit';

// Basic usage
@Post()
@AuditCreate('resource')
async create() { }

// Custom usage
@Post()
@AuditLog({
  action: 'custom.action',
  resourceType: 'custom',
  resourceIdPath: 'result.id',
  includeArgs: true,
  detailsExtractor: (args, result) => ({ /* ... */ }),
})
async customAction() { }
```

## Support

For issues or questions:
- Check README.md for detailed documentation
- Review examples.md for real-world examples
- Consult the NestJS documentation for interceptors
