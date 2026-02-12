import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
import {
  LEDGER_PROVIDER,
  ILedgerProvider,
} from '../../../providers/interfaces';
import { CacheInvalidationService } from '../../../shared/infrastructure/services';
import { v4 as uuidv4 } from 'uuid';
import { TransactionRiskService } from '../../../risk/application/services/transaction-risk.service';
import { OmnibusService } from '../services/omnibus.service';
import { RiskEvaluationService } from '../../../risk/risk-evaluation.service';

// SECURITY: KYC-based daily transfer limits
const DAILY_TRANSFER_LIMITS = {
  none: 100,
  pending: 100,
  verified: 10000,
  rejected: 0,
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
  txHash?: string;
  estimatedArrival?: string;
}

/**
 * External Transfer Use Case (Omnibus Pattern)
 *
 * Withdrawals flow:
 * 1. Blnk debit user balance (source of truth)
 * 2. Omnibus wallet sends on-chain
 * 3. Update local DB as mirror
 *
 * Deposits flow (handled by webhook/deposit use case):
 * 1. Receive on omnibus wallet
 * 2. Blnk credit user balance
 */
@Injectable()
export class ExternalTransferUseCase {
  private readonly logger = new Logger(ExternalTransferUseCase.name);

  private readonly FEE_PERCENTAGE = 0.005;
  private readonly MAX_TRANSFER_AMOUNT = 10000;
  private readonly MAX_RETRIES = 3;

  constructor(
    private readonly _walletRepository: WalletRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly userRepository: UserRepository,
    private readonly dataSource: DataSource,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    @Inject(LEDGER_PROVIDER)
    private readonly ledgerProvider: ILedgerProvider,
    private readonly omnibusService: OmnibusService,
    private readonly cacheInvalidationService: CacheInvalidationService,
    private readonly riskService: TransactionRiskService,
    private readonly riskEvaluationService: RiskEvaluationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: ExternalTransferInput): Promise<ExternalTransferOutput> {
    const currency = input.currency || 'USD';

    // Validate address format
    if (!this.isValidAddress(input.toAddress)) {
      throw new BadRequestException('Invalid wallet address format');
    }

    // CRITICAL SECURITY: Circle Compliance Engine - Address Screening
    await this.screenDestinationAddress(input.toAddress, input.network);

    // Validate amount
    if (input.amount <= 0)
      throw new BadRequestException('Amount must be greater than 0');
    if (input.amount < 1)
      throw new BadRequestException('Minimum transfer amount is $1');
    if (input.amount > this.MAX_TRANSFER_AMOUNT)
      throw new BadRequestException(
        `Maximum transfer amount is $${this.MAX_TRANSFER_AMOUNT}`,
      );
    if (
      !Number.isFinite(input.amount) ||
      Math.round(input.amount * 100) / 100 !== input.amount
    )
      throw new BadRequestException('Invalid amount precision');

    const fee = Math.ceil(input.amount * this.FEE_PERCENTAGE * 100) / 100;
    const totalAmount = input.amount + fee;

    // Check KYC-based transfer limits
    await this.checkTransferLimits(input.userId, input.amount);

    // Risk evaluation via Risk Manager
    const riskResult = await this.riskEvaluationService.evaluateTransfer({
      transactionId: uuidv4(),
      amount: input.amount,
      currency,
      senderId: input.userId,
      receiverId: input.toAddress,
      type: 'WITHDRAWAL',
    });
    if (riskResult?.decision === 'STEP_UP') {
      throw new BadRequestException(
        'Additional verification required for this withdrawal. Please verify your identity and try again.',
      );
    }

    // Get wallet
    const wallet = await this._walletRepository.findByUserId(input.userId);
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (wallet.status !== 'active')
      throw new BadRequestException('Wallet is not active');

    // Step 1: Check balance via Blnk (source of truth)
    const amountInMicro = BigInt(Math.round(totalAmount * 1_000_000));
    try {
      const availableBalance = await this.ledgerProvider.getAvailableBalance(
        input.userId,
        'USDC',
      );
      if (availableBalance < amountInMicro) {
        throw new BadRequestException(
          `Insufficient balance. Required: $${totalAmount.toFixed(2)} (including $${fee.toFixed(2)} fee)`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.warn(
        `Blnk balance check failed, falling back to local: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      if (wallet.balance < totalAmount) {
        throw new BadRequestException(
          `Insufficient balance. Required: $${totalAmount.toFixed(2)} (including $${fee.toFixed(2)} fee)`,
        );
      }
    }

    // Step 2: Record withdrawal in Blnk ledger (debit user — source of truth)
    const transactionRef = uuidv4();
    let blnkTxId: string | undefined;
    try {
      const blnkResult = await this.ledgerProvider.recordExternalTransfer({
        userId: input.userId,
        amount: BigInt(Math.round(input.amount * 1_000_000)),
        currency: 'USDC',
        reference: transactionRef,
        destinationAddress: input.toAddress,
        blockchain: input.network || 'polygon',
        fee: BigInt(Math.round(fee * 1_000_000)),
        inflight: true,
        description: `Withdrawal to ${input.toAddress.slice(0, 10)}...`,
        metadata: {
          walletId: wallet.id,
          omnibusPattern: true,
        },
      });
      blnkTxId = blnkResult.transactionId;
      this.logger.log(`Blnk withdrawal recorded (inflight): ${blnkTxId}`);
    } catch (error) {
      this.logger.error(
        `Failed to record withdrawal in Blnk: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      throw new BadRequestException(
        'Transfer failed. Please try again later.',
      );
    }

    // Step 3: Route through omnibus and execute on-chain transfer
    try {
      const route = await this.omnibusService.routeExternalTransfer({
        amount: input.amount,
        destination: input.toAddress,
        preferredNetwork: input.network === 'stellar' ? 'stellar' : 'circle',
      });

      // Execute the on-chain transfer from omnibus wallet
      const transferResponse = await this.paymentGateway.externalTransfer({
        subwalletId: route.omnibusWalletId,
        toAddress: input.toAddress,
        amount: input.amount,
        currency,
        network: input.network || 'polygon',
      });

      // Step 4: Commit Blnk inflight transaction
      if (blnkTxId) {
        try {
          await this.ledgerProvider.commitTransaction(blnkTxId);
        } catch (commitError) {
          this.logger.error(
            `Failed to commit Blnk transaction ${blnkTxId}: ${commitError instanceof Error ? commitError.message : 'Unknown'}`,
          );
        }
      }

      // Step 5: Update local DB balance (mirror)
      await this.updateLocalBalance(input.userId, -totalAmount);

      // Step 6: Create transaction record
      const transaction = TransactionEntity.createExternalTransfer({
        walletId: wallet.id,
        amount: -totalAmount,
        recipientAddress: input.toAddress,
        currency,
        yellowCardRef: transferResponse.externalId,
        metadata: {
          network: input.network || 'polygon',
          fee,
          grossAmount: input.amount,
          blnkTransactionId: blnkTxId,
          omnibusNetwork: route.network,
          omnibusWalletId: route.omnibusWalletId,
          status: 'completed',
        },
      });
      transaction.complete();
      await this.transactionRepository.save(transaction);

      // Invalidate cache
      await this.cacheInvalidationService.invalidateBalance(input.userId);

      // Emit events
      this.eventEmitter.emit('transaction.withdrawal.initiated', {
        userId: input.userId,
        transactionId: transaction.id,
        toAddress: input.toAddress,
        amount: input.amount,
        currency,
        fee,
        omnibusNetwork: route.network,
        timestamp: new Date(),
      });

      this.eventEmitter.emit('balance.updated', {
        userId: input.userId,
        walletId: wallet.id,
        reason: 'withdrawal',
        timestamp: new Date(),
      });

      this.logger.log(
        `External transfer completed via omnibus (${route.network}): ${transaction.id}`,
      );

      return {
        transactionId: transaction.id,
        walletId: wallet.id,
        toAddress: input.toAddress,
        amount: input.amount,
        currency,
        fee,
        status: transferResponse.status,
        txHash: transferResponse.txHash,
        estimatedArrival: '5-30 minutes',
      };
    } catch (error) {
      // On-chain transfer failed — void the Blnk inflight transaction
      this.logger.error(
        `External transfer failed, voiding Blnk transaction: ${error instanceof Error ? error.message : 'Unknown'}`,
      );

      if (blnkTxId) {
        try {
          await this.ledgerProvider.voidTransaction(blnkTxId);
          this.logger.log(`Voided Blnk transaction ${blnkTxId}`);
        } catch (voidError) {
          this.logger.error(
            `CRITICAL: Failed to void Blnk transaction ${blnkTxId}: ${voidError instanceof Error ? voidError.message : 'Unknown'}`,
          );
        }
      }

      throw new BadRequestException(
        'Transfer failed. Your funds have been refunded. Please try again later.',
      );
    }
  }

  private async updateLocalBalance(
    userId: string,
    delta: number,
  ): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const walletOrm = await manager.findOne(WalletOrmEntity, {
          where: { userId },
        });
        if (walletOrm) {
          walletOrm.balance = Number(walletOrm.balance) + delta;
          await manager.save(walletOrm);
        }
      });
    } catch (error) {
      this.logger.error(
        `Failed to update local balance for ${userId}: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  private async checkTransferLimits(
    userId: string,
    amount: number,
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const kycStatus = user.kycStatus || 'none';
    const dailyLimit =
      DAILY_TRANSFER_LIMITS[kycStatus as keyof typeof DAILY_TRANSFER_LIMITS] ??
      DAILY_TRANSFER_LIMITS.none;

    if (dailyLimit === 0) {
      throw new BadRequestException(
        'Transfers are disabled. Please contact support regarding your KYC status.',
      );
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const dailyVolume = await this.transactionRepository.getDailyTransferVolume(
      userId,
      todayStart,
    );

    if (dailyVolume + amount > dailyLimit) {
      const remaining = Math.max(0, dailyLimit - dailyVolume);
      throw new BadRequestException(
        `Daily transfer limit exceeded. Your limit is $${dailyLimit}/day (KYC: ${kycStatus}). ` +
          `You have $${remaining.toFixed(2)} remaining today.`,
      );
    }
  }

  private isValidAddress(address: string): boolean {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return false;
    if (
      address === address.toLowerCase() ||
      address.substring(2) === address.substring(2).toUpperCase()
    )
      return true;
    return this.validateEip55Checksum(address);
  }

  private validateEip55Checksum(address: string): boolean {
    try {
      const addressWithoutPrefix = address.substring(2).toLowerCase();
      const crypto = require('crypto');
      const hash = crypto
        .createHash('sha3-256')
        .update(addressWithoutPrefix)
        .digest('hex');

      for (let i = 0; i < 40; i++) {
        const hashChar = parseInt(hash[i], 16);
        const addressChar = address[i + 2];
        if (hashChar >= 8) {
          if (addressChar !== addressChar.toUpperCase()) return false;
        } else {
          if (addressChar !== addressChar.toLowerCase()) return false;
        }
      }
      return true;
    } catch (error) {
      this.logger.warn(
        `EIP-55 checksum validation failed for ${address}: ${error.message}`,
      );
      return true;
    }
  }

  private async screenDestinationAddress(
    address: string,
    network?: string,
  ): Promise<void> {
    const blockchain = this.mapNetworkToBlockchain(network);
    this.logger.log(
      `[COMPLIANCE] Screening address: ${address} on ${blockchain}`,
    );

    const result = await this.riskService.isAddressSafe(address, blockchain);

    if (!result.safe) {
      this.logger.warn(`[COMPLIANCE] Address blocked: ${address}`, {
        reason: result.reason,
        riskSignals: result.riskSignals,
      });
      throw new ForbiddenException(
        `Transfer blocked: This destination address has been flagged by our compliance system. ` +
          `Reason: ${result.reason || 'Compliance check failed'}`,
      );
    }
    this.logger.log(`[COMPLIANCE] Address approved: ${address}`);
  }

  private mapNetworkToBlockchain(
    network?: string,
  ): 'ETH' | 'MATIC' | 'ARB' | 'AVAX' | 'BASE' | 'OP' | 'SOL' {
    const networkMap: Record<
      string,
      'ETH' | 'MATIC' | 'ARB' | 'AVAX' | 'BASE' | 'OP' | 'SOL'
    > = {
      ethereum: 'ETH',
      eth: 'ETH',
      polygon: 'MATIC',
      matic: 'MATIC',
      arbitrum: 'ARB',
      arb: 'ARB',
      avalanche: 'AVAX',
      avax: 'AVAX',
      base: 'BASE',
      optimism: 'OP',
      op: 'OP',
      solana: 'SOL',
      sol: 'SOL',
    };
    return networkMap[network?.toLowerCase() || 'polygon'] || 'MATIC';
  }
}
