import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import { TransactionRepository } from '../../../transaction/infrastructure/repositories/transaction.repository';
import { TransactionEntity } from '../../../transaction/domain/entities/transaction.entity';
import { UserRepository } from '../../../user/infrastructure/repositories/user.repository';
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
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly userRepository: UserRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  async execute(input: InternalTransferInput): Promise<InternalTransferOutput> {
    const currency = input.currency || 'USD';

    // Get sender's wallet
    const fromWallet = await this.walletRepository.findByUserId(
      input.fromUserId,
    );
    if (!fromWallet) {
      throw new NotFoundException('Sender wallet not found');
    }

    if (!fromWallet.isActive) {
      throw new BadRequestException('Sender wallet is not active');
    }

    // Find recipient by phone
    const recipient = await this.userRepository.findByPhone(input.toPhone);
    if (!recipient) {
      throw new NotFoundException(
        'Recipient not found. They must register first.',
      );
    }

    // Get recipient's wallet
    const toWallet = await this.walletRepository.findByUserId(recipient.id);
    if (!toWallet) {
      throw new NotFoundException('Recipient wallet not found');
    }

    if (!toWallet.isActive) {
      throw new BadRequestException('Recipient wallet is not active');
    }

    // Cannot transfer to yourself
    if (fromWallet.id === toWallet.id) {
      throw new BadRequestException('Cannot transfer to yourself');
    }

    // Validate amount
    if (input.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // Execute transfer via payment gateway
    const transferResponse = await this.paymentGateway.internalTransfer({
      fromSubwalletId: fromWallet.yellowCardWalletId,
      toSubwalletId: toWallet.yellowCardWalletId,
      amount: input.amount,
      currency,
    });

    // Create transaction record for sender (debit)
    const senderTransaction = TransactionEntity.createInternalTransfer({
      walletId: fromWallet.id,
      amount: -input.amount, // Negative for debit
      recipientWalletId: toWallet.id,
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
      walletId: toWallet.id,
      amount: input.amount, // Positive for credit
      recipientWalletId: fromWallet.id,
      recipientPhone: input.toPhone,
      currency,
      metadata: {
        transferId: transferResponse.id,
        direction: 'inbound',
        senderWalletId: fromWallet.id,
      },
    });

    // Mark as completed (internal transfers are instant)
    senderTransaction.complete();
    recipientTransaction.complete();

    await Promise.all([
      this.transactionRepository.save(senderTransaction),
      this.transactionRepository.save(recipientTransaction),
    ]);

    return {
      transactionId: senderTransaction.id,
      fromWalletId: fromWallet.id,
      toWalletId: toWallet.id,
      toPhone: input.toPhone,
      amount: input.amount,
      currency,
      fee: transferResponse.fee,
      status: 'completed',
    };
  }
}
