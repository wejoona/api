/**
 * Alert Notification Service
 * Handles sending notifications for monitoring alerts
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../../../notifications/application/services/notification.service';
import {
  TransactionAlert,
  AlertCreatedEvent,
  ALERT_TYPE_CONFIG,
  AlertType,
} from '../../domain/interfaces/monitoring.types';

@Injectable()
export class AlertNotificationService {
  private readonly logger = new Logger(AlertNotificationService.name);

  constructor(
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Handle alert created event
   */
  @OnEvent('monitoring.alert.created')
  async handleAlertCreated(event: AlertCreatedEvent): Promise<void> {
    const { alert, user, shouldNotify } = event;

    this.logger.log(`Processing notification for alert ${alert.alertId}`);

    try {
      const config = ALERT_TYPE_CONFIG[alert.alertType];
      const channels = this.determineChannels(shouldNotify, alert.severity);

      if (channels.length === 0) {
        this.logger.debug(
          `No notification channels enabled for alert ${alert.alertId}`,
        );
        return;
      }

      await this.notificationService.send({
        userId: user.userId,
        category: 'security',
        title: alert.title,
        body: alert.message,
        data: {
          alertId: alert.alertId,
          alertType: alert.alertType,
          severity: alert.severity,
          transactionId: alert.transactionId,
          isActionRequired: alert.isActionRequired,
        },
        deepLink: `/alerts/${alert.alertId}`,
        priority: this.mapSeverityToPriority(alert.severity),
        channels,
        phoneNumber: user.phone,
        email: user.email,
      });

      this.logger.log(
        `Sent notification for alert ${alert.alertId} via ${channels.join(', ')}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send notification for alert ${alert.alertId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle critical alerts with escalation
   */
  @OnEvent('monitoring.alert.suspicious_pattern')
  @OnEvent('monitoring.alert.unusual_location')
  async handleCriticalAlert(event: AlertCreatedEvent): Promise<void> {
    const { alert, user } = event;

    this.logger.log(`Handling critical alert ${alert.alertId}`);

    // Send to admin notification channel
    try {
      await this.notificationService.send({
        userId: 'admin',
        category: 'security',
        title: `[ALERT] ${alert.title}`,
        body: `User ${user.userId} triggered: ${alert.message}`,
        data: {
          alertId: alert.alertId,
          userId: user.userId,
          alertType: alert.alertType,
          severity: alert.severity,
        },
        priority: 'critical',
        channels: ['push', 'email', 'in_app'],
      });
    } catch (error) {
      this.logger.error(`Failed to send admin notification: ${error.message}`);
    }
  }

  /**
   * Send immediate SMS for critical alerts
   */
  async sendCriticalSms(
    alert: TransactionAlert,
    phoneNumber: string,
  ): Promise<void> {
    if (!phoneNumber) {
      this.logger.warn(
        `No phone number for critical SMS alert ${alert.alertId}`,
      );
      return;
    }

    try {
      await this.notificationService.send({
        userId: alert.userId,
        category: 'security',
        title: alert.title,
        body: this.formatSmsMessage(alert),
        channels: ['sms'],
        priority: 'critical',
        phoneNumber,
      });

      this.logger.log(`Sent critical SMS for alert ${alert.alertId}`);
    } catch (error) {
      this.logger.error(`Failed to send critical SMS: ${error.message}`);
    }
  }

  /**
   * Send alert digest email
   */
  async sendAlertDigest(
    userId: string,
    email: string,
    alerts: TransactionAlert[],
    period: 'daily' | 'weekly',
  ): Promise<void> {
    if (alerts.length === 0) {
      return;
    }

    try {
      const criticalCount = alerts.filter(
        (a) => a.severity === 'critical',
      ).length;
      const warningCount = alerts.filter(
        (a) => a.severity === 'warning',
      ).length;
      const infoCount = alerts.filter((a) => a.severity === 'info').length;

      const title = `Your ${period} alert summary`;
      const body = this.formatDigestBody(
        alerts,
        criticalCount,
        warningCount,
        infoCount,
        period,
      );

      await this.notificationService.send({
        userId,
        category: 'security',
        title,
        body,
        channels: ['email'],
        priority: criticalCount > 0 ? 'high' : 'normal',
        email,
        data: {
          digestType: period,
          alertCount: alerts.length,
          criticalCount,
          warningCount,
          infoCount,
        },
      });

      this.logger.log(`Sent ${period} alert digest to ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send alert digest: ${error.message}`);
    }
  }

  /**
   * Determine notification channels based on preferences and severity
   */
  private determineChannels(
    shouldNotify: { push: boolean; sms: boolean; email: boolean },
    severity: string,
  ): ('push' | 'sms' | 'email' | 'in_app')[] {
    const channels: ('push' | 'sms' | 'email' | 'in_app')[] = ['in_app'];

    if (shouldNotify.push) {
      channels.push('push');
    }

    if (shouldNotify.email) {
      channels.push('email');
    }

    // SMS only for critical or if explicitly enabled
    if (
      shouldNotify.sms &&
      (severity === 'critical' || severity === 'warning')
    ) {
      channels.push('sms');
    }

    return channels;
  }

  /**
   * Map severity to notification priority
   */
  private mapSeverityToPriority(
    severity: string,
  ): 'low' | 'normal' | 'high' | 'critical' {
    switch (severity) {
      case 'critical':
        return 'critical';
      case 'warning':
        return 'high';
      case 'info':
        return 'normal';
      default:
        return 'normal';
    }
  }

  /**
   * Format SMS message (must be concise)
   */
  private formatSmsMessage(alert: TransactionAlert): string {
    const config = ALERT_TYPE_CONFIG[alert.alertType];
    return `JoonaPay Alert: ${alert.title}. ${alert.message.substring(0, 100)}`;
  }

  /**
   * Format digest email body
   */
  private formatDigestBody(
    alerts: TransactionAlert[],
    critical: number,
    warning: number,
    info: number,
    period: string,
  ): string {
    let body = `You had ${alerts.length} security alerts in the past ${period}.\n\n`;

    if (critical > 0) {
      body += `- ${critical} critical alert(s) requiring immediate attention\n`;
    }
    if (warning > 0) {
      body += `- ${warning} warning(s)\n`;
    }
    if (info > 0) {
      body += `- ${info} informational alert(s)\n`;
    }

    body += '\nRecent alerts:\n\n';

    // Include top 5 most important alerts
    const sortedAlerts = [...alerts].sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return (
        severityOrder[a.severity] - severityOrder[b.severity] ||
        b.createdAt.getTime() - a.createdAt.getTime()
      );
    });

    sortedAlerts.slice(0, 5).forEach((alert) => {
      body += `[${alert.severity.toUpperCase()}] ${alert.title}\n`;
      body += `${alert.message}\n`;
      body += `${new Date(alert.createdAt).toLocaleString()}\n\n`;
    });

    if (alerts.length > 5) {
      body += `... and ${alerts.length - 5} more alerts.\n`;
    }

    body += '\nLog in to your JoonaPay app to review all alerts.';

    return body;
  }

  /**
   * Get alert icon and color for push notification
   */
  getAlertVisuals(alertType: AlertType): { icon: string; color: string } {
    const config = ALERT_TYPE_CONFIG[alertType];
    return {
      icon: config.icon,
      color: config.color,
    };
  }
}
