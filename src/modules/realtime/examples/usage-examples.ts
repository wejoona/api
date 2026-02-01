/**
 * Usage Examples for Realtime WebSocket Module
 *
 * This file demonstrates how to use the realtime notification system
 * from various parts of the application.
 */

import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RealtimeGateway } from '../infrastructure/gateways/realtime.gateway';
import { NotificationService } from '../application/services/notification.service';
import {
  NotificationEventType,
  TransactionNotificationEvent,
  BalanceNotificationEvent,
  SecurityNotificationEvent,
  KycStatusNotificationEvent,
} from '../domain/events/notification.event';

// ==========================================
// Example 1: Using EventEmitter (Recommended)
// ==========================================

@Injectable()
export class TransferServiceExample {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async createTransfer(userId: string, _recipientId: string, amount: number) {
    // ... transfer creation logic

    const transactionId = 'txn-123';

    // Emit event - NotificationService will automatically handle it
    this.eventEmitter.emit(
      'transaction.created',
      new TransactionNotificationEvent({
        type: NotificationEventType.TRANSACTION_CREATED,
        userId,
        transactionId,
        amount,
        currency: 'XOF',
        status: 'pending',
        direction: 'outbound',
        recipientName: 'John Doe',
      }),
    );

    return { transactionId };
  }

  async completeTransfer(
    transactionId: string,
    userId: string,
    amount: number,
  ) {
    // ... completion logic

    // Emit completion event
    this.eventEmitter.emit(
      'transaction.completed',
      new TransactionNotificationEvent({
        type: NotificationEventType.TRANSACTION_COMPLETED,
        userId,
        transactionId,
        amount,
        currency: 'XOF',
        status: 'completed',
        direction: 'outbound',
        recipientName: 'John Doe',
      }),
    );

    // Also emit balance update
    this.eventEmitter.emit(
      'balance.updated',
      new BalanceNotificationEvent({
        userId,
        balance: 4500,
        currency: 'XOF',
        previousBalance: 5000,
      }),
    );
  }

  async receiveTransfer(userId: string, _senderId: string, amount: number) {
    // ... receive transfer logic

    const transactionId = 'txn-456';

    // Notify recipient
    this.eventEmitter.emit(
      'transfer.received',
      new TransactionNotificationEvent({
        type: NotificationEventType.TRANSFER_RECEIVED,
        userId,
        transactionId,
        amount,
        currency: 'XOF',
        status: 'completed',
        direction: 'inbound',
        senderName: 'Jane Smith',
      }),
    );

    // Update balance
    this.eventEmitter.emit(
      'balance.updated',
      new BalanceNotificationEvent({
        userId,
        balance: 6000,
        currency: 'XOF',
        previousBalance: 5500,
      }),
    );
  }
}

// ==========================================
// Example 2: Using NotificationService Directly
// ==========================================

@Injectable()
export class WalletServiceExample {
  constructor(private readonly notificationService: NotificationService) {}

  async updateBalance(userId: string, newBalance: number, oldBalance: number) {
    // ... balance update logic

    // Send notification directly
    await this.notificationService.sendBalanceNotification({
      userId,
      balance: newBalance,
      currency: 'XOF',
      previousBalance: oldBalance,
    });
  }

  async processDeposit(userId: string, depositId: string, amount: number) {
    // ... deposit processing

    await this.notificationService.sendTransactionNotification({
      userId,
      type: NotificationEventType.DEPOSIT_COMPLETED,
      transactionId: depositId,
      amount,
      currency: 'XOF',
      status: 'completed',
      direction: 'inbound',
    });

    await this.notificationService.sendBalanceNotification({
      userId,
      balance: 10000,
      currency: 'XOF',
      previousBalance: 9000,
    });
  }

  async processWithdrawal(
    userId: string,
    withdrawalId: string,
    amount: number,
  ) {
    // ... withdrawal processing

    await this.notificationService.sendTransactionNotification({
      userId,
      type: NotificationEventType.WITHDRAWAL_COMPLETED,
      transactionId: withdrawalId,
      amount,
      currency: 'XOF',
      status: 'completed',
      direction: 'outbound',
    });
  }
}

// ==========================================
// Example 3: KYC Status Updates
// ==========================================

@Injectable()
export class KycServiceExample {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationService: NotificationService,
  ) {}

  async approveKyc(userId: string) {
    // ... KYC approval logic

    // Option 1: Using EventEmitter
    this.eventEmitter.emit(
      'kyc.status_updated',
      new KycStatusNotificationEvent({
        userId,
        status: 'approved',
        previousStatus: 'submitted',
        message: 'Your KYC verification has been approved!',
      }),
    );

    // Option 2: Using NotificationService
    await this.notificationService.sendKycNotification({
      userId,
      status: 'approved',
      previousStatus: 'submitted',
      message: 'Your KYC verification has been approved!',
    });
  }

  async rejectKyc(userId: string, reason: string) {
    // ... KYC rejection logic

    await this.notificationService.sendKycNotification({
      userId,
      status: 'rejected',
      previousStatus: 'submitted',
      message: `KYC verification rejected: ${reason}`,
    });
  }
}

// ==========================================
// Example 4: Security Alerts
// ==========================================

@Injectable()
export class SecurityServiceExample {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async detectSuspiciousActivity(userId: string, activityType: string) {
    // ... detection logic

    await this.notificationService.sendSecurityNotification({
      type: NotificationEventType.SECURITY_ALERT,
      userId,
      alertType: 'suspicious_activity',
      message: `Suspicious ${activityType} detected on your account`,
      severity: 'high',
      requiresAction: true,
    });
  }

  async suspendAccount(userId: string, reason: string) {
    // ... suspension logic

    // Send notification
    await this.notificationService.sendSecurityNotification({
      type: NotificationEventType.ACCOUNT_SUSPENDED,
      userId,
      alertType: 'account_suspended',
      message: `Your account has been suspended: ${reason}`,
      severity: 'critical',
      requiresAction: true,
    });

    // Disconnect all user sessions
    await this.realtimeGateway.disconnectUser(userId, reason);
  }

  async notifyNewDeviceLogin(userId: string, deviceInfo: string) {
    await this.notificationService.sendSecurityNotification({
      type: NotificationEventType.SECURITY_ALERT,
      userId,
      alertType: 'new_device_login',
      message: `Login from new device: ${deviceInfo}`,
      severity: 'medium',
      requiresAction: false,
    });
  }
}

// ==========================================
// Example 5: Using RealtimeGateway Directly
// ==========================================

@Injectable()
export class AdminServiceExample {
  constructor(private readonly realtimeGateway: RealtimeGateway) {}

  async checkUserOnlineStatus(userId: string): Promise<boolean> {
    return await this.realtimeGateway.isUserOnline(userId);
  }

  async getOnlineUsersCount(): Promise<number> {
    const users = await this.realtimeGateway.getOnlineUsers();
    return users.length;
  }

  async disconnectUserSession(userId: string, reason: string) {
    await this.realtimeGateway.disconnectUser(userId, reason);
  }

  async broadcastMaintenanceNotice(message: string, scheduledTime: Date) {
    await this.realtimeGateway.broadcast('maintenance.scheduled', {
      message,
      scheduledTime: scheduledTime.toISOString(),
    });
  }

  async sendCustomNotification(userId: string, data: unknown) {
    await this.realtimeGateway.sendToUser(userId, 'custom.notification', data);
  }
}

// ==========================================
// Example 6: Session Management
// ==========================================

@Injectable()
export class SessionServiceExample {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async expireSession(userId: string, _sessionId: string) {
    // ... expire session logic

    // Notify user
    this.eventEmitter.emit(
      'session.expired',
      new SecurityNotificationEvent({
        type: NotificationEventType.SESSION_EXPIRED,
        userId,
        alertType: 'session_expired',
        message: 'Your session has expired. Please log in again.',
        severity: 'medium',
        requiresAction: true,
      }),
    );

    // Force disconnect
    await this.realtimeGateway.disconnectUser(userId, 'Session expired');
  }
}

// ==========================================
// Example 7: Device Verification
// ==========================================

@Injectable()
export class DeviceServiceExample {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async verifyDevice(userId: string, deviceId: string) {
    // ... device verification logic

    this.eventEmitter.emit('device.verified', {
      type: NotificationEventType.DEVICE_VERIFIED,
      userId,
      data: {
        deviceId,
        message: 'Your device has been successfully verified',
      },
      timestamp: new Date(),
    });
  }
}

// ==========================================
// Example 8: Custom Events
// ==========================================

@Injectable()
export class CustomNotificationExample {
  constructor(private readonly notificationService: NotificationService) {}

  async sendPromotion(
    userId: string,
    promotion: { title: string; discount: number },
  ) {
    await this.notificationService.sendCustomNotification(
      userId,
      'promotion.available',
      {
        title: promotion.title,
        discount: promotion.discount,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    );
  }

  async sendReferralReward(userId: string, rewardAmount: number) {
    await this.notificationService.sendCustomNotification(
      userId,
      'referral.reward',
      {
        amount: rewardAmount,
        currency: 'XOF',
        message: `You earned ${rewardAmount} XOF from a referral!`,
      },
    );
  }
}

// ==========================================
// Example 9: Batch Notifications
// ==========================================

@Injectable()
export class BatchNotificationExample {
  constructor(private readonly realtimeGateway: RealtimeGateway) {}

  async notifyMultipleUsers(userIds: string[], event: string, data: unknown) {
    for (const userId of userIds) {
      await this.realtimeGateway.sendToUser(userId, event, data);
    }
  }

  async sendSystemWideAlert(message: string) {
    await this.realtimeGateway.broadcast('system.alert', {
      message,
      severity: 'high',
      timestamp: new Date().toISOString(),
    });
  }
}

// ==========================================
// Example 10: Monitoring & Debugging
// ==========================================

@Injectable()
export class MonitoringExample {
  constructor(
    private readonly realtimeGateway: RealtimeGateway,
    private readonly notificationService: NotificationService,
  ) {}

  async getConnectionMetrics() {
    const onlineUsers = await this.realtimeGateway.getOnlineUsers();

    return {
      totalOnlineUsers: onlineUsers.length,
      userIds: onlineUsers,
    };
  }

  async testNotification(userId: string) {
    // Test if notifications are working for a user
    const isOnline = await this.realtimeGateway.isUserOnline(userId);

    if (!isOnline) {
      return { success: false, message: 'User is offline' };
    }

    await this.notificationService.sendCustomNotification(
      userId,
      'test.notification',
      {
        message: 'This is a test notification',
        timestamp: new Date().toISOString(),
      },
    );

    return { success: true, message: 'Test notification sent' };
  }
}
