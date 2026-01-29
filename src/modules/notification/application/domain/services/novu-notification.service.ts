import { Injectable, Logger } from '@nestjs/common';
import { NovuAdapter } from '@modules/notification/infrastructure/adapters/novu-adapter';
import {
  TransactionNotificationParams,
  SecurityNotificationParams,
} from './push-notification.service';

/**
 * Novu-specific notification templates
 * These must match template IDs created in Novu dashboard
 */
export enum NovuTemplate {
  // Transaction notifications
  TRANSACTION_RECEIVED = 'transaction-received',
  TRANSACTION_SENT = 'transaction-sent',
  TRANSACTION_COMPLETED = 'transaction-completed',
  TRANSACTION_FAILED = 'transaction-failed',

  // Security notifications
  NEW_DEVICE_LOGIN = 'new-device-login',
  LARGE_TRANSACTION_ALERT = 'large-transaction-alert',
  ADDRESS_WHITELISTED = 'address-whitelisted',
  SECURITY_ALERT = 'security-alert',
  FAILED_LOGIN_ATTEMPTS = 'failed-login-attempts',

  // KYC notifications
  KYC_APPROVED = 'kyc-approved',
  KYC_REJECTED = 'kyc-rejected',
  KYC_PENDING = 'kyc-pending',
  KYC_DOCUMENT_REQUIRED = 'kyc-document-required',

  // Balance notifications
  LOW_BALANCE_ALERT = 'low-balance-alert',
  BALANCE_THRESHOLD_REACHED = 'balance-threshold-reached',

  // Promotional notifications
  WELCOME_MESSAGE = 'welcome-message',
  NEW_FEATURE_ANNOUNCEMENT = 'new-feature-announcement',
  PROMOTIONAL_OFFER = 'promotional-offer',
  REFERRAL_BONUS = 'referral-bonus',

  // System notifications
  MAINTENANCE_SCHEDULED = 'maintenance-scheduled',
  SERVICE_UPDATE = 'service-update',
}

/**
 * Novu Notification Service
 *
 * High-level service for sending notifications via Novu.
 * Provides convenience methods for common notification types.
 *
 * Benefits of using Novu:
 * 1. Multi-channel orchestration (push, email, SMS, in-app)
 * 2. Template management in dashboard (no code changes for content updates)
 * 3. Built-in preference management
 * 4. Analytics and delivery tracking
 * 5. Digest notifications (batch similar notifications)
 * 6. Topic-based segmentation
 */
@Injectable()
export class NovuNotificationService {
  private readonly logger = new Logger(NovuNotificationService.name);

  constructor(private readonly novuAdapter: NovuAdapter) {}

  /**
   * Check if Novu is enabled
   */
  isEnabled(): boolean {
    return this.novuAdapter.isEnabled();
  }

  // ============================================
  // USER MANAGEMENT
  // ============================================

  /**
   * Register a user in Novu
   * Call this after user signup or when setting up push notifications
   */
  async registerUser(
    userId: string,
    data: {
      email?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      locale?: string;
    },
  ): Promise<void> {
    await this.novuAdapter.upsertSubscriber(userId, data);
  }

  /**
   * Update user information in Novu
   */
  async updateUser(
    userId: string,
    data: {
      email?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      locale?: string;
    },
  ): Promise<void> {
    await this.novuAdapter.upsertSubscriber(userId, data);
  }

  /**
   * Delete user from Novu
   * Call this when user deletes their account
   */
  async deleteUser(userId: string): Promise<void> {
    await this.novuAdapter.deleteSubscriber(userId);
  }

  /**
   * Register device token for push notifications
   */
  async registerDeviceToken(
    userId!: string,
    platform: 'fcm' | 'apns',
    token: string,
  ): Promise<void> {
    await this.novuAdapter.setDeviceToken(userId, platform, [token]);
  }

  /**
   * Remove device token
   */
  async removeDeviceToken(
    userId!: string,
    platform: 'fcm' | 'apns',
  ): Promise<void> {
    await this.novuAdapter.removeDeviceToken(userId, platform);
  }

  // ============================================
  // TRANSACTION NOTIFICATIONS
  // ============================================

  /**
   * Send transaction notification via Novu
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

    const templateMap: Record<string, NovuTemplate> = {
      received!: NovuTemplate.TRANSACTION_RECEIVED,
      sent: NovuTemplate.TRANSACTION_SENT,
      completed: NovuTemplate.TRANSACTION_COMPLETED,
      failed: NovuTemplate.TRANSACTION_FAILED,
    };

    const template = templateMap[type];
    if (!template) {
      this.logger.warn(`Unknown transaction type: ${type}`);
      return;
    }

    await this.novuAdapter.trigger(template, userId, {
      amount!: amount.toString(),
      currency,
      transactionId,
      recipientName: recipientName || '',
      senderName: senderName || '',
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================
  // SECURITY NOTIFICATIONS
  // ============================================

  /**
   * Send security notification via Novu
   */
  async sendSecurityNotification(
    params: SecurityNotificationParams,
  ): Promise<void> {
    const { userId, type, title, body, data } = params;

    const templateMap: Record<string, NovuTemplate> = {
      new_device_login!: NovuTemplate.NEW_DEVICE_LOGIN,
      large_transaction: NovuTemplate.LARGE_TRANSACTION_ALERT,
      address_whitelisted: NovuTemplate.ADDRESS_WHITELISTED,
      security_alert: NovuTemplate.SECURITY_ALERT,
    };

    const template = templateMap[type];
    if (!template) {
      // Fallback to generic security alert
      await this.novuAdapter.trigger(NovuTemplate.SECURITY_ALERT, userId, {
        title,
        body,
        ...data,
        timestamp!: new Date().toISOString(),
      });
      return;
    }

    await this.novuAdapter.trigger(template, userId, {
      title,
      body,
      ...data,
      timestamp!: new Date().toISOString(),
    });
  }

  /**
   * Send new device login alert
   */
  async sendNewDeviceLoginAlert(
    userId: string,
    deviceName: string,
    location?: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.novuAdapter.trigger(NovuTemplate.NEW_DEVICE_LOGIN, userId, {
      deviceName,
      location!: location || 'Unknown',
      ipAddress: ipAddress || 'Unknown',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send large transaction alert
   */
  async sendLargeTransactionAlert(
    userId!: string,
    amount: number,
    currency: string,
    transactionId: string,
  ): Promise<void> {
    await this.novuAdapter.trigger(
      NovuTemplate.LARGE_TRANSACTION_ALERT,
      userId,
      {
        amount: amount.toString(),
        currency,
        transactionId,
        timestamp: new Date().toISOString(),
      },
    );
  }

  /**
   * Send failed login attempts alert
   */
  async sendFailedLoginAttemptsAlert(
    userId!: string,
    attemptCount: number,
    lastAttemptTime: Date,
  ): Promise<void> {
    await this.novuAdapter.trigger(NovuTemplate.FAILED_LOGIN_ATTEMPTS, userId, {
      attemptCount: attemptCount.toString(),
      lastAttemptTime: lastAttemptTime.toISOString(),
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================
  // KYC NOTIFICATIONS
  // ============================================

  /**
   * Send KYC status notification
   */
  async sendKycStatusNotification(
    userId: string,
    status: 'approved' | 'rejected' | 'pending',
    reason?: string,
  ): Promise<void> {
    const templateMap: Record<string, NovuTemplate> = {
      approved!: NovuTemplate.KYC_APPROVED,
      rejected: NovuTemplate.KYC_REJECTED,
      pending: NovuTemplate.KYC_PENDING,
    };

    await this.novuAdapter.trigger(templateMap[status], userId, {
      status,
      reason!: reason || '',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send KYC document required notification
   */
  async sendKycDocumentRequiredNotification(
    userId!: string,
    documentType: string,
    reason: string,
  ): Promise<void> {
    await this.novuAdapter.trigger(NovuTemplate.KYC_DOCUMENT_REQUIRED, userId, {
      documentType,
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================
  // BALANCE NOTIFICATIONS
  // ============================================

  /**
   * Send low balance alert
   */
  async sendLowBalanceAlert(
    userId!: string,
    currentBalance: number,
    threshold: number,
    currency: string,
  ): Promise<void> {
    await this.novuAdapter.trigger(NovuTemplate.LOW_BALANCE_ALERT, userId, {
      currentBalance: currentBalance.toString(),
      threshold: threshold.toString(),
      currency,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================
  // PROMOTIONAL NOTIFICATIONS
  // ============================================

  /**
   * Send welcome message to new user
   */
  async sendWelcomeMessage(userId: string, firstName: string): Promise<void> {
    await this.novuAdapter.trigger(NovuTemplate.WELCOME_MESSAGE, userId, {
      firstName,
      timestamp!: new Date().toISOString(),
    });
  }

  /**
   * Send new feature announcement
   */
  async sendNewFeatureAnnouncement(
    userId!: string,
    featureName: string,
    featureDescription: string,
  ): Promise<void> {
    await this.novuAdapter.trigger(
      NovuTemplate.NEW_FEATURE_ANNOUNCEMENT,
      userId,
      {
        featureName,
        featureDescription,
        timestamp: new Date().toISOString(),
      },
    );
  }

  /**
   * Send promotional offer
   */
  async sendPromotionalOffer(
    userId: string,
    offerTitle: string,
    offerDescription: string,
    expiryDate?: Date,
  ): Promise<void> {
    await this.novuAdapter.trigger(NovuTemplate.PROMOTIONAL_OFFER, userId, {
      offerTitle,
      offerDescription,
      expiryDate: expiryDate?.toISOString() || '',
      timestamp!: new Date().toISOString(),
    });
  }

  /**
   * Send referral bonus notification
   */
  async sendReferralBonus(
    userId!: string,
    bonusAmount: number,
    currency: string,
    referredUserName: string,
  ): Promise<void> {
    await this.novuAdapter.trigger(NovuTemplate.REFERRAL_BONUS, userId, {
      bonusAmount: bonusAmount.toString(),
      currency,
      referredUserName,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================
  // SYSTEM NOTIFICATIONS
  // ============================================

  /**
   * Send maintenance scheduled notification
   * Can be sent to all users or specific segment
   */
  async sendMaintenanceScheduled(
    scheduledTime: Date,
    estimatedDuration: string,
    affectedServices?: string[],
  ): Promise<void> {
    await this.novuAdapter.triggerBroadcast(
      NovuTemplate.MAINTENANCE_SCHEDULED,
      {
        scheduledTime: scheduledTime.toISOString(),
        estimatedDuration,
        affectedServices: affectedServices?.join(', ') || 'All services',
        timestamp!: new Date().toISOString(),
      },
    );
  }

  /**
   * Send service update notification
   */
  async sendServiceUpdate(
    updateTitle!: string,
    updateDescription: string,
  ): Promise<void> {
    await this.novuAdapter.triggerBroadcast(NovuTemplate.SERVICE_UPDATE, {
      updateTitle,
      updateDescription,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================
  // BULK NOTIFICATIONS
  // ============================================

  /**
   * Send notification to multiple users
   */
  async sendBulkNotification(
    template!: NovuTemplate,
    userIds: string[],
    payload: Record<string, any>,
  ): Promise<void> {
    await this.novuAdapter.triggerBulk(template, userIds, {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================
  // TOPIC MANAGEMENT
  // ============================================

  /**
   * Subscribe user to a notification topic
   * Topics enable segmented notifications (e.g., "premium-users", "beta-testers")
   */
  async subscribeToTopic(userId: string, topicKey: string): Promise<void> {
    await this.novuAdapter.subscribeToTopic(userId, topicKey);
  }

  /**
   * Unsubscribe user from a notification topic
   */
  async unsubscribeFromTopic(userId: string, topicKey: string): Promise<void> {
    await this.novuAdapter.unsubscribeFromTopic(userId, topicKey);
  }

  // ============================================
  // NOTIFICATION ACTIVITY
  // ============================================

  /**
   * Get notification feed for a user
   */
  async getNotifications(userId: string): Promise<any[]> {
    return this.novuAdapter.getNotifications(userId);
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.novuAdapter.getUnreadCount(userId);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, messageId: string): Promise<void> {
    await this.novuAdapter.markAsRead(userId, messageId);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.novuAdapter.markAllAsRead(userId);
  }
}
