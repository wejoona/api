/**
 * KYC Notification Listener
 * Listens for KYC events and sends notifications
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';
import { KycNotificationEvent } from '../../domain/interfaces/notification.types';

@Injectable()
export class KycNotificationListener {
  private readonly logger = new Logger(KycNotificationListener.name);

  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent('kyc.submitted')
  async handleKycSubmitted(event: KycNotificationEvent) {
    this.logger.log(
      `Sending KYC submitted notification for user ${event.userId}`,
    );

    await this.notificationService.send({
      userId: event.userId,
      category: 'kyc',
      title: 'KYC Documents Submitted',
      body: 'Your documents have been submitted and are being reviewed.',
      templateId: 'kyc.submitted',
      templateData: {},
      data: {
        type: 'kyc_submitted',
        kycId: event.kycId,
      },
      deepLink: '/kyc/status',
      channels: ['push', 'email', 'in_app'],
      priority: 'normal',
    });
  }

  @OnEvent('kyc.approved')
  async handleKycApproved(event: KycNotificationEvent) {
    this.logger.log(
      `Sending KYC approved notification for user ${event.userId}`,
    );

    await this.notificationService.send({
      userId: event.userId,
      category: 'kyc',
      title: 'KYC Approved!',
      body: 'Congratulations! Your identity has been verified.',
      templateId: 'kyc.approved',
      templateData: {},
      data: {
        type: 'kyc_approved',
        kycId: event.kycId,
      },
      deepLink: '/home',
      channels: ['push', 'sms', 'email', 'in_app'],
      priority: 'high',
    });
  }

  @OnEvent('kyc.rejected')
  async handleKycRejected(event: KycNotificationEvent) {
    this.logger.log(
      `Sending KYC rejected notification for user ${event.userId}`,
    );

    await this.notificationService.send({
      userId: event.userId,
      category: 'kyc',
      title: 'KYC Review Required',
      body: `We could not verify your documents. ${event.rejectionReason || 'Please resubmit.'}`,
      templateId: 'kyc.rejected',
      templateData: {
        reason: event.rejectionReason || 'Documents unclear or invalid',
      },
      data: {
        type: 'kyc_rejected',
        kycId: event.kycId,
        reason: event.rejectionReason,
      },
      deepLink: '/kyc/resubmit',
      channels: ['push', 'email', 'in_app'],
      priority: 'high',
    });
  }

  @OnEvent('kyc.requires_review')
  async handleKycRequiresReview(event: KycNotificationEvent) {
    this.logger.log(
      `Sending KYC requires review notification for user ${event.userId}`,
    );

    await this.notificationService.send({
      userId: event.userId,
      category: 'kyc',
      title: 'Additional Review Required',
      body: "Your documents require additional review. We'll notify you when complete.",
      data: {
        type: 'kyc_review',
        kycId: event.kycId,
      },
      deepLink: '/kyc/status',
      channels: ['push', 'in_app'],
      priority: 'normal',
    });
  }
}
