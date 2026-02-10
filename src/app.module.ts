import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CqrsModule } from '@nestjs/cqrs';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bull';
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
import { BulkPaymentsModule } from './modules/bulk-payments/bulk-payments.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { VerificationModule } from './modules/verification/verification.module';
import { DeviceModule } from './modules/device/device.module';
import { SessionModule } from './modules/session/session.module';
import { BeneficiaryModule } from './modules/beneficiary/beneficiary.module';
import { BankLinkingModule } from './modules/bank-linking/bank-linking.module';
import { FeatureFlagModule } from './modules/feature-flag/feature-flag.module';
import { RecurringTransferModule } from './modules/recurring-transfers/recurring-transfer.module';
import { DepositModule } from './modules/deposit/deposit.module';
import { ApiKeysModule } from './modules/api-keys';
import { CardsModule } from './modules/cards/cards.module';
import { SlaConfigurationModule } from './modules/sla-configuration';
import { SupportModule } from './modules/support';
import { DataRetentionModule } from './modules/data-retention';
import { ProfilingModule } from './modules/profiling';
import { TracingModule } from './modules/tracing';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { CorrelationModule } from './modules/correlation';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { BusinessModule } from './modules/business';
import { SubBusinessModule } from './modules/sub-business';

// Previously unregistered modules
import { SavingsPotsModule } from './modules/savings-pots/savings-pots.module';
import { ScheduledPaymentsModule } from './modules/scheduled-payments/scheduled-payments.module';
import { SanctionsScreeningModule } from './modules/sanctions-screening/sanctions-screening.module';
import { RegulatoryReportsModule } from './modules/regulatory-reports/regulatory-reports.module';
import { EventStoreModule } from './modules/event-store/event-store.module';
import { ApiHealthModule } from './modules/api-health/api-health.module';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module';
import { BatchProcessingModule } from './modules/batch-processing/batch-processing.module';
import { ResilienceModule } from './modules/resilience/resilience.module';
import { PaymentLinksModule } from './modules/payment-links/payment-links.module';

// Provider Modules
import { CircleModule } from './modules/providers/circle';
import { YellowCardModule } from './modules/providers/yellowcard';
import { StellarModule } from './modules/providers/stellar';
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
        synchronize: configService.get<boolean>('database.synchronize', false), // Uses DATABASE_SYNCHRONIZE env var
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

    // Bull queue (Redis-backed job processing)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          password: configService.get<string>('redis.password'),
          db: configService.get<number>('redis.db', 0),
        },
      }),
    }),

    // Distributed Tracing (OpenTelemetry + Jaeger)
    TracingModule,

    // Correlation ID Tracking (Request tracing across services)
    CorrelationModule,

    // Provider modules (external integrations)
    CircleModule, // Identity, Wallets, Transfers
    YellowCardModule, // On-ramp/Off-ramp for Africa
    StellarModule, // Stellar blockchain USDC (alternative to Circle)
    BlnkModule, // Ledger/Accounting (source of truth)
    TwilioModule, // SMS OTP delivery and webhook handling

    // Core feature modules
    SharedModule,
    UserModule,
    VerificationModule, // Email, phone, and identity verification
    DeviceModule, // Device registration and management
    SessionModule, // User session management with refresh tokens
    WalletModule,
    DepositModule, // Mobile money to USDC deposits
    BeneficiaryModule, // Saved beneficiaries for faster transfers
    BankLinkingModule, // Bank account linking for deposits/withdrawals
    RecurringTransferModule, // Recurring/scheduled transfers
    CardsModule, // Virtual and physical card management
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
    BulkPaymentsModule, // Bulk payment processing for batch transfers
    MonitoringModule, // Transaction monitoring and alerts
    ComplianceModule, // BCEAO compliance and AML/CFT
    SlaConfigurationModule, // SLA configurations for support tickets and KYC
    SupportModule, // Customer support ticket system with SLA tracking
    DataRetentionModule, // Data retention policies and GDPR compliance
    ProfilingModule, // Performance profiling and monitoring
    RealtimeModule, // WebSocket real-time notifications
    AnalyticsModule, // Spending insights and analytics
    BusinessModule, // Business account management for organizations
    SubBusinessModule, // Sub-business entity management for organizations

    // Previously orphan modules — DI wiring verified
    ResilienceModule,
    EventStoreModule,
    PaymentLinksModule,
    BatchProcessingModule,
    SavingsPotsModule,
    ScheduledPaymentsModule,
    SanctionsScreeningModule,
    RegulatoryReportsModule,
    ReconciliationModule,
    ApiHealthModule,
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
