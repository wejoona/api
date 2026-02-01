/**
 * EXAMPLE: How to use Correlation ID in Services
 *
 * This file demonstrates best practices for using correlation IDs
 * in NestJS services and use cases.
 */

import { Injectable, Logger } from '@nestjs/common';
import { CorrelationService } from '../correlation.service';

/**
 * Example 1: Using CorrelationService in a regular service
 */
@Injectable()
export class WalletServiceExample {
  private readonly logger = new Logger(WalletServiceExample.name);

  constructor(
    private readonly correlationService: CorrelationService,
    private readonly walletRepository: any,
  ) {}

  async getBalance(userId: string): Promise<number> {
    // Get correlation ID from request scope
    const correlationId = this.correlationService.getCorrelationId();

    this.logger.log(`[${correlationId}] Fetching balance for user ${userId}`);

    try {
      const wallet = await this.walletRepository.findByUserId(userId);

      if (!wallet) {
        this.logger.warn(
          `[${correlationId}] Wallet not found for user ${userId}`,
        );
        throw new Error('Wallet not found');
      }

      this.logger.log(
        `[${correlationId}] Balance retrieved: ${wallet.balance}`,
      );

      return wallet.balance;
    } catch (error) {
      this.logger.error(
        `[${correlationId}] Error fetching balance: ${error.message}`,
      );
      throw error;
    }
  }
}

/**
 * Example 2: Using correlation ID in use cases
 */
@Injectable()
export class CreateTransferUseCaseExample {
  private readonly logger = new Logger(CreateTransferUseCaseExample.name);

  constructor(
    private readonly correlationService: CorrelationService,
    private readonly walletRepository: any,
    private readonly transferRepository: any,
    private readonly ledgerAdapter: any,
  ) {}

  async execute(dto: any, userId: string): Promise<any> {
    const correlationId = this.correlationService.getCorrelationId();

    this.logger.log(
      `[${correlationId}] Starting transfer: ${userId} -> ${dto.recipientId}, amount: ${dto.amount}`,
    );

    // Step 1: Validate sender wallet
    const senderWallet = await this.walletRepository.findByUserId(userId);
    if (senderWallet.balance < dto.amount) {
      this.logger.warn(
        `[${correlationId}] Insufficient balance for user ${userId}`,
      );
      throw new Error('Insufficient balance');
    }

    // Step 2: Validate recipient wallet
    const recipientWallet = await this.walletRepository.findByUserId(
      dto.recipientId,
    );
    if (!recipientWallet) {
      this.logger.warn(
        `[${correlationId}] Recipient wallet not found: ${dto.recipientId}`,
      );
      throw new Error('Recipient not found');
    }

    // Step 3: Create transfer record
    const transfer = await this.transferRepository.create({
      senderId: userId,
      recipientId: dto.recipientId,
      amount: dto.amount,
      status: 'pending',
    });

    this.logger.log(
      `[${correlationId}] Transfer record created: ${transfer.id}`,
    );

    // Step 4: Record in ledger (with correlation ID propagation)
    try {
      await this.ledgerAdapter.recordTransaction(transfer, correlationId);

      this.logger.log(
        `[${correlationId}] Transfer completed successfully: ${transfer.id}`,
      );

      return transfer;
    } catch (error) {
      this.logger.error(
        `[${correlationId}] Ledger transaction failed: ${error.message}`,
      );

      // Update transfer status to failed
      await this.transferRepository.update(transfer.id, { status: 'failed' });

      throw error;
    }
  }
}

/**
 * Example 3: Using correlation ID check for optional logging
 */
@Injectable()
export class NotificationServiceExample {
  private readonly logger = new Logger(NotificationServiceExample.name);

  constructor(private readonly correlationService: CorrelationService) {}

  async sendNotification(userId: string, _message: string): Promise<void> {
    // Check if correlation ID exists (might be called from background job)
    if (this.correlationService.hasCorrelationId()) {
      const correlationId = this.correlationService.getCorrelationId();
      this.logger.log(
        `[${correlationId}] Sending notification to user ${userId}`,
      );
    } else {
      this.logger.log(`Sending notification to user ${userId} (background)`);
    }

    // Send notification logic...
  }
}
