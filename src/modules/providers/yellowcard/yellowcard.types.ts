/**
 * Yellow Card API Types
 * For on-ramp (XOF → USDC) and off-ramp (USDC → XOF) in Ivory Coast/UEMOA
 */

export interface YellowCardConfig {
  apiUrl: string;
  apiKey: string;
  secretKey: string;
  webhookSecret: string;
  useMock: boolean;
}

// ============================================
// CHANNELS
// ============================================

export interface YellowCardChannel {
  id: string;
  name: string;
  channelType: 'mobile_money' | 'bank';
  network: string; // 'orange', 'mtn', 'wave'
  country: string;
  currency: string;
  minAmount: number;
  maxAmount: number;
  flatFee: number;
  percentFee: number;
  estimatedSettlementTime: string;
}

// ============================================
// RATES
// ============================================

export interface YellowCardRate {
  id: string;
  sourceCurrency: string;
  destinationCurrency: string;
  buy: number;
  sell: number;
  expiresAt: string;
}

// ============================================
// PAYMENTS (DEPOSITS/ON-RAMP)
// ============================================

export interface YellowCardCreatePaymentRequest {
  channelId: string;
  amount: number;
  currency: string;
  destinationCurrency: string;
  destinationAddress: string; // Joona's pool address
  customerPhone?: string;
  customerEmail?: string;
  reference: string; // Your transaction ID
  metadata?: Record<string, unknown>;
}

export interface YellowCardPayment {
  id: string;
  status:
    | 'pending'
    | 'awaiting_payment'
    | 'processing'
    | 'complete'
    | 'failed'
    | 'expired';
  amount: number;
  currency: string;
  destinationAmount: number;
  destinationCurrency: string;
  rate: number;
  fee: number;
  channel: {
    id: string;
    type: string;
    network: string;
  };
  paymentDetails: {
    accountNumber?: string;
    accountName?: string;
    reference: string;
    instructions: string;
    expiresAt: string;
  };
  reference: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// PAYOUTS (WITHDRAWALS/OFF-RAMP)
// ============================================

export interface YellowCardCreatePayoutRequest {
  channelId: string;
  amount: number;
  currency: string; // USDC
  destinationCurrency: string; // XOF
  destination: {
    type: 'mobile_money' | 'bank';
    network?: string; // 'orange', 'mtn', 'wave'
    accountNumber: string; // Phone number or bank account
    accountName: string;
    bankCode?: string;
  };
  reference: string;
  metadata?: Record<string, unknown>;
}

export interface YellowCardPayout {
  id: string;
  status: 'pending' | 'processing' | 'complete' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  destinationAmount: number;
  destinationCurrency: string;
  rate: number;
  fee: number;
  destination: {
    type: string;
    accountNumber: string;
    accountName: string;
  };
  reference: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// ============================================
// WEBHOOKS
// ============================================

export type YellowCardWebhookType =
  | 'payment.pending'
  | 'payment.awaiting_payment'
  | 'payment.processing'
  | 'payment.complete'
  | 'payment.failed'
  | 'payment.expired'
  | 'payout.pending'
  | 'payout.processing'
  | 'payout.complete'
  | 'payout.failed';

export interface YellowCardWebhookEvent {
  id: string;
  type: YellowCardWebhookType;
  data: YellowCardPayment | YellowCardPayout;
  createdAt: string;
}

// ============================================
// SUPPORTED COUNTRIES
// ============================================

export const YELLOWCARD_COUNTRIES = {
  CI: { name: 'Ivory Coast', currency: 'XOF', region: 'UEMOA' },
  SN: { name: 'Senegal', currency: 'XOF', region: 'UEMOA' },
  ML: { name: 'Mali', currency: 'XOF', region: 'UEMOA' },
  BF: { name: 'Burkina Faso', currency: 'XOF', region: 'UEMOA' },
  BJ: { name: 'Benin', currency: 'XOF', region: 'UEMOA' },
  TG: { name: 'Togo', currency: 'XOF', region: 'UEMOA' },
  NE: { name: 'Niger', currency: 'XOF', region: 'UEMOA' },
  GW: { name: 'Guinea-Bissau', currency: 'XOF', region: 'UEMOA' },
} as const;

export const YELLOWCARD_MOBILE_MONEY_NETWORKS = {
  CI: ['orange', 'mtn', 'wave', 'moov'],
  SN: ['orange', 'wave', 'free'],
} as const;
