import { Injectable } from '@nestjs/common';
import { TransactionRepository } from '../../infrastructure/repositories/transaction.repository';
import { TransactionEntity } from '../../domain/entities/transaction.entity';
import { WalletRepository } from '../../../wallet/infrastructure/repositories/wallet.repository';
import { TransactionFilters } from '../dto/requests';

export interface GetTransactionsInput {
  userId: string;
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  sortBy?: 'createdAt' | 'amount';
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export interface GetTransactionsOutput {
  transactions: TransactionEntity[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

@Injectable()
export class GetTransactionsUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(input: GetTransactionsInput): Promise<GetTransactionsOutput> {
    const wallet = await this.walletRepository.findByUserId(input.userId);

    // If no wallet exists, return empty transactions list
    if (!wallet) {
      const limit = input.limit || 20;
      const offset = input.offset || 0;
      return {
        transactions: [],
        total: 0,
        limit,
        offset,
        hasMore: false,
      };
    }

    // Build filters
    const limit = input.limit || 20;
    const offset = input.offset || 0;

    const filters: TransactionFilters = {
      type: input.type,
      status: input.status,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      minAmount: input.minAmount,
      maxAmount: input.maxAmount,
      search: input.search,
      sortBy: input.sortBy || 'createdAt',
      sortOrder: input.sortOrder || 'DESC',
      limit,
      offset,
    };

    // Use the new filtered query method
    const result = await this.transactionRepository.findByWalletIdFiltered(
      wallet.id,
      filters,
    );

    return {
      transactions: result.transactions,
      total: result.total,
      limit,
      offset,
      hasMore: offset + result.transactions.length < result.total,
    };
  }
}
