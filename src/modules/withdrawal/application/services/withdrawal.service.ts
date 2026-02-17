import { Injectable, Logger, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ILedgerProvider, LEDGER_PROVIDER } from '../../../providers/interfaces';
import { WithdrawalRepository, CreateWithdrawalParams } from '../../infrastructure/repositories/withdrawal.repository';
import { PayoutProviderFactory } from '../../infrastructure/providers/payout-provider.factory';
import { WithdrawalEntity } from '../../domain/entities/withdrawal.entity';
import { WithdrawalStatus } from '../../domain/enums/withdrawal-status.enum';
import { WithdrawalInitiatedEvent, WithdrawalCompletedEvent, WithdrawalFailedEvent } from '../../domain/events/withdrawal.events';
import { InitiateWithdrawalDto } from '../dto/initiate-withdrawal.dto';
import { WithdrawalResponseDto } from '../dto/withdrawal-response.dto';
import { ExchangeRateService } from '../../../exchange-rate/application/services/exchange-rate.service';

@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);

  constructor(
    private readonly withdrawalRepository: WithdrawalRepository,
    private readonly providerFactory: PayoutProviderFactory,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly exchangeRateService: ExchangeRateService,
    @Inject(LEDGER_PROVIDER)
    private readonly ledgerProvider: ILedgerProvider,
  ) {}

  async initiateWithdrawal(
    userId: string,
    dto: InitiateWithdrawalDto,
  ): Promise<WithdrawalResponseDto> {
    this.logger.log(`Initiating withdrawal for user ${userId}: ${dto.amount} USDC → ${dto.currency}`);

    const provider = this.providerFactory.getProvider(dto.providerCode);

    // Convert USDC → XOF using exchange rate service
    const rateInfo = this.exchangeRateService.getRate('USD', dto.currency);
    if (!rateInfo) {
      throw new BadRequestException(`Exchange rate not available for USD/${dto.currency}`);
    }

    const usdcAmount = BigInt(dto.amount);
    // Convert: USDC minor units (cents) → fiat minor units
    const fiatAmount = BigInt(Math.round(Number(usdcAmount) * rateInfo.rate));

    // Debit USDC from user's Blnk ledger
    let blnkTransactionId: string | undefined;
    try {
      const debitResult = await this.ledgerProvider.recordWithdrawal({
        userId,
        amount: usdcAmount,
        currency: 'USDC',
        reference: `wdr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        description: `Withdrawal to ${dto.providerCode} ${dto.phoneNumber}`,
        provider: 'mobile_money',
        fee: BigInt(0),
        inflight: true,
        metadata: {
          providerCode: dto.providerCode,
          phoneNumber: dto.phoneNumber,
          fiatAmount: fiatAmount.toString(),
          fiatCurrency: dto.currency,
        },
      });
      blnkTransactionId = debitResult?.transactionId;
    } catch (error) {
      this.logger.error(`Ledger debit failed for user ${userId}: ${error.message}`);
      throw new BadRequestException('Insufficient balance or ledger error');
    }

    // Create withdrawal record
    const createParams: CreateWithdrawalParams = {
      userId,
      amount: usdcAmount,
      fiatAmount,
      currency: dto.currency,
      providerCode: dto.providerCode,
      paymentMethodType: provider.getPaymentMethodType(),
      phoneNumber: dto.phoneNumber,
      exchangeRate: rateInfo.rate,
      metadata: {
        initiatedAt: Date.now(),
        blnkTransactionId,
      },
    };

    const withdrawal = await this.withdrawalRepository.create(createParams);

    // Update with blnk transaction ID
    if (blnkTransactionId) {
      await this.withdrawalRepository.update(withdrawal.id, { blnkTransactionId });
    }

    // Emit initiated event
    this.eventEmitter.emit(
      'withdrawal.initiated',
      new WithdrawalInitiatedEvent(
        withdrawal.id, userId, usdcAmount, fiatAmount,
        dto.currency, dto.providerCode, dto.phoneNumber,
      ),
    );

    // Initiate fiat payout via provider (async)
    this.processPayoutAsync(withdrawal, dto, fiatAmount);

    return this.toResponseDto(withdrawal);
  }

  async getWithdrawal(id: string, userId: string): Promise<WithdrawalResponseDto> {
    const withdrawal = await this.withdrawalRepository.findByIdAndUser(id, userId);
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    return this.toResponseDto(withdrawal);
  }

  async listWithdrawals(params: {
    userId: string;
    status?: WithdrawalStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ withdrawals: WithdrawalResponseDto[]; total: number; hasMore: boolean }> {
    const result = await this.withdrawalRepository.list(params);
    return {
      withdrawals: result.withdrawals.map(w => this.toResponseDto(w)),
      total: result.total,
      hasMore: (params.offset || 0) + (params.limit || 20) < result.total,
    };
  }

  private async processPayoutAsync(
    withdrawal: WithdrawalEntity,
    dto: InitiateWithdrawalDto,
    fiatAmount: bigint,
  ): Promise<void> {
    try {
      await this.withdrawalRepository.update(withdrawal.id, {
        status: WithdrawalStatus.PROCESSING,
      });

      const provider = this.providerFactory.getProvider(dto.providerCode);
      const payoutResult = await provider.initiatePayout({
        amount: Number(fiatAmount),
        currency: dto.currency,
        phoneNumber: dto.phoneNumber,
        userId: withdrawal.userId,
        transactionId: withdrawal.id,
      });

      await this.withdrawalRepository.update(withdrawal.id, {
        providerTransactionId: payoutResult.providerTransactionId,
        providerReference: payoutResult.providerReference,
        status: payoutResult.status === 'completed'
          ? WithdrawalStatus.COMPLETED
          : payoutResult.status === 'failed'
            ? WithdrawalStatus.FAILED
            : WithdrawalStatus.PROCESSING,
        completedAt: payoutResult.status === 'completed' ? new Date() : undefined,
        failureReason: payoutResult.failureReason,
      });

      if (payoutResult.status === 'completed') {
        this.eventEmitter.emit(
          'withdrawal.completed',
          new WithdrawalCompletedEvent(
            withdrawal.id, withdrawal.userId, withdrawal.amount, fiatAmount,
            dto.currency, dto.providerCode, payoutResult.providerReference,
            withdrawal.blnkTransactionId,
          ),
        );
      } else if (payoutResult.status === 'failed') {
        // Reverse the ledger debit on failure
        this.eventEmitter.emit(
          'withdrawal.failed',
          new WithdrawalFailedEvent(
            withdrawal.id, withdrawal.userId, withdrawal.amount,
            dto.currency, payoutResult.failureReason || 'Provider payout failed', dto.providerCode,
          ),
        );
      }
    } catch (error) {
      this.logger.error(`Payout processing failed for withdrawal ${withdrawal.id}: ${error.message}`);

      await this.withdrawalRepository.update(withdrawal.id, {
        status: WithdrawalStatus.FAILED,
        failureReason: error.message,
      });

      this.eventEmitter.emit(
        'withdrawal.failed',
        new WithdrawalFailedEvent(
          withdrawal.id, withdrawal.userId, withdrawal.amount,
          dto.currency, error.message, dto.providerCode,
        ),
      );
    }
  }

  private toResponseDto(withdrawal: WithdrawalEntity): WithdrawalResponseDto {
    return {
      id: withdrawal.id,
      status: withdrawal.status,
      amount: Number(withdrawal.amount),
      fiatAmount: Number(withdrawal.fiatAmount),
      currency: withdrawal.currency,
      providerCode: withdrawal.providerCode,
      phoneNumber: withdrawal.phoneNumber,
      exchangeRate: withdrawal.exchangeRate,
      providerReference: withdrawal.providerReference,
      createdAt: withdrawal.createdAt,
      completedAt: withdrawal.completedAt,
    };
  }
}
