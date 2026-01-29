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
import { BillPaymentsModule } from './modules/bill-payments/bill-payments.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { VerificationModule } from './modules/verification/verification.module';
import { DeviceModule } from './modules/device/device.module';
import { SessionModule } from './modules/session/session.module';
import { BeneficiaryModule } from './modules/beneficiary/beneficiary.module';
import { FeatureFlagModule } from './modules/feature-flag/feature-flag.module';
import { ApiKeysModule } from './modules/api-keys';
import { SlaConfigurationModule } from './modules/sla-configuration';
import { SupportModule } from './modules/support';
import { DataRetentionModule } from './modules/data-retention';
import { ProfilingModule } from './modules/profiling';

// Provider Modules
import { CircleModule } from './modules/providers/circle';
import { YellowCardModule } from './modules/providers/yellowcard';
import { BlnkModule } from './modules/providers/blnk';
import { TwilioModule } from './modules/twilio/twilio.module';

// APM and Profiling
import { ApmService } from './common/apm';
import { DatabaseProfiler } from './common/profilers/database.profiler';

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
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('rateLimit.ttl', 60) * 1000,
          limit: configService.get<number>('rateLimit.limit', 100),
        },
      ],
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
    TwilioModule, // SMS OTP delivery and webhook handling

    // Core feature modules
    SharedModule,
    UserModule,
    VerificationModule, // Email, phone, and identity verification
    DeviceModule, // Device registration and management
    SessionModule, // User session management with refresh tokens
    WalletModule,
    BeneficiaryModule, // Saved beneficiaries for faster transfers
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
    FeatureFlagModule, // Feature flags for gradual rollout
    ApiKeysModule, // External API key management
    UploadModule, // S3 document upload
    KycModule, // KYC verification flow
    LivenessModule, // Challenge-based liveness detection
    MerchantModule, // Merchant QR payment system
    BillPaymentsModule, // Bill payments for West African utilities
    MonitoringModule, // Transaction monitoring and alerts
    ComplianceModule, // BCEAO compliance and AML/CFT
    SlaConfigurationModule, // SLA configurations for support tickets and KYC
    SupportModule, // Customer support ticket system with SLA tracking
    DataRetentionModule, // Data retention policies and GDPR compliance
    ProfilingModule, // Performance profiling and monitoring
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ApmService,
    DatabaseProfiler,
    // Apply rate limiting globally to all endpoints
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
