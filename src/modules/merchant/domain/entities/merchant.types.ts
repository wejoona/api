/**
 * Merchant Types
 * Core type definitions for the merchant payment system
 */

// ============================================
// MERCHANT CATEGORY
// ============================================

export type MerchantCategory =
  | 'retail'
  | 'restaurant'
  | 'grocery'
  | 'transport'
  | 'services'
  | 'healthcare'
  | 'education'
  | 'entertainment'
  | 'other';

export const MERCHANT_CATEGORIES: MerchantCategory[] = [
  'retail',
  'restaurant',
  'grocery',
  'transport',
  'services',
  'healthcare',
  'education',
  'entertainment',
  'other',
];

// ============================================
// MERCHANT STATUS
// ============================================

export type MerchantStatus = 'pending' | 'active' | 'suspended' | 'closed';

export const MERCHANT_STATUSES: MerchantStatus[] = [
  'pending',
  'active',
  'suspended',
  'closed',
];

// ============================================
// PAYMENT REQUEST STATUS
// ============================================

export type PaymentRequestStatus = 'pending' | 'paid' | 'expired' | 'cancelled';

export const PAYMENT_REQUEST_STATUSES: PaymentRequestStatus[] = [
  'pending',
  'paid',
  'expired',
  'cancelled',
];

// ============================================
// MERCHANT PAYMENT STATUS
// ============================================

export type MerchantPaymentStatus = 'completed' | 'refunded' | 'failed';

export const MERCHANT_PAYMENT_STATUSES: MerchantPaymentStatus[] = [
  'completed',
  'refunded',
  'failed',
];

// ============================================
// QR CODE TYPES
// ============================================

export type QrCodeType = 'static' | 'dynamic';

// ============================================
// INTERFACES
// ============================================

/**
 * Merchant Interface
 * Represents a registered business that can accept USDC payments
 */
export interface IMerchant {
  id: string;
  businessName: string;
  displayName: string;
  ownerId: string;
  category: MerchantCategory;
  country: string;
  walletId: string;
  qrCode: string;
  qrCodeUrl?: string;
  isVerified: boolean;
  feePercent: number;
  dailyLimit: number;
  monthlyLimit: number;
  dailyVolume: number;
  monthlyVolume: number;
  totalTransactions: number;
  status: MerchantStatus;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  taxId?: string;
  logoUrl?: string;
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payment Request Interface
 * Represents a payment request created by a merchant (dynamic QR)
 */
export interface IPaymentRequest {
  id: string;
  requestId: string;
  merchantId: string;
  amount: number;
  currency: string;
  description?: string;
  reference?: string;
  expiresAt: Date;
  status: PaymentRequestStatus;
  qrData: string;
  paidAt?: Date;
  paymentId?: string;
  customerId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Merchant Payment Interface
 * Represents a completed payment to a merchant
 */
export interface IMerchantPayment {
  id: string;
  paymentId: string;
  merchantId: string;
  customerId: string;
  customerWalletId: string;
  merchantWalletId: string;
  paymentRequestId?: string;
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  reference: string;
  description?: string;
  status: MerchantPaymentStatus;
  txHash?: string;
  ledgerTransactionId?: string;
  refundedAt?: Date;
  refundReason?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * QR Code Payload Interface
 * Structure of data encoded in merchant QR codes
 */
export interface IQrCodePayload {
  version: number;
  type: QrCodeType;
  merchantId: string;
  amount?: number;
  requestId?: string;
  currency?: string;
  description?: string;
  signature: string;
  timestamp: number;
}

/**
 * Invoice Line Item Interface
 */
export interface IInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

/**
 * Invoice Interface
 */
export interface IInvoice {
  id: string;
  invoiceNumber: string;
  merchantId: string;
  customerId?: string;
  customerEmail?: string;
  customerPhone?: string;
  lineItems: IInvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  dueDate: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  qrCode?: string;
  paymentId?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Merchant Analytics Interface
 */
export interface IMerchantAnalytics {
  merchantId: string;
  period: 'day' | 'week' | 'month' | 'year';
  startDate: Date;
  endDate: Date;
  totalTransactions: number;
  totalVolume: number;
  totalFees: number;
  averageTransactionSize: number;
  uniqueCustomers: number;
  topHours: { hour: number; count: number }[];
  transactionsByDay: { date: string; count: number; volume: number }[];
}

// ============================================
// CREATE PROPS
// ============================================

export interface CreateMerchantProps {
  businessName: string;
  displayName?: string;
  ownerId: string;
  category: MerchantCategory;
  country: string;
  walletId: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  taxId?: string;
  webhookUrl?: string;
}

export interface CreatePaymentRequestProps {
  merchantId: string;
  amount: number;
  currency?: string;
  description?: string;
  reference?: string;
  expiresInMinutes?: number;
}

export interface CreateMerchantPaymentProps {
  merchantId: string;
  customerId: string;
  customerWalletId: string;
  merchantWalletId: string;
  paymentRequestId?: string;
  amount: number;
  fee: number;
  currency?: string;
  description?: string;
}
