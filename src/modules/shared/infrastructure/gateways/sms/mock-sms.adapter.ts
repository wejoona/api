import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  ISmsGateway,
  SendSmsRequest,
  SmsResponse,
} from '../../../domain/gateways/sms.gateway';

interface SmsTemplates {
  templates: Record<string, string>;
  mockDeliveryStatus: string;
  mockDeliveryStatuses: string[];
  mockDeliveryDelay: number;
}

/**
 * Mock SMS Gateway
 *
 * Logs SMS messages to console instead of sending them.
 * Uses JSON mock data for templates and configuration.
 * Use for development and testing.
 */
@Injectable()
export class MockSmsAdapter implements ISmsGateway {
  private readonly logger = new Logger(MockSmsAdapter.name);
  private readonly mockData: SmsTemplates;

  readonly providerName = 'mock';

  constructor() {
    this.mockData = this.loadMockData();
    this.logger.warn(
      'SMS Gateway running in MOCK mode - messages will be logged only',
    );
  }

  private loadMockData(): SmsTemplates {
    try {
      const mockDataPath = path.join(
        __dirname,
        '../../../../providers/mock-data/sms/responses.json',
      );
      const data = fs.readFileSync(mockDataPath, 'utf-8');
      return JSON.parse(data) as SmsTemplates;
    } catch {
      // Return defaults if file doesn't exist
      return {
        templates: {
          otp: 'Your JoonaPay verification code is: {otp}. Valid for 5 minutes.',
        },
        mockDeliveryStatus: 'sent',
        mockDeliveryStatuses: ['queued', 'sent', 'delivered', 'failed'],
        mockDeliveryDelay: 0,
      };
    }
  }

  send(request: SendSmsRequest): Promise<SmsResponse> {
    const id = `sms_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(`
╔══════════════════════════════════════════════════════════════╗
║  📱 MOCK SMS                                                  ║
╠══════════════════════════════════════════════════════════════╣
║  To: ${request.to.padEnd(54)}║
║  Message: ${request.message.substring(0, 48).padEnd(48)}║
${request.message.length > 48 ? `║           ${request.message.substring(48, 96).padEnd(48)}║\n` : ''}╚══════════════════════════════════════════════════════════════╝
    `);

    return Promise.resolve({
      id,
      to: request.to,
      status: this.mockData.mockDeliveryStatus as
        | 'queued'
        | 'sent'
        | 'delivered'
        | 'failed',
      provider: this.providerName,
      createdAt: new Date(),
    });
  }

  async sendOtp(phone: string, otp: string): Promise<SmsResponse> {
    const template =
      this.mockData.templates.otp || this.mockData.templates.otp_fr;
    const message = template
      ? template.replace('{otp}', otp)
      : `Your verification code is: ${otp}. Valid for 5 minutes.`;

    return this.send({
      to: phone,
      message,
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

  /**
   * Get a template by name and substitute variables
   */
  getTemplate(
    templateName: string,
    variables: Record<string, string> = {},
  ): string {
    let template = this.mockData.templates[templateName] || '';
    for (const [key, value] of Object.entries(variables)) {
      template = template.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return template;
  }
}
