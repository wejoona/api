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
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
  fee: number;
  estimatedAmount: number;
  paymentInstructions: PaymentInstructions;
  expiresAt: Date;
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
      targetCurrency: 'USD',
      channelId: input.channelId,
    });

    // Create transaction record
    const transaction = TransactionEntity.createDeposit({
      walletId: wallet.id,
      amount:
        depositResponse.amount * depositResponse.rate - depositResponse.fee,
      currency: 'USD',
      yellowCardRef: depositResponse.externalId,
      metadata: {
        sourceCurrency: input.sourceCurrency,
        sourceAmount: input.amount,
        rate: depositResponse.rate,
        fee: depositResponse.fee,
        channelId: input.channelId,
        depositId: depositResponse.id,
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
      sourceCurrency: input.sourceCurrency,
      targetCurrency: 'USD',
      rate: depositResponse.rate,
      fee: depositResponse.fee,
      estimatedAmount:
        input.amount * depositResponse.rate - depositResponse.fee,
      paymentInstructions: depositResponse.paymentInstructions,
      expiresAt: depositResponse.expiresAt,
    };
  }
}
