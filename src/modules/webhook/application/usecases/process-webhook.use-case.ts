import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  PAYMENT_GATEWAY,
  IPaymentGateway,
  WebhookEvent,
} from '@modules/shared/domain/gateways/payment.gateway';
import { TransactionRepository } from '@modules/transaction/infrastructure/repositories/transaction.repository';
import { WalletRepository } from '@modules/wallet/infrastructure/repositories/wallet.repository';
import {
  ONRAMP_PROVIDER_CI,
  IOnRampProvider,
} from '@modules/providers/interfaces';

export interface ProcessWebhookInput {
  payload: Record<string, unknown>;
  signature: string;
  rawBody: string;
  provider?: 'yellowcard' | 'circle' | 'generic';
}

export interface ProcessWebhookOutput {
  success: boolean;
  eventType: string;
  processed: boolean;
  message?: string;
}

/**
 * Process Webhook Use Case
 *
 * Handles incoming webhooks from payment providers.
 * Events are emitted for downstream services to handle ledger operations.
 *
 * TODO: Integrate with Blnk Finance for ledger operations
 */
@Injectable()
export class ProcessWebhookUseCase {
  private readonly logger = new Logger(ProcessWebhookUseCase.name);
  private readonly circleWebhookSecret: string;

  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    @Inject(ONRAMP_PROVIDER_CI)
    private readonly onRampProvider: IOnRampProvider,
    private readonly transactionRepository: TransactionRepository,
    private readonly walletRepository: WalletRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.circleWebhookSecret = this.configService.get<string>('circle.webhookSecret', '');
  }

  /**
   * Verify Circle webhook signature using HMAC-SHA256
   */
  private verifyCircleSignature(rawBody: string, signature: string): boolean {
    if (!this.circleWebhookSecret) {
      this.logger.warn('Circle webhook secret not configured');
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.circleWebhookSecret)
        .update(rawBody)
        .digest('hex');

      // Use constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      this.logger.error('Error verifying Circle webhook signature');
      return false;
    }
  }

  async execute(input: ProcessWebhookInput): Promise<ProcessWebhookOutput> {
    const provider = input.provider || 'generic';

    // Route to appropriate handler based on provider
    switch (provider) {
      case 'yellowcard':
        return this.processYellowCardWebhook(input);
      case 'circle':
        return this.processCircleWebhook(input);
      default:
        return this.processGenericWebhook(input);
    }
  }

  /**
   * Process Yellow Card webhooks (on-ramp/off-ramp status updates)
   */
  private async processYellowCardWebhook(
    input: ProcessWebhookInput,
  ): Promise<ProcessWebhookOutput> {
    // Verify signature
    const isValid = this.onRampProvider.verifyWebhookSignature(
      input.rawBody,
      input.signature,
    );
    if (!isValid) {
      this.logger.warn('Invalid Yellow Card webhook signature');
      return {
        success: false,
        eventType: 'unknown',
        processed: false,
        message: 'Invalid signature',
      };
    }

    // Parse event
    const event = this.onRampProvider.parseWebhookEvent(input.payload);
    this.logger.log(
      `Yellow Card webhook: ${event.type} for deposit ${event.depositId}`,
    );

    try {
      switch (event.type) {
        case 'deposit.pending':
          await this.handleYcDepositPending(event.depositId, event.data);
          break;
        case 'deposit.completed':
          await this.handleYcDepositCompleted(event.depositId, event.data);
          break;
        case 'deposit.failed':
          await this.handleYcDepositFailed(event.depositId, event.data);
          break;
        case 'deposit.expired':
          await this.handleYcDepositExpired(event.depositId);
          break;
        default: {
          const unhandledType: string = event.type;
          this.logger.warn(`Unhandled Yellow Card event: ${unhandledType}`);
          return {
            success: true,
            eventType: unhandledType,
            processed: false,
            message: 'Event type not handled',
          };
        }
      }

      return { success: true, eventType: event.type, processed: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error processing Yellow Card webhook: ${errorMessage}`,
        errorStack,
      );
      // Return generic error to external callers - don't leak internal details
      return {
        success: false,
        eventType: event.type,
        processed: false,
        message: 'Internal processing error',
      };
    }
  }

  /**
   * Process Circle webhooks (transfer status, wallet events)
   */
  private async processCircleWebhook(
    input: ProcessWebhookInput,
  ): Promise<ProcessWebhookOutput> {
    // Verify Circle webhook signature BEFORE processing
    if (!this.verifyCircleSignature(input.rawBody, input.signature)) {
      this.logger.warn('Invalid Circle webhook signature');
      return {
        success: false,
        eventType: 'unknown',
        processed: false,
        message: 'Invalid signature',
      };
    }

    // Circle webhook structure
    const payload = input.payload;
    const notificationType = payload.notificationType as string;

    this.logger.log(`Circle webhook: ${notificationType}`);

    try {
      // Circle sends different notification types
      switch (notificationType) {
        // Transfer notifications
        case 'transfers.complete':
          this.handleCircleTransferComplete(payload);
          break;
        case 'transfers.failed':
          this.handleCircleTransferFailed(payload);
          break;

        // Transaction (on-chain) notifications
        case 'transactions.complete':
          this.handleCircleTransactionComplete(payload);
          break;
        case 'transactions.failed':
          this.handleCircleTransactionFailed(payload);
          break;

        // Inbound transfer (deposit to wallet)
        case 'inboundTransfers.complete':
          await this.handleCircleInboundComplete(payload);
          break;

        default:
          this.logger.warn(
            `Unhandled Circle notification type: ${notificationType}`,
          );
          return {
            success: true,
            eventType: notificationType,
            processed: false,
            message: 'Notification type not handled',
          };
      }

      return { success: true, eventType: notificationType, processed: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error processing Circle webhook: ${errorMessage}`,
        errorStack,
      );
      // Return generic error to external callers - don't leak internal details
      return {
        success: false,
        eventType: notificationType,
        processed: false,
        message: 'Internal processing error',
      };
    }
  }

  /**
   * Process generic webhooks (legacy/fallback)
   */
  private async processGenericWebhook(
    input: ProcessWebhookInput,
  ): Promise<ProcessWebhookOutput> {
    // Verify webhook signature using legacy payment gateway
    const isValid = this.paymentGateway.verifyWebhookSignature(
      input.rawBody,
      input.signature,
    );

    if (!isValid) {
      this.logger.warn('Invalid webhook signature received');
      return {
        success: false,
        eventType: 'unknown',
        processed: false,
        message: 'Invalid signature',
      };
    }

    const event = this.paymentGateway.parseWebhookEvent(input.payload);
    this.logger.log(
      `Processing webhook event: ${event.type} for reference: ${event.referenceId}`,
    );

    try {
      switch (event.type) {
        case 'deposit.pending':
          await this.handleDepositPending(event);
          break;
        case 'deposit.completed':
          await this.handleDepositCompleted(event);
          break;
        case 'deposit.failed':
          await this.handleDepositFailed(event);
          break;
        case 'transfer.pending':
          await this.handleTransferPending(event);
          break;
        case 'transfer.completed':
          await this.handleTransferCompleted(event);
          break;
        case 'transfer.failed':
          await this.handleTransferFailed(event);
          break;
        case 'kyc.approved':
          await this.handleKycApproved(event);
          break;
        case 'kyc.rejected':
          await this.handleKycRejected(event);
          break;
        default: {
          const unhandledType: string = event.type;
          this.logger.warn(`Unhandled webhook event type: ${unhandledType}`);
          return {
            success: true,
            eventType: unhandledType,
            processed: false,
            message: 'Event type not handled',
          };
        }
      }

      return { success: true, eventType: event.type, processed: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error processing webhook: ${errorMessage}`,
        errorStack,
      );
      // Return generic error to external callers - don't leak internal details
      return {
        success: false,
        eventType: event.type,
        processed: false,
        message: 'Internal processing error',
      };
    }
  }

  // ========================================
  // Yellow Card Handlers
  // ========================================

  private async handleYcDepositPending(
    depositId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _data: Record<string, unknown>,
  ): Promise<void> {
    const transaction =
      await this.transactionRepository.findByProviderRef(depositId);
    if (transaction) {
      transaction.updateStatus('processing');
      await this.transactionRepository.save(transaction);
      this.logger.log(`YC Deposit ${depositId} now processing`);
    }
  }

  private async handleYcDepositCompleted(
    depositId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const transaction =
      await this.transactionRepository.findByProviderRef(depositId);
    if (!transaction) {
      this.logger.warn(`Transaction not found for YC deposit: ${depositId}`);
      return;
    }

    transaction.complete();
    await this.transactionRepository.save(transaction);

    // Find wallet and emit event for ledger service to handle
    const wallet = await this.walletRepository.findById(transaction.walletId);
    if (wallet?.userId) {
      // Emit event - Blnk ledger service will listen and record the deposit
      const targetAmount =
        typeof data.targetAmount === 'number' ||
        typeof data.targetAmount === 'string'
          ? String(data.targetAmount)
          : String(transaction.amount);
      const feeAmount =
        typeof data.fee === 'number' || typeof data.fee === 'string'
          ? String(data.fee)
          : '0';

      this.eventEmitter.emit('webhook.deposit.completed', {
        userId: wallet.userId,
        walletId: wallet.id,
        amount: targetAmount,
        fee: feeAmount,
        currency: 'USDC',
        externalId: depositId,
        provider: 'yellowcard',
      });

      // Also emit notification event
      this.eventEmitter.emit('deposit.completed', {
        userId: wallet.userId,
        amount: targetAmount,
        currency: 'USDC',
        reference: depositId,
      });
    }

    this.logger.log(`YC Deposit ${depositId} completed`);
  }

  private async handleYcDepositFailed(
    depositId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const transaction =
      await this.transactionRepository.findByProviderRef(depositId);
    if (transaction) {
      const reason =
        typeof data.reason === 'string' ? data.reason : 'Deposit failed';
      transaction.fail(reason);
      await this.transactionRepository.save(transaction);

      const wallet = await this.walletRepository.findById(transaction.walletId);
      if (wallet?.userId) {
        this.eventEmitter.emit('deposit.failed', {
          userId: wallet.userId,
          amount: String(transaction.amount),
          currency: 'USDC',
          reference: depositId,
          error: reason,
        });
      }

      this.logger.log(`YC Deposit ${depositId} failed`);
    }
  }

  private async handleYcDepositExpired(depositId: string): Promise<void> {
    const transaction =
      await this.transactionRepository.findByProviderRef(depositId);
    if (transaction) {
      transaction.fail('Deposit expired');
      await this.transactionRepository.save(transaction);
      this.logger.log(`YC Deposit ${depositId} expired`);
    }
  }

  // ========================================
  // Circle Handlers
  // ========================================

  private handleCircleTransferComplete(payload: Record<string, unknown>): void {
    const transfer = payload.transfer as Record<string, unknown>;
    const transferId = transfer?.id as string;

    if (transferId) {
      // Emit event for transfer service to handle
      this.eventEmitter.emit('webhook.transfer.completed', {
        transferId,
        provider: 'circle',
        txHash: transfer.transactionHash,
      });
      this.logger.log(`Circle transfer ${transferId} completed`);
    }
  }

  private handleCircleTransferFailed(payload: Record<string, unknown>): void {
    const transfer = payload.transfer as Record<string, unknown>;
    const transferId = transfer?.id as string;
    const errorCode = transfer?.errorCode as string;

    if (transferId) {
      // Emit event for transfer service to handle
      this.eventEmitter.emit('webhook.transfer.failed', {
        transferId,
        provider: 'circle',
        errorCode,
        errorMessage: `Transfer failed: ${errorCode || 'unknown'}`,
      });
      this.logger.log(
        `Circle transfer ${transferId} failed: ${errorCode || 'unknown'}`,
      );
    }
  }

  private handleCircleTransactionComplete(
    payload: Record<string, unknown>,
  ): void {
    const transaction = payload.transaction as Record<string, unknown>;
    const txHash =
      typeof transaction?.txHash === 'string' ? transaction.txHash : 'unknown';
    this.logger.log(`Circle on-chain transaction completed: ${txHash}`);
    // Handle on-chain transaction completion if needed
  }

  private handleCircleTransactionFailed(
    payload: Record<string, unknown>,
  ): void {
    const transaction = payload.transaction as Record<string, unknown>;
    const txId =
      typeof transaction?.id === 'string' ? transaction.id : 'unknown';
    this.logger.log(`Circle on-chain transaction failed: ${txId}`);
  }

  private async handleCircleInboundComplete(
    payload: Record<string, unknown>,
  ): Promise<void> {
    const inbound = payload.inboundTransfer as Record<string, unknown>;
    const walletId = inbound?.destinationWalletId as string;
    const amount = inbound?.amount as string;

    this.logger.log(
      `Circle inbound transfer to wallet ${walletId}: ${amount} USDC`,
    );

    // Find wallet by Circle wallet ID
    const wallet = await this.walletRepository.findByProviderWalletId(walletId);
    if (wallet?.userId) {
      // Emit event for ledger service to handle
      this.eventEmitter.emit('webhook.deposit.completed', {
        userId: wallet.userId,
        walletId: wallet.id,
        amount,
        currency: 'USDC',
        externalId: inbound?.id as string,
        provider: 'circle',
      });

      this.eventEmitter.emit('deposit.completed', {
        userId: wallet.userId,
        amount: String(amount),
        currency: 'USDC',
        reference: (inbound?.id as string) || 'circle_inbound',
      });
    }
  }

  // ========================================
  // Legacy/Generic Handlers
  // ========================================

  private async handleDepositPending(event: WebhookEvent): Promise<void> {
    const transaction = await this.transactionRepository.findByProviderRef(
      event.referenceId,
    );
    if (transaction) {
      transaction.updateStatus('processing');
      await this.transactionRepository.save(transaction);
    }
  }

  private async handleDepositCompleted(event: WebhookEvent): Promise<void> {
    const transaction = await this.transactionRepository.findByProviderRef(
      event.referenceId,
    );
    if (transaction) {
      transaction.complete();
      await this.transactionRepository.save(transaction);

      const wallet = await this.walletRepository.findById(transaction.walletId);
      if (wallet && event.data?.amount) {
        wallet.credit(Number(event.data.amount));
        await this.walletRepository.save(wallet);
      }
    }
  }

  private async handleDepositFailed(event: WebhookEvent): Promise<void> {
    const transaction = await this.transactionRepository.findByProviderRef(
      event.referenceId,
    );
    if (transaction) {
      transaction.fail((event.data?.reason as string) || 'Payment failed');
      await this.transactionRepository.save(transaction);
    }
  }

  private async handleTransferPending(event: WebhookEvent): Promise<void> {
    const transaction = await this.transactionRepository.findByProviderRef(
      event.referenceId,
    );
    if (transaction) {
      transaction.updateStatus('processing');
      await this.transactionRepository.save(transaction);
    }
  }

  private async handleTransferCompleted(event: WebhookEvent): Promise<void> {
    const transaction = await this.transactionRepository.findByProviderRef(
      event.referenceId,
    );
    if (transaction) {
      transaction.complete();
      await this.transactionRepository.save(transaction);
    }
  }

  private async handleTransferFailed(event: WebhookEvent): Promise<void> {
    const transaction = await this.transactionRepository.findByProviderRef(
      event.referenceId,
    );
    if (transaction) {
      transaction.fail((event.data?.reason as string) || 'Transfer failed');
      await this.transactionRepository.save(transaction);

      const wallet = await this.walletRepository.findById(transaction.walletId);
      if (wallet) {
        wallet.credit(transaction.amount);
        await this.walletRepository.save(wallet);
      }
    }
  }

  private async handleKycApproved(event: WebhookEvent): Promise<void> {
    const wallet = await this.walletRepository.findByProviderWalletId(
      event.referenceId,
    );
    if (wallet) {
      wallet.updateKycStatus('verified');
      await this.walletRepository.save(wallet);
    }
  }

  private async handleKycRejected(event: WebhookEvent): Promise<void> {
    const wallet = await this.walletRepository.findByProviderWalletId(
      event.referenceId,
    );
    if (wallet) {
      wallet.updateKycStatus('rejected');
      await this.walletRepository.save(wallet);
    }
  }
}
