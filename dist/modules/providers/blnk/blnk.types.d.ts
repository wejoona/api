export interface BlnkLedger {
    ledger_id: string;
    name: string;
    created_at: string;
    meta_data?: Record<string, unknown>;
}
export interface CreateLedgerRequest {
    name: string;
    meta_data?: Record<string, unknown>;
}
export interface BlnkBalance {
    balance_id: string;
    balance: number;
    credit_balance: number;
    debit_balance: number;
    inflight_balance: number;
    inflight_credit_balance: number;
    inflight_debit_balance: number;
    currency: string;
    ledger_id: string;
    identity_id?: string;
    indicator?: string;
    precision: number;
    created_at: string;
    meta_data?: Record<string, unknown>;
}
export interface CreateBalanceRequest {
    ledger_id: string;
    currency: string;
    identity_id?: string;
    meta_data?: Record<string, unknown>;
}
export type BlnkTransactionStatus = 'QUEUED' | 'APPLIED' | 'REJECTED' | 'INFLIGHT' | 'VOID' | 'COMMIT';
export interface BlnkTransaction {
    transaction_id: string;
    source: string;
    destination: string;
    reference: string;
    amount: number;
    precise_amount: number;
    precision: number;
    currency: string;
    description?: string;
    status: BlnkTransactionStatus;
    created_at: string;
    meta_data?: Record<string, unknown>;
    parent_transaction?: string;
}
export interface RecordTransactionRequest {
    amount: number;
    reference: string;
    currency: string;
    precision: number;
    source: string;
    destination: string;
    description?: string;
    meta_data?: Record<string, unknown>;
    inflight?: boolean;
    skip_queue?: boolean;
    allow_overdraft?: boolean;
}
export type RecordTransactionResponse = BlnkTransaction;
export declare const JOONAPAY_LEDGERS: {
    readonly GENERAL: "joonapay-general-ledger";
    readonly CUSTOMER_WALLETS: "joonapay-customer-wallets";
};
export declare const JOONAPAY_INTERNAL_BALANCES: {
    readonly PAY_IN_YELLOWCARD: "@PayInYellowCard";
    readonly PAY_IN_CIRCLE: "@PayInCircle";
    readonly PAY_OUT_YELLOWCARD: "@PayOutYellowCard";
    readonly PAY_OUT_CIRCLE: "@PayOutCircle";
    readonly FEES: "@Fees";
    readonly REVENUE: "@Revenue";
    readonly FLOAT: "@Float";
};
export interface UserBalance {
    userId: string;
    balanceId: string;
    currency: string;
    availableBalance: bigint;
    totalCredits: bigint;
    totalDebits: bigint;
    inflightBalance: bigint;
}
export interface TransactionRecord {
    id: string;
    type: 'deposit' | 'withdrawal' | 'transfer_p2p' | 'transfer_external';
    status: BlnkTransactionStatus;
    sourceBalanceId: string;
    destinationBalanceId: string;
    amount: bigint;
    fee: bigint;
    currency: string;
    reference: string;
    description?: string;
    createdAt: Date;
    metadata?: Record<string, unknown>;
}
export type BalanceMonitorField = 'balance' | 'credit_balance' | 'debit_balance';
export type BalanceMonitorOperator = '>' | '<' | '=' | '!=' | '>=' | '<=';
export interface BalanceMonitorCondition {
    field: BalanceMonitorField;
    operator: BalanceMonitorOperator;
    value: number;
    precision: number;
}
export interface CreateBalanceMonitorRequest {
    balance_id: string;
    condition: BalanceMonitorCondition;
    description?: string;
    call_back_url?: string;
}
export interface BlnkBalanceMonitor {
    monitor_id: string;
    balance_id: string;
    condition: BalanceMonitorCondition;
    description?: string;
    created_at: string;
}
export interface SearchParams {
    q: string;
    query_by?: string;
    filter_by?: string;
    facet_by?: string;
    sort_by?: string;
    page?: number;
    per_page?: number;
}
export interface SearchHit<T> {
    document: T;
    highlights?: unknown[];
}
export interface SearchResponse<T = unknown> {
    found: number;
    hits: SearchHit<T>[];
    out_of: number;
    page: number;
    search_time_ms: number;
    facet_counts?: unknown[];
}
export type SearchCollection = 'ledgers' | 'transactions' | 'balances';
export type ReconciliationStrategy = 'one_to_one' | 'one_to_many' | 'many_to_one';
export type MatchingOperator = 'equals' | 'contains' | 'greater_than' | 'less_than';
export interface MatchingCriteria {
    field: string;
    operator: MatchingOperator;
    allowable_drift?: number;
}
export interface CreateMatchingRuleRequest {
    name: string;
    description?: string;
    criteria: MatchingCriteria[];
}
export interface MatchingRule {
    rule_id: string;
    name: string;
    description?: string;
    criteria: MatchingCriteria[];
    created_at: string;
}
export interface RunReconciliationRequest {
    upload_id: string;
    strategy: ReconciliationStrategy;
    dry_run?: boolean;
    grouping_criteria?: string;
    matching_rule_ids: string[];
}
export interface ReconciliationResult {
    reconciliation_id: string;
    status: string;
    matched_count: number;
    unmatched_count: number;
    created_at: string;
}
export type IdentityType = 'individual' | 'organization';
export interface CreateIdentityRequest {
    identity_type: IdentityType;
    first_name?: string;
    last_name?: string;
    email_address?: string;
    phone_number?: string;
    nationality?: string;
    category?: string;
    street?: string;
    country?: string;
    state?: string;
    post_code?: string;
    city?: string;
    meta_data?: Record<string, unknown>;
}
export interface BlnkIdentity {
    identity_id: string;
    identity_type: IdentityType;
    first_name?: string;
    last_name?: string;
    email_address?: string;
    phone_number?: string;
    nationality?: string;
    category?: string;
    street?: string;
    country?: string;
    state?: string;
    post_code?: string;
    city?: string;
    created_at: string;
    meta_data?: Record<string, unknown>;
}
export declare const JOONAPAY_MONITORS: {
    readonly HIGH_DEBIT_ALERT: {
        readonly field: BalanceMonitorField;
        readonly operator: BalanceMonitorOperator;
        readonly value: 10000000000;
        readonly precision: 1000000;
        readonly description: "High debit volume alert - possible fraud";
    };
    readonly LOW_BALANCE_WARNING: {
        readonly field: BalanceMonitorField;
        readonly operator: BalanceMonitorOperator;
        readonly value: 10000000;
        readonly precision: 1000000;
        readonly description: "Low balance warning";
    };
    readonly LOW_FLOAT_ALERT: {
        readonly field: BalanceMonitorField;
        readonly operator: BalanceMonitorOperator;
        readonly value: 50000000000;
        readonly precision: 1000000;
        readonly description: "Low float alert - replenishment needed";
    };
    readonly AML_DAILY_LIMIT: {
        readonly field: BalanceMonitorField;
        readonly operator: BalanceMonitorOperator;
        readonly value: 3000000000;
        readonly precision: 1000000;
        readonly description: "AML daily transaction limit reached";
    };
};
