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

    try {
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
            await this.deviceTokenRepository.deactivateToken(
              response.deviceToken,
            );
          }
        }
      }
    } catch (error) {
      this.logger.warn(
        `Push notification delivery failed after persisting notification ${notification.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
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

  // ============================================
  // CONVENIENCE METHODS FOR SPECIFIC NOTIFICATIONS
  // ============================================

  /**
   * Send new device login alert
   */
  async sendNewDeviceLoginAlert(
    userId: string,
    deviceName: string,
    location?: string,
  ): Promise<void> {
    await this.sendToUser({
      userId,
      type: 'new_device_login',
      title: 'New Device Login',
      body: `A new device "${deviceName}" just logged into your account${location ? ` from ${location}` : ''}.`,
      data: {
        deviceName,
        location: location || 'Unknown',
      },
      priority: 'high',
    });
  }

  /**
   * Send large transaction alert
   */
  async sendLargeTransactionAlert(
    userId: string,
    amount: number,
    currency: string,
    transactionId: string,
    recipientName?: string,
  ): Promise<void> {
    const bodyText = recipientName
      ? `A large transaction of ${amount} ${currency} to ${recipientName} has been initiated.`
      : `A large transaction of ${amount} ${currency} has been initiated.`;

    await this.sendToUser({
      userId,
      type: 'large_transaction',
      title: 'Large Transaction Alert',
      body: bodyText,
      data: {
        amount: amount.toString(),
        currency,
        transactionId,
        recipientName: recipientName || '',
      },
      referenceType: 'transaction',
      referenceId: transactionId,
      priority: 'high',
    });
  }

  /**
   * Send address whitelisted notification
   */
  async sendAddressWhitelistedNotification(
    userId: string,
    label: string,
    address: string,
  ): Promise<void> {
    await this.sendToUser({
      userId,
      type: 'address_whitelisted',
      title: 'Address Whitelisted',
      body: `"${label}" (${address.substring(0, 6)}...${address.slice(-4)}) has been added to your trusted addresses.`,
      data: {
        label,
        address,
      },
    });
  }

  /**
   * Send security alert
   */
  async sendSecurityAlert(
    userId: string,
    title: string,
    message: string,
    data?: Record<string, string>,
  ): Promise<void> {
    await this.sendToUser({
      userId,
      type: 'security_alert',
      title,
      body: message,
      data,
      priority: 'high',
    });
  }

  /**
   * Send withdrawal pending notification (for new addresses)
   */
  async sendWithdrawalPendingNotification(
    userId: string,
    amount: number,
    currency: string,
    hoursUntilProcessed: number,
    transactionId: string,
  ): Promise<void> {
    await this.sendToUser({
      userId,
      type: 'withdrawal_pending',
      title: 'Withdrawal Pending',
      body: `Your withdrawal of ${amount} ${currency} to a new address will be processed in ${hoursUntilProcessed} hours.`,
      data: {
        amount: amount.toString(),
        currency,
        hoursUntilProcessed: hoursUntilProcessed.toString(),
        transactionId,
      },
      referenceType: 'transaction',
      referenceId: transactionId,
    });
  }

  /**
   * Send price alert
   */
  async sendPriceAlert(
    userId: string,
    rate: string,
    threshold: string,
    direction: 'above' | 'below',
  ): Promise<void> {
    await this.sendToUser({
      userId,
      type: 'price_alert',
      title: 'Price Alert',
      body: `USDC/XOF rate is now ${rate}, ${direction} your threshold of ${threshold}.`,
      data: {
        rate,
        threshold,
        direction,
      },
    });
  }

  /**
   * Send weekly spending summary
   */
  async sendWeeklySummary(
    userId: string,
    totalSpent: number,
    totalReceived: number,
    currency: string,
    transactionCount: number,
    comparisonText?: string,
  ): Promise<void> {
    await this.sendToUser({
      userId,
      type: 'weekly_summary',
      title: 'Weekly Summary',
      body: `This week: Sent ${totalSpent} ${currency}, Received ${totalReceived} ${currency} (${transactionCount} transactions).${comparisonText ? ` ${comparisonText}` : ''}`,
      data: {
        totalSpent: totalSpent.toString(),
        totalReceived: totalReceived.toString(),
        currency,
        transactionCount: transactionCount.toString(),
        comparison: comparisonText || '',
      },
    });
  }
}
