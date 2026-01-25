/**
 * Risk Notification Listener
 * Listens for risk events and sends notifications
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';
import { RiskNotificationEvent } from '../../domain/interfaces/notification.types';

@Injectable()
export class RiskNotificationListener {
  private readonly logger = new Logger(RiskNotificationListener.name);

  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent('risk.transaction.blocked')
  async handleTransactionBlocked(event: RiskNotificationEvent) {
    this.logger.log(`Sending transaction blocked notification for user ${event.userId}`);

    await this.notificationService.send({
      userId: event.userId,
      category: 'risk',
      title: 'Transaction Blocked',
      body: 'Your transaction was blocked for security reasons.',
      templateId: 'risk.transaction.blocked',
      templateData: {
        reason: event.reason,
      },
      data: {
        type: 'transaction_blocked',
        transactionId: event.transactionId,
        reason: event.reason,
      },
      deepLink: '/support',
      channels: ['push', 'email', 'in_app'],
      priority: 'high',
    });
  }

  @OnEvent('risk.step_up.required')
  async handleStepUpRequired(event: RiskNotificationEvent) {
    this.logger.log(`Sending step-up required notification for user ${event.userId}`);

    await this.notificationService.send({
      userId: event.userId,
      category: 'risk',
      title: 'Additional Verification Required',
      body: 'Please complete additional verification to proceed.',
      templateId: 'risk.step_up.required',
      templateData: {},
      data: {
        type: 'step_up_required',
        transactionId: event.transactionId,
      },
      deepLink: `/transactions/${event.transactionId}/verify`,
      channels: ['push', 'in_app'],
      priority: 'high',
    });
  }

  @OnEvent('risk.sanctions.match')
  async handleSanctionsMatch(event: RiskNotificationEvent) {
    // This is an internal alert - don't notify the user directly
    // Instead, this should trigger an internal review process
    this.logger.warn(`Sanctions match detected for user ${event.userId}`, {
      reason: event.reason,
    });

    // Emit event for internal systems
    // In production, this would alert compliance team
  }
}
