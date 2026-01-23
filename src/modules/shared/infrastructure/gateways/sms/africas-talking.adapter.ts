import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ISmsGateway,
  SendSmsRequest,
  SmsResponse,
} from '../../../domain/gateways/sms.gateway';

interface ATSmsResponse {
  SMSMessageData: {
    Message: string;
    Recipients: Array<{
      statusCode: number;
      number: string;
      cost: string;
      status: string;
      messageId: string;
    }>;
  };
}

/**
 * Africa's Talking SMS Gateway Adapter
 *
 * Implements ISmsGateway using Africa's Talking API.
 * Ideal for African mobile networks including Ivory Coast.
 * Requires: AT_USERNAME, AT_API_KEY
 */
@Injectable()
export class AfricasTalkingSmsAdapter implements ISmsGateway {
  private readonly logger = new Logger(AfricasTalkingSmsAdapter.name);
  private readonly username: string;
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly baseUrl: string;

  readonly providerName = 'africas_talking';

  constructor(private readonly configService: ConfigService) {
    this.username = this.configService.get<string>('AT_USERNAME') || '';
    this.apiKey = this.configService.get<string>('AT_API_KEY') || '';
    this.senderId =
      this.configService.get<string>('sms.senderId') || 'JoonaPay';

    // Use sandbox for testing, production for live
    const useSandbox =
      this.configService.get<string>('NODE_ENV') !== 'production';
    this.baseUrl = useSandbox
      ? 'https://api.sandbox.africastalking.com/version1'
      : 'https://api.africastalking.com/version1';

    if (!this.username || !this.apiKey) {
      this.logger.warn(
        "Africa's Talking credentials not configured. SMS sending will fail.",
      );
    } else {
      this.logger.log(
        `Africa's Talking SMS adapter initialized (${useSandbox ? 'sandbox' : 'production'})`,
      );
    }
  }

  async send(request: SendSmsRequest): Promise<SmsResponse> {
    if (!this.username || !this.apiKey) {
      throw new Error("Africa's Talking credentials not configured");
    }

    try {
      const formData = new URLSearchParams();
      formData.append('username', this.username);
      formData.append('to', request.to);
      formData.append('message', request.message);
      formData.append('from', this.senderId);

      const response = await fetch(`${this.baseUrl}/messaging`, {
        method: 'POST',
        headers: {
          apiKey: this.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        throw new Error(
          `Africa's Talking API error: ${response.statusText}`,
        );
      }

      const result = (await response.json()) as ATSmsResponse;
      const recipient = result.SMSMessageData.Recipients[0];

      if (!recipient) {
        throw new Error('No recipient data in response');
      }

      this.logger.log(
        `SMS sent successfully to ${request.to}: ${recipient.messageId}`,
      );

      return {
        id: recipient.messageId,
        to: recipient.number,
        status: this.mapATStatus(recipient.status),
        provider: this.providerName,
        createdAt: new Date(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send SMS via Africa's Talking: ${errorMessage}`,
      );
      throw error;
    }
  }

  async sendOtp(phone: string, otp: string): Promise<SmsResponse> {
    return this.send({
      to: phone,
      message: `Votre code de verification JoonaPay est: ${otp}. Valide pendant 5 minutes. Ne partagez pas ce code.`,
    });
  }

  async getStatus(messageId: string): Promise<SmsResponse> {
    // Africa's Talking uses delivery reports via webhooks
    // For manual status check, we'd need to query their reporting API
    this.logger.warn(
      `Status check for ${messageId} - AT uses webhooks for delivery reports`,
    );

    return {
      id: messageId,
      to: 'unknown',
      status: 'sent', // Assume sent if no webhook received
      provider: this.providerName,
      createdAt: new Date(),
    };
  }

  private mapATStatus(
    atStatus: string,
  ): 'queued' | 'sent' | 'delivered' | 'failed' {
    const statusMap: Record<string, 'queued' | 'sent' | 'delivered' | 'failed'> =
      {
        Success: 'sent',
        Sent: 'sent',
        Queued: 'queued',
        Buffered: 'queued',
        Rejected: 'failed',
        Failed: 'failed',
      };
    return statusMap[atStatus] || 'queued';
  }
}
