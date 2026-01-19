import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TransactionRepository } from '../../infrastructure/repositories/transaction.repository';
import { TransactionEntity } from '../../domain/entities/transaction.entity';
import { WalletRepository } from '../../../wallet/infrastructure/repositories/wallet.repository';

export interface GetTransactionInput {
  userId: string;
  transactionId: string;
}

@Injectable()
export class GetTransactionUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(input: GetTransactionInput): Promise<TransactionEntity> {
    const transaction = await this.transactionRepository.findById(
      input.transactionId,
    );
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Verify ownership
    const wallet = await this.walletRepository.findByUserId(input.userId);
    if (!wallet || wallet.id !== transaction.walletId) {
      throw new ForbiddenException('Not authorized to view this transaction');
    }

    return transaction;
  }
}
