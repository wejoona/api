import { ConfigService } from '@nestjs/config';
import { ISearchProvider, SearchQueryParams, SearchResult, LedgerTransactionResult, UserBalanceInfo } from '@modules/providers/interfaces/ledger.interface';
export declare class BlnkSearchAdapter implements ISearchProvider {
    private readonly configService;
    private readonly logger;
    private readonly client;
    constructor(configService: ConfigService);
    searchTransactions(params: SearchQueryParams): Promise<SearchResult<LedgerTransactionResult>>;
    searchBalances(params: SearchQueryParams): Promise<SearchResult<UserBalanceInfo>>;
    private mapToTransactionResult;
    private mapToBalanceInfo;
}
