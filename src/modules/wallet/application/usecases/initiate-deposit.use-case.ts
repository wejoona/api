import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import { TransactionRepository } from '../../../transaction/infrastructure/repositories/transaction.repository';
import { TransactionEntity } from '../../../transaction/domain/entities/transaction.entity';
import {
  PAYMENT_GATEWAY,
  IPaymentGateway,
  PaymentInstructions,
} from '../../../shared/domain/gateways';
import { RiskEvaluationService } from '../../../risk/risk-evaluation.service';
import { v4 as uuidv4 } from 'uuid';
import {
  formatDecimalAmount,
  formatRateDecimal,
} from '../../../../common/utils/money-response.util';

export interface InitiateDepositInput {
  userId: string;
  amount: number;
  sourceCurrency: string;
  channelId: string;
}

export interface InitiateDepositOutput {
  transactionId: string;
  depositId: string;
  amount: number;
  amountDecimal: string;
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
  rateDecimal: string;
  fee: number;
  feeDecimal: string;
  estimatedAmount: number;
  estimatedAmountDecimal: string;
  paymentInstructions: PaymentInstructions;
  expiresAt: Date;
  supportReference: string;
  providerReference: string;
  paymentReference?: string;
}

@Injectable()
export class InitiateDepositUseCase {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly transactionRepository: TransactionRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly riskEvaluationService: RiskEvaluationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: InitiateDepositInput): Promise<InitiateDepositOutput> {
    // Validate wallet exists
    const wallet = await this.walletRepository.findByUserId(input.userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (!wallet.isActive) {
      throw new BadRequestException('Wallet is not active');
    }

    // Note: Yellow Card is DEACTIVATED. Deposits flow through mobile money providers
    // (MTN, Orange, Wave, Moov) which don't require a provider-specific wallet ID.
    // The deposit module handles provider routing via PaymentProviderFactory.

    // Validate amount
    if (input.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    if (!Number.isFinite(input.amount)) {
      throw new BadRequestException('Invalid amount');
    }

    // Maximum deposit amount (in source currency, e.g. XOF)
    const MAX_DEPOSIT_AMOUNT = 10_000_000; // 10M XOF ≈ ~$16,600
    if (input.amount > MAX_DEPOSIT_AMOUNT) {
      throw new BadRequestException(
        `Maximum deposit amount is ${MAX_DEPOSIT_AMOUNT.toLocaleString()} ${input.sourceCurrency}`,
      );
    }

    // Risk evaluation via Risk Manager
    const riskResult = await this.riskEvaluationService.evaluate({
      transactionId: uuidv4(),
      amount: input.amount,
      currency: input.sourceCurrency,
      type: 'DEPOSIT',
      senderId: input.userId,
      senderCountry: 'CI',
    });
    if (riskResult?.decision === 'DECLINE') {
      throw new BadRequestException(
        'This deposit has been flagged by our risk system. Please contact support.',
      );
    }
    if (riskResult?.decision === 'STEP_UP') {
      throw new BadRequestException(
        'Additional verification required for this deposit.',
      );
    }

    // Initiate deposit with payment gateway
    const depositResponse = await this.paymentGateway.initiateDeposit({
      subwalletId: wallet.yellowCardWalletId,
      amount: input.amount,
      sourceCurrency: input.sourceCurrency,
      targetCurrency: 'USDC',
      channelId: input.channelId,
    });
    const estimatedAmount = this.calculateNetTargetAmount(
      depositResponse.amount,
      depositResponse.rate,
      depositResponse.fee,
    );

    // Create transaction record
    const transaction = TransactionEntity.createDeposit({
      walletId: wallet.id,
      amount: estimatedAmount,
      currency: 'USDC',
      yellowCardRef: depositResponse.externalId,
      metadata: {
        sourceCurrency: input.sourceCurrency,
        sourceAmount: input.amount,
        rate: depositResponse.rate,
        fee: depositResponse.fee,
        feeCurrency: input.sourceCurrency,
        channelId: input.channelId,
        depositId: depositResponse.id,
        providerReference: depositResponse.externalId,
        paymentReference: depositResponse.paymentInstructions?.reference,
      },
    });

    await this.transactionRepository.save(transaction);

    this.eventEmitter.emit('wallet.deposit.initiated', {
      userId: input.userId,
      walletId: wallet.id,
      transactionId: transaction.id,
      amount: input.amount,
      sourceCurrency: input.sourceCurrency,
      timestamp: new Date(),
    });

    return {
      transactionId: transaction.id,
      depositId: depositResponse.id,
      amount: input.amount,
      amountDecimal: formatDecimalAmount(input.amount, input.sourceCurrency),
      sourceCurrency: input.sourceCurrency,
      targetCurrency: 'USDC',
      rate: depositResponse.rate,
      rateDecimal: formatRateDecimal(depositResponse.rate),
      fee: depositResponse.fee,
      feeDecimal: formatDecimalAmount(
        depositResponse.fee,
        input.sourceCurrency,
      ),
      estimatedAmount,
      estimatedAmountDecimal: formatDecimalAmount(estimatedAmount, 'USDC'),
      paymentInstructions: depositResponse.paymentInstructions,
      expiresAt: depositResponse.expiresAt,
      supportReference: transaction.id,
      providerReference: depositResponse.externalId,
      paymentReference: depositResponse.paymentInstructions?.reference,
    };
  }

  private calculateNetTargetAmount(
    sourceAmount: number,
    rate: number,
    sourceCurrencyFee: number,
  ): number {
    const netSourceAmount = Math.max(0, sourceAmount - sourceCurrencyFee);
    return Math.round(netSourceAmount * rate * 100) / 100;
  }
}
