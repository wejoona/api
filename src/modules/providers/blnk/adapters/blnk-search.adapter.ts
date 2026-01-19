import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlnkInit } from '@blnkfinance/blnk-typescript';
import type { Blnk } from '@blnkfinance/blnk-typescript/dist/src/blnk/endpoints/baseBlnkClient';
import type { SearchResponse as BlnkSearchResponse } from '@blnkfinance/blnk-typescript/dist/src/types/search';
import type { ApiResponse } from '@blnkfinance/blnk-typescript/dist/src/types/general';

import {
  ISearchProvider,
  SearchQueryParams,
  SearchResult,
  LedgerTransactionResult,
  UserBalanceInfo,
} from '@modules/providers/interfaces/ledger.interface';
import { BlnkTransaction, BlnkBalance } from '../blnk.types';

/**
 * Blnk Search Adapter
 *
 * Provides search capabilities for:
 * - Transaction history queries
 * - Balance lookups
 * - Customer support searches
 * - Reporting and analytics
 */
@Injectable()
export class BlnkSearchAdapter implements ISearchProvider {
  private readonly logger = new Logger(BlnkSearchAdapter.name);
  private readonly client: Blnk;

  constructor(private readonly configService: ConfigService) {
    const blnkUrl = this.configService.get<string>(
      'blnk.url',
      'http://localhost:5001',
    );
    const blnkApiKey = this.configService.get<string>('blnk.apiKey', '');
    this.client = BlnkInit(blnkApiKey, { baseUrl: blnkUrl });
  }

  async searchTransactions(
    params: SearchQueryParams,
  ): Promise<SearchResult<LedgerTransactionResult>> {
    this.logger.debug(`Searching transactions: ${params.query}`);

    const response = (await this.client.Search.search(
      {
        q: params.query,
        filter_by: params.filterBy,
        sort_by: params.sortBy,
        page: params.page ?? 1,
        per_page: params.perPage ?? 20,
      },
      'transactions',
    )) as unknown as ApiResponse<BlnkSearchResponse>;

    if (!response.data) {
      return {
        found: 0,
        hits: [],
        page: params.page ?? 1,
        totalPages: 0,
      };
    }

    const transactions = response.data.hits.map((hit) =>
      this.mapToTransactionResult(hit.document as unknown as BlnkTransaction),
    );

    const perPage = params.perPage ?? 20;
    return {
      found: response.data.found,
      hits: transactions,
      page: response.data.page,
      totalPages: Math.ceil(response.data.found / perPage),
    };
  }

  async searchBalances(
    params: SearchQueryParams,
  ): Promise<SearchResult<UserBalanceInfo>> {
    this.logger.debug(`Searching balances: ${params.query}`);

    const response = (await this.client.Search.search(
      {
        q: params.query,
        filter_by: params.filterBy,
        sort_by: params.sortBy,
        page: params.page ?? 1,
        per_page: params.perPage ?? 20,
      },
      'balances',
    )) as unknown as ApiResponse<BlnkSearchResponse>;

    if (!response.data) {
      return {
        found: 0,
        hits: [],
        page: params.page ?? 1,
        totalPages: 0,
      };
    }

    const balances = response.data.hits.map((hit) =>
      this.mapToBalanceInfo(hit.document as unknown as BlnkBalance),
    );

    const perPage = params.perPage ?? 20;
    return {
      found: response.data.found,
      hits: balances,
      page: response.data.page,
      totalPages: Math.ceil(response.data.found / perPage),
    };
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  private mapToTransactionResult(tx: BlnkTransaction): LedgerTransactionResult {
    return {
      transactionId: tx.transaction_id,
      reference: tx.reference,
      status: tx.status.toLowerCase() as LedgerTransactionResult['status'],
      source: tx.source,
      destination: tx.destination,
      amount: BigInt(tx.precise_amount),
      currency: tx.currency,
      description: tx.description,
      createdAt: new Date(tx.created_at),
      metadata: tx.meta_data,
    };
  }

  private mapToBalanceInfo(balance: BlnkBalance): UserBalanceInfo {
    // Extract userId from balance metadata or identity
    const userId =
      (balance.meta_data?.userId as string) ?? balance.identity_id ?? 'unknown';

    return {
      balanceId: balance.balance_id,
      userId,
      currency: balance.currency,
      balance: BigInt(balance.balance),
      creditBalance: BigInt(balance.credit_balance),
      debitBalance: BigInt(balance.debit_balance),
      inflightBalance: BigInt(balance.inflight_balance),
      availableBalance: BigInt(
        balance.balance - balance.inflight_debit_balance,
      ),
    };
  }
}
