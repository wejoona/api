/**
 * Reverse Transaction Use Case
 *
 * Reverses a completed transaction by creating a counter-transaction
 * in the Blnk ledger and updating the original transaction status.
 *
 * Rules:
 * - Transaction must be COMPLETED
 * - Transaction must not already be reversed
 * - Must be within 30-day reversal window
 * - Creates reverse entry in Blnk (debit receiver, credit sender)
 * - Emits transaction.reversed event
 */

import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TransactionRepository } from '../../infrastructure/repositories/transaction.repository';
import { WalletRepository } from '../../../wallet/infrastructure/repositories/wallet.repository';
import {
  LEDGER_PROVIDER,
  ILedgerProvider,
} from '../../../providers/interfaces';
import { v4 as uuidv4 } from 'uuid';

export interface ReverseTransactionInput {
  transactionId: string;
  reason: string;
  requestedBy: string; // userId of person requesting reversal
}

export interface ReverseTransactionOutput {
  reversalTransactionId: string;
  originalTransactionId: string;
  amount: number;
  currency: string;
  reason: string;
  status: string;
}

const REVERSAL_WINDOW_DAYS = 30;

@Injectable()
export class ReverseTransactionUseCase {
  private readonly logger = new Logger(ReverseTransactionUseCase.name);

  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly walletRepository: WalletRepository,
    @Inject(LEDGER_PROVIDER)
    private readonly ledgerProvider: ILedgerProvider,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    input: ReverseTransactionInput,
  ): Promise<ReverseTransactionOutput> {
    const { transactionId, reason, requestedBy } = input;

    // 1. Find original transaction
    const transaction =
      await this.transactionRepository.findById(transactionId);
    if (!transaction) {
      throw new NotFoundException(
        `Transaction ${transactionId} not found`,
      );
    }

    // 2. Validate: must be completed
    if (transaction.status !== 'completed') {
      throw new BadRequestException(
        `Cannot reverse transaction in '${transaction.status}' status. Only completed transactions can be reversed.`,
      );
    }

    // 3. Validate: not already reversed
    if (
      transaction.metadata?.reversed === true ||
      transaction.metadata?.reversalTransactionId
    ) {
      throw new BadRequestException(
        'Transaction has already been reversed',
      );
    }

    // 4. Validate: within 30-day window
    const daysSinceCompletion = transaction.completedAt
      ? (Date.now() - transaction.completedAt.getTime()) /
        (1000 * 60 * 60 * 24)
      : Infinity;

    if (daysSinceCompletion > REVERSAL_WINDOW_DAYS) {
      throw new BadRequestException(
        `Transaction reversal window has expired. Reversals must be within ${REVERSAL_WINDOW_DAYS} days of completion.`,
      );
    }

    // 5. Determine reversal parameters based on transaction type
    const reversalRef = `rev-${uuidv4()}`;

    try {
      if (
        transaction.type === 'transfer_internal' &&
        transaction.recipientWalletId
      ) {
        // P2P reversal: debit recipient, credit sender
        const senderWallet = await this.walletRepository.findById(
          transaction.walletId,
        );
        const recipientWallet = await this.walletRepository.findById(
          transaction.recipientWalletId,
        );

        if (!senderWallet || !recipientWallet) {
          throw new BadRequestException(
            'Cannot reverse: sender or recipient wallet not found',
          );
        }

        // Record reverse P2P in Blnk (swap sender/recipient)
        await this.ledgerProvider.recordP2PTransfer({
          senderId: recipientWallet.userId,
          recipientId: senderWallet.userId,
          amount: BigInt(Math.round(transaction.amount * 1000000)),
          currency: transaction.currency,
          reference: reversalRef,
          description: `Reversal of ${transactionId}: ${reason}`,
          metadata: {
            reversalOf: transactionId,
            reason,
            requestedBy,
          },
        });
      } else if (transaction.type === 'deposit') {
        // Deposit reversal: withdraw from user back to system
        const wallet = await this.walletRepository.findById(
          transaction.walletId,
        );
        if (!wallet) {
          throw new BadRequestException(
            'Cannot reverse: wallet not found',
          );
        }

        await this.ledgerProvider.recordWithdrawal({
          userId: wallet.userId,
          amount: BigInt(Math.round(transaction.amount * 1000000)),
          currency: transaction.currency,
          reference: reversalRef,
          description: `Reversal of deposit ${transactionId}: ${reason}`,
          provider: 'circle',
          fee: BigInt(0),
          metadata: {
            reversalOf: transactionId,
            reason,
            requestedBy,
          },
        });
      } else {
        throw new BadRequestException(
          `Reversal not supported for transaction type '${transaction.type}'`,
        );
      }

      // 6. Mark original transaction as reversed
      transaction.addMetadata('reversed', true);
      transaction.addMetadata('reversalTransactionId', reversalRef);
      transaction.addMetadata('reversalReason', reason);
      transaction.addMetadata('reversedAt', new Date().toISOString());
      transaction.addMetadata('reversedBy', requestedBy);
      transaction.updateStatus('cancelled'); // closest status to "reversed"
      await this.transactionRepository.save(transaction);

      // 7. Emit event
      this.eventEmitter.emit('transaction.reversed', {
        originalTransactionId: transactionId,
        reversalReference: reversalRef,
        amount: transaction.amount,
        currency: transaction.currency,
        reason,
        requestedBy,
        type: transaction.type,
      });

      this.logger.log(
        `Transaction ${transactionId} reversed successfully (ref: ${reversalRef})`,
      );

      return {
        reversalTransactionId: reversalRef,
        originalTransactionId: transactionId,
        amount: transaction.amount,
        currency: transaction.currency,
        reason,
        status: 'reversed',
      };
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to reverse transaction ${transactionId}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to reverse transaction: ${error.message}`,
      );
    }
  }
}
