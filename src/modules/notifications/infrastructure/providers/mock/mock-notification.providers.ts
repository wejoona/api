/**
 * Mock Notification Providers
 * For development and testing
 */

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  IPushNotificationProvider,
  ISmsNotificationProvider,
  IEmailNotificationProvider,
} from '../../../domain/interfaces/notification-provider.interface';
import {
  PushNotificationPayload,
  SmsNotificationPayload,
  EmailNotificationPayload,
  DeliveryResult,
} from '../../../domain/interfaces/notification.types';

@Injectable()
export class MockPushProvider implements IPushNotificationProvider {
  private readonly logger = new Logger(MockPushProvider.name);
  readonly name = 'mock_push';

  async send(token: string, payload: PushNotificationPayload): Promise<DeliveryResult> {
    this.logger.debug(`[MOCK PUSH] Sending to ${token.substring(0, 20)}...`);
    this.logger.debug(`[MOCK PUSH] Title: ${payload.title}`);
    this.logger.debug(`[MOCK PUSH] Body: ${payload.body}`);

    await this.delay(50);

    return {
      notificationId: uuidv4(),
      channel: 'push',
      status: 'sent',
      providerMessageId: `mock_${uuidv4()}`,
      deliveredAt: new Date(),
    };
  }

  async sendBatch(tokens: string[], payload: PushNotificationPayload): Promise<DeliveryResult[]> {
    this.logger.debug(`[MOCK PUSH] Batch sending to ${tokens.length} devices`);

    await this.delay(100);

    return tokens.map(() => ({
      notificationId: uuidv4(),
      channel: 'push' as const,
      status: 'sent' as const,
      providerMessageId: `mock_${uuidv4()}`,
      deliveredAt: new Date(),
    }));
  }

  async validateToken(token: string): Promise<boolean> {
    // Simulate invalid token if it contains "invalid"
    return !token.includes('invalid');
  }

  async subscribeToTopic(token: string, topic: string): Promise<void> {
    this.logger.debug(`[MOCK PUSH] Subscribed ${token.substring(0, 20)}... to topic: ${topic}`);
  }

  async unsubscribeFromTopic(token: string, topic: string): Promise<void> {
    this.logger.debug(`[MOCK PUSH] Unsubscribed ${token.substring(0, 20)}... from topic: ${topic}`);
  }

  async sendToTopic(topic: string, payload: PushNotificationPayload): Promise<DeliveryResult> {
    this.logger.debug(`[MOCK PUSH] Sending to topic: ${topic}`);

    await this.delay(50);

    return {
      notificationId: uuidv4(),
      channel: 'push',
      status: 'sent',
      providerMessageId: `mock_topic_${uuidv4()}`,
      deliveredAt: new Date(),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

@Injectable()
export class MockSmsProvider implements ISmsNotificationProvider {
  private readonly logger = new Logger(MockSmsProvider.name);
  readonly name = 'mock_sms';

  async send(payload: SmsNotificationPayload): Promise<DeliveryResult> {
    this.logger.debug(`[MOCK SMS] Sending to ${payload.phoneNumber}`);
    this.logger.debug(`[MOCK SMS] Message: ${payload.message}`);

    await this.delay(100);

    return {
      notificationId: uuidv4(),
      channel: 'sms',
      status: 'sent',
      providerMessageId: `mock_sms_${uuidv4()}`,
      deliveredAt: new Date(),
    };
  }

  async sendBatch(payloads: SmsNotificationPayload[]): Promise<DeliveryResult[]> {
    this.logger.debug(`[MOCK SMS] Batch sending to ${payloads.length} numbers`);

    await this.delay(200);

    return payloads.map(() => ({
      notificationId: uuidv4(),
      channel: 'sms' as const,
      status: 'sent' as const,
      providerMessageId: `mock_sms_${uuidv4()}`,
      deliveredAt: new Date(),
    }));
  }

  async getDeliveryStatus(messageId: string): Promise<DeliveryResult> {
    return {
      notificationId: messageId,
      channel: 'sms',
      status: 'delivered',
      providerMessageId: messageId,
      deliveredAt: new Date(),
    };
  }

  async validatePhoneNumber(phoneNumber: string): Promise<boolean> {
    // Basic validation
    return /^\+?[1-9]\d{7,14}$/.test(phoneNumber.replace(/\s/g, ''));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

@Injectable()
export class MockEmailProvider implements IEmailNotificationProvider {
  private readonly logger = new Logger(MockEmailProvider.name);
  readonly name = 'mock_email';

  async send(payload: EmailNotificationPayload): Promise<DeliveryResult> {
    this.logger.debug(`[MOCK EMAIL] Sending to ${payload.to}`);
    this.logger.debug(`[MOCK EMAIL] Subject: ${payload.subject}`);

    await this.delay(100);

    return {
      notificationId: uuidv4(),
      channel: 'email',
      status: 'sent',
      providerMessageId: `mock_email_${uuidv4()}`,
      deliveredAt: new Date(),
    };
  }

  async sendBatch(payloads: EmailNotificationPayload[]): Promise<DeliveryResult[]> {
    this.logger.debug(`[MOCK EMAIL] Batch sending to ${payloads.length} addresses`);

    await this.delay(200);

    return payloads.map(() => ({
      notificationId: uuidv4(),
      channel: 'email' as const,
      status: 'sent' as const,
      providerMessageId: `mock_email_${uuidv4()}`,
      deliveredAt: new Date(),
    }));
  }

  async sendWithTemplate(
    to: string,
    templateId: string,
    data: Record<string, any>,
  ): Promise<DeliveryResult> {
    this.logger.debug(`[MOCK EMAIL] Sending template ${templateId} to ${to}`);
    this.logger.debug(`[MOCK EMAIL] Template data: ${JSON.stringify(data)}`);

    await this.delay(100);

    return {
      notificationId: uuidv4(),
      channel: 'email',
      status: 'sent',
      providerMessageId: `mock_email_template_${uuidv4()}`,
      deliveredAt: new Date(),
    };
  }

  async validateEmail(email: string): Promise<boolean> {
    // Basic email validation
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
