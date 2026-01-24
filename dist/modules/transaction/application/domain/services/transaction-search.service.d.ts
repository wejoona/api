import { ISearchProvider, LedgerTransactionResult, SearchResult } from '@modules/providers/interfaces';
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
export declare class TransactionSearchService {
    private readonly searchProvider;
    private readonly logger;
    constructor(searchProvider: ISearchProvider);
    searchTransactions(input: SearchTransactionsInput): Promise<SearchResult<LedgerTransactionResult>>;
    getUserTransactionHistory(userId: string, options?: {
        page?: number;
        perPage?: number;
        type?: SearchTransactionsInput['type'];
    }): Promise<SearchResult<LedgerTransactionResult>>;
    findByReference(reference: string): Promise<LedgerTransactionResult | null>;
    getRecentTransactions(userId: string, limit?: number): Promise<LedgerTransactionResult[]>;
    findPotentialDuplicates(amount: bigint, source: string, destination: string, timeWindowMinutes?: number): Promise<LedgerTransactionResult[]>;
    getUserStats(userId: string, startDate?: Date, endDate?: Date): Promise<{
        totalTransactions: number;
        deposits: number;
        withdrawals: number;
        transfers: number;
    }>;
}
