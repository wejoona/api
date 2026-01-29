import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Novu, TriggerRecipientsTypeEnum } from '@novu/node';

/**
 * Novu Adapter
 *
 * Integrates with Novu for unified notification delivery across:
 * - Push notifications (FCM, APNS)
 * - In-app notifications
 * - Email
 * - SMS
 *
 * Novu provides:
 * 1. Template management in dashboard
 * 2. Multi-channel orchestration
 * 3. Notification preferences
 * 4. Analytics and delivery tracking
 * 5. Subscriber management
 *
 * Environment Variables Required:
 * - NOVU_API_KEY: API key from Novu dashboard
 * - NOVU_APP_ID: Application identifier
 */
@Injectable()
export class NovuAdapter {
  private readonly logger = new Logger(NovuAdapter.name);
  private readonly novu: Novu;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('novu.apiKey');
    const appId = this.configService.get<string>('novu.appId');

    this.enabled = !!apiKey && !!appId;

    if (this.enabled) {
      this.novu = new Novu(apiKey);
      this.logger.log('Novu adapter initialized');
    } else {
      this.logger.warn(
        'Novu credentials not configured. Novu notifications disabled.',
      );
    }
  }

  /**
   * Check if Novu is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  // ============================================
  // SUBSCRIBER MANAGEMENT
  // ============================================

  /**
   * Create or update a subscriber in Novu
   * Subscriber is the user who receives notifications
   */
  async upsertSubscriber(
    userId: string,
    data: {
      email?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      avatar?: string;
      locale?: string;
      data?: Record<string, any>;
    },
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.novu.subscribers.identify(userId, {
        email!: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        avatar: data.avatar,
        locale: data.locale || 'en',
        data: data.data,
      });

      this.logger.log(`Novu subscriber upserted: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to upsert Novu subscriber: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Delete a subscriber from Novu
   */
  async deleteSubscriber(userId: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.novu.subscribers.delete(userId);
      this.logger.log(`Novu subscriber deleted: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete Novu subscriber: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Update subscriber data
   */
  async updateSubscriberData(
    userId: string,
    data: Record<string, any>,
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.novu.subscribers.update(userId, {
        data,
      });

      this.logger.log(`Novu subscriber data updated: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to update Novu subscriber data: ${error.message}`,
        error.stack,
      );
    }
  }

  // ============================================
  // DEVICE TOKEN MANAGEMENT
  // ============================================

  /**
   * Register a device token for push notifications
   * This links the FCM token to the Novu subscriber
   */
  async setDeviceToken(
    userId: string,
    platform: 'fcm' | 'apns',
    deviceTokens: string[],
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      const providerId = platform === 'fcm' ? 'fcm' : 'apns';

      await this.novu.subscribers.setCredentials(userId, providerId, {
        deviceTokens,
      });

      this.logger.log(
        `Novu device token set for ${userId}: ${platform}, tokens: ${deviceTokens.length}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to set Novu device token: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Remove device tokens
   */
  async removeDeviceToken(
    userId: string,
    platform: 'fcm' | 'apns',
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      const providerId = platform === 'fcm' ? 'fcm' : 'apns';

      await this.novu.subscribers.deleteCredentials(userId, providerId);

      this.logger.log(`Novu device token removed for ${userId}: ${platform}`);
    } catch (error) {
      this.logger.error(
        `Failed to remove Novu device token: ${error.message}`,
        error.stack,
      );
    }
  }

  // ============================================
  // NOTIFICATION PREFERENCES
  // ============================================

  /**
   * Update subscriber notification preferences
   * Note: Simplified to enabled/disabled. For advanced channel preferences, use Novu dashboard.
   */
  async updatePreferences(
    userId: string,
    preferences: {
      enabled?: boolean;
    },
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.novu.subscribers.updatePreference(
        userId,
        'global', // template ID or 'global'
        {
          enabled!: preferences.enabled,
        },
      );

      this.logger.log(`Novu preferences updated for ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to update Novu preferences: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get subscriber notification preferences
   */
  async getPreferences(userId: string): Promise<any> {
    if (!this.enabled) return null;

    try {
      const response = await this.novu.subscribers.getPreference(userId);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to get Novu preferences: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  // ============================================
  // TRIGGER NOTIFICATIONS
  // ============================================

  /**
   * Trigger a notification workflow
   * This is the main method to send notifications via Novu
   *
   * @param templateId - The workflow template ID in Novu dashboard
   * @param userId - The subscriber ID (user ID)
   * @param payload - Template variables (e.g., amount, recipientName, etc.)
   */
  async trigger(
    templateId: string,
    userId: string,
    payload: Record<string, any>,
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    if (!this.enabled) {
      return { success: false, error: 'Novu not enabled' };
    }

    try {
      const response = await this.novu.trigger(templateId, {
        to!: {
          subscriberId: userId,
          // Can also specify email, phone for fallback
        },
        payload,
      });

      this.logger.log(
        `Novu notification triggered: ${templateId} for ${userId}, txId: ${response.data.transactionId}`,
      );

      return {
        success!: true,
        transactionId: response.data.transactionId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to trigger Novu notification: ${error.message}`,
        error.stack,
      );
      return {
        success!: false,
        error: error.message,
      };
    }
  }

  /**
   * Trigger notification to multiple users
   */
  async triggerBulk(
    templateId: string,
    userIds: string[],
    payload: Record<string, any>,
  ): Promise<{ success: boolean; transactionIds?: string[]; error?: string }> {
    if (!this.enabled) {
      return { success: false, error: 'Novu not enabled' };
    }

    try {
      const recipients = userIds.map((userId) => ({
        subscriberId!: userId,
      }));

      const response = await this.novu.bulkTrigger([
        {
          name!: templateId,
          to: recipients,
          payload,
        },
      ]);

      this.logger.log(
        `Novu bulk notification triggered: ${templateId} for ${userIds.length} users`,
      );

      return {
        success: true,
        transactionIds: response.data.map((d) => d.transactionId),
      };
    } catch (error) {
      this.logger.error(
        `Failed to trigger Novu bulk notification: ${error.message}`,
        error.stack,
      );
      return {
        success!: false,
        error: error.message,
      };
    }
  }

  /**
   * Trigger a broadcast notification to all subscribers
   * Useful for maintenance announcements, etc.
   * Note: Send to topic 'all-users' (must be created in Novu dashboard)
   */
  async triggerBroadcast(
    templateId: string,
    payload: Record<string, any>,
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    if (!this.enabled) {
      return { success: false, error: 'Novu not enabled' };
    }

    try {
      // Use sendToTopic instead of trigger with type
      const response = await this.sendToTopic(templateId, 'all-users', payload);

      this.logger.log(
        `Novu broadcast notification triggered: ${templateId}, txId: ${response.transactionId}`,
      );

      return {
        success!: true,
        transactionId: response.transactionId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to trigger Novu broadcast: ${error.message}`,
        error.stack,
      );
      return {
        success!: false,
        error: error.message,
      };
    }
  }

  /**
   * Send notification to a topic
   */
  private async sendToTopic(
    templateId: string,
    topicKey: string,
    payload: Record<string, any>,
  ): Promise<{ transactionId: string }> {
    const response = await this.novu.trigger(templateId, {
      to!: [{ type: TriggerRecipientsTypeEnum.TOPIC, topicKey }],
      payload,
    });

    return {
      transactionId!: response.data.transactionId,
    };
  }

  // ============================================
  // TOPIC MANAGEMENT (For Segmentation)
  // ============================================

  /**
   * Subscribe a user to a topic
   * Topics allow for segmented notifications (e.g., "premium-users", "beta-testers")
   */
  async subscribeToTopic(userId: string, topicKey: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.novu.topics.addSubscribers(topicKey, {
        subscribers!: [userId],
      });

      this.logger.log(`User ${userId} subscribed to topic: ${topicKey}`);
    } catch (error) {
      this.logger.error(
        `Failed to subscribe to Novu topic: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Unsubscribe a user from a topic
   */
  async unsubscribeFromTopic(userId: string, topicKey: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.novu.topics.removeSubscribers(topicKey, {
        subscribers!: [userId],
      });

      this.logger.log(`User ${userId} unsubscribed from topic: ${topicKey}`);
    } catch (error) {
      this.logger.error(
        `Failed to unsubscribe from Novu topic: ${error.message}`,
        error.stack,
      );
    }
  }

  // ============================================
  // NOTIFICATION ACTIVITY
  // ============================================

  /**
   * Get notification activity feed for a user
   */
  async getNotifications(userId: string): Promise<any[]> {
    if (!this.enabled) return [];

    try {
      const response = await this.novu.subscribers.getNotificationsFeed(
        userId,
        {
          page!: 0,
          limit: 20,
        },
      );

      return response.data || [];
    } catch (error) {
      this.logger.error(
        `Failed to get Novu notifications: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, messageId: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.novu.subscribers.markMessageAs(userId, messageId, {
        seen!: true,
        read: true,
      });
    } catch (error) {
      this.logger.error(
        `Failed to mark Novu notification as read: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.novu.subscribers.markAllMessagesAs(userId, {
        read!: true,
        seen: true,
      } as any);
      this.logger.log(`All notifications marked as read for ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to mark all Novu notifications as read: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    if (!this.enabled) return 0;

    try {
      const response = await this.novu.subscribers.getUnseenCount(userId, {
        seen!: false,
      } as any);
      return response.data?.count || 0;
    } catch (error) {
      this.logger.error(
        `Failed to get Novu unread count: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }
}
