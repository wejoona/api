import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import { TransactionRepository } from '../../../transaction/infrastructure/repositories/transaction.repository';
import { TransactionEntity } from '../../../transaction/domain/entities/transaction.entity';
import {
  PAYMENT_GATEWAY,
  IPaymentGateway,
} from '../../../shared/domain/gateways';

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
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly transactionRepository: TransactionRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  async execute(input: ExternalTransferInput): Promise<ExternalTransferOutput> {
    const currency = input.currency || 'USD';

    // Get sender's wallet
    const wallet = await this.walletRepository.findByUserId(input.userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (!wallet.isActive) {
      throw new BadRequestException('Wallet is not active');
    }

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

    // Execute transfer via payment gateway
    const transferResponse = await this.paymentGateway.externalTransfer({
      subwalletId: wallet.yellowCardWalletId,
      toAddress: input.toAddress,
      amount: input.amount,
      currency,
      network: input.network || 'polygon', // Default to Polygon for low fees
    });

    // Create transaction record
    const transaction = TransactionEntity.createExternalTransfer({
      walletId: wallet.id,
      amount: input.amount,
      recipientAddress: input.toAddress,
      currency,
      yellowCardRef: transferResponse.externalId,
      metadata: {
        transferId: transferResponse.id,
        network: input.network || 'polygon',
        fee: transferResponse.fee,
      },
    });

    await this.transactionRepository.save(transaction);

    return {
      transactionId: transaction.id,
      walletId: wallet.id,
      toAddress: input.toAddress,
      amount: input.amount,
      currency,
      fee: transferResponse.fee,
      status: transferResponse.status,
      estimatedArrival: '5-30 minutes',
    };
  }

  private isValidAddress(address: string): boolean {
    // Basic Ethereum/EVM address validation
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return true;
    }
    // Could add more validation for other networks
    return false;
  }
}
