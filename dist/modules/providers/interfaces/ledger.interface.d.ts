export declare const LEDGER_PROVIDER: unique symbol;
export interface ILedgerProvider {
    initialize(): Promise<void>;
    createUserBalance(userId: string, currency: string): Promise<string>;
    getUserBalance(userId: string, currency: string): Promise<UserBalanceInfo | null>;
    getAvailableBalance(userId: string, currency: string): Promise<bigint>;
    recordDeposit(params: RecordDepositParams): Promise<LedgerTransactionResult>;
    recordWithdrawal(params: RecordWithdrawalParams): Promise<LedgerTransactionResult>;
    recordP2PTransfer(params: RecordP2PTransferParams): Promise<LedgerTransactionResult>;
    recordExternalTransfer(params: RecordExternalTransferParams): Promise<LedgerTransactionResult>;
    commitTransaction(transactionId: string): Promise<void>;
    voidTransaction(transactionId: string): Promise<void>;
    getTransactionByReference(reference: string): Promise<LedgerTransactionResult | null>;
    getUserTransactionHistory(userId: string, options?: TransactionHistoryOptions): Promise<LedgerTransactionResult[]>;
}
export interface UserBalanceInfo {
    balanceId: string;
    userId: string;
    currency: string;
    balance: bigint;
    creditBalance: bigint;
    debitBalance: bigint;
    inflightBalance: bigint;
    availableBalance: bigint;
}
export interface RecordDepositParams {
    userId: string;
    amount: bigint;
    currency: string;
    reference: string;
    description?: string;
    provider: 'yellowcard' | 'circle';
    externalId?: string;
    fee?: bigint;
    metadata?: Record<string, unknown>;
}
export interface RecordWithdrawalParams {
    userId: string;
    amount: bigint;
    currency: string;
    reference: string;
    description?: string;
    provider: 'yellowcard' | 'circle';
    fee: bigint;
    inflight?: boolean;
    metadata?: Record<string, unknown>;
}
export interface RecordP2PTransferParams {
    senderId: string;
    recipientId: string;
    amount: bigint;
    currency: string;
    reference: string;
    description?: string;
    note?: string;
    metadata?: Record<string, unknown>;
}
export interface RecordExternalTransferParams {
    userId: string;
    amount: bigint;
    currency: string;
    reference: string;
    destinationAddress: string;
    blockchain: string;
    fee: bigint;
    inflight?: boolean;
    description?: string;
    metadata?: Record<string, unknown>;
}
export interface TransactionHistoryOptions {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
    type?: 'deposit' | 'withdrawal' | 'transfer_p2p' | 'transfer_external';
}
export interface LedgerTransactionResult {
    transactionId: string;
    reference: string;
    status: 'queued' | 'applied' | 'rejected' | 'inflight' | 'void' | 'committed';
    source: string;
    destination: string;
    amount: bigint;
    currency: string;
    description?: string;
    createdAt: Date;
    metadata?: Record<string, unknown>;
}
export declare const BALANCE_MONITOR_PROVIDER: unique symbol;
export interface IBalanceMonitorProvider {
    createMonitor(params: CreateMonitorParams): Promise<BalanceMonitorInfo>;
    getMonitor(monitorId: string): Promise<BalanceMonitorInfo | null>;
    listMonitors(): Promise<BalanceMonitorInfo[]>;
    updateMonitor(monitorId: string, params: Partial<CreateMonitorParams>): Promise<BalanceMonitorInfo>;
    deleteMonitor(monitorId: string): Promise<void>;
}
export interface CreateMonitorParams {
    balanceId: string;
    field: 'balance' | 'credit_balance' | 'debit_balance';
    operator: '>' | '<' | '=' | '!=' | '>=' | '<=';
    value: bigint;
    description?: string;
}
export interface BalanceMonitorInfo {
    monitorId: string;
    balanceId: string;
    field: string;
    operator: string;
    value: bigint;
    description?: string;
    createdAt: Date;
}
export declare const SEARCH_PROVIDER: unique symbol;
export interface ISearchProvider {
    searchTransactions(params: SearchQueryParams): Promise<SearchResult<LedgerTransactionResult>>;
    searchBalances(params: SearchQueryParams): Promise<SearchResult<UserBalanceInfo>>;
}
export interface SearchQueryParams {
    query: string;
    filterBy?: string;
    sortBy?: string;
    page?: number;
    perPage?: number;
}
export interface SearchResult<T> {
    found: number;
    hits: T[];
    page: number;
    totalPages: number;
}
export declare const RECONCILIATION_PROVIDER: unique symbol;
export interface IReconciliationProvider {
    uploadExternalData(filePath: string, source: string): Promise<string>;
    createMatchingRule(params: CreateMatchingRuleParams): Promise<string>;
    runReconciliation(params: RunReconciliationParams): Promise<ReconciliationResultInfo>;
}
export interface CreateMatchingRuleParams {
    name: string;
    description?: string;
    criteria: {
        field: string;
        operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
        allowableDrift?: number;
    }[];
}
export interface RunReconciliationParams {
    uploadId: string;
    strategy: 'one_to_one' | 'one_to_many' | 'many_to_one';
    dryRun?: boolean;
    groupingCriteria?: string;
    matchingRuleIds: string[];
}
export interface ReconciliationResultInfo {
    reconciliationId: string;
    status: string;
    matchedCount: number;
    unmatchedCount: number;
    createdAt: Date;
}
export declare const LEDGER_IDENTITY_PROVIDER: unique symbol;
export interface ILedgerIdentityProvider {
    createLedgerIdentity(params: CreateLedgerIdentityParams): Promise<LedgerIdentityInfo>;
    getLedgerIdentity(identityId: string): Promise<LedgerIdentityInfo | null>;
    updateLedgerIdentity(identityId: string, params: Partial<CreateLedgerIdentityParams>): Promise<LedgerIdentityInfo>;
    listLedgerIdentities(): Promise<LedgerIdentityInfo[]>;
}
export interface CreateLedgerIdentityParams {
    type: 'individual' | 'organization';
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    country?: string;
    metadata?: Record<string, unknown>;
}
export interface LedgerIdentityInfo {
    identityId: string;
    type: 'individual' | 'organization';
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    country?: string;
    createdAt: Date;
    metadata?: Record<string, unknown>;
}
