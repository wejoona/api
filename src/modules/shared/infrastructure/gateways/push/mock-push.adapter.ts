import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  IPushGateway,
  SendPushRequest,
  SendMulticastPushRequest,
  PushResponse,
  MulticastPushResponse,
} from '../../../domain/gateways/push.gateway';

interface PushMockData {
  templates: Record<string, { title: string; body: string; data: Record<string, string> }>;
  mockDeliveryStatus: string;
  priorities: Record<string, string[]>;
}

/**
 * Mock Push Notification Gateway
 *
 * Logs push notifications to console instead of sending them.
 * Uses JSON mock data for templates and configuration.
 * Use for development and testing.
 */
@Injectable()
export class MockPushAdapter implements IPushGateway {
  private readonly logger = new Logger(MockPushAdapter.name);
  private readonly mockData: PushMockData;

  readonly providerName = 'mock';

  constructor() {
    this.mockData = this.loadMockData();
    this.logger.warn(
      'Push Gateway running in MOCK mode - notifications will be logged only',
    );
  }

  private loadMockData(): PushMockData {
    try {
      const mockDataPath = path.join(
        __dirname,
        '../../../../providers/mock-data/push/responses.json',
      );
      const data = fs.readFileSync(mockDataPath, 'utf-8');
      return JSON.parse(data) as PushMockData;
    } catch {
      return {
        templates: {},
        mockDeliveryStatus: 'sent',
        priorities: { high: [], normal: [] },
      };
    }
  }

  async send(request: SendPushRequest): Promise<PushResponse> {
    const id = `push_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(`
╔══════════════════════════════════════════════════════════════╗
║  🔔 MOCK PUSH NOTIFICATION                                   ║
╠══════════════════════════════════════════════════════════════╣
║  Device: ${request.deviceToken.substring(0, 20).padEnd(42)}║
║  Title: ${request.title.substring(0, 45).padEnd(45)}║
║  Body: ${request.body.substring(0, 46).padEnd(46)}║
║  Priority: ${(request.priority || 'normal').padEnd(42)}║
${request.data ? `║  Data: ${JSON.stringify(request.data).substring(0, 44).padEnd(44)}║\n` : ''}╚══════════════════════════════════════════════════════════════╝
    `);

    return {
      id,
      success: true,
      deviceToken: request.deviceToken,
      provider: this.providerName,
      createdAt: new Date(),
    };
  }

  async sendMulticast(request: SendMulticastPushRequest): Promise<MulticastPushResponse> {
    const responses: PushResponse[] = [];

    for (const token of request.deviceTokens) {
      const response = await this.send({
        deviceToken: token,
        title: request.title,
        body: request.body,
        data: request.data,
        imageUrl: request.imageUrl,
        sound: request.sound,
        priority: request.priority,
      });
      responses.push(response);
    }

    return {
      successCount: responses.filter((r) => r.success).length,
      failureCount: responses.filter((r) => !r.success).length,
      responses,
    };
  }

  async subscribeToTopic(deviceToken: string, topic: string): Promise<boolean> {
    this.logger.log(`[MOCK] Device ${deviceToken.substring(0, 20)}... subscribed to topic: ${topic}`);
    return true;
  }

  async unsubscribeFromTopic(deviceToken: string, topic: string): Promise<boolean> {
    this.logger.log(`[MOCK] Device ${deviceToken.substring(0, 20)}... unsubscribed from topic: ${topic}`);
    return true;
  }

  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ messageId: string }> {
    const messageId = `push_topic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(`
╔══════════════════════════════════════════════════════════════╗
║  🔔 MOCK TOPIC NOTIFICATION                                  ║
╠══════════════════════════════════════════════════════════════╣
║  Topic: ${topic.padEnd(48)}║
║  Title: ${title.substring(0, 45).padEnd(45)}║
║  Body: ${body.substring(0, 46).padEnd(46)}║
${data ? `║  Data: ${JSON.stringify(data).substring(0, 44).padEnd(44)}║\n` : ''}╚══════════════════════════════════════════════════════════════╝
    `);

    return { messageId };
  }

  /**
   * Get a template by name and substitute variables
   */
  getTemplate(
    templateName: string,
    variables: Record<string, string> = {},
  ): { title: string; body: string; data: Record<string, string> } | null {
    const template = this.mockData.templates[templateName];
    if (!template) return null;

    let title = template.title;
    let body = template.body;

    for (const [key, value] of Object.entries(variables)) {
      title = title.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      body = body.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }

    return { title, body, data: template.data };
  }
}
