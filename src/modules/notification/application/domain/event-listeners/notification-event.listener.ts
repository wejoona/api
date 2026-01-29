import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PushNotificationService } from '../services/push-notification.service';
import { NotificationService } from '../services/notification.service';

/**
 * Events that trigger notifications
 */
export interface TransferReceivedEvent {
  userId: string;
  senderId: string;
  senderName?: string;
  amount: number;
  currency: string;
  transactionId: string;
}

export interface TransferSentEvent {
  userId: string;
  recipientId: string;
  recipientName?: string;
  amount: number;
  currency: string;
  transactionId: string;
}

export interface TransferCompletedEvent {
  userId: string;
  amount: number;
  currency: string;
  transactionId: string;
  type: 'internal' | 'external';
}

export interface TransferFailedEvent {
  userId: string;
  amount: number;
  currency: string;
  transactionId: string;
  reason: string;
}

export interface KycStatusChangedEvent {
  userId: string;
  status: 'approved' | 'rejected' | 'pending';
  reason?: string;
}

export interface NewDeviceLoginEvent {
  userId: string;
  deviceName: string;
  deviceId: string;
  ipAddress?: string;
  location?: string;
}

export interface LargeTransactionEvent {
  userId: string;
  amount: number;
  currency: string;
  transactionId: string;
}

export interface LowBalanceEvent {
  userId: string;
  currentBalance: number;
  threshold: number;
  currency: string;
}

export interface DepositCompletedEvent {
  userId: string;
  amount: number;
  currency: string;
  transactionId: string;
  method: string;
}

export interface WithdrawalCompletedEvent {
  userId: string;
  amount: number;
  currency: string;
  transactionId: string;
  destination: string;
}

/**
 * Notification Event Listener
 *
 * Listens for domain events and triggers appropriate notifications.
 * Events are emitted by other modules (Transfer, Transaction, Security, etc.)
 * and this listener handles creating both in-app and push notifications.
 *
 * Event naming convention:
 * - transfer.received: Incoming transfer notification
 * - transfer.sent: Outgoing transfer notification
 * - transfer.completed: Transfer completion notification
 * - transfer.failed: Transfer failure notification
 * - kyc.status.changed: KYC verification status update
 * - security.new_device_login: New device login alert
 * - security.large_transaction: Large transaction alert
 * - balance.low: Low balance warning
 * - deposit.completed: Deposit success notification
 * - withdrawal.completed: Withdrawal success notification
 */
@Injectable()
export class NotificationEventListener {
  private readonly logger = new Logger(NotificationEventListener.name);

  constructor(
    private readonly pushNotificationService: PushNotificationService,
    private readonly notificationService: NotificationService,
  ) {}

  // ============================================
  // TRANSFER EVENTS
  // ============================================

  @OnEvent('transfer.received')
  async handleTransferReceived(event: TransferReceivedEvent): Promise<void> {
    this.logger.log(
      `Processing transfer.received event for user ${event.userId}`,
    );

    // Send push notification
    await this.pushNotificationService.sendTransactionNotification({
      userId: event.userId,
      type: 'received',
      amount: event.amount,
      currency: event.currency,
      transactionId: event.transactionId,
      senderName: event.senderName,
    });

    // Create in-app notification
    await this.notificationService.sendToUser({
      userId: event.userId,
      type: 'transfer_received',
      title: 'Money Received',
      body: event.senderName
        ? `You received ${event.amount} ${event.currency} from ${event.senderName}`
        : `You received ${event.amount} ${event.currency}`,
      data: {
        transactionId: event.transactionId,
        amount: event.amount.toString(),
        currency: event.currency,
        senderId: event.senderId,
      },
      referenceType: 'transaction',
      referenceId: event.transactionId,
    });
  }

  @OnEvent('transfer.sent')
  async handleTransferSent(event: TransferSentEvent): Promise<void> {
    this.logger.log(`Processing transfer.sent event for user ${event.userId}`);

    await this.pushNotificationService.sendTransactionNotification({
      userId: event.userId,
      type: 'sent',
      amount: event.amount,
      currency: event.currency,
      transactionId: event.transactionId,
      recipientName: event.recipientName,
    });

    await this.notificationService.sendToUser({
      userId: event.userId,
      type: 'transfer_sent',
      title: 'Transfer Sent',
      body: event.recipientName
        ? `${event.amount} ${event.currency} sent to ${event.recipientName}`
        : `${event.amount} ${event.currency} sent successfully`,
      data: {
        transactionId: event.transactionId,
        amount: event.amount.toString(),
        currency: event.currency,
        recipientId: event.recipientId,
      },
      referenceType: 'transaction',
      referenceId: event.transactionId,
    });
  }

  @OnEvent('transfer.completed')
  async handleTransferCompleted(event: TransferCompletedEvent): Promise<void> {
    this.logger.log(
      `Processing transfer.completed event for user ${event.userId}`,
    );

    await this.pushNotificationService.sendTransactionNotification({
      userId: event.userId,
      type: 'completed',
      amount: event.amount,
      currency: event.currency,
      transactionId: event.transactionId,
    });

    await this.notificationService.sendToUser({
      userId: event.userId,
      type: 'transfer_complete',
      title: 'Transfer Complete',
      body: `Your ${event.type} transfer of ${event.amount} ${event.currency} is complete`,
      data: {
        transactionId: event.transactionId,
        amount: event.amount.toString(),
        currency: event.currency,
        type: event.type,
      },
      referenceType: 'transaction',
      referenceId: event.transactionId,
    });
  }

  @OnEvent('transfer.failed')
  async handleTransferFailed(event: TransferFailedEvent): Promise<void> {
    this.logger.log(
      `Processing transfer.failed event for user ${event.userId}`,
    );

    await this.pushNotificationService.sendTransactionNotification({
      userId: event.userId,
      type: 'failed',
      amount: event.amount,
      currency: event.currency,
      transactionId: event.transactionId,
    });

    await this.notificationService.sendToUser({
      userId: event.userId,
      type: 'transfer_failed',
      title: 'Transfer Failed',
      body: `Transfer of ${event.amount} ${event.currency} failed: ${event.reason}`,
      data: {
        transactionId: event.transactionId,
        amount: event.amount.toString(),
        currency: event.currency,
        reason: event.reason,
      },
      referenceType: 'transaction',
      referenceId: event.transactionId,
      priority: 'high',
    });
  }

  // ============================================
  // KYC EVENTS
  // ============================================

  @OnEvent('kyc.status.changed')
  async handleKycStatusChanged(event: KycStatusChangedEvent): Promise<void> {
    this.logger.log(
      `Processing kyc.status.changed event for user ${event.userId}: ${event.status}`,
    );

    await this.pushNotificationService.sendKycStatusNotification(
      event.userId,
      event.status,
      event.reason,
    );

    const titles: Record<string, string> = {
      approved: 'KYC Approved',
      rejected: 'KYC Verification Failed',
      pending: 'KYC Under Review',
    };

    const bodies: Record<string, string> = {
      approved:
        'Your identity has been verified. You now have full access to all features.',
      rejected:
        event.reason ||
        'Your verification was not successful. Please try again.',
      pending:
        'Your documents are being reviewed. This usually takes 1-2 business days.',
    };

    await this.notificationService.sendToUser({
      userId: event.userId,
      type: 'kyc_update',
      title: titles[event.status],
      body: bodies[event.status],
      data: {
        status: event.status,
        reason: event.reason || '',
      },
      priority: event.status === 'rejected' ? 'high' : 'normal',
    });
  }

  // ============================================
  // SECURITY EVENTS
  // ============================================

  @OnEvent('security.new_device_login')
  async handleNewDeviceLogin(event: NewDeviceLoginEvent): Promise<void> {
    this.logger.log(
      `Processing security.new_device_login event for user ${event.userId}`,
    );

    await this.pushNotificationService.sendNewDeviceLoginAlert(
      event.userId,
      event.deviceName,
      event.location,
    );

    await this.notificationService.sendToUser({
      userId: event.userId,
      type: 'new_device_login',
      title: 'New Device Login',
      body: `A new device "${event.deviceName}" logged into your account${event.location ? ` from ${event.location}` : ''}.`,
      data: {
        deviceName: event.deviceName,
        deviceId: event.deviceId,
        ipAddress: event.ipAddress || '',
        location: event.location || '',
      },
      priority: 'high',
    });
  }

  @OnEvent('security.large_transaction')
  async handleLargeTransaction(event: LargeTransactionEvent): Promise<void> {
    this.logger.log(
      `Processing security.large_transaction event for user ${event.userId}`,
    );

    await this.pushNotificationService.sendLargeTransactionAlert(
      event.userId,
      event.amount,
      event.currency,
      event.transactionId,
    );

    await this.notificationService.sendToUser({
      userId: event.userId,
      type: 'large_transaction',
      title: 'Large Transaction Alert',
      body: `A large transaction of ${event.amount} ${event.currency} has been initiated.`,
      data: {
        transactionId: event.transactionId,
        amount: event.amount.toString(),
        currency: event.currency,
      },
      referenceType: 'transaction',
      referenceId: event.transactionId,
      priority: 'high',
    });
  }

  // ============================================
  // BALANCE EVENTS
  // ============================================

  @OnEvent('balance.low')
  async handleLowBalance(event: LowBalanceEvent): Promise<void> {
    this.logger.log(`Processing balance.low event for user ${event.userId}`);

    await this.pushNotificationService.sendLowBalanceAlert(
      event.userId,
      event.currentBalance,
      event.threshold,
      event.currency,
    );

    await this.notificationService.sendToUser({
      userId: event.userId,
      type: 'low_balance',
      title: 'Low Balance Alert',
      body: `Your ${event.currency} balance (${event.currentBalance}) is below your threshold (${event.threshold}).`,
      data: {
        currentBalance: event.currentBalance.toString(),
        threshold: event.threshold.toString(),
        currency: event.currency,
      },
    });
  }

  // ============================================
  // DEPOSIT/WITHDRAWAL EVENTS
  // ============================================

  @OnEvent('deposit.completed')
  async handleDepositCompleted(event: DepositCompletedEvent): Promise<void> {
    this.logger.log(
      `Processing deposit.completed event for user ${event.userId}`,
    );

    await this.pushNotificationService.sendTransactionNotification({
      userId: event.userId,
      type: 'completed',
      amount: event.amount,
      currency: event.currency,
      transactionId: event.transactionId,
    });

    await this.notificationService.sendToUser({
      userId: event.userId,
      type: 'deposit_complete',
      title: 'Deposit Complete',
      body: `Your deposit of ${event.amount} ${event.currency} has been credited to your account.`,
      data: {
        transactionId: event.transactionId,
        amount: event.amount.toString(),
        currency: event.currency,
        method: event.method,
      },
      referenceType: 'transaction',
      referenceId: event.transactionId,
    });
  }

  @OnEvent('withdrawal.completed')
  async handleWithdrawalCompleted(
    event: WithdrawalCompletedEvent,
  ): Promise<void> {
    this.logger.log(
      `Processing withdrawal.completed event for user ${event.userId}`,
    );

    await this.pushNotificationService.sendTransactionNotification({
      userId: event.userId,
      type: 'completed',
      amount: event.amount,
      currency: event.currency,
      transactionId: event.transactionId,
    });

    await this.notificationService.sendToUser({
      userId: event.userId,
      type: 'withdrawal_complete',
      title: 'Withdrawal Complete',
      body: `Your withdrawal of ${event.amount} ${event.currency} has been sent to ${event.destination}.`,
      data: {
        transactionId: event.transactionId,
        amount: event.amount.toString(),
        currency: event.currency,
        destination: event.destination,
      },
      referenceType: 'transaction',
      referenceId: event.transactionId,
    });
  }
}
