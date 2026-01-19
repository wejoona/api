import { Module, Global } from '@nestjs/common';
import { PAYMENT_GATEWAY, SMS_GATEWAY } from './domain/gateways';
import { YellowCardPaymentAdapter } from './infrastructure/gateways/payment';
import { MockSmsAdapter } from './infrastructure/gateways/sms';

/**
 * SharedModule provides global access to external service gateways.
 *
 * Gateways are abstracted behind interfaces so implementations can be swapped:
 * - PAYMENT_GATEWAY: Currently Yellow Card, can switch to Bridge.xyz, Circle, in-house
 * - SMS_GATEWAY: Currently Mock, can switch to Twilio, Africa's Talking, etc.
 */
@Global()
@Module({
  providers: [
    // Payment Gateway (Yellow Card implementation)
    {
      provide: PAYMENT_GATEWAY,
      useClass: YellowCardPaymentAdapter,
    },
    // SMS Gateway (Mock implementation - logs to console)
    {
      provide: SMS_GATEWAY,
      useClass: MockSmsAdapter,
    },
  ],
  exports: [PAYMENT_GATEWAY, SMS_GATEWAY],
})
export class SharedModule {}
