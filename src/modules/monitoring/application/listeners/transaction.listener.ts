/**
 * Transaction Event Listener
 * Listens for transaction events and triggers monitoring pipeline
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TransactionMonitorService } from '../services/transaction-monitor.service';
import {
  TransactionContext,
  LocationInfo,
  DeviceInfo,
} from '../../domain/interfaces/monitoring.types';

// Transaction event payload from transaction module
interface TransactionEvent {
  transactionId: string;
  userId: string;
  walletId: string;
  type: 'deposit' | 'withdrawal' | 'transfer_internal' | 'transfer_external';
  amount: number;
  currency: string;
  status: string;
  recipientAddress?: string;
  recipientWalletId?: string;
  recipientPhone?: string;
  metadata?: Record<string, any>;
  // Additional context
  ip?: string;
  deviceId?: string;
  deviceInfo?: DeviceInfo;
  location?: LocationInfo;
}

// Failed transaction event
interface TransactionFailedEvent extends TransactionEvent {
  reason: string;
  failedAt: Date;
}

@Injectable()
export class TransactionEventListener {
  private readonly logger = new Logger(TransactionEventListener.name);

  // Track failed attempts per user for velocity checks
  private failedAttemptsCache: Map<string, { count: number; firstAt: Date }> =
    new Map();
  private readonly FAILED_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

  constructor(private readonly monitorService: TransactionMonitorService) {}

  /**
   * Handle transaction created event
   */
  @OnEvent('transaction.created')
  async handleTransactionCreated(event: TransactionEvent): Promise<void> {
    this.logger.log(`Transaction created event: ${event.transactionId}`);

    try {
      const context = this.buildTransactionContext(event);
      const result = await this.monitorService.monitorTransaction(context);

      this.logger.log(
        `Monitored transaction ${event.transactionId}: ${result.alertsCreated.length} alerts created`,
      );

      if (result.transactionBlocked) {
        this.logger.warn(
          `Transaction ${event.transactionId} blocked by monitoring: ${result.blockReason}`,
        );
        // Emit event to notify transaction service
        // This would typically trigger a transaction cancellation
      }
    } catch (error) {
      this.logger.error(
        `Error handling transaction created event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle transaction completed event
   */
  @OnEvent('transaction.completed')
  @OnEvent('transaction.deposit.completed')
  @OnEvent('transaction.transfer.completed')
  @OnEvent('transaction.withdrawal.completed')
  async handleTransactionCompleted(event: TransactionEvent): Promise<void> {
    this.logger.log(`Transaction completed event: ${event.transactionId}`);

    try {
      // For completed transactions, we primarily want to track for patterns
      // and possibly send confirmation alerts for large transactions
      const context = this.buildTransactionContext(event);

      // Only run full monitoring if this is a significant transaction
      if (event.amount >= 500 || event.type === 'transfer_external') {
        const result = await this.monitorService.monitorTransaction(context);
        this.logger.debug(
          `Completed transaction monitoring: ${result.alertsCreated.length} alerts`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling transaction completed event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle transaction failed event
   */
  @OnEvent('transaction.failed')
  async handleTransactionFailed(event: TransactionFailedEvent): Promise<void> {
    this.logger.log(`Transaction failed event: ${event.transactionId}`);

    try {
      // Track failed attempts
      this.trackFailedAttempt(event.userId);

      const failedCount = this.getFailedAttemptCount(event.userId);
      const context = this.buildTransactionContext(event, {
        recentFailedCount: failedCount,
      });

      // Run monitoring with failed attempt context
      const result = await this.monitorService.monitorTransaction(context);

      if (result.alertsCreated.length > 0) {
        this.logger.warn(
          `Failed transaction ${event.transactionId} triggered ${result.alertsCreated.length} alerts`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling transaction failed event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle deposit received event
   */
  @OnEvent('wallet.deposit.received')
  async handleDepositReceived(event: {
    userId: string;
    walletId: string;
    amount: number;
    currency: string;
    previousBalance: number;
    newBalance: number;
  }): Promise<void> {
    this.logger.log(
      `Deposit received for wallet ${event.walletId}: ${event.amount} ${event.currency}`,
    );

    try {
      // Check balance threshold after deposit
      await this.monitorService.checkBalanceThreshold(
        event.userId,
        event.newBalance,
        event.previousBalance,
        event.currency,
      );
    } catch (error) {
      this.logger.error(`Error handling deposit received: ${error.message}`);
    }
  }

  /**
   * Handle withdrawal completed event
   */
  @OnEvent('wallet.withdrawal.completed')
  async handleWithdrawalCompleted(event: {
    userId: string;
    walletId: string;
    amount: number;
    currency: string;
    previousBalance: number;
    newBalance: number;
    recipientAddress: string;
  }): Promise<void> {
    this.logger.log(
      `Withdrawal completed for wallet ${event.walletId}: ${event.amount} ${event.currency}`,
    );

    try {
      // Check balance threshold after withdrawal
      await this.monitorService.checkBalanceThreshold(
        event.userId,
        event.newBalance,
        event.previousBalance,
        event.currency,
      );
    } catch (error) {
      this.logger.error(
        `Error handling withdrawal completed: ${error.message}`,
      );
    }
  }

  /**
   * Handle security events for new device login
   */
  @OnEvent('security.new_device_login')
  async handleNewDeviceLogin(event: {
    userId: string;
    deviceId: string;
    deviceType: string;
    platform: 'ios' | 'android' | 'web';
    osVersion?: string;
    appVersion?: string;
    ip: string;
    country?: string;
    city?: string;
  }): Promise<void> {
    this.logger.log(`New device login for user ${event.userId}`);

    try {
      await this.monitorService.createNewDeviceAlert(
        event.userId,
        {
          deviceId: event.deviceId,
          deviceType: event.deviceType,
          platform: event.platform,
          osVersion: event.osVersion,
          appVersion: event.appVersion,
        },
        {
          ip: event.ip,
          country: event.country,
          city: event.city,
        },
      );
    } catch (error) {
      this.logger.error(`Error handling new device login: ${error.message}`);
    }
  }

  /**
   * Handle account change events
   */
  @OnEvent('security.password_changed')
  async handlePasswordChanged(event: { userId: string }): Promise<void> {
    await this.monitorService.createAccountChangeAlert(
      event.userId,
      'password',
    );
  }

  @OnEvent('security.pin_changed')
  async handlePinChanged(event: { userId: string }): Promise<void> {
    await this.monitorService.createAccountChangeAlert(event.userId, 'pin');
  }

  @OnEvent('security.2fa_changed')
  async handleTwoFactorChanged(event: {
    userId: string;
    enabled: boolean;
  }): Promise<void> {
    await this.monitorService.createAccountChangeAlert(event.userId, '2fa', {
      enabled: event.enabled,
    });
  }

  /**
   * Build transaction context from event
   */
  private buildTransactionContext(
    event: TransactionEvent,
    additionalMetadata?: Record<string, any>,
  ): TransactionContext {
    return {
      transactionId: event.transactionId,
      userId: event.userId,
      walletId: event.walletId,
      type: event.type,
      amount: event.amount,
      currency: event.currency,
      status: event.status,
      recipientAddress: event.recipientAddress,
      recipientWalletId: event.recipientWalletId,
      recipientPhone: event.recipientPhone,
      location: event.location,
      device: event.deviceInfo,
      metadata: {
        ...event.metadata,
        ...additionalMetadata,
      },
      createdAt: new Date(),
    };
  }

  /**
   * Track failed transaction attempt
   */
  private trackFailedAttempt(userId: string): void {
    const now = new Date();
    const existing = this.failedAttemptsCache.get(userId);

    if (existing) {
      // Check if window has expired
      if (now.getTime() - existing.firstAt.getTime() > this.FAILED_WINDOW_MS) {
        // Reset counter
        this.failedAttemptsCache.set(userId, { count: 1, firstAt: now });
      } else {
        // Increment counter
        existing.count += 1;
      }
    } else {
      this.failedAttemptsCache.set(userId, { count: 1, firstAt: now });
    }

    // Cleanup old entries periodically
    if (this.failedAttemptsCache.size > 10000) {
      this.cleanupFailedAttemptsCache();
    }
  }

  /**
   * Get failed attempt count for user
   */
  private getFailedAttemptCount(userId: string): number {
    const existing = this.failedAttemptsCache.get(userId);
    if (!existing) return 0;

    const now = new Date();
    if (now.getTime() - existing.firstAt.getTime() > this.FAILED_WINDOW_MS) {
      this.failedAttemptsCache.delete(userId);
      return 0;
    }

    return existing.count;
  }

  /**
   * Cleanup expired entries from cache
   */
  private cleanupFailedAttemptsCache(): void {
    const now = new Date();
    for (const [userId, data] of this.failedAttemptsCache.entries()) {
      if (now.getTime() - data.firstAt.getTime() > this.FAILED_WINDOW_MS) {
        this.failedAttemptsCache.delete(userId);
      }
    }
  }
}
