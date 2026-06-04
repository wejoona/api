import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import { TransactionRepository } from '../../../transaction/infrastructure/repositories/transaction.repository';
import { TransactionEntity } from '../../../transaction/domain/entities/transaction.entity';
import { UserRepository } from '../../../user/infrastructure/repositories/user.repository';
import { WalletOrmEntity } from '../../infrastructure/orm-entities/wallet.orm-entity';
import {
  LEDGER_PROVIDER,
  ILedgerProvider,
} from '../../../providers/interfaces';
import { CacheInvalidationService } from '../../../shared/infrastructure/services';
import { RiskEvaluationService } from '../../../risk/risk-evaluation.service';
import { getLimitsForKycStatus } from '../../../../common/constants/limits';
import { AppException } from '../../../../common/exceptions';
import { ERROR_CODES } from '../../../../common/constants/error-codes';
import { v4 as uuidv4 } from 'uuid';
import { formatDecimalAmount } from '../../../../common/utils/money-response.util';

export interface InternalTransferInput {
  fromUserId: string;
  toPhone?: string;
  recipientUsername?: string;
  amount: number;
  currency?: string;
  note?: string;
}

export interface InternalTransferOutput {
  transactionId: string;
  fromWalletId: string;
  toWalletId: string;
  toPhone: string;
  amount: number;
  amountDecimal: string;
  currency: string;
  fee: number;
  feeDecimal: string;
  status: string;
  supportReference: string;
  ledgerReference: string;
  ledgerTransactionId?: string;
}

/**
 * Internal Transfer Use Case (Omnibus Pattern)
 *
 * P2P transfers are Blnk-only: debit sender balance, credit receiver balance.
 * NO on-chain transaction is needed — instant, free, ledger-only.
 *
 * Flow:
 * 1. Validate request, find recipient, check limits
 * 2. Record P2P transfer in Blnk ledger (source of truth)
 * 3. Update local DB balances (mirror)
 * 4. Create transaction records
 * 5. Emit events
 */
@Injectable()
export class InternalTransferUseCase {
  private readonly logger = new Logger(InternalTransferUseCase.name);

  constructor(
    private readonly _walletRepository: WalletRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly userRepository: UserRepository,
    private readonly dataSource: DataSource,
    @Inject(LEDGER_PROVIDER)
    private readonly ledgerProvider: ILedgerProvider,
    private readonly cacheInvalidationService: CacheInvalidationService,
    private readonly eventEmitter: EventEmitter2,
    private readonly riskEvaluationService: RiskEvaluationService,
  ) {}

  async execute(input: InternalTransferInput): Promise<InternalTransferOutput> {
    const currency = input.currency || 'USDC';

    // Step 1: Validate transfer request
    this.validateTransferRequest(input);

    // Step 2: Validate and find recipient
    const recipient = await this.validateRecipient(input);

    // Step 3: Check daily limits based on KYC status
    await this.checkDailyLimits(input.fromUserId, input.amount);

    // Step 3.5: Risk evaluation (via Risk Manager service)
    const riskResult = await this.riskEvaluationService.evaluateTransfer({
      transactionId: uuidv4(),
      amount: input.amount,
      currency,
      senderId: input.fromUserId,
      receiverId: recipient.id,
      type: 'P2P',
    });
    if (riskResult?.decision === 'STEP_UP') {
      throw new BadRequestException(
        'Additional verification required for this transfer. Please verify your PIN and try again.',
      );
    }

    // Step 4: Load wallets
    const fromWallet = await this._walletRepository.findByUserId(
      input.fromUserId,
    );
    if (!fromWallet) throw new NotFoundException('Sender wallet not found');
    if (fromWallet.status !== 'active')
      throw new BadRequestException('Sender wallet is not active');

    const toWallet = await this._walletRepository.findByUserId(recipient.id);
    if (!toWallet) throw new NotFoundException('Recipient wallet not found');
    if (toWallet.status !== 'active')
      throw new BadRequestException('Recipient wallet is not active');
    // Check at user level (not wallet level) to handle potential multi-wallet scenarios
    if (input.fromUserId === recipient.id)
      throw AppException.badRequest(
        ERROR_CODES.TRANSFER_SELF_TRANSFER,
        'Cannot transfer to yourself',
      );
    if (fromWallet.id === toWallet.id)
      throw AppException.badRequest(
        ERROR_CODES.TRANSFER_SELF_TRANSFER,
        'Cannot transfer to yourself',
      );

    // Step 5: Check balance via Blnk (source of truth)
    try {
      const availableBalance = await this.ledgerProvider.getAvailableBalance(
        input.fromUserId,
        'USDC',
      );
      const amountInMicro = BigInt(Math.round(input.amount * 1_000_000));
      if (availableBalance < amountInMicro) {
        throw AppException.badRequest(
          ERROR_CODES.TRANSFER_INSUFFICIENT_FUNDS,
          'Insufficient balance',
        );
      }
    } catch (error) {
      if (error instanceof AppException || error instanceof BadRequestException)
        throw error;
      // Fallback: check local balance if Blnk is unavailable
      this.logger.warn(
        `Blnk balance check failed, falling back to local: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      if (fromWallet.balance < input.amount) {
        throw AppException.badRequest(
          ERROR_CODES.TRANSFER_INSUFFICIENT_FUNDS,
          'Insufficient balance',
        );
      }
    }

    // Step 6: Record P2P transfer in Blnk ledger (source of truth — NO on-chain tx)
    const amountInMicroUSDC = BigInt(Math.round(input.amount * 1_000_000));
    const senderTxId = uuidv4();
    let ledgerTransactionId: string | undefined;

    try {
      const ledgerResult = await this.ledgerProvider.recordP2PTransfer({
        senderId: input.fromUserId,
        recipientId: recipient.id,
        amount: amountInMicroUSDC,
        currency: 'USDC',
        reference: senderTxId,
        description: `P2P transfer to ${recipient.fullName}`,
        metadata: {
          senderWalletId: fromWallet.id,
          recipientWalletId: toWallet.id,
          recipientPhone: recipient.phone,
          recipientName: recipient.fullName,
        },
        note: input.note,
      });
      ledgerTransactionId = ledgerResult.transactionId;
      this.logger.log(`Blnk P2P transfer recorded: ${senderTxId}`);
    } catch (error) {
      this.logger.error(
        `Failed to record P2P transfer in Blnk: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      throw AppException.badRequest(
        ERROR_CODES.TRANSFER_FAILED,
        'Transfer failed. Please try again later.',
        undefined,
        {
          supportReference: senderTxId,
          ledgerReference: senderTxId,
          settlementStage: 'ledger_recording',
        },
      );
    }

    // Step 7: Update local DB balances (mirror of Blnk)
    await this.dataSource.transaction(async (manager) => {
      const fromWalletOrm = await manager.findOne(WalletOrmEntity, {
        where: { userId: input.fromUserId },
      });
      const toWalletOrm = await manager.findOne(WalletOrmEntity, {
        where: { userId: recipient.id },
      });

      if (fromWalletOrm && toWalletOrm) {
        fromWalletOrm.balance = Number(fromWalletOrm.balance) - input.amount;
        toWalletOrm.balance = Number(toWalletOrm.balance) + input.amount;
        await manager.save(fromWalletOrm);
        await manager.save(toWalletOrm);
      }
    });

    // Step 8: Create transaction records
    const senderTransaction = TransactionEntity.createInternalTransfer({
      walletId: fromWallet.id,
      amount: -input.amount,
      recipientWalletId: toWallet.id,
      recipientPhone: recipient.phone,
      currency,
      metadata: {
        direction: 'outbound',
        recipientName: recipient.fullName,
        blnkReference: senderTxId,
        omnibusPattern: true,
      },
    });
    senderTransaction.complete();

    const recipientTransaction = TransactionEntity.createInternalTransfer({
      walletId: toWallet.id,
      amount: input.amount,
      recipientWalletId: fromWallet.id,
      recipientPhone: recipient.phone,
      currency,
      metadata: {
        direction: 'inbound',
        senderWalletId: fromWallet.id,
        blnkReference: senderTxId,
        omnibusPattern: true,
      },
    });
    recipientTransaction.complete();

    await Promise.all([
      this.transactionRepository.save(senderTransaction),
      this.transactionRepository.save(recipientTransaction),
    ]);

    // Step 9: Invalidate caches
    await this.cacheInvalidationService.invalidateMultipleBalances([
      input.fromUserId,
      recipient.id,
    ]);

    // Step 10: Emit events
    this.eventEmitter.emit('transaction.transfer.sent', {
      userId: input.fromUserId,
      transactionId: senderTransaction.id,
      recipientId: recipient.id,
      amount: input.amount,
      currency,
      timestamp: new Date(),
    });

    this.eventEmitter.emit('transaction.transfer.received', {
      userId: recipient.id,
      transactionId: recipientTransaction.id,
      senderId: input.fromUserId,
      amount: input.amount,
      currency,
      timestamp: new Date(),
    });

    this.eventEmitter.emit('transfer.sent', {
      userId: input.fromUserId,
      transactionId: senderTransaction.id,
      recipientId: recipient.id,
      amount: input.amount,
      currency,
      timestamp: new Date(),
    });

    this.eventEmitter.emit('transfer.received', {
      userId: recipient.id,
      transactionId: recipientTransaction.id,
      senderId: input.fromUserId,
      amount: input.amount,
      currency,
      timestamp: new Date(),
    });

    this.eventEmitter.emit('balance.updated', {
      userId: input.fromUserId,
      walletId: fromWallet.id,
      reason: 'transfer_sent',
      timestamp: new Date(),
    });

    this.eventEmitter.emit('balance.updated', {
      userId: recipient.id,
      walletId: toWallet.id,
      reason: 'transfer_received',
      timestamp: new Date(),
    });

    this.logger.log(
      `Internal transfer completed (Blnk-only, no on-chain tx): ${senderTransaction.id}, amount: ${input.amount}`,
    );

    return {
      transactionId: senderTransaction.id,
      fromWalletId: fromWallet.id,
      toWalletId: toWallet.id,
      toPhone: recipient.phone,
      amount: input.amount,
      amountDecimal: formatDecimalAmount(input.amount, currency),
      currency,
      fee: 0, // Internal transfers are free
      feeDecimal: formatDecimalAmount(0, currency),
      status: 'completed',
      supportReference: senderTransaction.id,
      ledgerReference: senderTxId,
      ledgerTransactionId,
    };
  }

  private validateTransferRequest(input: InternalTransferInput): void {
    if (!input.toPhone && !input.recipientUsername) {
      throw AppException.badRequest(
        ERROR_CODES.TRANSFER_RECIPIENT_NOT_FOUND,
        'Recipient phone or username is required',
      );
    }
    if (input.amount <= 0) {
      throw AppException.badRequest(
        ERROR_CODES.TRANSFER_AMOUNT_TOO_LOW,
        'Amount must be greater than 0',
      );
    }
    if (input.amount < 0.01) {
      throw AppException.badRequest(
        ERROR_CODES.TRANSFER_AMOUNT_TOO_LOW,
        'Minimum transfer amount is 0.01',
      );
    }
    if (
      !Number.isFinite(input.amount) ||
      Math.round(input.amount * 100) / 100 !== input.amount
    ) {
      throw AppException.badRequest(
        ERROR_CODES.TRANSFER_AMOUNT_TOO_LOW,
        'Invalid amount precision',
      );
    }
  }

  private async validateRecipient(
    input: InternalTransferInput,
  ): Promise<{ id: string; phone: string; fullName: string }> {
    const recipient = input.recipientUsername
      ? await this.userRepository.findByUsername(input.recipientUsername)
      : await this.userRepository.findByPhone(input.toPhone!);
    if (!recipient) {
      throw new NotFoundException(
        'Recipient not found. They must register first.',
      );
    }

    // Check if recipient account is active (not suspended/banned)
    if ((recipient as any).status && (recipient as any).status !== 'active') {
      throw new BadRequestException(
        'Recipient account is not active. Transfer cannot be completed.',
      );
    }

    return {
      id: recipient.id,
      phone: recipient.phone,
      fullName: recipient.displayName,
    };
  }

  private async checkDailyLimits(
    userId: string,
    amount: number,
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const kycStatus = user.kycStatus || 'none';
    // Use unified limits from common/constants/limits.ts (single source of truth)
    const limits = getLimitsForKycStatus(kycStatus);

    if (
      Number(limits.perTransactionLimit) === 0 ||
      Number(limits.dailyLimit) === 0
    ) {
      throw AppException.badRequest(
        ERROR_CODES.TRANSFER_BLOCKED,
        'Transfers are disabled. Please contact support regarding your KYC status.',
      );
    }

    // Check per-transaction limit
    if (amount > limits.perTransactionLimit) {
      throw AppException.badRequest(
        ERROR_CODES.TRANSFER_AMOUNT_TOO_HIGH,
        `Transfer amount exceeds per-transaction limit of $${limits.perTransactionLimit}`,
      );
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const dailyVolume = await this.transactionRepository.getDailyTransferVolume(
      userId,
      todayStart,
    );

    if (dailyVolume + amount > limits.dailyLimit) {
      const remaining = Math.max(0, limits.dailyLimit - dailyVolume);
      throw AppException.badRequest(
        ERROR_CODES.TRANSFER_LIMIT_EXCEEDED,
        `Daily transfer limit exceeded. Your limit is $${limits.dailyLimit}/day (KYC: ${kycStatus}). ` +
          `You have $${remaining.toFixed(2)} remaining today.`,
      );
    }
  }
}
