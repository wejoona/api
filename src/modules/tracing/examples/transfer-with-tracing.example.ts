/**
 * Example: Using Distributed Tracing in Transfer Service
 *
 * This example demonstrates how to instrument a money transfer operation
 * with distributed tracing to track the entire flow across multiple services.
 */

import { Injectable, Logger } from '@nestjs/common';
import { TracingService, TracedHttpClient } from '@/modules/tracing';

interface CreateTransferDto {
  userId: string;
  recipientId: string;
  amount: number;
  currency: string;
  note?: string;
}

interface Transfer {
  id: string;
  status: string;
  amount: number;
  createdAt: Date;
}

@Injectable()
export class TransferServiceExample {
  private readonly logger = new Logger(TransferServiceExample.name);

  constructor(
    private readonly tracingService: TracingService,
    private readonly httpClient: TracedHttpClient,
  ) {}

  /**
   * Create a transfer with comprehensive tracing
   *
   * This method demonstrates:
   * 1. Creating custom spans for business operations
   * 2. Adding span attributes for context
   * 3. Adding events for key milestones
   * 4. Trace context propagation to external services
   * 5. Error tracking in spans
   */
  async createTransfer(dto: CreateTransferDto): Promise<Transfer> {
    // Main transfer span - wraps the entire operation
    return this.tracingService.trace(
      'TransferService.createTransfer',
      async (span) => {
        // Add business context as span attributes
        span.setAttribute('transfer.amount', dto.amount);
        span.setAttribute('transfer.currency', dto.currency);
        span.setAttribute('transfer.sender_id', dto.userId);
        span.setAttribute('transfer.recipient_id', dto.recipientId);
        span.setAttribute('transfer.has_note', !!dto.note);

        try {
          // Step 1: Validate sender's balance
          const balance = await this.validateBalance(dto.userId, dto.amount);
          span.addEvent('transfer.balance_validated', {
            current_balance: balance,
            required_balance: dto.amount,
          });

          // Step 2: Check transfer limits and fraud rules
          const limitsCheck = await this.checkTransferLimits(dto);
          span.setAttribute(
            'transfer.limits_check',
            limitsCheck.passed ? 'passed' : 'failed',
          );

          if (!limitsCheck.passed) {
            span.setAttribute('transfer.rejection_reason', limitsCheck.reason);
            throw new Error(`Transfer limit exceeded: ${limitsCheck.reason}`);
          }

          // Step 3: Create ledger transaction (external service call)
          const ledgerTx = await this.createLedgerTransaction(dto);
          span.addEvent('transfer.ledger_created', {
            ledger_tx_id: ledgerTx.id,
            ledger_status: ledgerTx.status,
          });

          // Step 4: Update wallet balances (database operations are auto-traced)
          await this.updateWalletBalances(
            dto.userId,
            dto.recipientId,
            dto.amount,
          );
          span.addEvent('transfer.balances_updated');

          // Step 5: Send notifications (external service call)
          await this.sendTransferNotifications(
            dto.userId,
            dto.recipientId,
            dto.amount,
          );
          span.addEvent('transfer.notifications_sent');

          // Create final transfer record
          const transfer: Transfer = {
            id: ledgerTx.id,
            status: 'completed',
            amount: dto.amount,
            createdAt: new Date(),
          };

          // Add final attributes
          span.setAttribute('transfer.id', transfer.id);
          span.setAttribute('transfer.status', transfer.status);
          span.setAttribute('transfer.completed', true);

          this.logger.log(`Transfer created successfully: ${transfer.id}`);
          return transfer;
        } catch (error) {
          // Error is automatically recorded by TracingService
          // But we can add additional context
          span.setAttribute('transfer.error_type', error.constructor.name);
          span.setAttribute('transfer.completed', false);

          this.logger.error(`Transfer failed: ${error.message}`, error.stack);
          throw error;
        }
      },
      {
        // Initial attributes (alternative to span.setAttribute)
        'service.name': 'transfer',
        'transfer.type': 'internal',
      },
    );
  }

  /**
   * Validate user has sufficient balance
   * This creates a child span under the main transfer span
   */
  private async validateBalance(
    userId: string,
    amount: number,
  ): Promise<number> {
    return this.tracingService.trace(
      'TransferService.validateBalance',
      async (span) => {
        span.setAttribute('user.id', userId);
        span.setAttribute('required_amount', amount);

        // Database query is auto-traced by OpenTelemetry
        // You'll see: PostgreSQL: SELECT balance FROM wallets WHERE user_id = ?
        const balance = await this.fetchUserBalance(userId);

        span.setAttribute('current_balance', balance);
        span.setAttribute('sufficient_balance', balance >= amount);

        if (balance < amount) {
          throw new Error('Insufficient balance');
        }

        return balance;
      },
    );
  }

  /**
   * Check if transfer is within limits
   */
  private async checkTransferLimits(
    dto: CreateTransferDto,
  ): Promise<{ passed: boolean; reason?: string }> {
    return this.tracingService.trace(
      'TransferService.checkTransferLimits',
      async (span) => {
        span.setAttribute('user.id', dto.userId);
        span.setAttribute('transfer.amount', dto.amount);

        // Redis cache lookup is auto-traced
        const dailyTotal = await this.getDailyTransferTotal(dto.userId);
        const maxDaily = 10000; // $10,000 daily limit

        span.setAttribute('daily_total', dailyTotal);
        span.setAttribute('daily_limit', maxDaily);

        if (dailyTotal + dto.amount > maxDaily) {
          return {
            passed: false,
            reason: `Daily limit exceeded: ${dailyTotal + dto.amount} > ${maxDaily}`,
          };
        }

        return { passed: true };
      },
    );
  }

  /**
   * Create transaction in ledger service
   * Demonstrates trace context propagation to external service
   */
  private async createLedgerTransaction(dto: CreateTransferDto): Promise<any> {
    return this.tracingService.trace(
      'TransferService.createLedgerTransaction',
      async (span) => {
        span.setAttribute('ledger.service', 'blnk');
        span.setAttribute('ledger.amount', dto.amount);

        // TracedHttpClient automatically injects trace context headers
        // The external service can see this request as a child span
        const response = await this.httpClient
          .post('https://blnk.io/api/v1/transactions', {
            source: `wallet:${dto.userId}`,
            destination: `wallet:${dto.recipientId}`,
            amount: dto.amount,
            currency: dto.currency,
            reference: `transfer-${Date.now()}`,
            metadata: {
              note: dto.note,
            },
          })
          .toPromise();

        span.setAttribute('ledger.tx_id', response.data.id);
        span.setAttribute('ledger.status', response.data.status);

        return response.data;
      },
    );
  }

  /**
   * Update wallet balances in database
   */
  private async updateWalletBalances(
    senderId: string,
    recipientId: string,
    amount: number,
  ): Promise<void> {
    return this.tracingService.trace(
      'TransferService.updateWalletBalances',
      async (span) => {
        span.setAttribute('sender.id', senderId);
        span.setAttribute('recipient.id', recipientId);
        span.setAttribute('amount', amount);

        // Database operations are auto-traced
        // You'll see two child spans:
        // 1. UPDATE wallets SET balance = balance - ? WHERE user_id = ?
        // 2. UPDATE wallets SET balance = balance + ? WHERE user_id = ?

        await this.debitWallet(senderId, amount);
        span.addEvent('sender.wallet_debited');

        await this.creditWallet(recipientId, amount);
        span.addEvent('recipient.wallet_credited');
      },
    );
  }

  /**
   * Send notifications to sender and recipient
   */
  private async sendTransferNotifications(
    senderId: string,
    recipientId: string,
    amount: number,
  ): Promise<void> {
    return this.tracingService.trace(
      'TransferService.sendNotifications',
      async (span) => {
        span.setAttribute('notification.type', 'transfer');

        // Send to sender
        await this.httpClient
          .post('https://fcm.googleapis.com/fcm/send', {
            to: senderId,
            notification: {
              title: 'Transfer Sent',
              body: `You sent $${amount}`,
            },
          })
          .toPromise();

        span.addEvent('notification.sender_sent');

        // Send to recipient
        await this.httpClient
          .post('https://fcm.googleapis.com/fcm/send', {
            to: recipientId,
            notification: {
              title: 'Money Received',
              body: `You received $${amount}`,
            },
          })
          .toPromise();

        span.addEvent('notification.recipient_sent');

        span.setAttribute('notification.sent_count', 2);
      },
    );
  }

  // Mock methods (replace with actual implementations)
  private async fetchUserBalance(_userId: string): Promise<number> {
    // Simulated database query
    return 5000;
  }

  private async getDailyTransferTotal(_userId: string): Promise<number> {
    // Simulated Redis cache lookup
    return 2000;
  }

  private async debitWallet(userId: string, _amount: number): Promise<void> {
    // Simulated database update
  }

  private async creditWallet(userId: string, _amount: number): Promise<void> {
    // Simulated database update
  }
}

/**
 * Expected Trace Hierarchy in Jaeger:
 *
 * TransferService.createTransfer (200ms)
 * ├── TransferService.validateBalance (15ms)
 * │   └── PostgreSQL: SELECT balance FROM wallets WHERE user_id = ? (12ms)
 * ├── TransferService.checkTransferLimits (8ms)
 * │   └── Redis: GET daily_total:user:123 (5ms)
 * ├── TransferService.createLedgerTransaction (85ms)
 * │   └── HTTP POST https://blnk.io/api/v1/transactions (80ms)
 * ├── TransferService.updateWalletBalances (25ms)
 * │   ├── PostgreSQL: UPDATE wallets SET balance = balance - ? WHERE user_id = ? (10ms)
 * │   └── PostgreSQL: UPDATE wallets SET balance = balance + ? WHERE user_id = ? (12ms)
 * └── TransferService.sendNotifications (60ms)
 *     ├── HTTP POST https://fcm.googleapis.com/fcm/send (30ms)
 *     └── HTTP POST https://fcm.googleapis.com/fcm/send (28ms)
 *
 * Total: 200ms
 *
 * Span Attributes:
 * - transfer.amount: 100
 * - transfer.currency: USD
 * - transfer.sender_id: user-123
 * - transfer.recipient_id: user-456
 * - transfer.id: tx-789
 * - transfer.status: completed
 * - transfer.completed: true
 *
 * Events:
 * - transfer.balance_validated
 * - transfer.ledger_created
 * - transfer.balances_updated
 * - transfer.notifications_sent
 */
