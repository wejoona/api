import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  IPushGateway,
  PUSH_GATEWAY,
  SendPushRequest,
} from '@modules/shared/domain/gateways/push.gateway';
import { FcmTokenRepository } from '@modules/notification/infrastructure/fcm/fcm-token.repository';
import { FcmPlatform } from '@modules/notification/infrastructure/fcm/fcm-token.orm-entity';
import { NotificationPreferencesRepository } from '@modules/user-preferences/infrastructure/repositories';
import { NotificationPreferences } from '@modules/user-preferences/application/domain/entities';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  sound?: string;
  badge?: number;
  priority?: 'high' | 'normal';
}

export interface TransactionNotificationParams {
  userId: string;
  type: 'received' | 'sent' | 'completed' | 'failed';
  amount: number;
  currency: string;
  transactionId: string;
  recipientName?: string;
  senderName?: string;
}

export interface SecurityNotificationParams {
  userId: string;
  type:
    | 'new_device_login'
    | 'large_transaction'
    | 'address_whitelisted'
    | 'security_alert';
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Push Notification Service
 *
 * Manages push notification delivery:
 * 1. Checks user notification preferences
 * 2. Retrieves active FCM tokens for the user
 * 3. Sends notifications via the push gateway (FCM)
 * 4. Handles token failures and cleanup
 *
 * This service is the main entry point for sending push notifications.
 * It integrates with:
 * - NotificationPreferencesRepository: Check if user wants notifications
 * - FcmTokenRepository: Get user's device tokens
 * - IPushGateway: Send notifications via FCM
 */
@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(
    @Inject(PUSH_GATEWAY)
    private readonly pushGateway: IPushGateway,
    private readonly fcmTokenRepository: FcmTokenRepository,
    private readonly preferencesRepository: NotificationPreferencesRepository,
  ) {}

  // ============================================
  // TOKEN MANAGEMENT
  // ============================================

  /**
   * Register an FCM token for a user
   */
  async registerToken(
    userId: string,
    token: string,
    platform: FcmPlatform,
    deviceId?: string,
    deviceName?: string,
    appVersion?: string,
    osVersion?: string,
  ): Promise<void> {
    await this.fcmTokenRepository.upsert(
      userId,
      token,
      platform,
      deviceId,
      deviceName,
      appVersion,
      osVersion,
    );
    this.logger.log(
      `Registered FCM token for user ${userId}, platform: ${platform}`,
    );
  }

  /**
   * Remove a specific token
   */
  async removeToken(userId: string, token: string): Promise<void> {
    await this.fcmTokenRepository.deactivateToken(token);
    this.logger.log(`Deactivated FCM token for user ${userId}`);
  }

  /**
   * Remove all tokens for a user (full logout)
   */
  async removeAllTokensForUser(userId: string): Promise<void> {
    await this.fcmTokenRepository.deactivateAllForUser(userId);
    this.logger.log(`Deactivated all FCM tokens for user ${userId}`);
  }

  // ============================================
  // NOTIFICATION SENDING
  // ============================================

  /**
   * Send a push notification to a user
   * Checks preferences before sending
   */
  async sendToUser(
    userId: string,
    notification: PushNotificationPayload,
    notificationType?: string,
  ): Promise<{
    sent: boolean;
    devicesNotified: number;
    failedDevices: number;
  }> {
    // Check if push notifications are enabled for the user
    const prefs = await this.preferencesRepository.findByUserId(userId);
    if (prefs && !prefs.pushEnabled) {
      this.logger.log(
        `Push notifications disabled for user ${userId}, skipping`,
      );
      return { sent: false, devicesNotified: 0, failedDevices: 0 };
    }

    // Check specific notification type preferences
    if (notificationType && prefs) {
      const shouldSend = this.shouldSendNotificationType(
        prefs,
        notificationType,
      );
      if (!shouldSend) {
        this.logger.log(
          `Notification type ${notificationType} disabled for user ${userId}`,
        );
        return { sent: false, devicesNotified: 0, failedDevices: 0 };
      }
    }

    // Get active tokens
    const tokens = await this.fcmTokenRepository.findActiveByUserId(userId);
    if (tokens.length === 0) {
      this.logger.log(`No active FCM tokens for user ${userId}`);
      return { sent: false, devicesNotified: 0, failedDevices: 0 };
    }

    let successCount = 0;
    let failureCount = 0;

    // Send to each device
    for (const tokenEntity of tokens) {
      const request: SendPushRequest = {
        deviceToken: tokenEntity.token,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        imageUrl: notification.imageUrl,
        sound: notification.sound || 'default',
        badge: notification.badge,
        priority: notification.priority || 'normal',
      };

      const result = await this.pushGateway.send(request);

      if (result.success) {
        successCount++;
        await this.fcmTokenRepository.updateLastUsed(tokenEntity.token);
      } else {
        failureCount++;
        await this.handleTokenFailure(tokenEntity.token, result.failureReason);
      }
    }

    this.logger.log(
      `Push notification sent to ${successCount}/${tokens.length} devices for user ${userId}`,
    );

    return {
      sent: successCount > 0,
      devicesNotified: successCount,
      failedDevices: failureCount,
    };
  }

  /**
   * Send to multiple users (e.g., broadcast)
   */
  async sendToUsers(
    userIds: string[],
    notification: PushNotificationPayload,
    notificationType?: string,
  ): Promise<{ totalSent: number; totalFailed: number }> {
    let totalSent = 0;
    let totalFailed = 0;

    for (const userId of userIds) {
      const result = await this.sendToUser(
        userId,
        notification,
        notificationType,
      );
      totalSent += result.devicesNotified;
      totalFailed += result.failedDevices;
    }

    return { totalSent, totalFailed };
  }

  // ============================================
  // CONVENIENCE METHODS FOR SPECIFIC NOTIFICATIONS
  // ============================================

  /**
   * Send transaction notification
   */
  async sendTransactionNotification(
    params: TransactionNotificationParams,
  ): Promise<void> {
    const {
      userId,
      type,
      amount,
      currency,
      transactionId,
      recipientName,
      senderName,
    } = params;

    const titles: Record<string, string> = {
      received: 'Money Received',
      sent: 'Transfer Sent',
      completed: 'Transaction Complete',
      failed: 'Transaction Failed',
    };

    const bodies: Record<string, string> = {
      received: senderName
        ? `You received ${amount} ${currency} from ${senderName}`
        : `You received ${amount} ${currency}`,
      sent: recipientName
        ? `${amount} ${currency} sent to ${recipientName}`
        : `${amount} ${currency} sent successfully`,
      completed: `Transaction of ${amount} ${currency} completed`,
      failed: `Transaction of ${amount} ${currency} failed`,
    };

    await this.sendToUser(
      userId,
      {
        title: titles[type] || 'Transaction Update',
        body: bodies[type] || `Transaction update: ${amount} ${currency}`,
        data: {
          type: 'transaction',
          action: type,
          transactionId,
          amount: amount.toString(),
          currency,
        },
        priority: type === 'failed' ? 'high' : 'normal',
      },
      'transaction',
    );
  }

  /**
   * Send security notification (always high priority)
   */
  async sendSecurityNotification(
    params: SecurityNotificationParams,
  ): Promise<void> {
    const { userId, type, title, body, data } = params;

    await this.sendToUser(
      userId,
      {
        title,
        body,
        data: {
          type: 'security',
          action: type,
          ...data,
        },
        priority: 'high',
      },
      'security',
    );
  }

  /**
   * Send new device login alert
   */
  async sendNewDeviceLoginAlert(
    userId: string,
    deviceName: string,
    location?: string,
  ): Promise<void> {
    await this.sendSecurityNotification({
      userId,
      type: 'new_device_login',
      title: 'New Device Login',
      body: `A new device "${deviceName}" logged into your account${location ? ` from ${location}` : ''}.`,
      data: {
        deviceName,
        location: location || 'Unknown',
      },
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
  ): Promise<void> {
    await this.sendSecurityNotification({
      userId,
      type: 'large_transaction',
      title: 'Large Transaction Alert',
      body: `A large transaction of ${amount} ${currency} has been initiated.`,
      data: {
        amount: amount.toString(),
        currency,
        transactionId,
      },
    });
  }

  /**
   * Send KYC status update
   */
  async sendKycStatusNotification(
    userId: string,
    status: 'approved' | 'rejected' | 'pending',
    reason?: string,
  ): Promise<void> {
    const titles: Record<string, string> = {
      approved: 'KYC Approved',
      rejected: 'KYC Verification Failed',
      pending: 'KYC Under Review',
    };

    const bodies: Record<string, string> = {
      approved:
        'Your identity has been verified. You now have full access to all features.',
      rejected:
        reason || 'Your verification was not successful. Please try again.',
      pending:
        'Your documents are being reviewed. This usually takes 1-2 business days.',
    };

    await this.sendToUser(
      userId,
      {
        title: titles[status],
        body: bodies[status],
        data: {
          type: 'kyc',
          action: status,
          reason: reason || '',
        },
        priority: status === 'rejected' ? 'high' : 'normal',
      },
      'transaction', // KYC falls under transaction preferences
    );
  }

  /**
   * Send low balance alert
   */
  async sendLowBalanceAlert(
    userId: string,
    currentBalance: number,
    threshold: number,
    currency: string,
  ): Promise<void> {
    await this.sendToUser(
      userId,
      {
        title: 'Low Balance Alert',
        body: `Your ${currency} balance (${currentBalance}) is below your threshold (${threshold}).`,
        data: {
          type: 'balance',
          action: 'low_balance',
          currentBalance: currentBalance.toString(),
          threshold: threshold.toString(),
          currency,
        },
        priority: 'normal',
      },
      'transaction',
    );
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Handle token failure
   */
  private async handleTokenFailure(
    token: string,
    reason: string | undefined,
  ): Promise<void> {
    const failureReason = reason || 'Unknown error';
    this.logger.warn(`FCM token failure: ${failureReason}`);

    // Deactivate immediately for invalid/unregistered tokens
    if (
      failureReason.includes('invalid') ||
      failureReason.includes('unregistered') ||
      failureReason.includes('NotRegistered')
    ) {
      await this.fcmTokenRepository.deactivateToken(token);
      this.logger.log(`Deactivated invalid FCM token`);
    } else {
      // Increment failure count for other errors
      await this.fcmTokenRepository.incrementFailureCount(token, failureReason);
    }
  }

  /**
   * Check if notification type should be sent based on preferences
   */
  private shouldSendNotificationType(
    prefs: NotificationPreferences | null,
    type: string,
  ): boolean {
    if (!prefs) return true; // Send if no preferences set

    switch (type) {
      case 'transaction':
      case 'balance':
      case 'kyc':
        return prefs.shouldReceivePush('transaction');
      case 'security':
        return prefs.shouldReceivePush('security');
      case 'marketing':
      case 'promotion':
        return prefs.shouldReceivePush('marketing');
      default:
        return true;
    }
  }
}
