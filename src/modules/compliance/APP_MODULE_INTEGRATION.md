# App Module Integration Guide

## Adding Compliance Module to App Module

Update `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/app.module.ts`:

### Step 1: Import the Module

Add to the imports section at the top of the file:

```typescript
import { ComplianceModule } from './modules/compliance';
import { RiskModule } from './modules/risk';
```

### Step 2: Add to Module Imports Array

Add `ComplianceModule` to the imports array (around line 154, after `MerchantModule`):

```typescript
@Module({
  imports: [
    // ... existing imports ...
    MerchantModule, // Merchant QR payment system
    ComplianceModule, // BCEAO Compliance Engine
  ],
  // ... rest of module
})
```

### Complete Updated app.module.ts

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CqrsModule } from '@nestjs/cqrs';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

import { configuration, envValidationSchema } from './config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CustomTypeOrmLogger } from './common/logger';

// Core Modules
import { SharedModule } from './modules/shared/shared.module';
import { UserModule } from './modules/user/user.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { TransactionModule } from './modules/transaction/transaction.module';
import { TransferModule } from './modules/transfer/transfer.module';
import { NotificationModule } from './modules/notification/notification.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { ReferralModule } from './modules/referral/referral.module';
import { AdminModule } from './modules/admin';
import { ReportsModule } from './modules/reports';
import { JobsModule } from './modules/jobs';
import { HealthModule } from './modules/health';
import { SecurityModule } from './modules/security';
import { LegalModule } from './modules/legal/legal.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { UserPreferencesModule } from './modules/user-preferences/user-preferences.module';
import { MetricsModule } from './modules/metrics';
import { KycModule } from './modules/kyc/kyc.module';
import { UploadModule } from './modules/upload/upload.module';
import { LivenessModule } from './modules/liveness/liveness.module';
import { MerchantModule } from './modules/merchant/merchant.module';
import { ComplianceModule } from './modules/compliance'; // ADD THIS
import { RiskModule } from './modules/risk'; // Already exists

// Provider Modules
import { CircleModule } from './modules/providers/circle';
import { YellowCardModule } from './modules/providers/yellowcard';
import { BlnkModule } from './modules/providers/blnk';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),

    // Cache - Global Redis cache configuration
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const store = await redisStore({
          socket: {
            host: configService.get<string>('redis.host'),
            port: configService.get<number>('redis.port'),
          },
          password: configService.get<string>('redis.password'),
          database: configService.get<number>('redis.db'),
        });

        return {
          store,
          ttl: 300, // Default TTL: 5 minutes (in seconds)
        };
      },
    }),

    // Database - NEVER use synchronize in production, always use migrations
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        database: configService.get<string>('database.name'),
        username: configService.get<string>('database.user'),
        password: configService.get<string>('database.password'),
        autoLoadEntities: true,
        synchronize: false, // SECURITY: Always use migrations, never auto-sync
        logging: true,
        logger: new CustomTypeOrmLogger(),
        // PERFORMANCE: Connection pooling for better concurrency and resource management
        extra: {
          max: 20, // Maximum pool size
          min: 5, // Minimum pool size (always-ready connections)
          idleTimeoutMillis: 30000, // Close idle connections after 30s
          connectionTimeoutMillis: 2000, // Fail fast if can't get connection in 2s
        },
        // PERFORMANCE: Log slow queries in development for optimization
        maxQueryExecutionTime: 1000, // Log queries taking longer than 1s
      }),
    }),

    // Rate limiting - configured via environment
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ([
        {
          ttl: configService.get<number>('rateLimit.ttl', 60) * 1000,
          limit: configService.get<number>('rateLimit.limit', 100),
        },
      ]),
    }),

    // CQRS
    CqrsModule,

    // Event Emitter (for notifications)
    EventEmitterModule.forRoot(),

    // Scheduled tasks (reconciliation, cleanup jobs)
    ScheduleModule.forRoot(),

    // Provider modules (external integrations)
    CircleModule, // Identity, Wallets, Transfers
    YellowCardModule, // On-ramp/Off-ramp for Africa
    BlnkModule, // Ledger/Accounting (source of truth)

    // Core feature modules
    SharedModule,
    UserModule,
    WalletModule,
    TransactionModule,
    TransferModule,
    NotificationModule,
    WebhookModule,
    ReferralModule,
    AdminModule,
    ReportsModule,
    JobsModule,
    HealthModule,
    MetricsModule,
    SecurityModule,
    LegalModule,
    ContactsModule,
    UserPreferencesModule,
    UploadModule, // S3 document upload
    KycModule, // KYC verification flow
    LivenessModule, // Challenge-based liveness detection
    MerchantModule, // Merchant QR payment system
    RiskModule, // Risk assessment and management
    ComplianceModule, // BCEAO Compliance Engine - ADD THIS LINE
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply rate limiting globally to all endpoints
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

## Integration Verification

After adding the module, verify it's loaded correctly:

### 1. Start the application

```bash
npm run start:dev
```

### 2. Check logs for module initialization

Look for these log entries:
```
[Nest] INFO [InstanceLoader] ComplianceModule dependencies initialized
[Nest] INFO [RoutesResolver] ComplianceController {/api/v1/compliance}
[Nest] INFO [BCEAOReportingService] Scheduled jobs registered
```

### 3. Verify routes registered

```bash
# Check all compliance routes are registered
curl http://localhost:3000/api/v1/compliance/dashboard/health
```

Expected response (even without auth):
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

This confirms the route exists (401 means auth required, which is correct).

### 4. Check scheduled jobs

```bash
# View all scheduled jobs
npm run start:dev 2>&1 | grep -i "scheduled"
```

Expected output:
```
[Nest] INFO Mapped scheduled job: daily_bceao_report
[Nest] INFO Mapped scheduled job: weekly_bceao_report
[Nest] INFO Mapped scheduled job: monthly_bceao_report
```

## Using the Module in Other Services

### Example 1: Transaction Service Integration

```typescript
// src/modules/transaction/transaction.service.ts
import { AMLCFTService } from '@modules/compliance';

@Injectable()
export class TransactionService {
  constructor(
    // ... other dependencies
    private readonly amlCftService: AMLCFTService,
  ) {}

  async createTransaction(userId: string, amount: number) {
    // Screen transaction
    const assessment = await this.amlCftService.analyzeTransaction(
      userId,
      amount,
    );

    if (!assessment.approved) {
      throw new ForbiddenException('Transaction blocked: compliance risk');
    }

    // Create transaction...
  }
}
```

### Example 2: Admin Dashboard Integration

```typescript
// src/modules/admin/admin.controller.ts
import { ComplianceDashboardService } from '@modules/compliance';

@Controller('admin')
export class AdminController {
  constructor(
    // ... other dependencies
    private readonly complianceDashboard: ComplianceDashboardService,
  ) {}

  @Get('dashboard')
  async getDashboard() {
    const [
      // ... other dashboard data
      complianceHealth,
    ] = await Promise.all([
      // ... other calls
      this.complianceDashboard.getComplianceHealthScore(),
    ]);

    return {
      // ... other data
      compliance: complianceHealth,
    };
  }
}
```

### Example 3: Using the Screening Guard

```typescript
// src/modules/transfer/transfer.controller.ts
import { TransactionScreeningGuard } from '@modules/compliance';

@Controller('transfer')
export class TransferController {
  @Post()
  @UseGuards(TransactionScreeningGuard) // Add this guard
  async createTransfer(@Body() dto: CreateTransferDto) {
    // Transaction automatically screened by guard
    return this.transferService.create(dto);
  }
}
```

## Troubleshooting Integration

### Issue: Module not loading

**Check:**
```typescript
// Verify import path is correct
import { ComplianceModule } from './modules/compliance';

// Not './modules/compliance/compliance.module'
```

### Issue: Scheduled jobs not running

**Check:**
```typescript
// Ensure ScheduleModule.forRoot() is called BEFORE ComplianceModule
@Module({
  imports: [
    ScheduleModule.forRoot(), // Must be first
    ComplianceModule,
  ],
})
```

### Issue: Events not firing

**Check:**
```typescript
// Ensure EventEmitterModule.forRoot() is called
@Module({
  imports: [
    EventEmitterModule.forRoot(), // Required
    ComplianceModule,
  ],
})
```

### Issue: Database entities not found

**Check:**
```typescript
// Ensure autoLoadEntities: true in TypeORM config
TypeOrmModule.forRoot({
  autoLoadEntities: true, // Automatically discover entities
})
```

## Next Steps After Integration

1. **Run database migrations**
   ```bash
   npm run migration:run
   ```

2. **Configure environment variables**
   ```bash
   cp src/modules/compliance/.env.example .env
   # Edit .env with your values
   ```

3. **Test endpoints**
   ```bash
   # Import Postman collection
   # File: src/modules/compliance/postman/compliance-api.postman_collection.json
   ```

4. **Monitor first report generation**
   ```bash
   # Wait until midnight WAT (00:00 UTC)
   # Check logs for:
   [Nest] INFO [BCEAOReportingService] Generating daily BCEAO report
   ```

5. **Train compliance team**
   - Share API documentation
   - Conduct system walkthrough
   - Practice SAR filing workflow

## Production Deployment

Before deploying to production:

1. **Review configuration**
   - Ensure `BCEAO_COMPLIANCE_ENABLED=true`
   - Set proper thresholds for production volume
   - Configure BCEAO API credentials

2. **Run migrations on production database**
   ```bash
   NODE_ENV=production npm run migration:run
   ```

3. **Deploy application**
   ```bash
   pm2 deploy production
   ```

4. **Verify deployment**
   ```bash
   curl https://api.joonapay.com/api/v1/compliance/dashboard/health
   ```

5. **Monitor for 24 hours**
   - Check scheduled job execution
   - Review any generated alerts
   - Verify report generation
   - Monitor performance metrics

## Integration Checklist

- [ ] `ComplianceModule` imported in `app.module.ts`
- [ ] Database migrations executed
- [ ] Environment variables configured
- [ ] Scheduled jobs verified
- [ ] API endpoints tested
- [ ] Event listeners working
- [ ] Guards functional (if used)
- [ ] Monitoring configured
- [ ] Documentation reviewed
- [ ] Team trained

## Support

If you encounter integration issues:

1. Check application logs: `pm2 logs`
2. Verify database connection: `psql -U postgres -d usdc_wallet -c "SELECT 1"`
3. Review configuration: Check all required env vars are set
4. Consult documentation: See README.md and ARCHITECTURE.md

For technical support: tech-support@joonapay.com
