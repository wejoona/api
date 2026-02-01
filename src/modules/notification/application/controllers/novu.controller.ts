import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@modules/user/application/domain/entities/user.entity';
import { NovuNotificationService } from '../domain/services/novu-notification.service';

/**
 * Novu Notification Controller
 *
 * Provides endpoints for managing Novu notifications:
 * - User registration/updates
 * - Device token management
 * - Topic subscriptions
 * - Notification history
 * - Preference management
 *
 * These endpoints are typically called by the mobile app
 * after user authentication.
 */
@Controller('notifications/novu')
@UseGuards(JwtAuthGuard)
export class NovuController {
  constructor(
    private readonly novuNotificationService: NovuNotificationService,
  ) {}

  // ============================================
  // USER REGISTRATION
  // ============================================

  /**
   * Register/update user in Novu
   * Call this after user signup or profile update
   */
  @Post('subscriber')
  async registerSubscriber(@CurrentUser() user: User) {
    await this.novuNotificationService.registerUser(user.id, {
      email: user.email || undefined,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      phone: user.phone,
      locale: 'fr', // Default to French for West Africa
    });

    return {
      success: true,
      message: 'Subscriber registered in Novu',
    };
  }

  /**
   * Delete user from Novu
   * Call this when user deletes their account
   */
  @Delete('subscriber')
  async deleteSubscriber(@CurrentUser() user: User) {
    await this.novuNotificationService.deleteUser(user.id);

    return {
      success: true,
      message: 'Subscriber deleted from Novu',
    };
  }

  // ============================================
  // DEVICE TOKEN MANAGEMENT
  // ============================================

  /**
   * Register device token for push notifications
   */
  @Post('device-token')
  async registerDeviceToken(
    @CurrentUser() user: User,
    @Body() body: { token: string; platform: 'ios' | 'android' },
  ) {
    const platform = body.platform === 'ios' ? 'apns' : 'fcm';

    await this.novuNotificationService.registerDeviceToken(
      user.id,
      platform,
      body.token,
    );

    return {
      success: true,
      message: 'Device token registered',
    };
  }

  /**
   * Remove device token
   */
  @Delete('device-token/:platform')
  async removeDeviceToken(
    @CurrentUser() user: User,
    @Param('platform') platform: string,
  ) {
    const novuPlatform = platform === 'ios' ? 'apns' : 'fcm';

    await this.novuNotificationService.removeDeviceToken(user.id, novuPlatform);

    return {
      success: true,
      message: 'Device token removed',
    };
  }

  // ============================================
  // TOPIC SUBSCRIPTIONS
  // ============================================

  /**
   * Subscribe to a notification topic
   */
  @Post('topics/:topicKey/subscribe')
  async subscribeToTopic(
    @CurrentUser() user: User,
    @Param('topicKey') topicKey: string,
  ) {
    await this.novuNotificationService.subscribeToTopic(user.id, topicKey);

    return {
      success: true,
      message: `Subscribed to topic: ${topicKey}`,
    };
  }

  /**
   * Unsubscribe from a notification topic
   */
  @Post('topics/:topicKey/unsubscribe')
  async unsubscribeFromTopic(
    @CurrentUser() user: User,
    @Param('topicKey') topicKey: string,
  ) {
    await this.novuNotificationService.unsubscribeFromTopic(user.id, topicKey);

    return {
      success: true,
      message: `Unsubscribed from topic: ${topicKey}`,
    };
  }

  // ============================================
  // NOTIFICATION ACTIVITY
  // ============================================

  /**
   * Get notification feed for current user
   */
  @Get('feed')
  async getNotificationFeed(@CurrentUser() user: User) {
    const notifications = await this.novuNotificationService.getNotifications(
      user.id,
    );

    return {
      success: true,
      data: notifications,
    };
  }

  /**
   * Get unread notification count
   */
  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: User) {
    const count = await this.novuNotificationService.getUnreadCount(user.id);

    return {
      success: true,
      count,
    };
  }

  /**
   * Mark notification as read
   */
  @Post(':messageId/read')
  async markAsRead(
    @CurrentUser() user: User,
    @Param('messageId') messageId: string,
  ) {
    await this.novuNotificationService.markAsRead(user.id, messageId);

    return {
      success: true,
      message: 'Notification marked as read',
    };
  }

  /**
   * Mark all notifications as read
   */
  @Post('read-all')
  async markAllAsRead(@CurrentUser() user: User) {
    await this.novuNotificationService.markAllAsRead(user.id);

    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }

  // ============================================
  // TEST ENDPOINTS (Development only)
  // ============================================

  /**
   * Send test transaction notification
   * For development/testing purposes
   */
  @Post('test/transaction')
  async sendTestTransaction(@CurrentUser() user: User) {
    await this.novuNotificationService.sendTransactionNotification({
      userId: user.id,
      type: 'received',
      amount: 100,
      currency: 'USDC',
      transactionId: 'test-tx-' + Date.now(),
      senderName: 'Test Sender',
    });

    return {
      success: true,
      message: 'Test transaction notification sent',
    };
  }

  /**
   * Send test security alert
   */
  @Post('test/security')
  async sendTestSecurity(@CurrentUser() user: User) {
    await this.novuNotificationService.sendNewDeviceLoginAlert(
      user.id,
      'Test Device',
      'Test Location',
    );

    return {
      success: true,
      message: 'Test security alert sent',
    };
  }

  /**
   * Send test KYC notification
   */
  @Post('test/kyc')
  async sendTestKyc(@CurrentUser() user: User) {
    await this.novuNotificationService.sendKycStatusNotification(
      user.id,
      'approved',
    );

    return {
      success: true,
      message: 'Test KYC notification sent',
    };
  }

  /**
   * Send test welcome message
   */
  @Post('test/welcome')
  async sendTestWelcome(@CurrentUser() user: User) {
    await this.novuNotificationService.sendWelcomeMessage(
      user.id,
      user.firstName,
    );

    return {
      success: true,
      message: 'Test welcome message sent',
    };
  }

  /**
   * Get Novu status
   */
  @Get('status')
  async getStatus() {
    const enabled = this.novuNotificationService.isEnabled();

    return {
      success: true,
      enabled,
      message: enabled
        ? 'Novu is enabled and ready'
        : 'Novu is disabled. Check environment variables.',
    };
  }
}
