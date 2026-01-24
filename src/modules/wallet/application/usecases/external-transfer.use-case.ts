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
import { WalletOrmEntity } from '../../infrastructure/orm-entities/wallet.orm-entity';
import { UserRepository } from '../../../user/infrastructure/repositories/user.repository';
import {
  PAYMENT_GATEWAY,
  IPaymentGateway,
} from '../../../shared/domain/gateways';

// SECURITY: KYC-based daily transfer limits (shared with internal transfers)
const DAILY_TRANSFER_LIMITS = {
  none: 100,        // $100/day for unverified users
  pending: 100,     // $100/day while KYC is pending
  verified: 10000,  // $10,000/day for verified users
  rejected: 0,      // No transfers for rejected KYC
};

export interface ExternalTransferInput {
  userId: string;
  toAddress: string;
  amount: number;
  currency?: string;
  network?: string;
}

export interface ExternalTransferOutput {
  transactionId: string;
  walletId: string;
  toAddress: string;
  amount: number;
  currency: string;
  fee: number;
  status: string;
  estimatedArrival?: string;
}

@Injectable()
export class ExternalTransferUseCase {
  private readonly logger = new Logger(ExternalTransferUseCase.name);

  // Fee percentage for external transfers (0.5%)
  private readonly FEE_PERCENTAGE = 0.005;
  // Maximum single transfer amount
  private readonly MAX_TRANSFER_AMOUNT = 10000;
  // Max retries for optimistic locking conflicts
  private readonly MAX_RETRIES = 3;

  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly userRepository: UserRepository,
    private readonly dataSource: DataSource,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  async execute(input: ExternalTransferInput): Promise<ExternalTransferOutput> {
    const currency = input.currency || 'USD';

    // Validate address format (basic validation)
    if (!this.isValidAddress(input.toAddress)) {
      throw new BadRequestException('Invalid wallet address format');
    }

    // Validate amount
    if (input.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // Minimum amount for external transfers
    if (input.amount < 1) {
      throw new BadRequestException('Minimum transfer amount is $1');
    }

    // Maximum amount for external transfers
    if (input.amount > this.MAX_TRANSFER_AMOUNT) {
      throw new BadRequestException(
        `Maximum transfer amount is $${this.MAX_TRANSFER_AMOUNT}`,
      );
    }

    // Validate amount precision (max 2 decimal places for USD)
    if (
      !Number.isFinite(input.amount) ||
      Math.round(input.amount * 100) / 100 !== input.amount
    ) {
      throw new BadRequestException('Invalid amount precision');
    }

    // Calculate fee
    const fee = Math.ceil(input.amount * this.FEE_PERCENTAGE * 100) / 100;
    const totalAmount = input.amount + fee;

    // SECURITY: Check KYC-based transfer limits
    await this.checkTransferLimits(input.userId, input.amount);

    // PHASE 1: Reserve funds with short-lived lock
    const { walletId, transactionId, yellowCardWalletId } =
      await this.reserveFunds(input.userId, totalAmount, input.toAddress, currency, fee, input.network);

    // PHASE 2: Execute external transfer (no lock held)
    try {
      const transferResponse = await this.paymentGateway.externalTransfer({
        subwalletId: yellowCardWalletId,
        toAddress: input.toAddress,
        amount: input.amount,
        currency,
        network: input.network || 'polygon',
      });

      // PHASE 3: Finalize transaction (short lock)
      await this.finalizeTransaction(transactionId, transferResponse, 'completed');

      this.logger.log(
        `External transfer completed: ${transactionId}, amount: ${input.amount}, fee: ${fee}`,
      );

      return {
        transactionId,
        walletId,
        toAddress: input.toAddress,
        amount: input.amount,
        currency,
        fee,
        status: transferResponse.status,
        estimatedArrival: '5-30 minutes',
      };
    } catch (error) {
      // PHASE 3 (failure): Refund the reserved funds
      this.logger.error(
        `External transfer failed, refunding: ${error.message}`,
        error.stack,
      );

      await this.refundTransaction(transactionId, input.userId, totalAmount);

      throw new BadRequestException(
        'Transfer failed. Your funds have been refunded. Please try again later.',
      );
    }
  }

  /**
   * Phase 1: Reserve funds using optimistic locking
   * This debits the balance and creates a PENDING transaction
   */
  private async reserveFunds(
    userId: string,
    totalAmount: number,
    toAddress: string,
    currency: string,
    fee: number,
    network?: string,
    attempt = 1,
  ): Promise<{ walletId: string; transactionId: string; yellowCardWalletId: string }> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // Get wallet without pessimistic lock - using optimistic locking via version column
        const walletOrm = await manager.findOne(WalletOrmEntity, {
          where: { userId },
        });

        if (!walletOrm) {
          throw new NotFoundException('Wallet not found');
        }

        if (walletOrm.status !== 'active') {
          throw new BadRequestException('Wallet is not active');
        }

        // Check balance
        if (Number(walletOrm.balance) < totalAmount) {
          throw new BadRequestException(
            `Insufficient balance. Required: $${totalAmount.toFixed(2)} (including $${fee.toFixed(2)} fee)`,
          );
        }

        this.logger.log(
          `Reserving funds: ${userId} -> ${toAddress}, amount: ${totalAmount - fee}, fee: ${fee} (attempt ${attempt})`,
        );

        // Debit balance - version column auto-increments on save
        walletOrm.balance = Number(walletOrm.balance) - totalAmount;
        await manager.save(walletOrm);

        // Create PENDING transaction
        const transaction = TransactionEntity.createExternalTransfer({
          walletId: walletOrm.id,
          amount: -totalAmount,
          recipientAddress: toAddress,
          currency,
          yellowCardRef: null, // Will be updated in finalize
          metadata: {
            network: network || 'polygon',
            fee,
            grossAmount: totalAmount - fee,
            status: 'pending',
          },
        });

        // Mark as pending
        transaction.status = 'pending';
        await this.transactionRepository.save(transaction);

        return {
          walletId: walletOrm.id,
          transactionId: transaction.id,
          yellowCardWalletId: walletOrm.yellowCardWalletId,
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
            `Optimistic lock conflict on fund reservation, retrying (attempt ${attempt + 1}/${this.MAX_RETRIES})`,
          );
          // Small delay before retry to reduce contention
          await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
          return this.reserveFunds(userId, totalAmount, toAddress, currency, fee, network, attempt + 1);
        }
        throw new ConflictException(
          'Transfer failed due to concurrent modification. Please try again.',
        );
      }
      throw error;
    }
  }

  /**
   * Phase 3a: Finalize successful transaction
   */
  private async finalizeTransaction(
    transactionId: string,
    transferResponse: { id: string; externalId: string; status: string },
    status: string,
  ): Promise<void> {
    // Update transaction with external reference and status
    await this.transactionRepository.update(transactionId, {
      status,
      yellowCardRef: transferResponse.externalId,
      metadata: {
        transferId: transferResponse.id,
        externalStatus: transferResponse.status,
        completedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Phase 3b: Refund on failure using optimistic locking
   */
  private async refundTransaction(
    transactionId: string,
    userId: string,
    amount: number,
    attempt = 1,
  ): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        // Get wallet without pessimistic lock - using optimistic locking
        const walletOrm = await manager.findOne(WalletOrmEntity, {
          where: { userId },
        });

        if (walletOrm) {
          // Refund the amount - version column auto-increments on save
          walletOrm.balance = Number(walletOrm.balance) + amount;
          await manager.save(walletOrm);
        }

        // Mark transaction as failed
        await this.transactionRepository.update(transactionId, {
          status: 'failed',
          metadata: {
            failedAt: new Date().toISOString(),
            refunded: true,
          },
        });
      });

      this.logger.log(`Refunded ${amount} for failed transaction ${transactionId}`);
    } catch (error) {
      // Handle optimistic lock conflict - retry refund
      if (
        error instanceof OptimisticLockVersionMismatchError ||
        error.message?.includes('version')
      ) {
        if (attempt < this.MAX_RETRIES) {
          this.logger.warn(
            `Optimistic lock conflict on refund, retrying (attempt ${attempt + 1}/${this.MAX_RETRIES})`,
          );
          await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
          return this.refundTransaction(transactionId, userId, amount, attempt + 1);
        }
      }
      // Log but don't throw - refund failure needs manual intervention
      this.logger.error(
        `CRITICAL: Failed to refund transaction ${transactionId}: ${error.message}`,
        error.stack,
      );
      // TODO: Alert operations team for manual refund
    }
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

  private isValidAddress(address: string): boolean {
    // Ethereum/EVM address validation with checksum support
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return false;
    }

    // If address is all lowercase or all uppercase, it's valid (no checksum)
    if (
      address === address.toLowerCase() ||
      address.substring(2) === address.substring(2).toUpperCase()
    ) {
      return true;
    }

    // TODO: Implement EIP-55 checksum validation for mixed-case addresses
    // For now, accept mixed-case addresses
    return true;
  }
}
