/**
 * Notifications Module
 * Multi-channel notification system
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Providers
import {
  PUSH_NOTIFICATION_PROVIDER,
  SMS_NOTIFICATION_PROVIDER,
  EMAIL_NOTIFICATION_PROVIDER,
} from './domain/interfaces/notification-provider.interface';
import { FirebasePushProvider } from './infrastructure/providers/firebase/firebase-push.provider';
import {
  MockPushProvider,
  MockSmsProvider,
  MockEmailProvider,
} from './infrastructure/providers/mock/mock-notification.providers';

// Repositories
import { NotificationPreferencesRepository } from './infrastructure/repositories/notification-preferences.repository';
import { DeviceTokenRepository } from './infrastructure/repositories/device-token.repository';
import { NotificationHistoryRepository } from './infrastructure/repositories/notification-history.repository';

// Services
import { NotificationService } from './application/services/notification.service';
import { TemplateRendererService } from './application/services/template-renderer.service';

// Listeners
import { TransactionNotificationListener } from './application/listeners/transaction-notification.listener';
import { KycNotificationListener } from './application/listeners/kyc-notification.listener';
import { SecurityNotificationListener } from './application/listeners/security-notification.listener';
import { RiskNotificationListener } from './application/listeners/risk-notification.listener';
import { ReferralNotificationListener } from './application/listeners/referral-notification.listener';
import { ScheduledPaymentNotificationListener } from './application/listeners/scheduled-payment-notification.listener';

// Controllers
import { NotificationController } from './application/controllers/notification.controller';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [NotificationController],
  providers: [
    // Repositories
    NotificationPreferencesRepository,
    DeviceTokenRepository,
    NotificationHistoryRepository,

    // Services
    NotificationService,
    TemplateRendererService,

    // Listeners
    TransactionNotificationListener,
    KycNotificationListener,
    SecurityNotificationListener,
    RiskNotificationListener,
    ReferralNotificationListener,
    ScheduledPaymentNotificationListener,

    // Provider implementations
    FirebasePushProvider,
    MockPushProvider,
    MockSmsProvider,
    MockEmailProvider,

    // Dynamic provider selection based on environment
    {
      provide: PUSH_NOTIFICATION_PROVIDER,
      useFactory: (configService: ConfigService, firebase: FirebasePushProvider, mock: MockPushProvider) => {
        const mode = configService.get<string>('NOTIFICATION_MODE', 'mock');
        return mode === 'live' ? firebase : mock;
      },
      inject: [ConfigService, FirebasePushProvider, MockPushProvider],
    },
    {
      provide: SMS_NOTIFICATION_PROVIDER,
      useFactory: (configService: ConfigService, mock: MockSmsProvider) => {
        // TODO: Add Twilio provider for live mode
        return mock;
      },
      inject: [ConfigService, MockSmsProvider],
    },
    {
      provide: EMAIL_NOTIFICATION_PROVIDER,
      useFactory: (configService: ConfigService, mock: MockEmailProvider) => {
        // TODO: Add SendGrid provider for live mode
        return mock;
      },
      inject: [ConfigService, MockEmailProvider],
    },
  ],
  exports: [
    NotificationService,
    TemplateRendererService,
    PUSH_NOTIFICATION_PROVIDER,
    SMS_NOTIFICATION_PROVIDER,
    EMAIL_NOTIFICATION_PROVIDER,
  ],
})
export class NotificationsModule {}
