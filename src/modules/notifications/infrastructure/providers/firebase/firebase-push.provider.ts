/**
 * Firebase Cloud Messaging Push Provider
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import {
  IPushNotificationProvider,
} from '../../../domain/interfaces/notification-provider.interface';
import {
  PushNotificationPayload,
  DeliveryResult,
} from '../../../domain/interfaces/notification.types';

@Injectable()
export class FirebasePushProvider implements IPushNotificationProvider, OnModuleInit {
  private readonly logger = new Logger(FirebasePushProvider.name);
  readonly name = 'firebase';
  private initialized = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initialize();
  }

  private async initialize() {
    try {
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
      const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

      if (!projectId || !clientEmail || !privateKey) {
        this.logger.warn('Firebase credentials not configured, push notifications disabled');
        return;
      }

      // Check if already initialized
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
      }

      this.initialized = true;
      this.logger.log('Firebase Push Provider initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Push Provider', error);
    }
  }

  async send(token: string, payload: PushNotificationPayload): Promise<DeliveryResult> {
    const notificationId = uuidv4();

    if (!this.initialized) {
      return {
        notificationId,
        channel: 'push',
        status: 'failed',
        error: 'Firebase not initialized',
      };
    }

    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: this.stringifyData(payload.data),
        android: {
          priority: payload.priority === 'high' ? 'high' : 'normal',
          notification: {
            channelId: payload.channelId || 'default',
            sound: payload.sound || 'default',
          },
          ttl: (payload.ttlSeconds || 86400) * 1000,
        },
        apns: {
          headers: {
            'apns-priority': payload.priority === 'high' ? '10' : '5',
            'apns-expiration': String(
              Math.floor(Date.now() / 1000) + (payload.ttlSeconds || 86400)
            ),
          },
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body,
              },
              badge: payload.badge,
              sound: payload.sound || 'default',
            },
          },
        },
      };

      if (payload.collapseKey) {
        message.android!.collapseKey = payload.collapseKey;
        message.apns!.headers!['apns-collapse-id'] = payload.collapseKey;
      }

      const response = await admin.messaging().send(message);

      this.logger.debug(`Push notification sent: ${response}`);

      return {
        notificationId,
        channel: 'push',
        status: 'sent',
        providerMessageId: response,
        deliveredAt: new Date(),
      };
    } catch (error: any) {
      this.logger.error(`Failed to send push notification: ${error.message}`);

      return {
        notificationId,
        channel: 'push',
        status: 'failed',
        error: error.message,
      };
    }
  }

  async sendBatch(
    tokens: string[],
    payload: PushNotificationPayload,
  ): Promise<DeliveryResult[]> {
    if (!this.initialized) {
      return tokens.map(() => ({
        notificationId: uuidv4(),
        channel: 'push' as const,
        status: 'failed' as const,
        error: 'Firebase not initialized',
      }));
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: this.stringifyData(payload.data),
        android: {
          priority: payload.priority === 'high' ? 'high' : 'normal',
          notification: {
            channelId: payload.channelId || 'default',
            sound: payload.sound || 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body,
              },
              badge: payload.badge,
              sound: payload.sound || 'default',
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      return response.responses.map((res, index) => ({
        notificationId: uuidv4(),
        channel: 'push' as const,
        status: res.success ? 'sent' as const : 'failed' as const,
        providerMessageId: res.messageId,
        error: res.error?.message,
        metadata: { token: tokens[index] },
      }));
    } catch (error: any) {
      this.logger.error(`Failed to send batch push notifications: ${error.message}`);

      return tokens.map(() => ({
        notificationId: uuidv4(),
        channel: 'push' as const,
        status: 'failed' as const,
        error: error.message,
      }));
    }
  }

  async validateToken(token: string): Promise<boolean> {
    if (!this.initialized) return false;

    try {
      // Send a dry run message to validate the token
      await admin.messaging().send(
        {
          token,
          data: { test: 'true' },
        },
        true // dryRun
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  async subscribeToTopic(token: string, topic: string): Promise<void> {
    if (!this.initialized) return;

    try {
      await admin.messaging().subscribeToTopic([token], topic);
      this.logger.debug(`Token subscribed to topic: ${topic}`);
    } catch (error: any) {
      this.logger.error(`Failed to subscribe to topic: ${error.message}`);
    }
  }

  async unsubscribeFromTopic(token: string, topic: string): Promise<void> {
    if (!this.initialized) return;

    try {
      await admin.messaging().unsubscribeFromTopic([token], topic);
      this.logger.debug(`Token unsubscribed from topic: ${topic}`);
    } catch (error: any) {
      this.logger.error(`Failed to unsubscribe from topic: ${error.message}`);
    }
  }

  async sendToTopic(
    topic: string,
    payload: PushNotificationPayload,
  ): Promise<DeliveryResult> {
    const notificationId = uuidv4();

    if (!this.initialized) {
      return {
        notificationId,
        channel: 'push',
        status: 'failed',
        error: 'Firebase not initialized',
      };
    }

    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: this.stringifyData(payload.data),
      };

      const response = await admin.messaging().send(message);

      return {
        notificationId,
        channel: 'push',
        status: 'sent',
        providerMessageId: response,
        deliveredAt: new Date(),
      };
    } catch (error: any) {
      return {
        notificationId,
        channel: 'push',
        status: 'failed',
        error: error.message,
      };
    }
  }

  private stringifyData(data?: Record<string, any>): Record<string, string> | undefined {
    if (!data) return undefined;

    const stringified: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      stringified[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return stringified;
  }
}
