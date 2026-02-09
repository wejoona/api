import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import {
  BillProviderRepository,
  BillPaymentRepository,
} from '../../infrastructure/repositories';
import { BillAdapterService } from '../services/bill-adapter.service';
import { WalletRepository } from '../../../wallet/infrastructure/repositories/wallet.repository';
import { TransactionRepository } from '../../../transaction/infrastructure/repositories/transaction.repository';
import { TransactionEntity } from '../../../transaction/domain/entities/transaction.entity';
import { WalletOrmEntity } from '../../../wallet/infrastructure/orm-entities';
import { CacheInvalidationService } from '../../../shared/infrastructure/services';
import {
  BillPaymentRequest,
  BillPaymentResult,
  BillPaymentError,
} from '../../domain/types';

export interface PayBillInput {
  userId: string;
  providerId: string;
  accountNumber: string;
  meterNumber?: string;
  customerName?: string;
  amount: number;
  currency?: string;
  phone?: string;
  email?: string;
  idempotencyKey?: string;
}

export interface PayBillOutput extends BillPaymentResult {
  walletTransactionId: string;
}

// Daily bill payment limits based on KYC status
const DAILY_BILL_PAYMENT_LIMITS = {
  none: 50000, // 50,000 XOF (~$80)
  pending: 50000,
  verified: 5000000, // 5,000,000 XOF (~$8,000)
  rejected: 0,
};

@Injectable()
export class PayBillUseCase {
  private readonly logger = new Logger(PayBillUseCase.name);

  constructor(
    private readonly providerRepository: BillProviderRepository,
    private readonly paymentRepository: BillPaymentRepository,
    private readonly walletRepository: WalletRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly adapterService: BillAdapterService,
    private readonly dataSource: DataSource,
    private readonly cacheInvalidationService: CacheInvalidationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: PayBillInput): Promise<PayBillOutput> {
    this.logger.log(
      `Processing bill payment: provider=${input.providerId}, account=${input.accountNumber}, amount=${input.amount}`,
    );

    // Check for idempotency
    if (input.idempotencyKey) {
      const existingPayment = await this.paymentRepository.findByIdempotencyKey(
        input.idempotencyKey,
      );
      if (existingPayment) {
        this.logger.debug(
          `Found existing payment for idempotency key: ${input.idempotencyKey}`,
        );
        return this.mapToOutput(existingPayment);
      }
    }

    // Get provider
    const providerData = await this.providerRepository.findByIdWithConfig(
      input.providerId,
    );
    if (!providerData) {
      throw new NotFoundException('Bill provider not found');
    }

    const { provider, adapterType } = providerData;

    if (!provider.isActive) {
      throw new BadRequestException(
        'This bill provider is currently unavailable',
      );
    }

    const currency = input.currency || provider.currency;

    // Validate amount limits
    if (input.amount < provider.minimumAmount) {
      throw new BadRequestException(
        `Minimum payment amount is ${provider.minimumAmount} ${currency}`,
      );
    }

    if (input.amount > provider.maximumAmount) {
      throw new BadRequestException(
        `Maximum payment amount is ${provider.maximumAmount} ${currency}`,
      );
    }

    // Calculate fee
    const fee =
      provider.processingFeeType === 'percentage'
        ? (input.amount * provider.processingFee) / 100
        : provider.processingFee;

    const totalAmount = input.amount + fee;

    // Get user's wallet
    const wallet = await this.walletRepository.findByUserId(input.userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.status !== 'active') {
      throw new BadRequestException('Your wallet is not active');
    }

    // Check daily limit based on KYC status
    await this.checkDailyLimits(
      input.userId,
      wallet.kycStatus,
      totalAmount,
      currency,
    );

    // Check for duplicate payment within 5 minutes
    const recentPayment =
      await this.paymentRepository.getRecentPaymentForAccount(
        input.userId,
        input.providerId,
        input.accountNumber,
        5,
      );

    if (recentPayment && Number(recentPayment.amount) === input.amount) {
      throw new ConflictException(
        'A similar payment was recently submitted. Please wait a few minutes before trying again.',
      );
    }

    // Check balance
    if (Number(wallet.balance) < totalAmount) {
      throw new BadRequestException(
        `Insufficient balance. Required: ${totalAmount} ${currency}, Available: ${wallet.balance} ${currency}`,
      );
    }

    // Execute payment in transaction
    return this.executePayment(
      input,
      provider,
      adapterType,
      wallet,
      fee,
      totalAmount,
      currency,
    );
  }

  private async checkDailyLimits(
    userId: string,
    kycStatus: string,
    amount: number,
    currency: string,
  ): Promise<void> {
    const dailyLimit =
      DAILY_BILL_PAYMENT_LIMITS[
        kycStatus as keyof typeof DAILY_BILL_PAYMENT_LIMITS
      ] ?? DAILY_BILL_PAYMENT_LIMITS.none;

    if (dailyLimit === 0) {
      throw new BadRequestException(
        'Bill payments are disabled. Please contact support regarding your KYC status.',
      );
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const dailyVolume = await this.paymentRepository.getDailyPaymentVolume(
      userId,
      todayStart,
    );

    if (dailyVolume + amount > dailyLimit) {
      const remaining = Math.max(0, dailyLimit - dailyVolume);
      throw new BadRequestException(
        `Daily bill payment limit exceeded. Your limit is ${dailyLimit} ${currency}/day. ` +
          `You have ${remaining.toFixed(0)} ${currency} remaining today.`,
      );
    }
  }

  private async executePayment(
    input: PayBillInput,
    provider: any,
    adapterType: string,
    wallet: any,
    fee: number,
    totalAmount: number,
    currency: string,
  ): Promise<PayBillOutput> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let paymentId: string | null = null;

    try {
      // Create payment record
      const payment = await this.paymentRepository.create({
        userId: input.userId,
        walletId: wallet.id,
        providerId: input.providerId,
        category: provider.category,
        accountNumber: input.accountNumber,
        meterNumber: input.meterNumber || null,
        customerName: input.customerName || null,
        amount: input.amount,
        fee,
        totalAmount,
        currency,
        status: 'pending',
        idempotencyKey: input.idempotencyKey || null,
        phone: input.phone || null,
        email: input.email || null,
      });

      paymentId = payment.id;

      // Debit wallet
      const walletOrm = await queryRunner.manager.findOne(WalletOrmEntity, {
        where: { id: wallet.id },
      });

      if (!walletOrm || Number(walletOrm.balance) < totalAmount) {
        throw new BadRequestException('Insufficient balance');
      }

      walletOrm.balance = Number(walletOrm.balance) - totalAmount;
      await queryRunner.manager.save(walletOrm);

      // Create wallet transaction
      const transaction = TransactionEntity.createBillPayment({
        walletId: wallet.id,
        amount: -totalAmount,
        currency,
        metadata: {
          billPaymentId: payment.id,
          providerId: input.providerId,
          providerName: provider.name,
          category: provider.category,
          accountNumber: input.accountNumber,
          fee,
        },
      });

      await this.transactionRepository.save(transaction);

      // Update payment with transaction ID
      await this.paymentRepository.updateStatus(payment.id, 'processing', {
        transactionId: transaction.id,
      });

      await queryRunner.commitTransaction();

      // Process payment with provider (outside transaction)
      const adapter = this.adapterService.getAdapter(adapterType);
      const request: BillPaymentRequest = {
        userId: input.userId,
        providerId: input.providerId,
        accountNumber: input.accountNumber,
        meterNumber: input.meterNumber,
        customerName: input.customerName,
        amount: input.amount,
        currency,
        phone: input.phone,
        email: input.email,
      };

      try {
        const result = await adapter.processPayment(request);

        // Update payment with result
        await this.paymentRepository.updateStatus(payment.id, result.status, {
          receiptNumber: result.receiptNumber || this.generateReceiptNumber(),
          providerReference: result.providerReference,
          tokenNumber: result.tokenNumber,
          units: result.units,
          metadata: result.metadata,
        });

        // Complete transaction
        transaction.complete();
        await this.transactionRepository.save(transaction);

        // Invalidate cache
        await this.cacheInvalidationService.invalidateBalance(input.userId);

        this.logger.log(
          `Bill payment completed: paymentId=${payment.id}, status=${result.status}`,
        );

        this.eventEmitter.emit('bill.payment.completed', {
          userId: input.userId,
          paymentId: payment.id,
          providerId: input.providerId,
          amount: input.amount,
          currency,
          timestamp: new Date(),
        });

        this.eventEmitter.emit('balance.updated', {
          userId: input.userId,
          walletId: wallet.id,
          reason: 'bill_payment',
          timestamp: new Date(),
        });

        return {
          ...result,
          paymentId: payment.id,
          walletTransactionId: transaction.id,
          fee,
          totalAmount,
        };
      } catch (error) {
        // Provider payment failed - refund the user
        this.logger.error(`Provider payment failed: ${error}`, error);

        await this.refundPayment(payment.id, wallet.id, totalAmount, error);

        this.eventEmitter.emit('bill.payment.failed', {
          userId: input.userId,
          paymentId: payment.id,
          providerId: input.providerId,
          amount: input.amount,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        });

        if (error instanceof BillPaymentError) {
          throw new BadRequestException(error.message);
        }

        throw new BadRequestException(
          'Bill payment failed. Your account has been refunded.',
        );
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();

      // Mark payment as failed if it was created
      if (paymentId) {
        await this.paymentRepository.setFailureReason(
          paymentId,
          error instanceof Error ? error.message : 'Unknown error',
        );
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async refundPayment(
    paymentId: string,
    walletId: string,
    amount: number,
    error: any,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Credit wallet back
      const wallet = await queryRunner.manager.findOne(WalletOrmEntity, {
        where: { id: walletId },
      });

      if (wallet) {
        wallet.balance = Number(wallet.balance) + amount;
        await queryRunner.manager.save(wallet);
      }

      // Update payment status
      await this.paymentRepository.updateStatus(paymentId, 'failed', {
        failureReason:
          error instanceof Error ? error.message : 'Provider error',
      });

      await queryRunner.commitTransaction();

      this.logger.log(
        `Payment refunded: paymentId=${paymentId}, amount=${amount}`,
      );
    } catch (refundError) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to refund payment: ${refundError}`);
    } finally {
      await queryRunner.release();
    }
  }

  private generateReceiptNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `RCP-${dateStr}-${random}`;
  }

  private mapToOutput(entity: any): PayBillOutput {
    return {
      paymentId: entity.id,
      transactionId: entity.transactionId || entity.id,
      walletTransactionId: entity.transactionId,
      status: entity.status,
      receiptNumber: entity.receiptNumber,
      providerReference: entity.providerReference,
      tokenNumber: entity.tokenNumber,
      units: entity.units,
      amount: Number(entity.amount),
      fee: Number(entity.fee),
      totalAmount: Number(entity.totalAmount),
      currency: entity.currency,
      paidAt: entity.completedAt,
      metadata: entity.metadata,
    };
  }
}
