import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ISmsGateway,
  SendSmsRequest,
  SmsResponse,
} from '../../../domain/gateways/sms.gateway';

/**
 * Twilio SMS Gateway Adapter
 *
 * Implements ISmsGateway using Twilio API.
 * Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 */
@Injectable()
export class TwilioSmsAdapter implements ISmsGateway {
  private readonly logger = new Logger(TwilioSmsAdapter.name);
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly fromNumber: string;
  private readonly baseUrl: string;

  readonly providerName = 'twilio';

  constructor(private readonly configService: ConfigService) {
    this.accountSid =
      this.configService.get<string>('TWILIO_ACCOUNT_SID') || '';
    this.authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN') || '';
    this.fromNumber =
      this.configService.get<string>('TWILIO_PHONE_NUMBER') ||
      this.configService.get<string>('sms.senderId') ||
      'JoonaPay';
    this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}`;

    if (!this.accountSid || !this.authToken) {
      this.logger.warn(
        'Twilio credentials not configured. SMS sending will fail.',
      );
    } else {
      this.logger.log('Twilio SMS adapter initialized');
    }
  }

  async send(request: SendSmsRequest): Promise<SmsResponse> {
    if (!this.accountSid || !this.authToken) {
      throw new Error('Twilio credentials not configured');
    }

    try {
      const formData = new URLSearchParams();
      formData.append('To', request.to);
      formData.append('From', this.fromNumber);
      formData.append('Body', request.message);

      const response = await fetch(`${this.baseUrl}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(`${this.accountSid}:${this.authToken}`).toString(
              'base64',
            ),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as {
          message?: string;
          code?: number;
        };
        throw new Error(
          `Twilio API error: ${errorData.message || response.statusText}`,
        );
      }

      const result = (await response.json()) as {
        sid: string;
        to: string;
        status: string;
        date_created: string;
      };

      this.logger.log(`SMS sent successfully to ${request.to}: ${result.sid}`);

      return {
        id: result.sid,
        to: result.to,
        status: this.mapTwilioStatus(result.status),
        provider: this.providerName,
        createdAt: new Date(result.date_created),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send SMS via Twilio: ${errorMessage}`);
      throw error;
    }
  }

  async sendOtp(phone: string, otp: string): Promise<SmsResponse> {
    return this.send({
      to: phone,
      message: `Your JoonaPay verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`,
    });
  }

  async getStatus(messageId: string): Promise<SmsResponse> {
    if (!this.accountSid || !this.authToken) {
      throw new Error('Twilio credentials not configured');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/Messages/${messageId}.json`,
        {
          headers: {
            Authorization:
              'Basic ' +
              Buffer.from(`${this.accountSid}:${this.authToken}`).toString(
                'base64',
              ),
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to get message status: ${response.statusText}`);
      }

      const result = (await response.json()) as {
        sid: string;
        to: string;
        status: string;
        date_created: string;
      };

      return {
        id: result.sid,
        to: result.to,
        status: this.mapTwilioStatus(result.status),
        provider: this.providerName,
        createdAt: new Date(result.date_created),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get SMS status from Twilio: ${errorMessage}`,
      );
      throw error;
    }
  }

  private mapTwilioStatus(
    twilioStatus: string,
  ): 'queued' | 'sent' | 'delivered' | 'failed' {
    const statusMap: Record<
      string,
      'queued' | 'sent' | 'delivered' | 'failed'
    > = {
      queued: 'queued',
      sending: 'queued',
      sent: 'sent',
      delivered: 'delivered',
      undelivered: 'failed',
      failed: 'failed',
    };
    return statusMap[twilioStatus] || 'queued';
  }
}
