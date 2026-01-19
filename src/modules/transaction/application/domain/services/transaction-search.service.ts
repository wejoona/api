import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  SEARCH_PROVIDER,
  ISearchProvider,
  LedgerTransactionResult,
  SearchResult,
} from '@modules/providers/interfaces';

export interface SearchTransactionsInput {
  userId?: string;
  query?: string;
  type?: 'deposit' | 'withdrawal' | 'transfer_p2p' | 'transfer_external';
  status?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: bigint;
  maxAmount?: bigint;
  page?: number;
  perPage?: number;
}

/**
 * Transaction Search Service
 *
 * Provides advanced search capabilities for transactions:
 * - Full-text search across references, descriptions
 * - Filter by type, status, date range, amount
 * - Pagination support
 * - Used for transaction history, customer support, reporting
 */
@Injectable()
export class TransactionSearchService {
  private readonly logger = new Logger(TransactionSearchService.name);

  constructor(
    @Inject(SEARCH_PROVIDER)
    private readonly searchProvider: ISearchProvider,
  ) {}

  /**
   * Search transactions with various filters
   */
  async searchTransactions(
    input: SearchTransactionsInput,
  ): Promise<SearchResult<LedgerTransactionResult>> {
    this.logger.debug(`Searching transactions: ${JSON.stringify(input)}`);

    // Build query string
    const query = input.query || '*';

    // Build filter string for Blnk Search API
    const filters: string[] = [];

    if (input.userId) {
      // Search in metadata for userId or in source/destination
      filters.push(`meta_data.userId:=${input.userId}`);
    }

    if (input.type) {
      filters.push(`meta_data.type:=${input.type}`);
    }

    if (input.status) {
      filters.push(`status:=${input.status.toUpperCase()}`);
    }

    if (input.startDate) {
      filters.push(`created_at:>=${input.startDate.toISOString()}`);
    }

    if (input.endDate) {
      filters.push(`created_at:<=${input.endDate.toISOString()}`);
    }

    if (input.minAmount) {
      filters.push(`precise_amount:>=${input.minAmount.toString()}`);
    }

    if (input.maxAmount) {
      filters.push(`precise_amount:<=${input.maxAmount.toString()}`);
    }

    const filterBy = filters.length > 0 ? filters.join(' && ') : undefined;

    const result = await this.searchProvider.searchTransactions({
      query,
      filterBy,
      sortBy: 'created_at:desc',
      page: input.page ?? 1,
      perPage: input.perPage ?? 20,
    });

    this.logger.debug(`Found ${result.found} transactions`);

    return result;
  }

  /**
   * Get user's transaction history
   */
  async getUserTransactionHistory(
    userId: string,
    options?: {
      page?: number;
      perPage?: number;
      type?: SearchTransactionsInput['type'];
    },
  ): Promise<SearchResult<LedgerTransactionResult>> {
    return this.searchTransactions({
      userId,
      type: options?.type,
      page: options?.page,
      perPage: options?.perPage,
    });
  }

  /**
   * Search transactions by reference
   */
  async findByReference(
    reference: string,
  ): Promise<LedgerTransactionResult | null> {
    const result = await this.searchProvider.searchTransactions({
      query: reference,
      filterBy: `reference:=${reference}`,
      perPage: 1,
    });

    return result.hits[0] || null;
  }

  /**
   * Get recent transactions for a user
   */
  async getRecentTransactions(
    userId: string,
    limit: number = 10,
  ): Promise<LedgerTransactionResult[]> {
    const result = await this.searchTransactions({
      userId,
      perPage: limit,
    });

    return result.hits;
  }

  /**
   * Search for potential duplicates
   * Useful for fraud detection and preventing double-processing
   */
  async findPotentialDuplicates(
    amount: bigint,
    source: string,
    destination: string,
    timeWindowMinutes: number = 5,
  ): Promise<LedgerTransactionResult[]> {
    const startTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

    const result = await this.searchProvider.searchTransactions({
      query: '*',
      filterBy: [
        `precise_amount:=${amount.toString()}`,
        `source:=${source}`,
        `destination:=${destination}`,
        `created_at:>=${startTime.toISOString()}`,
      ].join(' && '),
      perPage: 10,
    });

    return result.hits;
  }

  /**
   * Get transaction statistics for a user
   */
  async getUserStats(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalTransactions: number;
    deposits: number;
    withdrawals: number;
    transfers: number;
  }> {
    const baseInput: SearchTransactionsInput = {
      userId,
      startDate,
      endDate,
      perPage: 1, // We only need counts
    };

    const [total, deposits, withdrawals, transfers] = await Promise.all([
      this.searchTransactions(baseInput),
      this.searchTransactions({ ...baseInput, type: 'deposit' }),
      this.searchTransactions({ ...baseInput, type: 'withdrawal' }),
      this.searchTransactions({ ...baseInput, type: 'transfer_p2p' }),
    ]);

    return {
      totalTransactions: total.found,
      deposits: deposits.found,
      withdrawals: withdrawals.found,
      transfers: transfers.found,
    };
  }
}
