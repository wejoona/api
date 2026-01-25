/**
 * Scheduled Payment Notification Listener
 * Listens for scheduled payment events and sends notifications
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';

interface ScheduleCreatedEvent {
  scheduleId: string;
  userId: string;
  recipientName: string;
  amount: number;
  currency: string;
  frequency: string;
  nextExecutionAt: Date;
}

interface PaymentExecutedEvent {
  executionId: string;
  scheduleId: string;
  userId: string;
  recipientName: string;
  amount: number;
  currency: string;
  status: 'completed' | 'failed';
  failureReason?: string;
}

interface LowBalanceWarningEvent {
  userId: string;
  scheduleId: string;
  scheduleName: string;
  amount: number;
  currency: string;
  currentBalance: number;
  scheduledAt: Date;
}

interface UpcomingPaymentEvent {
  userId: string;
  scheduleId: string;
  scheduleName: string;
  recipientName: string;
  amount: number;
  currency: string;
  scheduledAt: Date;
}

@Injectable()
export class ScheduledPaymentNotificationListener {
  private readonly logger = new Logger(ScheduledPaymentNotificationListener.name);

  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent('schedule.created')
  async handleScheduleCreated(event: ScheduleCreatedEvent) {
    this.logger.log(`Sending schedule created notification for ${event.scheduleId}`);

    await this.notificationService.send({
      userId: event.userId,
      category: 'transaction',
      title: 'Scheduled Payment Created',
      body: `Your ${event.frequency} payment of ${event.amount} ${event.currency} to ${event.recipientName} has been scheduled.`,
      data: {
        type: 'schedule_created',
        scheduleId: event.scheduleId,
        nextExecutionAt: event.nextExecutionAt,
      },
      deepLink: `/scheduled-payments/${event.scheduleId}`,
      channels: ['push', 'in_app'],
      priority: 'normal',
    });
  }

  @OnEvent('scheduled.payment.executed')
  async handlePaymentExecuted(event: PaymentExecutedEvent) {
    this.logger.log(`Sending payment executed notification for ${event.executionId}`);

    if (event.status === 'completed') {
      await this.notificationService.send({
        userId: event.userId,
        category: 'transaction',
        title: 'Scheduled Payment Sent',
        body: `Your scheduled payment of ${event.amount} ${event.currency} to ${event.recipientName} has been sent.`,
        templateId: 'scheduled.payment.executed',
        templateData: {
          amount: event.amount,
          currency: event.currency,
          recipientName: event.recipientName,
        },
        data: {
          type: 'scheduled_payment_sent',
          scheduleId: event.scheduleId,
          executionId: event.executionId,
        },
        deepLink: `/scheduled-payments/${event.scheduleId}`,
        channels: ['push', 'in_app'],
        priority: 'normal',
      });
    } else {
      await this.notificationService.send({
        userId: event.userId,
        category: 'transaction',
        title: 'Scheduled Payment Failed',
        body: `Your scheduled payment of ${event.amount} ${event.currency} to ${event.recipientName} failed. ${event.failureReason || ''}`,
        templateId: 'scheduled.payment.failed',
        templateData: {
          amount: event.amount,
          currency: event.currency,
          recipientName: event.recipientName,
          reason: event.failureReason || 'Unknown error',
        },
        data: {
          type: 'scheduled_payment_failed',
          scheduleId: event.scheduleId,
          executionId: event.executionId,
          failureReason: event.failureReason,
        },
        deepLink: `/scheduled-payments/${event.scheduleId}`,
        channels: ['push', 'email', 'in_app'],
        priority: 'high',
      });
    }
  }

  @OnEvent('scheduled.payment.upcoming')
  async handleUpcomingPayment(event: UpcomingPaymentEvent) {
    this.logger.log(`Sending upcoming payment reminder for ${event.scheduleId}`);

    const scheduledDate = new Date(event.scheduledAt);
    const dateStr = scheduledDate.toLocaleDateString();

    await this.notificationService.send({
      userId: event.userId,
      category: 'transaction',
      title: 'Upcoming Scheduled Payment',
      body: `Reminder: A payment of ${event.amount} ${event.currency} to ${event.recipientName} is scheduled for ${dateStr}.`,
      templateId: 'scheduled.payment.upcoming',
      templateData: {
        amount: event.amount,
        currency: event.currency,
        recipientName: event.recipientName,
        date: dateStr,
      },
      data: {
        type: 'scheduled_payment_upcoming',
        scheduleId: event.scheduleId,
        scheduledAt: event.scheduledAt,
      },
      deepLink: `/scheduled-payments/${event.scheduleId}`,
      channels: ['push', 'in_app'],
      priority: 'normal',
    });
  }

  @OnEvent('scheduled.payment.low_balance')
  async handleLowBalance(event: LowBalanceWarningEvent) {
    this.logger.log(`Sending low balance warning for ${event.scheduleId}`);

    await this.notificationService.send({
      userId: event.userId,
      category: 'transaction',
      title: 'Low Balance Warning',
      body: `Your upcoming payment of ${event.amount} ${event.currency} may fail due to insufficient balance. Current balance: ${event.currentBalance} ${event.currency}`,
      templateId: 'scheduled.payment.low_balance',
      templateData: {
        amount: event.amount,
        currency: event.currency,
        currentBalance: event.currentBalance,
      },
      data: {
        type: 'low_balance_warning',
        scheduleId: event.scheduleId,
        requiredAmount: event.amount,
        currentBalance: event.currentBalance,
      },
      deepLink: '/wallet/deposit',
      channels: ['push', 'sms', 'email', 'in_app'],
      priority: 'high',
    });
  }

  @OnEvent('schedule.paused')
  async handleSchedulePaused(event: { scheduleId: string; userId: string }) {
    await this.notificationService.send({
      userId: event.userId,
      category: 'transaction',
      title: 'Schedule Paused',
      body: 'Your scheduled payment has been paused. You can resume it anytime.',
      data: {
        type: 'schedule_paused',
        scheduleId: event.scheduleId,
      },
      deepLink: `/scheduled-payments/${event.scheduleId}`,
      channels: ['in_app'],
      priority: 'normal',
    });
  }

  @OnEvent('schedule.resumed')
  async handleScheduleResumed(event: { scheduleId: string; userId: string; nextExecutionAt: Date }) {
    await this.notificationService.send({
      userId: event.userId,
      category: 'transaction',
      title: 'Schedule Resumed',
      body: 'Your scheduled payment has been resumed.',
      data: {
        type: 'schedule_resumed',
        scheduleId: event.scheduleId,
        nextExecutionAt: event.nextExecutionAt,
      },
      deepLink: `/scheduled-payments/${event.scheduleId}`,
      channels: ['push', 'in_app'],
      priority: 'normal',
    });
  }
}
