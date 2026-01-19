import { Injectable, NotFoundException } from '@nestjs/common';
import { TransactionRepository } from '../../infrastructure/repositories/transaction.repository';
import { TransactionEntity } from '../../domain/entities/transaction.entity';
import { WalletRepository } from '../../../wallet/infrastructure/repositories/wallet.repository';

export interface GetTransactionsInput {
  userId: string;
  type?: 'deposit' | 'transfer_internal' | 'transfer_external';
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  limit?: number;
  offset?: number;
}

export interface GetTransactionsOutput {
  transactions: TransactionEntity[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class GetTransactionsUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(input: GetTransactionsInput): Promise<GetTransactionsOutput> {
    const wallet = await this.walletRepository.findByUserId(input.userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const transactions = await this.transactionRepository.findByWalletId(
      wallet.id,
    );

    // Apply filters
    let filtered = transactions;
    if (input.type) {
      filtered = filtered.filter((t) => t.type === input.type);
    }
    if (input.status) {
      filtered = filtered.filter((t) => t.status === input.status);
    }

    // Apply pagination
    const limit = input.limit || 20;
    const offset = input.offset || 0;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      transactions: paginated,
      total: filtered.length,
      limit,
      offset,
    };
  }
}
