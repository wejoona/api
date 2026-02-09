import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PAYMENT_GATEWAY, SMS_GATEWAY, PUSH_GATEWAY } from './domain/gateways';
import { YellowCardPaymentAdapter } from './infrastructure/gateways/payment';
import { SmsFactory, createSmsGateway } from './infrastructure/gateways/sms';
import { PushFactory, createPushGateway } from './infrastructure/gateways/push';
import { CacheInvalidationService, KeyVaultService, NtmClientService } from './infrastructure/services';

/**
 * SharedModule provides global access to external service gateways.
 *
 * Gateways are abstracted behind interfaces so implementations can be swapped:
 * - PAYMENT_GATEWAY: Currently Yellow Card, can switch to Bridge.xyz, Circle, in-house
 * - SMS_GATEWAY: Factory-based (mock, twilio, africas_talking) - configured via SMS_PROVIDER env var
 * - PUSH_GATEWAY: Factory-based (mock, fcm) - configured via FCM_* env vars
 *
 * SMS Provider Selection (SMS_PROVIDER env var):
 * - 'mock': Logs to console (default for development)
 * - 'twilio': Uses Twilio API (requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)
 * - 'africas_talking': Uses Africa's Talking API (requires AT_USERNAME, AT_API_KEY)
 *
 * Push Provider Selection (FCM_* env vars):
 * - Mock mode if FCM_USE_MOCK=true or FCM_PROJECT_ID is not set
 * - FCM mode requires FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY
 */
@Global()
@Module({
  imports: [ConfigModule, HttpModule],
  providers: [
    // Cache Service
    CacheInvalidationService,
    // NTM Client (Notification Template Manager)
    NtmClientService,
    // Key Vault (AES-256-GCM encryption for secrets at rest)
    KeyVaultService,
    // Payment Gateway (Yellow Card implementation)
    {
      provide: PAYMENT_GATEWAY,
      useClass: YellowCardPaymentAdapter,
    },
    // SMS Factory
    SmsFactory,
    // SMS Gateway (factory-based provider selection)
    {
      provide: SMS_GATEWAY,
      useFactory: createSmsGateway,
      inject: [SmsFactory],
    },
    // Push Factory
    PushFactory,
    // Push Gateway (factory-based provider selection)
    {
      provide: PUSH_GATEWAY,
      useFactory: createPushGateway,
      inject: [PushFactory],
    },
  ],
  exports: [
    PAYMENT_GATEWAY,
    SMS_GATEWAY,
    PUSH_GATEWAY,
    SmsFactory,
    PushFactory,
    CacheInvalidationService,
    KeyVaultService,
    NtmClientService,
  ],
})
export class SharedModule {}
