/**
 * On-Ramp Provider Interface
 *
 * Handles fiat-to-crypto conversions (deposits).
 * - Ivory Coast/UEMOA: Yellow Card (XOF → USDC via Mobile Money)
 * - USA: Circle (USD → USDC via Bank/Card)
 * Future: In-house mobile money aggregator
 */

export type PaymentChannelType =
  | 'mobile_money'
  | 'bank_transfer'
  | 'bank'
  | 'card'
  | 'ach'
  | 'wire';

export interface PaymentChannel {
  id: string;
  name: string;
  type: PaymentChannelType;
  provider: string; // 'orange', 'wave', 'mtn', 'visa', 'bank'
  country: string; // ISO country code
  currency: string; // Fiat currency (XOF, USD)
  minAmount: number;
  maxAmount: number;
  fee: number;
  feeType: 'fixed' | 'percentage';
  estimatedTime: string; // '5 minutes', '1-3 business days'
  isActive: boolean;
}

export interface InitiateDepositData {
  userId: string; // Your internal user ID
  amount: number; // Amount in source currency
  sourceCurrency: string; // XOF, USD
  targetCurrency: string; // USDC
  channelId: string; // Payment channel ID
  destinationWalletId: string; // Where USDC should go (Joona pool or user wallet)
  customerPhone?: string;
  customerEmail?: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentInstructions {
  type: PaymentChannelType;
  provider: string;
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  reference: string;
  instructions: string;
  qrCode?: string;
  deepLink?: string; // Mobile money app deep link
  expiresAt: Date;
}

export type DepositStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'refunded';

export interface DepositResult {
  providerId: string; // Provider's deposit ID
  status: DepositStatus;
  amount: number;
  sourceCurrency: string;
  targetAmount: number;
  targetCurrency: string;
  rate: number;
  fee: number;
  paymentInstructions: PaymentInstructions;
  createdAt: Date;
  expiresAt: Date;
  completedAt?: Date;
}

export interface IOnRampProvider {
  readonly providerName: string;
  readonly supportedCountries: string[];

  /**
   * Get available payment channels for a country
   */
  getChannels(country: string, currency?: string): Promise<PaymentChannel[]>;

  /**
   * Get exchange rate quote
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
   * Initiate a deposit (fiat → USDC)
   */
  initiateDeposit(data: InitiateDepositData): Promise<DepositResult>;

  /**
   * Get deposit status
   */
  getDepositStatus(providerDepositId: string): Promise<DepositResult>;

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean;

  /**
   * Parse webhook event
   * Note: Yellow Card uses a unified webhook for both deposits and withdrawals
   */
  parseWebhookEvent(payload: Record<string, unknown>): {
    type:
      | 'deposit.pending'
      | 'deposit.completed'
      | 'deposit.failed'
      | 'deposit.expired'
      | 'withdrawal.pending'
      | 'withdrawal.completed'
      | 'withdrawal.failed';
    depositId: string; // For deposits this is depositId, for withdrawals it's withdrawalId
    data: Record<string, unknown>;
  };
}

export const ONRAMP_PROVIDER = Symbol('ONRAMP_PROVIDER');
export const ONRAMP_PROVIDER_CI = Symbol('ONRAMP_PROVIDER_CI'); // Ivory Coast
export const ONRAMP_PROVIDER_US = Symbol('ONRAMP_PROVIDER_US'); // USA
