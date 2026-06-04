/**
 * Payment Gateway Interface
 *
 * Generic interface for payment/wallet providers.
 * Currently implemented by Yellow Card, but can be swapped for:
 * - In-house solution
 * - Bridge.xyz
 * - Circle APIs
 * - Any other stablecoin provider
 */

// ============================================
// SUBWALLET / ACCOUNT TYPES
// ============================================

export interface CreateSubwalletRequest {
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  country: string;
}

export interface Subwallet {
  id: string;
  externalId: string; // Provider's ID
  userId: string;
  address: string;
  currency: string;
  createdAt: Date;
}

// ============================================
// BALANCE TYPES
// ============================================

export interface Balance {
  currency: string;
  available: number;
  pending: number;
  total: number;
}

export interface BalanceResponse {
  subwalletId: string;
  balances: Balance[];
}

// ============================================
// ON-RAMP (DEPOSIT) TYPES
// ============================================

export interface OnRampChannel {
  id: string;
  name: string;
  type: 'mobile_money' | 'bank_transfer' | 'card' | 'crypto';
  provider: string;
  country: string;
  minAmount: number;
  maxAmount: number;
  fee: number;
  feeType: 'fixed' | 'percentage';
  currency: string;
}

export interface InitiateDepositRequest {
  subwalletId: string;
  amount: number;
  sourceCurrency: string;
  targetCurrency: string;
  channelId: string;
  customerPhone?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentInstructions {
  type: 'mobile_money' | 'bank_transfer' | 'card' | 'crypto';
  provider: string;
  accountNumber?: string;
  accountName?: string;
  reference: string;
  instructions: string;
  qrCode?: string;
}

export interface DepositResponse {
  id: string;
  externalId: string; // Provider's reference
  subwalletId: string;
  amount: number;
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
  fee: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  paymentInstructions: PaymentInstructions;
  createdAt: Date;
  expiresAt: Date;
}

// ============================================
// TRANSFER TYPES
// ============================================

export interface InternalTransferRequest {
  fromSubwalletId: string;
  toSubwalletId: string;
  amount: number;
  currency: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface ExternalTransferRequest {
  subwalletId: string;
  toAddress: string;
  amount: number;
  currency: string;
  network?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface TransferResponse {
  id: string;
  externalId: string; // Provider's reference
  type: 'internal' | 'external';
  fromSubwalletId: string;
  toSubwalletId?: string;
  toAddress?: string;
  amount: number;
  currency: string;
  fee: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  txHash?: string;
  createdAt: Date;
}

// ============================================
// RATE / QUOTE TYPES
// ============================================

export interface RateRequest {
  sourceCurrency: string;
  targetCurrency: string;
  amount: number;
  direction: 'buy' | 'sell';
}

export interface RateResponse {
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
  sourceAmount: number;
  targetAmount: number;
  fee: number;
  expiresAt: Date;
}

// ============================================
// KYC TYPES
// ============================================

export interface SubmitKycRequest {
  subwalletId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  country: string;
  idType: 'passport' | 'national_id' | 'drivers_license';
  idNumber: string;
  idExpiryDate?: string;
  address?: {
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
  documentFrontUrl?: string;
  documentBackUrl?: string;
  selfieUrl?: string;
}

export interface KycResponse {
  id: string;
  subwalletId: string;
  status: 'none' | 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// WEBHOOK TYPES
// ============================================

export type WebhookEventType =
  | 'deposit.pending'
  | 'deposit.completed'
  | 'deposit.failed'
  | 'transfer.pending'
  | 'transfer.completed'
  | 'transfer.failed'
  | 'kyc.approved'
  | 'kyc.rejected';

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  referenceId: string; // Provider's reference for the resource (deposit ID, transfer ID, etc.)
  externalId: string; // Provider's external event ID
  data: Record<string, unknown>;
  createdAt: Date;
}

// ============================================
// GATEWAY INTERFACE
// ============================================

export interface IPaymentGateway {
  // Provider identification
  readonly providerName: string;

  // Subwallet operations
  createSubwallet(request: CreateSubwalletRequest): Promise<Subwallet>;
  getBalance(subwalletId: string): Promise<BalanceResponse>;

  // On-ramp (deposits)
  getOnRampChannels(
    country: string,
    currency?: string,
  ): Promise<OnRampChannel[]>;
  initiateDeposit(request: InitiateDepositRequest): Promise<DepositResponse>;
  getDepositStatus(depositId: string): Promise<DepositResponse>;

  // Transfers
  internalTransfer(request: InternalTransferRequest): Promise<TransferResponse>;
  externalTransfer(request: ExternalTransferRequest): Promise<TransferResponse>;
  getTransferStatus(transferId: string): Promise<TransferResponse>;

  // Rates
  getRate(request: RateRequest): Promise<RateResponse>;

  // KYC
  submitKyc(request: SubmitKycRequest): Promise<KycResponse>;
  getKycStatus(subwalletId: string): Promise<KycResponse>;

  // Webhooks
  verifyWebhookSignature(payload: string, signature: string): boolean;
  parseWebhookEvent(payload: Record<string, unknown>): WebhookEvent;
}

// Injection token for the payment gateway
export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
