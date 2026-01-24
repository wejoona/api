import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import { TransactionRepository } from '../../../transaction/infrastructure/repositories/transaction.repository';
import { TransactionEntity } from '../../../transaction/domain/entities/transaction.entity';
import { UserRepository } from '../../../user/infrastructure/repositories/user.repository';
import { WalletOrmEntity } from '../../infrastructure/orm-entities/wallet.orm-entity';
import {
  PAYMENT_GATEWAY,
  IPaymentGateway,
} from '../../../shared/domain/gateways';

export interface InternalTransferInput {
  fromUserId: string;
  toPhone: string;
  amount: number;
  currency?: string;
}

export interface InternalTransferOutput {
  transactionId: string;
  fromWalletId: string;
  toWalletId: string;
  toPhone: string;
  amount: number;
  currency: string;
  fee: number;
  status: string;
}

@Injectable()
export class InternalTransferUseCase {
  private readonly logger = new Logger(InternalTransferUseCase.name);

  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly userRepository: UserRepository,
    private readonly dataSource: DataSource,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  async execute(input: InternalTransferInput): Promise<InternalTransferOutput> {
    const currency = input.currency || 'USD';

    // Validate amount early
    if (input.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // Validate amount is not too small (prevent dust attacks)
    if (input.amount < 0.01) {
      throw new BadRequestException('Minimum transfer amount is 0.01');
    }

    // Validate amount precision (max 2 decimal places for USD)
    if (!Number.isFinite(input.amount) || Math.round(input.amount * 100) / 100 !== input.amount) {
      throw new BadRequestException('Invalid amount precision');
    }

    // Find recipient by phone first (outside transaction to fail fast)
    const recipient = await this.userRepository.findByPhone(input.toPhone);
    if (!recipient) {
      throw new NotFoundException('Recipient not found. They must register first.');
    }

    // Execute in a database transaction with pessimistic locking
    return this.dataSource.transaction(async (manager) => {
      // Get sender's wallet with pessimistic lock to prevent race conditions
      const fromWalletOrm = await manager.findOne(WalletOrmEntity, {
        where: { userId: input.fromUserId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!fromWalletOrm) {
        throw new NotFoundException('Sender wallet not found');
      }

      if (fromWalletOrm.status !== 'active') {
        throw new BadRequestException('Sender wallet is not active');
      }

      // Check balance BEFORE transfer (critical security check)
      if (fromWalletOrm.balance < input.amount) {
        throw new BadRequestException('Insufficient balance');
      }

      // Get recipient's wallet with pessimistic lock
      const toWalletOrm = await manager.findOne(WalletOrmEntity, {
        where: { userId: recipient.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!toWalletOrm) {
        throw new NotFoundException('Recipient wallet not found');
      }

      if (toWalletOrm.status !== 'active') {
        throw new BadRequestException('Recipient wallet is not active');
      }

      // Cannot transfer to yourself
      if (fromWalletOrm.id === toWalletOrm.id) {
        throw new BadRequestException('Cannot transfer to yourself');
      }

      this.logger.log(
        `Processing internal transfer: ${input.fromUserId} -> ${recipient.id}, amount: ${input.amount}`,
      );

      // Execute transfer via payment gateway
      const transferResponse = await this.paymentGateway.internalTransfer({
        fromSubwalletId: fromWalletOrm.yellowCardWalletId,
        toSubwalletId: toWalletOrm.yellowCardWalletId,
        amount: input.amount,
        currency,
      });

      // Update balances atomically within the transaction
      fromWalletOrm.balance = Number(fromWalletOrm.balance) - input.amount;
      toWalletOrm.balance = Number(toWalletOrm.balance) + input.amount;

      await manager.save(fromWalletOrm);
      await manager.save(toWalletOrm);

      // Create transaction record for sender (debit)
      const senderTransaction = TransactionEntity.createInternalTransfer({
        walletId: fromWalletOrm.id,
        amount: -input.amount, // Negative for debit
        recipientWalletId: toWalletOrm.id,
        recipientPhone: input.toPhone,
        currency,
        metadata: {
          transferId: transferResponse.id,
          direction: 'outbound',
          recipientName: recipient.fullName,
        },
      });

      // Create transaction record for recipient (credit)
      const recipientTransaction = TransactionEntity.createInternalTransfer({
        walletId: toWalletOrm.id,
        amount: input.amount, // Positive for credit
        recipientWalletId: fromWalletOrm.id,
        recipientPhone: input.toPhone,
        currency,
        metadata: {
          transferId: transferResponse.id,
          direction: 'inbound',
          senderWalletId: fromWalletOrm.id,
        },
      });

      // Mark as completed (internal transfers are instant)
      senderTransaction.complete();
      recipientTransaction.complete();

      await Promise.all([
        this.transactionRepository.save(senderTransaction),
        this.transactionRepository.save(recipientTransaction),
      ]);

      this.logger.log(
        `Internal transfer completed: ${senderTransaction.id}, amount: ${input.amount}`,
      );

      return {
        transactionId: senderTransaction.id,
        fromWalletId: fromWalletOrm.id,
        toWalletId: toWalletOrm.id,
        toPhone: input.toPhone,
        amount: input.amount,
        currency,
        fee: transferResponse.fee,
        status: 'completed',
      };
    });
  }
}
