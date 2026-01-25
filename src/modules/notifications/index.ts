// Notifications Module Exports
export { NotificationsModule } from './notifications.module';

// Services
export { NotificationService } from './application/services/notification.service';
export type {
  SendNotificationInput,
  SendNotificationResult,
} from './application/services/notification.service';
export { TemplateRendererService } from './application/services/template-renderer.service';

// Provider Interfaces
export {
  IPushNotificationProvider,
  ISmsNotificationProvider,
  IEmailNotificationProvider,
  PUSH_NOTIFICATION_PROVIDER,
  SMS_NOTIFICATION_PROVIDER,
  EMAIL_NOTIFICATION_PROVIDER,
} from './domain/interfaces/notification-provider.interface';

// Types
export type {
  NotificationChannel,
  NotificationCategory,
  NotificationPriority,
  DeliveryStatus,
  NotificationPayload,
  PushNotificationPayload,
  SmsNotificationPayload,
  EmailNotificationPayload,
  DeviceToken,
  NotificationPreferences,
  DeliveryResult,
  NotificationHistoryEntry,
  NotificationTemplate,
  TransactionNotificationEvent,
  KycNotificationEvent,
  SecurityNotificationEvent,
  RiskNotificationEvent,
  ReferralNotificationEvent,
} from './domain/interfaces/notification.types';

// Providers
export { FirebasePushProvider } from './infrastructure/providers/firebase/firebase-push.provider';
export {
  MockPushProvider,
  MockSmsProvider,
  MockEmailProvider,
} from './infrastructure/providers/mock/mock-notification.providers';
