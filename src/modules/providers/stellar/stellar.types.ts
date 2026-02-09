/**
 * Stellar Provider Types
 *
 * Type definitions for Stellar blockchain integration including USDC transfers,
 * SEP-10 authentication, and SEP-24 interactive deposit/withdrawal flows.
 */

// ============================================
// NETWORK CONFIGURATION
// ============================================

export type StellarNetwork = 'testnet' | 'mainnet';

export interface StellarConfig {
  /** Network type (testnet or mainnet) */
  network: StellarNetwork;
  /** Horizon server URL */
  horizonUrl: string;
  /** USDC asset code */
  usdcAssetCode: string;
  /** USDC asset issuer public key */
  usdcIssuer: string;
  /** Anchor domain for SEP services */
  anchorDomain?: string;
  /** Use mock mode for testing */
  useMock: boolean;
}

// ============================================
// ACCOUNT TYPES
// ============================================

export interface StellarKeyPair {
  /** Public key (account ID) */
  publicKey: string;
  /** Secret key (private key) - stored encrypted */
  secretKey: string;
}

export interface StellarAccount {
  /** Account ID (public key) */
  accountId: string;
  /** Sequence number for transactions */
  sequence: string;
  /** Account balances */
  balances: StellarBalance[];
  /** Whether the account has a trustline for USDC */
  hasUsdcTrustline: boolean;
  /** Account status */
  status: 'active' | 'inactive';
}

export interface StellarBalance {
  /** Asset type ('native' for XLM, 'credit_alphanum4/12' for custom assets) */
  assetType: string;
  /** Asset code (e.g., 'XLM', 'USDC') */
  assetCode: string;
  /** Asset issuer (null for native XLM) */
  assetIssuer: string | null;
  /** Balance amount as string for precision */
  balance: string;
  /** Buying liabilities */
  buyingLiabilities: string;
  /** Selling liabilities */
  sellingLiabilities: string;
}

// ============================================
// TRANSACTION TYPES
// ============================================

export interface StellarTransactionRequest {
  /** Source account secret key */
  sourceSecretKey: string;
  /** Destination account public key */
  destinationPublicKey: string;
  /** Amount to send */
  amount: string;
  /** Asset code (USDC or XLM) */
  assetCode: string;
  /** Asset issuer (null for XLM) */
  assetIssuer?: string;
  /** Optional memo */
  memo?: string;
  /** Memo type ('text', 'id', 'hash') */
  memoType?: 'text' | 'id' | 'hash';
}

export interface StellarTransactionResult {
  /** Transaction ID (hash) */
  transactionId: string;
  /** Transaction hash (same as ID) */
  hash: string;
  /** Ledger number where transaction was included */
  ledger: number;
  /** Whether the transaction was successful */
  successful: boolean;
  /** Fee paid in stroops */
  feeCharged: string;
  /** Result XDR */
  resultXdr: string;
  /** Created at timestamp */
  createdAt: Date;
}

export type StellarTransactionStatus =
  | 'pending'
  | 'submitted'
  | 'confirmed'
  | 'failed';

// ============================================
// SEP-10 WEB AUTHENTICATION TYPES
// ============================================

export interface Sep10AuthRequest {
  /** Account to authenticate */
  account: string;
  /** Optional memo for custodial accounts */
  memo?: string;
  /** Home domain for multi-tenant anchors */
  homeDomain?: string;
  /** Client domain for verification */
  clientDomain?: string;
}

export interface Sep10AuthChallenge {
  /** The challenge transaction in XDR format */
  transaction: string;
  /** Network passphrase */
  networkPassphrase: string;
}

export interface Sep10AuthToken {
  /** JWT token for authenticated requests */
  token: string;
  /** Token expiration timestamp */
  expiresAt: Date;
  /** Authenticated account */
  account: string;
}

// ============================================
// SEP-24 INTERACTIVE DEPOSIT/WITHDRAWAL TYPES
// ============================================

export interface Sep24Info {
  /** Available deposit assets */
  deposit: Record<string, Sep24AssetInfo>;
  /** Available withdrawal assets */
  withdraw: Record<string, Sep24AssetInfo>;
  /** Supported features */
  features: {
    accountCreation: boolean;
    claimableBalances: boolean;
  };
}

export interface Sep24AssetInfo {
  /** Whether the asset is enabled */
  enabled: boolean;
  /** Authentication required */
  authenticationRequired: boolean;
  /** Fee structure */
  fee?: {
    fixed?: number;
    percent?: number;
    minimum?: number;
    maximum?: number;
  };
  /** Minimum amount */
  minAmount?: number;
  /** Maximum amount */
  maxAmount?: number;
  /** Supported types (e.g., 'bank_transfer', 'mobile_money') */
  types?: Record<string, { fields?: Record<string, unknown> }>;
}

export interface Sep24DepositRequest {
  /** JWT token from SEP-10 authentication */
  authToken: string;
  /** Asset code to deposit */
  assetCode: string;
  /** Stellar account to receive the deposit */
  account: string;
  /** Optional memo for the deposit */
  memo?: string;
  /** Memo type */
  memoType?: string;
  /** Preferred language */
  lang?: string;
  /** Amount (optional - can be specified in interactive flow) */
  amount?: string;
  /** Country code for localized options */
  countryCode?: string;
  /** Callback URL for status updates */
  claimableBalanceSupported?: boolean;
}

export interface Sep24WithdrawalRequest {
  /** JWT token from SEP-10 authentication */
  authToken: string;
  /** Asset code to withdraw */
  assetCode: string;
  /** Stellar account to withdraw from */
  account: string;
  /** Amount to withdraw */
  amount?: string;
  /** Refund memo (for failed withdrawals) */
  refundMemo?: string;
  /** Refund memo type */
  refundMemoType?: string;
  /** Preferred language */
  lang?: string;
  /** Country code */
  countryCode?: string;
}

export interface Sep24InteractiveResponse {
  /** Type of response */
  type: 'interactive_customer_info_needed';
  /** URL to open for user interaction */
  url: string;
  /** Transaction ID for tracking */
  id: string;
}

export type Sep24TransactionStatus =
  | 'incomplete'
  | 'pending_user_transfer_start'
  | 'pending_user_transfer_complete'
  | 'pending_external'
  | 'pending_anchor'
  | 'pending_stellar'
  | 'pending_trust'
  | 'pending_user'
  | 'completed'
  | 'refunded'
  | 'expired'
  | 'error'
  | 'no_market';

export interface Sep24Transaction {
  /** Transaction ID */
  id: string;
  /** Transaction kind (deposit or withdrawal) */
  kind: 'deposit' | 'withdrawal';
  /** Transaction status */
  status: Sep24TransactionStatus;
  /** Detailed status message */
  statusEta?: number;
  /** Whether the transaction requires more info */
  moreInfoUrl?: string;
  /** Amount in (fiat for deposits) */
  amountIn?: string;
  /** Amount out (crypto for deposits) */
  amountOut?: string;
  /** Amount fee */
  amountFee?: string;
  /** Started at timestamp */
  startedAt?: string;
  /** Completed at timestamp */
  completedAt?: string;
  /** Stellar transaction ID (for completed) */
  stellarTransactionId?: string;
  /** External transaction ID */
  externalTransactionId?: string;
  /** Deposit memo */
  depositMemo?: string;
  /** Deposit memo type */
  depositMemoType?: string;
  /** Withdraw anchor account (for withdrawals) */
  withdrawAnchorAccount?: string;
  /** Withdraw memo */
  withdrawMemo?: string;
  /** Withdraw memo type */
  withdrawMemoType?: string;
  /** Refunded flag */
  refunded?: boolean;
  /** From address */
  from?: string;
  /** To address */
  to?: string;
}

// ============================================
// WEBHOOK TYPES
// ============================================

export type StellarWebhookEventType =
  | 'sep24.deposit.pending'
  | 'sep24.deposit.completed'
  | 'sep24.deposit.failed'
  | 'sep24.withdrawal.pending'
  | 'sep24.withdrawal.completed'
  | 'sep24.withdrawal.failed';

export interface StellarWebhookEvent {
  /** Event type */
  type: StellarWebhookEventType;
  /** Transaction ID */
  transactionId: string;
  /** Event data */
  data: Sep24Transaction;
  /** Timestamp */
  timestamp: Date;
}

// ============================================
// ERROR TYPES
// ============================================

export class StellarError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'StellarError';
  }
}

export class StellarNetworkError extends StellarError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'StellarNetworkError';
  }
}

export class StellarTransactionError extends StellarError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'TRANSACTION_ERROR', details);
    this.name = 'StellarTransactionError';
  }
}

export class StellarAuthError extends StellarError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AUTH_ERROR', details);
    this.name = 'StellarAuthError';
  }
}

// ============================================
// CONSTANTS
// ============================================

/** Stellar testnet network passphrase */
export const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';

/** Stellar mainnet network passphrase */
export const MAINNET_PASSPHRASE = 'Public Global Stellar Network ; September 2015';

/** Stellar testnet Horizon URL */
export const TESTNET_HORIZON_URL = 'https://horizon-testnet.stellar.org';

/** Stellar mainnet Horizon URL */
export const MAINNET_HORIZON_URL = 'https://horizon.stellar.org';

/** Testnet USDC issuer (SDF test anchor) */
export const TESTNET_USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

/** Mainnet USDC issuer (Circle) */
export const MAINNET_USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

/** Minimum XLM balance for account activation (in lumens) */
export const MINIMUM_XLM_BALANCE = '1.5';

/** Base fee for transactions (in stroops, 1 stroop = 0.0000001 XLM) */
export const BASE_FEE = '100';
