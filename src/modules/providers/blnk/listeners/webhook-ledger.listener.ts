import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BlnkLedgerAdapter } from '../adapters/blnk-ledger.adapter';
import { RecordDepositParams } from '@modules/providers/interfaces';

/**
 * Webhook Event Payloads
 *
 * These interfaces match the event payloads emitted by ProcessWebhookUseCase
 */
interface WebhookDepositCompletedPayload {
  userId: string;
  walletId: string;
  amount: string;
  fee?: string;
  currency: string;
  externalId: string;
  provider: 'yellowcard' | 'circle';
}

interface WebhookTransferCompletedPayload {
  transferId: string;
  provider: 'circle';
  txHash?: string;
}

interface WebhookTransferFailedPayload {
  transferId: string;
  provider: 'circle';
  errorCode?: string;
  errorMessage: string;
}

interface DepositCompletedPayload {
  userId: string;
  amount: string;
  currency: string;
  reference: string;
}

interface DepositFailedPayload {
  userId: string;
  amount: string;
  currency: string;
  reference: string;
  error: string;
}

/**
 * Webhook Ledger Listener
 *
 * Listens to webhook events and records transactions in the Blnk ledger.
 * This ensures that all payment provider events are properly recorded
 * in our double-entry accounting system.
 *
 * Events handled:
 * - webhook.deposit.completed: Record deposit to user's ledger balance
 * - webhook.transfer.completed: Handle external transfer completion
 * - webhook.transfer.failed: Reverse failed transfer transactions
 * - deposit.completed: Notification event (logging only)
 * - deposit.failed: Notification event (logging only)
 *
 * Architecture Notes:
 * - This listener uses the BlnkLedgerAdapter directly for ledger operations
 * - Events are emitted by ProcessWebhookUseCase in the webhook module
 * - Transactions are recorded with proper provider attribution
 * - Fees are handled separately as distinct transactions
 *
 * @see ProcessWebhookUseCase for event emission
 * @see BlnkLedgerAdapter for ledger operations
 */
@Injectable()
export class WebhookLedgerListener {
  private readonly logger = new Logger(WebhookLedgerListener.name);

  constructor(private readonly blnkLedgerAdapter: BlnkLedgerAdapter) {}

  /**
   * Handle completed deposit from payment providers
   *
   * Records the deposit as a credit to the user's ledger balance.
   * The source is the provider's pay-in account, destination is user's balance.
   *
   * Flow:
   * 1. Parse amount and fee from string to bigint
   * 2. Record deposit transaction via BlnkLedgerAdapter
   * 3. Fee is automatically handled by recordDeposit if provided
   *
   * @param payload - Deposit completion details from webhook
   */
  @OnEvent('webhook.deposit.completed')
  async handleDepositCompleted(
    payload: WebhookDepositCompletedPayload,
  ): Promise<void> {
    try {
      this.logger.log(
        `Recording deposit for user ${payload.userId}: ${payload.amount} ${payload.currency} via ${payload.provider}`,
      );

      // Convert amount from string (micro-USDC) to bigint
      const amount = BigInt(payload.amount);
      const fee = payload.fee ? BigInt(payload.fee) : BigInt(0);

      // Generate a unique reference for this deposit
      const reference = `deposit-${payload.externalId}`;

      const depositParams: RecordDepositParams = {
        userId: payload.userId,
        amount,
        currency: payload.currency,
        reference,
        description: `Deposit via ${payload.provider}`,
        provider: payload.provider,
        externalId: payload.externalId,
        fee,
        metadata: {
          wallet_id: payload.walletId,
          event_type: 'webhook.deposit.completed',
        },
      };

      const result = await this.blnkLedgerAdapter.recordDeposit(depositParams);

      this.logger.log(
        `Deposit recorded successfully: Transaction ${result.transactionId} (${result.status})`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to record deposit for user ${payload.userId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Re-throw to ensure the webhook processing knows this failed
      throw error;
    }
  }

  /**
   * Handle completed external transfer
   *
   * This event is emitted when an external blockchain transfer completes.
   * The transaction is already recorded as inflight during initiation,
   * so we need to commit it to finalize.
   *
   * @param payload - Transfer completion details from Circle
   */
  @OnEvent('webhook.transfer.completed')
  async handleTransferCompleted(
    payload: WebhookTransferCompletedPayload,
  ): Promise<void> {
    try {
      this.logger.log(
        `Committing external transfer ${payload.transferId} via ${payload.provider}`,
      );

      // Look up the transaction by external reference
      const reference = `transfer-${payload.transferId}`;
      const transaction =
        await this.blnkLedgerAdapter.getTransactionByReference(reference);

      if (transaction) {
        // Commit the inflight transaction to finalize it
        await this.blnkLedgerAdapter.commitTransaction(transaction.transactionId);
        this.logger.log(
          `Successfully committed transfer ${payload.transferId} (txn: ${transaction.transactionId})`,
        );
      } else {
        this.logger.warn(
          `No inflight transaction found for transfer ${payload.transferId}. ` +
            `It may have already been committed or the reference format differs.`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to commit transfer ${payload.transferId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Handle failed external transfer
   *
   * When a transfer fails, we need to void the inflight transaction
   * to return the funds to the user's available balance.
   *
   * @param payload - Transfer failure details from Circle
   */
  @OnEvent('webhook.transfer.failed')
  async handleTransferFailed(
    payload: WebhookTransferFailedPayload,
  ): Promise<void> {
    try {
      this.logger.log(
        `Voiding failed transfer ${payload.transferId}: ${payload.errorMessage}`,
      );

      // Look up the transaction by external reference
      const reference = `transfer-${payload.transferId}`;
      const transaction =
        await this.blnkLedgerAdapter.getTransactionByReference(reference);

      if (transaction) {
        // Void the inflight transaction to reverse it
        await this.blnkLedgerAdapter.voidTransaction(transaction.transactionId);
        this.logger.log(
          `Successfully voided failed transfer ${payload.transferId} (txn: ${transaction.transactionId})`,
        );
      } else {
        this.logger.warn(
          `No inflight transaction found for failed transfer ${payload.transferId}. ` +
            `It may have already been voided or the reference format differs.`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to void transfer ${payload.transferId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Handle deposit completion notification
   *
   * This is a notification-only event for other services (e.g., notifications, analytics).
   * The actual ledger recording is handled by webhook.deposit.completed.
   *
   * @param payload - Notification payload
   */
  @OnEvent('deposit.completed')
  async handleDepositCompletedNotification(
    payload: DepositCompletedPayload,
  ): Promise<void> {
    this.logger.debug(
      `Deposit notification for user ${payload.userId}: ${payload.amount} ${payload.currency}`,
    );
    // This event is for notification services, email, push notifications, etc.
    // No ledger operation needed here
  }

  /**
   * Handle deposit failure notification
   *
   * This is a notification-only event for other services.
   * No ledger operation is needed since the deposit never completed.
   *
   * @param payload - Failure notification payload
   */
  @OnEvent('deposit.failed')
  async handleDepositFailedNotification(
    payload: DepositFailedPayload,
  ): Promise<void> {
    this.logger.debug(
      `Deposit failed notification for user ${payload.userId}: ${payload.error}`,
    );
    // This event is for notification services, email, push notifications, etc.
    // No ledger operation needed here since deposit never happened
  }
}
