/**
 * Ledger Provider Interface
 *
 * Abstracts the ledger/accounting system to allow swapping providers.
 * Currently implemented by Blnk Finance.
 */

export const LEDGER_PROVIDER = Symbol('LEDGER_PROVIDER');

export interface ILedgerProvider {
  // ==========================================
  // Ledger Management
  // ==========================================

  /**
   * Initialize the ledger system (create ledgers if needed)
   */
  initialize(): Promise<void>;

  // ==========================================
  // Balance Management
  // ==========================================

  /**
   * Create a new user balance/account
   */
  createUserBalance(userId: string, currency: string): Promise<string>;

  /**
   * Get user's balance information
   */
  getUserBalance(
    userId: string,
    currency: string,
  ): Promise<UserBalanceInfo | null>;

  /**
   * Get available balance (accounting for inflight transactions)
   */
  getAvailableBalance(userId: string, currency: string): Promise<bigint>;

  // ==========================================
  // Transaction Recording
  // ==========================================

  /**
   * Record a deposit (money coming into user's account)
   */
  recordDeposit(params: RecordDepositParams): Promise<LedgerTransactionResult>;

  /**
   * Record a withdrawal (money leaving user's account)
   */
  recordWithdrawal(
    params: RecordWithdrawalParams,
  ): Promise<LedgerTransactionResult>;

  /**
   * Record a P2P transfer between users
   */
  recordP2PTransfer(
    params: RecordP2PTransferParams,
  ): Promise<LedgerTransactionResult>;

  /**
   * Record an external transfer (to blockchain address)
   */
  recordExternalTransfer(
    params: RecordExternalTransferParams,
  ): Promise<LedgerTransactionResult>;

  // ==========================================
  // Transaction Lifecycle
  // ==========================================

  /**
   * Commit an inflight transaction (finalize it)
   */
  commitTransaction(transactionId: string): Promise<void>;

  /**
   * Void an inflight transaction (cancel it)
   */
  voidTransaction(transactionId: string): Promise<void>;

  /**
   * Get transaction by reference
   */
  getTransactionByReference(
    reference: string,
  ): Promise<LedgerTransactionResult | null>;

  // ==========================================
  // History & Reporting
  // ==========================================

  /**
   * Get user's transaction history
   */
  getUserTransactionHistory(
    userId: string,
    options?: TransactionHistoryOptions,
  ): Promise<LedgerTransactionResult[]>;
}

// ==========================================
// Parameter Types
// ==========================================

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

// ==========================================
// Balance Monitor Types
// ==========================================

export const BALANCE_MONITOR_PROVIDER = Symbol('BALANCE_MONITOR_PROVIDER');

export interface IBalanceMonitorProvider {
  /**
   * Create a balance monitor for fraud/compliance alerts
   */
  createMonitor(params: CreateMonitorParams): Promise<BalanceMonitorInfo>;

  /**
   * Get monitor by ID
   */
  getMonitor(monitorId: string): Promise<BalanceMonitorInfo | null>;

  /**
   * List all monitors for a balance
   */
  listMonitors(): Promise<BalanceMonitorInfo[]>;

  /**
   * Update a monitor
   */
  updateMonitor(
    monitorId: string,
    params: Partial<CreateMonitorParams>,
  ): Promise<BalanceMonitorInfo>;

  /**
   * Delete a monitor
   */
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

// ==========================================
// Search Types
// ==========================================

export const SEARCH_PROVIDER = Symbol('SEARCH_PROVIDER');

export interface ISearchProvider {
  /**
   * Search transactions
   */
  searchTransactions(
    params: SearchQueryParams,
  ): Promise<SearchResult<LedgerTransactionResult>>;

  /**
   * Search balances
   */
  searchBalances(
    params: SearchQueryParams,
  ): Promise<SearchResult<UserBalanceInfo>>;
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

// ==========================================
// Reconciliation Types
// ==========================================

export const RECONCILIATION_PROVIDER = Symbol('RECONCILIATION_PROVIDER');

export interface IReconciliationProvider {
  /**
   * Upload external data for reconciliation (CSV/JSON)
   */
  uploadExternalData(filePath: string, source: string): Promise<string>; // returns uploadId

  /**
   * Create a matching rule
   */
  createMatchingRule(params: CreateMatchingRuleParams): Promise<string>; // returns ruleId

  /**
   * Run batch reconciliation
   */
  runReconciliation(
    params: RunReconciliationParams,
  ): Promise<ReconciliationResultInfo>;
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

// ==========================================
// Ledger Identity Types (for linking users to balances in Blnk)
// Note: This is separate from Circle identity (KYC) - this is just ledger linkage
// ==========================================

export const LEDGER_IDENTITY_PROVIDER = Symbol('LEDGER_IDENTITY_PROVIDER');

export interface ILedgerIdentityProvider {
  /**
   * Create/register an identity in the ledger (for balance ownership)
   */
  createLedgerIdentity(
    params: CreateLedgerIdentityParams,
  ): Promise<LedgerIdentityInfo>;

  /**
   * Get identity by ID
   */
  getLedgerIdentity(identityId: string): Promise<LedgerIdentityInfo | null>;

  /**
   * Update identity
   */
  updateLedgerIdentity(
    identityId: string,
    params: Partial<CreateLedgerIdentityParams>,
  ): Promise<LedgerIdentityInfo>;

  /**
   * List all identities
   */
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
