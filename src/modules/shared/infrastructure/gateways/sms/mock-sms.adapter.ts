import { Injectable, Logger } from '@nestjs/common';
import {
  ISmsGateway,
  SendSmsRequest,
  SmsResponse,
} from '../../../domain/gateways/sms.gateway';

/**
 * Mock SMS Gateway
 *
 * Logs SMS messages to console instead of sending them.
 * Use for development and testing.
 *
 * To switch to a real provider:
 * 1. Create TwilioSmsAdapter or AfricasTalkingSmsAdapter
 * 2. Update SharedModule to provide the new adapter
 */
@Injectable()
export class MockSmsAdapter implements ISmsGateway {
  private readonly logger = new Logger(MockSmsAdapter.name);

  readonly providerName = 'mock';

  constructor() {
    this.logger.warn(
      'SMS Gateway running in MOCK mode - messages will be logged only',
    );
  }

  send(request: SendSmsRequest): Promise<SmsResponse> {
    const id = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(`
╔══════════════════════════════════════════════════════════════╗
║  📱 MOCK SMS                                                  ║
╠══════════════════════════════════════════════════════════════╣
║  To: ${request.to.padEnd(54)}║
║  Message: ${request.message.substring(0, 48).padEnd(48)}║
╚══════════════════════════════════════════════════════════════╝
    `);

    return Promise.resolve({
      id,
      to: request.to,
      status: 'sent',
      provider: this.providerName,
      createdAt: new Date(),
    });
  }

  async sendOtp(phone: string, otp: string): Promise<SmsResponse> {
    return this.send({
      to: phone,
      message: `Your verification code is: ${otp}. Valid for 5 minutes.`,
    });
  }

  getStatus(messageId: string): Promise<SmsResponse> {
    return Promise.resolve({
      id: messageId,
      to: 'unknown',
      status: 'delivered',
      provider: this.providerName,
      createdAt: new Date(),
    });
  }
}
