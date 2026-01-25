/**
 * Notification Service
 * Core service for sending notifications across all channels
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import {
  IPushNotificationProvider,
  ISmsNotificationProvider,
  IEmailNotificationProvider,
  PUSH_NOTIFICATION_PROVIDER,
  SMS_NOTIFICATION_PROVIDER,
  EMAIL_NOTIFICATION_PROVIDER,
} from '../../domain/interfaces/notification-provider.interface';
import {
  NotificationPayload,
  NotificationChannel,
  DeliveryResult,
  NotificationPreferences,
  DeviceToken,
  PushNotificationPayload,
  SmsNotificationPayload,
  EmailNotificationPayload,
} from '../../domain/interfaces/notification.types';
import { NotificationPreferencesRepository } from '../../infrastructure/repositories/notification-preferences.repository';
import { DeviceTokenRepository } from '../../infrastructure/repositories/device-token.repository';
import { NotificationHistoryRepository } from '../../infrastructure/repositories/notification-history.repository';
import { TemplateRendererService } from './template-renderer.service';

export interface SendNotificationInput {
  userId: string;
  category: NotificationPayload['category'];
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;
  deepLink?: string;
  priority?: NotificationPayload['priority'];
  channels?: NotificationChannel[];
  templateId?: string;
  templateData?: Record<string, any>;
  phoneNumber?: string;
  email?: string;
}

export interface SendNotificationResult {
  notificationId: string;
  deliveryResults: DeliveryResult[];
  channelsSent: NotificationChannel[];
  channelsSkipped: NotificationChannel[];
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(PUSH_NOTIFICATION_PROVIDER)
    private readonly pushProvider: IPushNotificationProvider,
    @Inject(SMS_NOTIFICATION_PROVIDER)
    private readonly smsProvider: ISmsNotificationProvider,
    @Inject(EMAIL_NOTIFICATION_PROVIDER)
    private readonly emailProvider: IEmailNotificationProvider,
    private readonly preferencesRepository: NotificationPreferencesRepository,
    private readonly deviceTokenRepository: DeviceTokenRepository,
    private readonly historyRepository: NotificationHistoryRepository,
    private readonly templateRenderer: TemplateRendererService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Send notification to user across configured channels
   */
  async send(input: SendNotificationInput): Promise<SendNotificationResult> {
    const notificationId = uuidv4();
    this.logger.log(`Sending notification ${notificationId} to user ${input.userId}`);

    // Get user preferences
    const preferences = await this.preferencesRepository.findByUserId(input.userId);
    const userLanguage = preferences?.language || 'en';

    // Determine channels to use
    const channelsToUse = this.determineChannels(
      input.channels || ['push', 'in_app'],
      input.category,
      preferences,
    );

    // Render template if provided
    let title = input.title;
    let body = input.body;
    if (input.templateId && input.templateData) {
      const rendered = await this.templateRenderer.render(
        input.templateId,
        input.templateData,
        userLanguage,
      );
      title = rendered.title || title;
      body = rendered.body || body;
    }

    const deliveryResults: DeliveryResult[] = [];
    const channelsSent: NotificationChannel[] = [];
    const channelsSkipped: NotificationChannel[] = [];

    // Send to each channel in parallel
    const sendPromises: Promise<void>[] = [];

    if (channelsToUse.includes('push')) {
      sendPromises.push(
        this.sendPush(input.userId, {
          title,
          body,
          data: input.data,
          imageUrl: input.imageUrl,
          priority: input.priority === 'critical' ? 'high' : 'normal',
        }).then(results => {
          deliveryResults.push(...results);
          if (results.some(r => r.status === 'sent')) {
            channelsSent.push('push');
          }
        }).catch(err => {
          this.logger.error(`Push notification failed: ${err.message}`);
          channelsSkipped.push('push');
        })
      );
    } else {
      channelsSkipped.push('push');
    }

    if (channelsToUse.includes('sms') && input.phoneNumber) {
      sendPromises.push(
        this.sendSms({
          phoneNumber: input.phoneNumber,
          message: body,
        }).then(result => {
          deliveryResults.push(result);
          if (result.status === 'sent') {
            channelsSent.push('sms');
          }
        }).catch(err => {
          this.logger.error(`SMS notification failed: ${err.message}`);
          channelsSkipped.push('sms');
        })
      );
    } else if (channelsToUse.includes('sms')) {
      channelsSkipped.push('sms');
    }

    if (channelsToUse.includes('email') && input.email) {
      sendPromises.push(
        this.sendEmail({
          to: input.email,
          subject: title,
          htmlBody: this.wrapEmailHtml(title, body),
          textBody: body,
        }).then(result => {
          deliveryResults.push(result);
          if (result.status === 'sent') {
            channelsSent.push('email');
          }
        }).catch(err => {
          this.logger.error(`Email notification failed: ${err.message}`);
          channelsSkipped.push('email');
        })
      );
    } else if (channelsToUse.includes('email')) {
      channelsSkipped.push('email');
    }

    // In-app notifications are stored in history
    if (channelsToUse.includes('in_app')) {
      channelsSent.push('in_app');
      deliveryResults.push({
        notificationId,
        channel: 'in_app',
        status: 'delivered',
        deliveredAt: new Date(),
      });
    }

    await Promise.all(sendPromises);

    // Save to history
    await this.historyRepository.create({
      id: notificationId,
      userId: input.userId,
      notificationId,
      category: input.category,
      title,
      body,
      data: input.data,
      channels: channelsSent,
      deliveryResults,
      createdAt: new Date(),
    });

    // Emit event
    this.eventEmitter.emit('notification.sent', {
      notificationId,
      userId: input.userId,
      category: input.category,
      channelsSent,
      channelsSkipped,
    });

    this.logger.log(`Notification ${notificationId} sent to ${channelsSent.join(', ')}`);

    return {
      notificationId,
      deliveryResults,
      channelsSent,
      channelsSkipped,
    };
  }

  /**
   * Send push notification to user's devices
   */
  async sendPush(
    userId: string,
    payload: PushNotificationPayload,
  ): Promise<DeliveryResult[]> {
    const tokens = await this.deviceTokenRepository.findByUserId(userId);
    const activeTokens = tokens.filter(t => t.isActive);

    if (activeTokens.length === 0) {
      this.logger.debug(`No active device tokens for user ${userId}`);
      return [];
    }

    const tokenStrings = activeTokens.map(t => t.token);
    return this.pushProvider.sendBatch(tokenStrings, payload);
  }

  /**
   * Send SMS notification
   */
  async sendSms(payload: SmsNotificationPayload): Promise<DeliveryResult> {
    return this.smsProvider.send(payload);
  }

  /**
   * Send email notification
   */
  async sendEmail(payload: EmailNotificationPayload): Promise<DeliveryResult> {
    return this.emailProvider.send(payload);
  }

  /**
   * Register device token for push notifications
   */
  async registerDeviceToken(
    userId: string,
    token: string,
    platform: 'ios' | 'android' | 'web',
  ): Promise<DeviceToken> {
    // Validate token
    const isValid = await this.pushProvider.validateToken(token);
    if (!isValid) {
      throw new Error('Invalid device token');
    }

    // Check if token already exists
    const existing = await this.deviceTokenRepository.findByToken(token);
    if (existing) {
      // Update existing token
      return this.deviceTokenRepository.update(existing.id, {
        userId,
        isActive: true,
        lastUsedAt: new Date(),
      });
    }

    // Create new token
    return this.deviceTokenRepository.create({
      id: uuidv4(),
      userId,
      token,
      platform,
      provider: 'fcm',
      isActive: true,
      lastUsedAt: new Date(),
      createdAt: new Date(),
    });
  }

  /**
   * Unregister device token
   */
  async unregisterDeviceToken(token: string): Promise<void> {
    const existing = await this.deviceTokenRepository.findByToken(token);
    if (existing) {
      await this.deviceTokenRepository.update(existing.id, {
        isActive: false,
      });
    }
  }

  /**
   * Get user notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const existing = await this.preferencesRepository.findByUserId(userId);
    if (existing) return existing;

    // Return default preferences
    return this.preferencesRepository.create({
      userId,
      channels: {
        push: true,
        sms: true,
        email: true,
        inApp: true,
      },
      categories: {
        transaction: true,
        kyc: true,
        security: true,
        marketing: false,
        system: true,
        risk: true,
        referral: true,
      },
      language: 'en',
      updatedAt: new Date(),
    });
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userId: string,
    updates: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    const existing = await this.getPreferences(userId);
    return this.preferencesRepository.update(existing.userId, {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    });
  }

  /**
   * Get user notification history
   */
  async getHistory(
    userId: string,
    options: { page?: number; limit?: number; category?: string } = {},
  ) {
    const { page = 1, limit = 20, category } = options;
    return this.historyRepository.findByUserId(userId, {
      offset: (page - 1) * limit,
      limit,
      category,
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.historyRepository.markAsRead(notificationId, userId);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.historyRepository.markAllAsRead(userId);
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.historyRepository.getUnreadCount(userId);
  }

  // Private helper methods

  private determineChannels(
    requestedChannels: NotificationChannel[],
    category: NotificationPayload['category'],
    preferences?: NotificationPreferences | null,
  ): NotificationChannel[] {
    if (!preferences) return requestedChannels;

    // Check if category is enabled
    const categoryKey = category as keyof typeof preferences.categories;
    if (!preferences.categories[categoryKey]) {
      return [];
    }

    // Filter by channel preferences
    return requestedChannels.filter(channel => {
      switch (channel) {
        case 'push':
          return preferences.channels.push;
        case 'sms':
          return preferences.channels.sms;
        case 'email':
          return preferences.channels.email;
        case 'in_app':
          return preferences.channels.inApp;
        default:
          return false;
      }
    });
  }

  private wrapEmailHtml(title: string, body: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a1a2e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">JoonaPay</h1>
          </div>
          <div class="content">
            <h2>${title}</h2>
            <p>${body}</p>
          </div>
          <div class="footer">
            <p>This is an automated message from JoonaPay. Please do not reply.</p>
          </div>
        </body>
      </html>
    `;
  }
}
