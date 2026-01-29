import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { TwilioWebhookService } from '../services/twilio-webhook.service';

interface TwilioWebhookPayload {
  MessageSid: string;
  MessageStatus: string;
  To: string;
  From: string;
  Body?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  SmsSid?: string;
  SmsStatus?: string;
  AccountSid?: string;
}

/**
 * Twilio Webhook Controller
 *
 * Handles Twilio delivery status callbacks (StatusCallback)
 * Updates SMS delivery status in the system
 *
 * Webhook URL: POST /webhooks/twilio/sms-status
 *
 * Configure in Twilio Console:
 * 1. Go to Phone Numbers > Active Numbers > [Your Number]
 * 2. Set StatusCallback URL to: https://your-api.com/webhooks/twilio/sms-status
 * 3. Or configure in Messaging Service if using Messaging Service SID
 *
 * Security: Validates Twilio signature to prevent spoofing
 */
@Controller('webhooks/twilio')
export class TwilioWebhookController {
  private readonly logger = new Logger(TwilioWebhookController.name);
  private readonly authToken: string;
  private readonly validateSignatures: boolean;

  constructor(
    private readonly twilioWebhookService: TwilioWebhookService,
    private readonly configService: ConfigService,
  ) {
    this.authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN') || '';
    this.validateSignatures = this.configService.get<boolean>(
      'TWILIO_VALIDATE_SIGNATURES',
      true,
    );

    if (!this.authToken && this.validateSignatures) {
      this.logger.warn(
        'Twilio auth token not configured. Signature validation disabled.',
      );
    }
  }

  /**
   * Handle SMS status callback from Twilio
   * POST /webhooks/twilio/sms-status
   */
  @HttpCode(HttpStatus.OK)
  @Post('sms-status')
  async handleSmsStatus(
    @Body() payload: TwilioWebhookPayload,
    @Headers('x-twilio-signature') signature?: string,
  ): Promise<{ success: boolean }> {
    this.logger.log(
      `Received Twilio webhook: ${payload.MessageSid} - ${payload.MessageStatus}`,
    );

    // Validate Twilio signature
    if (this.validateSignatures && this.authToken) {
      const isValid = this.validateTwilioSignature(
        signature || '',
        payload,
        this.getWebhookUrl(),
      );

      if (!isValid) {
        this.logger.warn(
          `Invalid Twilio signature for message ${payload.MessageSid}`,
        );
        throw new BadRequestException('Invalid signature');
      }
    }

    // Process webhook
    try {
      await this.twilioWebhookService.handleStatusCallback({
        messageSid: payload.MessageSid || payload.SmsSid,
        status: payload.MessageStatus || payload.SmsStatus,
        to: payload.To,
        from: payload.From,
        errorCode: payload.ErrorCode,
        errorMessage: payload.ErrorMessage,
      });

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to process Twilio webhook: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Still return 200 to prevent Twilio retries
      // Log error for investigation
      return { success: false };
    }
  }

  /**
   * Validate Twilio signature
   * Prevents webhook spoofing attacks
   */
  private validateTwilioSignature(
    signature: string,
    payload: any,
    url: string,
  ): boolean {
    try {
      // Sort payload keys and create string
      const sortedKeys = Object.keys(payload).sort();
      let data = url;

      for (const key of sortedKeys) {
        data += key + payload[key];
      }

      // Compute HMAC SHA256
      const expectedSignature = crypto
        .createHmac('sha1', this.authToken)
        .update(Buffer.from(data, 'utf-8'))
        .digest('base64');

      // Constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      this.logger.error('Failed to validate Twilio signature', error);
      return false;
    }
  }

  /**
   * Get webhook URL from configuration
   */
  private getWebhookUrl(): string {
    const baseUrl =
      this.configService.get<string>('app.publicUrl') ||
      'https://api.joonapay.com';
    return `${baseUrl}/webhooks/twilio/sms-status`;
  }

  /**
   * Health check endpoint
   * GET /webhooks/twilio/health
   */
  @HttpCode(HttpStatus.OK)
  @Post('health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}
