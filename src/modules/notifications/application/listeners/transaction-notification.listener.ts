/**
 * Transaction Notification Listener
 * Listens for transaction events and sends notifications
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';
import { TransactionNotificationEvent } from '../../domain/interfaces/notification.types';

@Injectable()
export class TransactionNotificationListener {
  private readonly logger = new Logger(TransactionNotificationListener.name);

  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent('transaction.deposit.completed')
  async handleDepositCompleted(event: TransactionNotificationEvent) {
    this.logger.log(
      `Sending deposit notification for transaction ${event.transactionId}`,
    );

    await this.notificationService.send({
      userId: event.userId,
      category: 'transaction',
      title: 'Deposit Received',
      body: `You have received ${event.amount} ${event.currency}`,
      templateId: 'transaction.deposit.received',
      templateData: {
        amount: event.amount,
        currency: event.currency,
        balance: event.amount, // TODO: Get actual balance
      },
      data: {
        type: 'deposit',
        transactionId: event.transactionId,
        amount: event.amount,
        currency: event.currency,
      },
      deepLink: `/transactions/${event.transactionId}`,
      channels: ['push', 'sms', 'email', 'in_app'],
      priority: 'high',
    });
  }

  @OnEvent('transaction.transfer.sent')
  async handleTransferSent(event: TransactionNotificationEvent) {
    this.logger.log(
      `Sending transfer sent notification for ${event.transactionId}`,
    );

    await this.notificationService.send({
      userId: event.userId,
      category: 'transaction',
      title: 'Transfer Sent',
      body: `You sent ${event.amount} ${event.currency} to ${event.recipientName}`,
      templateId: 'transaction.transfer.sent',
      templateData: {
        amount: event.amount,
        currency: event.currency,
        recipientName: event.recipientName || 'recipient',
      },
      data: {
        type: 'transfer_sent',
        transactionId: event.transactionId,
        amount: event.amount,
        currency: event.currency,
      },
      deepLink: `/transactions/${event.transactionId}`,
      channels: ['push', 'in_app'],
      priority: 'normal',
    });
  }

  @OnEvent('transaction.transfer.received')
  async handleTransferReceived(event: TransactionNotificationEvent) {
    this.logger.log(
      `Sending transfer received notification for ${event.transactionId}`,
    );

    await this.notificationService.send({
      userId: event.userId,
      category: 'transaction',
      title: 'Money Received',
      body: `${event.senderName} sent you ${event.amount} ${event.currency}`,
      templateId: 'transaction.transfer.received',
      templateData: {
        amount: event.amount,
        currency: event.currency,
        senderName: event.senderName || 'Someone',
      },
      data: {
        type: 'transfer_received',
        transactionId: event.transactionId,
        amount: event.amount,
        currency: event.currency,
      },
      deepLink: `/transactions/${event.transactionId}`,
      channels: ['push', 'sms', 'in_app'],
      priority: 'high',
    });
  }

  @OnEvent('transaction.withdrawal.completed')
  async handleWithdrawalCompleted(event: TransactionNotificationEvent) {
    this.logger.log(
      `Sending withdrawal completed notification for ${event.transactionId}`,
    );

    await this.notificationService.send({
      userId: event.userId,
      category: 'transaction',
      title: 'Withdrawal Completed',
      body: `Your withdrawal of ${event.amount} ${event.currency} has been completed`,
      templateId: 'transaction.withdrawal.completed',
      templateData: {
        amount: event.amount,
        currency: event.currency,
      },
      data: {
        type: 'withdrawal',
        transactionId: event.transactionId,
        status: 'completed',
      },
      deepLink: `/transactions/${event.transactionId}`,
      channels: ['push', 'sms', 'email', 'in_app'],
      priority: 'high',
    });
  }

  @OnEvent('transaction.withdrawal.failed')
  async handleWithdrawalFailed(
    event: TransactionNotificationEvent & { reason?: string },
  ) {
    this.logger.log(
      `Sending withdrawal failed notification for ${event.transactionId}`,
    );

    await this.notificationService.send({
      userId: event.userId,
      category: 'transaction',
      title: 'Withdrawal Failed',
      body: `Your withdrawal of ${event.amount} ${event.currency} could not be processed`,
      templateId: 'transaction.withdrawal.failed',
      templateData: {
        amount: event.amount,
        currency: event.currency,
        reason: event.reason || 'Unknown error',
      },
      data: {
        type: 'withdrawal',
        transactionId: event.transactionId,
        status: 'failed',
      },
      deepLink: `/transactions/${event.transactionId}`,
      channels: ['push', 'email', 'in_app'],
      priority: 'high',
    });
  }
}
