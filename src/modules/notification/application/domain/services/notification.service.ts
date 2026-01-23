import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  IPushGateway,
  PUSH_GATEWAY,
  SendPushRequest,
} from '@modules/shared/domain/gateways/push.gateway';
import {
  DeviceTokenRepository,
  DEVICE_TOKEN_REPOSITORY,
} from '@modules/notification/infrastructure/repositories/device-token.repository';
import {
  NotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '@modules/notification/infrastructure/repositories/notification.repository';
import { NotificationType } from '@modules/notification/infrastructure/orm-entities/notification.orm-entity';

export interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  referenceType?: string;
  referenceId?: string;
  priority?: 'high' | 'normal';
}

/**
 * Notification Service
 *
 * Orchestrates notification delivery:
 * 1. Persists notification to database
 * 2. Retrieves user's active device tokens
 * 3. Sends push notifications via gateway
 * 4. Updates notification status
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(PUSH_GATEWAY)
    private readonly pushGateway: IPushGateway,
    @Inject(DEVICE_TOKEN_REPOSITORY)
    private readonly deviceTokenRepository: DeviceTokenRepository,
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  /**
   * Send notification to a user
   * Persists to DB and sends push notification if device tokens exist
   */
  async sendToUser(params: SendNotificationParams): Promise<{
    notificationId: string;
    pushSent: boolean;
    devicesNotified: number;
  }> {
    // 1. Persist notification to database
    const notification = await this.notificationRepository.create({
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data as Record<string, unknown>,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
    });

    this.logger.log(
      `Created notification ${notification.id} for user ${params.userId}`,
    );

    // 2. Get user's active device tokens
    const deviceTokens = await this.deviceTokenRepository.findActiveByUserId(
      params.userId,
    );

    if (deviceTokens.length === 0) {
      this.logger.log(`No active device tokens for user ${params.userId}`);
      return {
        notificationId: notification.id,
        pushSent: false,
        devicesNotified: 0,
      };
    }

    // 3. Send push notification to all devices
    const tokens = deviceTokens.map((dt) => dt.token);
    let successCount = 0;

    if (tokens.length === 1) {
      // Single device
      const request: SendPushRequest = {
        deviceToken: tokens[0],
        title: params.title,
        body: params.body,
        data: params.data,
        priority: params.priority ?? 'normal',
      };

      const result = await this.pushGateway.send(request);
      successCount = result.success ? 1 : 0;

      if (!result.success) {
        this.logger.warn(
          `Push notification failed for token: ${result.failureReason}`,
        );
        // Deactivate invalid tokens
        if (
          result.failureReason?.includes('invalid') ||
          result.failureReason?.includes('unregistered')
        ) {
          await this.deviceTokenRepository.deactivateToken(tokens[0]);
        }
      }
    } else {
      // Multiple devices
      const result = await this.pushGateway.sendMulticast({
        deviceTokens: tokens,
        title: params.title,
        body: params.body,
        data: params.data,
        priority: params.priority ?? 'normal',
      });

      successCount = result.successCount;

      // Deactivate failed tokens
      for (const response of result.responses) {
        if (
          !response.success &&
          (response.failureReason?.includes('invalid') ||
            response.failureReason?.includes('unregistered'))
        ) {
          await this.deviceTokenRepository.deactivateToken(response.deviceToken);
        }
      }
    }

    // 4. Update notification status
    if (successCount > 0) {
      await this.notificationRepository.markAsSent(notification.id);
      this.logger.log(
        `Push notification sent to ${successCount}/${tokens.length} devices`,
      );
    } else {
      await this.notificationRepository.markAsFailed(notification.id);
      this.logger.warn(`Failed to send push notification to any device`);
    }

    return {
      notificationId: notification.id,
      pushSent: successCount > 0,
      devicesNotified: successCount,
    };
  }

  /**
   * Send notification to a topic (all subscribed users)
   */
  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ messageId: string }> {
    return this.pushGateway.sendToTopic(topic, title, body, data);
  }

  /**
   * Register a device token for a user
   */
  async registerDeviceToken(
    userId: string,
    token: string,
    platform: 'ios' | 'android' | 'web',
    deviceId?: string,
    deviceName?: string,
  ): Promise<void> {
    await this.deviceTokenRepository.upsert(
      userId,
      token,
      platform,
      deviceId,
      deviceName,
    );
    this.logger.log(`Registered device token for user ${userId}`);
  }

  /**
   * Unregister a device token
   */
  async unregisterDeviceToken(token: string): Promise<void> {
    await this.deviceTokenRepository.deactivateToken(token);
    this.logger.log(`Deactivated device token`);
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(
    userId: string,
    options?: { limit?: number; offset?: number },
  ) {
    return this.notificationRepository.findByUserId(userId, options);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await this.notificationRepository.markAsRead(notificationId);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.markAllAsRead(userId);
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.countUnread(userId);
  }
}
