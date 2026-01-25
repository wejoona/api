/**
 * Security Notification Listener
 * Listens for security events and sends notifications
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';
import { SecurityNotificationEvent } from '../../domain/interfaces/notification.types';

@Injectable()
export class SecurityNotificationListener {
  private readonly logger = new Logger(SecurityNotificationListener.name);

  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent('security.login.success')
  async handleLoginSuccess(event: SecurityNotificationEvent) {
    // Only notify for new device logins
    if (event.type !== 'new_device') return;

    this.logger.log(`Sending new device login notification for user ${event.userId}`);

    await this.notificationService.send({
      userId: event.userId,
      category: 'security',
      title: 'New Device Login',
      body: `Your account was accessed from a new device${event.location ? ` in ${event.location}` : ''}.`,
      templateId: 'security.login.new_device',
      templateData: {
        location: event.location || 'unknown location',
        deviceInfo: event.deviceInfo || 'Unknown device',
      },
      data: {
        type: 'new_device_login',
        ipAddress: event.ipAddress,
        deviceInfo: event.deviceInfo,
      },
      deepLink: '/settings/security',
      channels: ['push', 'sms', 'email', 'in_app'],
      priority: 'critical',
    });
  }

  @OnEvent('security.password.changed')
  async handlePasswordChanged(event: SecurityNotificationEvent) {
    this.logger.log(`Sending password changed notification for user ${event.userId}`);

    await this.notificationService.send({
      userId: event.userId,
      category: 'security',
      title: 'Password Changed',
      body: 'Your password was changed successfully.',
      templateId: 'security.password.changed',
      templateData: {},
      data: {
        type: 'password_changed',
      },
      deepLink: '/settings/security',
      channels: ['push', 'email', 'in_app'],
      priority: 'high',
    });
  }

  @OnEvent('security.suspicious_activity')
  async handleSuspiciousActivity(event: SecurityNotificationEvent) {
    this.logger.log(`Sending suspicious activity notification for user ${event.userId}`);

    await this.notificationService.send({
      userId: event.userId,
      category: 'security',
      title: 'Suspicious Activity Detected',
      body: 'We detected unusual activity on your account. Please review your recent transactions.',
      data: {
        type: 'suspicious_activity',
        ipAddress: event.ipAddress,
      },
      deepLink: '/settings/security',
      channels: ['push', 'sms', 'email', 'in_app'],
      priority: 'critical',
    });
  }

  @OnEvent('security.pin.changed')
  async handlePinChanged(event: SecurityNotificationEvent) {
    this.logger.log(`Sending PIN changed notification for user ${event.userId}`);

    await this.notificationService.send({
      userId: event.userId,
      category: 'security',
      title: 'PIN Changed',
      body: 'Your transaction PIN was changed successfully.',
      data: {
        type: 'pin_changed',
      },
      deepLink: '/settings/security',
      channels: ['push', 'in_app'],
      priority: 'normal',
    });
  }
}
