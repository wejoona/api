/**
 * Off-Ramp Provider Interface
 *
 * Handles crypto-to-fiat conversions (withdrawals).
 * - Ivory Coast/UEMOA: Yellow Card (USDC → XOF via Mobile Money)
 * - USA: Circle (USDC → USD via Bank)
 * Future: In-house settlement
 */

export type WithdrawalChannelType =
  | 'mobile_money'
  | 'bank_transfer'
  | 'ach'
  | 'wire';

export interface WithdrawalChannel {
  id: string;
  name: string;
  type: WithdrawalChannelType;
  provider: string;
  country: string;
  currency: string; // Target fiat currency
  minAmount: number;
  maxAmount: number;
  fee: number;
  feeType: 'fixed' | 'percentage';
  estimatedTime: string;
  isActive: boolean;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  routingNumber?: string; // USA
  swiftCode?: string; // International
  accountHolderName: string;
  accountType?: 'checking' | 'savings';
}

export interface MobileMoneyDetails {
  provider: string; // 'orange', 'wave', 'mtn'
  phoneNumber: string;
  accountName?: string;
}

export interface InitiateWithdrawalData {
  userId: string;
  sourceWalletId: string; // Provider wallet ID to withdraw from
  amount: number; // Amount in USDC
  targetCurrency: string; // XOF, USD
  channelId: string;
  destination: BankDetails | MobileMoneyDetails;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export type WithdrawalStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'returned';

export interface WithdrawalResult {
  providerId: string;
  status: WithdrawalStatus;
  sourceAmount: number;
  sourceCurrency: string;
  targetAmount: number;
  targetCurrency: string;
  rate: number;
  fee: number;
  destination: BankDetails | MobileMoneyDetails;
  reference: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: Date;
  estimatedArrival?: Date;
  completedAt?: Date;
}

export interface IOffRampProvider {
  readonly providerName: string;
  readonly supportedCountries: string[];

  /**
   * Get available withdrawal channels for a country
   */
  getChannels(country: string, currency?: string): Promise<WithdrawalChannel[]>;

  /**
   * Get exchange rate quote for withdrawal
   */
  getRate(
    sourceCurrency: string,
    targetCurrency: string,
    amount: number,
  ): Promise<{
    rate: number;
    sourceAmount: number;
    targetAmount: number;
    fee: number;
    expiresAt: Date;
  }>;

  /**
   * Initiate a withdrawal (USDC → fiat)
   */
  initiateWithdrawal(data: InitiateWithdrawalData): Promise<WithdrawalResult>;

  /**
   * Get withdrawal status
   */
  getWithdrawalStatus(providerWithdrawalId: string): Promise<WithdrawalResult>;

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean;

  /**
   * Parse webhook event
   */
  parseWebhookEvent(payload: Record<string, unknown>): {
    type:
      | 'withdrawal.pending'
      | 'withdrawal.completed'
      | 'withdrawal.failed'
      | 'withdrawal.returned';
    withdrawalId: string;
    data: Record<string, unknown>;
  };
}

export const OFFRAMP_PROVIDER = Symbol('OFFRAMP_PROVIDER');
export const OFFRAMP_PROVIDER_CI = Symbol('OFFRAMP_PROVIDER_CI'); // Ivory Coast
export const OFFRAMP_PROVIDER_US = Symbol('OFFRAMP_PROVIDER_US'); // USA
