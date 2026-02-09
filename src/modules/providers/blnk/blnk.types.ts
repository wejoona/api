/**
 * Blnk Finance Types
 *
 * Type definitions for Blnk Finance ledger integration.
 * Blnk is an open-source financial ledger database that provides
 * double-entry accounting for fintech products.
 *
 * @see https://docs.blnkfinance.com/
 */

// ==========================================
// Ledger Types
// ==========================================

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

// ==========================================
// Balance Types
// ==========================================

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

// ==========================================
// Transaction Types
// ==========================================

export type BlnkTransactionStatus =
  | 'QUEUED'
  | 'APPLIED'
  | 'REJECTED'
  | 'INFLIGHT'
  | 'VOID'
  | 'COMMIT';

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

// ==========================================
// JoonaPay Ledger Architecture
// ==========================================

/**
 * JoonaPay Money Movement Map with Blnk
 *
 * Ledgers:
 * - General Ledger: System accounts (@PayIn, @PayOut, @Fees, @Revenue)
 * - Customer Wallets: User USDC balances (user-{userId}-usdc)
 *
 * Internal Balances (General Ledger):
 * - @PayInYellowCard: Represents money coming from Yellow Card (deposits XOF->USDC)
 * - @PayInCircle: Represents money coming from Circle (external USDC deposits)
 * - @PayOutYellowCard: Represents money going to Yellow Card (withdrawals USDC->XOF)
 * - @PayOutCircle: Represents money going to Circle (external USDC transfers)
 * - @Fees: Tracks processing fees collected
 * - @Revenue: JoonaPay's revenue from fees
 * - @Float: JoonaPay's float/operating account
 *
 * Flows:
 * 1. Deposit (XOF->USDC via Yellow Card):
 *    - Source: @PayInYellowCard
 *    - Destination: user-{userId}-usdc
 *
 * 2. Withdrawal (USDC->XOF via Yellow Card):
 *    - Source: user-{userId}-usdc
 *    - Destination: @PayOutYellowCard
 *    - Fee: user-{userId}-usdc -> @Fees -> @Revenue (split)
 *
 * 3. P2P Transfer (within JoonaPay):
 *    - Source: user-{senderId}-usdc
 *    - Destination: user-{recipientId}-usdc
 *    - Fee: None (free P2P transfers)
 *
 * 4. External Transfer (to blockchain address):
 *    - Source: user-{userId}-usdc
 *    - Destination: @PayOutCircle
 *    - Fee: user-{userId}-usdc -> @Fees
 */

export const JOONAPAY_LEDGERS = {
  GENERAL: 'joonapay-general-ledger',
  CUSTOMER_WALLETS: 'joonapay-customer-wallets',
} as const;

/**
 * Get internal balance IDs from environment config, falling back to Blnk's
 * `@`-prefix convention (which creates balances on-the-fly).
 */
export const getInternalBalances = () => ({
  // Pay-in sources (money coming into the system)
  PAY_IN_YELLOWCARD:
    process.env.BLNK_CIRCLE_OMNIBUS_BALANCE_ID || '@PayInYellowCard',
  PAY_IN_CIRCLE:
    process.env.BLNK_CIRCLE_OMNIBUS_BALANCE_ID || '@PayInCircle',

  // Pay-out destinations (money leaving the system)
  PAY_OUT_YELLOWCARD:
    process.env.BLNK_STELLAR_OMNIBUS_BALANCE_ID || '@PayOutYellowCard',
  PAY_OUT_CIRCLE:
    process.env.BLNK_CIRCLE_OMNIBUS_BALANCE_ID || '@PayOutCircle',

  // Fee and revenue tracking
  FEES: process.env.BLNK_PLATFORM_FEES_BALANCE_ID || '@Fees',
  REVENUE: '@Revenue',

  // Operating account
  FLOAT: process.env.BLNK_FLOAT_BALANCE_ID || '@Float',
});

/** @deprecated Use getInternalBalances() for env-driven IDs */
export const JOONAPAY_INTERNAL_BALANCES = {
  // Pay-in sources (money coming into the system)
  PAY_IN_YELLOWCARD: '@PayInYellowCard',
  PAY_IN_CIRCLE: '@PayInCircle',

  // Pay-out destinations (money leaving the system)
  PAY_OUT_YELLOWCARD: '@PayOutYellowCard',
  PAY_OUT_CIRCLE: '@PayOutCircle',

  // Fee and revenue tracking
  FEES: '@Fees',
  REVENUE: '@Revenue',

  // Operating account
  FLOAT: '@Float',
} as const;

// ==========================================
// Helper Types
// ==========================================

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

// ==========================================
// Balance Monitor Types
// ==========================================

export type BalanceMonitorField =
  | 'balance'
  | 'credit_balance'
  | 'debit_balance';
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

// ==========================================
// Search Types
// ==========================================

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

// ==========================================
// Reconciliation Types
// ==========================================

export type ReconciliationStrategy =
  | 'one_to_one'
  | 'one_to_many'
  | 'many_to_one';
export type MatchingOperator =
  | 'equals'
  | 'contains'
  | 'greater_than'
  | 'less_than';

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

// ==========================================
// Identity Types (for linking users to balances)
// ==========================================

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

// ==========================================
// JoonaPay Specific Monitor Configurations
// ==========================================

/**
 * Pre-configured balance monitors for JoonaPay operational needs
 */
export const JOONAPAY_MONITORS = {
  // Fraud detection - alert if debit balance exceeds threshold
  HIGH_DEBIT_ALERT: {
    field: 'debit_balance' as BalanceMonitorField,
    operator: '>' as BalanceMonitorOperator,
    value: 10000_000000, // $10,000 USDC (6 decimals)
    precision: 1000000,
    description: 'High debit volume alert - possible fraud',
  },

  // Low balance warning for user notification
  LOW_BALANCE_WARNING: {
    field: 'balance' as BalanceMonitorField,
    operator: '<' as BalanceMonitorOperator,
    value: 10_000000, // $10 USDC
    precision: 1000000,
    description: 'Low balance warning',
  },

  // Float monitoring for operations
  LOW_FLOAT_ALERT: {
    field: 'balance' as BalanceMonitorField,
    operator: '<' as BalanceMonitorOperator,
    value: 50000_000000, // $50,000 USDC
    precision: 1000000,
    description: 'Low float alert - replenishment needed',
  },

  // AML compliance - daily transaction limit
  AML_DAILY_LIMIT: {
    field: 'debit_balance' as BalanceMonitorField,
    operator: '>=' as BalanceMonitorOperator,
    value: 3000_000000, // $3,000 USDC (UEMOA daily limit)
    precision: 1000000,
    description: 'AML daily transaction limit reached',
  },
} as const;
