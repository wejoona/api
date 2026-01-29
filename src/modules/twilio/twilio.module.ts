import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TwilioWebhookController } from '../webhook/application/controllers/twilio-webhook.controller';
import { TwilioWebhookService } from '../webhook/application/services/twilio-webhook.service';

/**
 * Twilio Module
 *
 * Encapsulates all Twilio-related functionality:
 * - SMS adapter (in shared/infrastructure/gateways/sms)
 * - Webhook handling
 * - Delivery status tracking
 *
 * The SMS adapter itself is provided by SharedModule via the SMS_GATEWAY token
 * This module focuses on webhook handling and status tracking
 */
@Global()
@Module({
  imports: [ConfigModule, EventEmitterModule],
  controllers: [TwilioWebhookController],
  providers: [TwilioWebhookService],
  exports: [TwilioWebhookService],
})
export class TwilioModule {}
