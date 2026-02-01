import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RealtimeGateway } from '../../infrastructure/gateways/realtime.gateway';
import {
  NotificationEvent,
  NotificationEventType,
  TransactionNotificationEvent,
  BalanceNotificationEvent,
  SecurityNotificationEvent,
  KycStatusNotificationEvent,
} from '../../domain/events/notification.event';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly realtimeGateway: RealtimeGateway) {}

  // ==========================================
  // Transaction Events
  // ==========================================

  @OnEvent('transaction.created')
  async handleTransactionCreated(
    event: TransactionNotificationEvent,
  ): Promise<void> {
    await this.sendNotification(event);
  }

  @OnEvent('transaction.completed')
  async handleTransactionCompleted(
    event: TransactionNotificationEvent,
  ): Promise<void> {
    await this.sendNotification(event);
  }

  @OnEvent('transaction.failed')
  async handleTransactionFailed(
    event: TransactionNotificationEvent,
  ): Promise<void> {
    await this.sendNotification(event);
  }

  // ==========================================
  // Balance Events
  // ==========================================

  @OnEvent('balance.updated')
  async handleBalanceUpdated(event: BalanceNotificationEvent): Promise<void> {
    await this.sendNotification(event);
  }

  // ==========================================
  // Transfer Events
  // ==========================================

  @OnEvent('transfer.received')
  async handleTransferReceived(
    event: TransactionNotificationEvent,
  ): Promise<void> {
    await this.sendNotification(event);
  }

  @OnEvent('transfer.sent')
  async handleTransferSent(event: TransactionNotificationEvent): Promise<void> {
    await this.sendNotification(event);
  }

  // ==========================================
  // Deposit/Withdrawal Events
  // ==========================================

  @OnEvent('deposit.completed')
  async handleDepositCompleted(
    event: TransactionNotificationEvent,
  ): Promise<void> {
    await this.sendNotification(event);
  }

  @OnEvent('withdrawal.completed')
  async handleWithdrawalCompleted(
    event: TransactionNotificationEvent,
  ): Promise<void> {
    await this.sendNotification(event);
  }

  // ==========================================
  // KYC Events
  // ==========================================

  @OnEvent('kyc.status_updated')
  async handleKycStatusUpdated(
    event: KycStatusNotificationEvent,
  ): Promise<void> {
    await this.sendNotification(event);
  }

  // ==========================================
  // Security Events
  // ==========================================

  @OnEvent('security.alert')
  async handleSecurityAlert(event: SecurityNotificationEvent): Promise<void> {
    await this.sendNotification(event);
  }

  @OnEvent('account.suspended')
  async handleAccountSuspended(
    event: SecurityNotificationEvent,
  ): Promise<void> {
    await this.sendNotification(event);
    // Force disconnect the user
    await this.realtimeGateway.disconnectUser(
      event.userId,
      'Account suspended',
    );
  }

  @OnEvent('account.unsuspended')
  async handleAccountUnsuspended(
    event: SecurityNotificationEvent,
  ): Promise<void> {
    await this.sendNotification(event);
  }

  @OnEvent('session.expired')
  async handleSessionExpired(event: SecurityNotificationEvent): Promise<void> {
    await this.sendNotification(event);
    // Force disconnect the user
    await this.realtimeGateway.disconnectUser(event.userId, 'Session expired');
  }

  @OnEvent('device.verified')
  async handleDeviceVerified(event: NotificationEvent): Promise<void> {
    await this.sendNotification(event);
  }

  // ==========================================
  // Generic Notification Sender
  // ==========================================

  private async sendNotification(event: NotificationEvent): Promise<void> {
    try {
      // Check if user is online
      const isOnline = await this.realtimeGateway.isUserOnline(event.userId);

      if (!isOnline) {
        this.logger.debug(
          `User ${event.userId} is offline, skipping WebSocket notification`,
        );
        return;
      }

      // Send to user
      await this.realtimeGateway.sendToUser(event.userId, event.type, {
        ...event.data,
        timestamp: event.timestamp,
      });

      this.logger.log(
        `Sent ${event.type} notification to user ${event.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send notification: ${error.message}`,
        error.stack,
      );
    }
  }

  // ==========================================
  // Public Methods for Manual Notifications
  // ==========================================

  async sendTransactionNotification(props: {
    userId: string;
    type: NotificationEventType;
    transactionId: string;
    amount: number;
    currency: string;
    status: string;
    direction: 'inbound' | 'outbound';
    recipientName?: string;
    senderName?: string;
  }): Promise<void> {
    const event = new TransactionNotificationEvent(props);
    await this.sendNotification(event);
  }

  async sendBalanceNotification(props: {
    userId: string;
    balance: number;
    currency: string;
    previousBalance?: number;
  }): Promise<void> {
    const event = new BalanceNotificationEvent(props);
    await this.sendNotification(event);
  }

  async sendSecurityNotification(props: {
    type: NotificationEventType;
    userId: string;
    alertType: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    requiresAction: boolean;
  }): Promise<void> {
    const event = new SecurityNotificationEvent(props);
    await this.sendNotification(event);
  }

  async sendKycNotification(props: {
    userId: string;
    status: string;
    previousStatus?: string;
    message?: string;
  }): Promise<void> {
    const event = new KycStatusNotificationEvent(props);
    await this.sendNotification(event);
  }

  async sendCustomNotification(
    userId: string,
    eventType: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const event: NotificationEvent = {
      type: eventType as NotificationEventType,
      userId,
      data,
      timestamp: new Date(),
    };
    await this.sendNotification(event);
  }
}
