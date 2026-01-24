import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm';
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

// SECURITY: KYC-based daily transfer limits
const DAILY_TRANSFER_LIMITS = {
  none: 100,        // $100/day for unverified users
  pending: 100,     // $100/day while KYC is pending
  verified: 10000,  // $10,000/day for verified users
  rejected: 0,      // No transfers for rejected KYC
};

@Injectable()
export class InternalTransferUseCase {
  private readonly logger = new Logger(InternalTransferUseCase.name);
  private readonly MAX_RETRIES = 3;

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

    // SECURITY: Check KYC-based transfer limits
    await this.checkTransferLimits(input.fromUserId, input.amount);

    // Execute with optimistic locking and retry on conflict
    return this.executeWithRetry(input, recipient, currency);
  }

  /**
   * SECURITY: Check if user has exceeded their daily transfer limit based on KYC status
   * Note: Blnk provides ledger-level tracking, this is additional application-level security
   */
  private async checkTransferLimits(userId: string, amount: number): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const kycStatus = user.kycStatus || 'none';
    const dailyLimit = DAILY_TRANSFER_LIMITS[kycStatus as keyof typeof DAILY_TRANSFER_LIMITS] ?? DAILY_TRANSFER_LIMITS.none;

    // If KYC is rejected, block all transfers
    if (dailyLimit === 0) {
      throw new BadRequestException('Transfers are disabled. Please contact support regarding your KYC status.');
    }

    // Get today's transfer volume
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const dailyVolume = await this.transactionRepository.getDailyTransferVolume(
      userId,
      todayStart,
    );

    // Check if this transfer would exceed the daily limit
    if (dailyVolume + amount > dailyLimit) {
      const remaining = Math.max(0, dailyLimit - dailyVolume);
      throw new BadRequestException(
        `Daily transfer limit exceeded. Your limit is $${dailyLimit}/day (KYC: ${kycStatus}). ` +
        `You have $${remaining.toFixed(2)} remaining today.`
      );
    }

    this.logger.debug(
      `Transfer limit check passed: user=${userId}, kycStatus=${kycStatus}, ` +
      `dailyLimit=$${dailyLimit}, dailyVolume=$${dailyVolume.toFixed(2)}, amount=$${amount}`
    );
  }

  private async executeWithRetry(
    input: InternalTransferInput,
    recipient: { id: string; fullName: string },
    currency: string,
    attempt = 1,
  ): Promise<InternalTransferOutput> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // Get sender's wallet (no lock - using optimistic locking via version column)
        const fromWalletOrm = await manager.findOne(WalletOrmEntity, {
          where: { userId: input.fromUserId },
        });

        if (!fromWalletOrm) {
          throw new NotFoundException('Sender wallet not found');
        }

        if (fromWalletOrm.status !== 'active') {
          throw new BadRequestException('Sender wallet is not active');
        }

        // Check balance BEFORE transfer (critical security check)
        if (Number(fromWalletOrm.balance) < input.amount) {
          throw new BadRequestException('Insufficient balance');
        }

        // Get recipient's wallet (no lock - using optimistic locking)
        const toWalletOrm = await manager.findOne(WalletOrmEntity, {
          where: { userId: recipient.id },
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
          `Processing internal transfer: ${input.fromUserId} -> ${recipient.id}, amount: ${input.amount} (attempt ${attempt})`,
        );

        // Execute transfer via payment gateway
        const transferResponse = await this.paymentGateway.internalTransfer({
          fromSubwalletId: fromWalletOrm.yellowCardWalletId,
          toSubwalletId: toWalletOrm.yellowCardWalletId,
          amount: input.amount,
          currency,
        });

        // Update balances - version column auto-increments on save
        // If another transaction modified the wallet, save() will throw OptimisticLockVersionMismatchError
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
    } catch (error) {
      // Handle optimistic lock conflict - retry with fresh data
      if (
        error instanceof OptimisticLockVersionMismatchError ||
        error.message?.includes('version')
      ) {
        if (attempt < this.MAX_RETRIES) {
          this.logger.warn(
            `Optimistic lock conflict on internal transfer, retrying (attempt ${attempt + 1}/${this.MAX_RETRIES})`,
          );
          // Small delay before retry to reduce contention
          await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
          return this.executeWithRetry(input, recipient, currency, attempt + 1);
        }
        throw new ConflictException(
          'Transfer failed due to concurrent modification. Please try again.',
        );
      }
      throw error;
    }
  }
}
