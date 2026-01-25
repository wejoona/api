/**
 * Bill Payment Types
 * Core type definitions for bill payments across West Africa
 */

// ============================================================================
// ENUMS
// ============================================================================

export type BillCategory =
  | 'electricity'
  | 'water'
  | 'internet'
  | 'tv'
  | 'phone_credit'
  | 'insurance'
  | 'education'
  | 'government';

export type BillPaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded';

export type SupportedCountry =
  | 'CI' // Ivory Coast
  | 'SN' // Senegal
  | 'ML' // Mali
  | 'BF' // Burkina Faso
  | 'BJ' // Benin
  | 'TG' // Togo
  | 'NE' // Niger
  | 'GW' // Guinea-Bissau
  | 'CM' // Cameroon
  | 'GA' // Gabon
  | 'CG' // Congo
  | 'GH' // Ghana
  | 'NG'; // Nigeria

// ============================================================================
// PROVIDER INTERFACES
// ============================================================================

export interface BillProvider {
  id: string;
  name: string;
  shortName: string;
  category: BillCategory;
  country: SupportedCountry;
  logo: string;
  requiresAccountNumber: boolean;
  requiresMeterNumber: boolean;
  requiresCustomerName: boolean;
  accountNumberLabel: string;
  accountNumberPattern?: string;
  accountNumberLength?: number;
  minimumAmount: number;
  maximumAmount: number;
  processingFee: number;
  processingFeeType: 'fixed' | 'percentage';
  currency: string;
  isActive: boolean;
  supportsValidation: boolean;
  estimatedProcessingTime: string;
  operatingHours?: {
    start: string; // HH:mm format
    end: string;
    timezone: string;
  };
  metadata?: Record<string, unknown>;
}

export interface BillProviderConfig {
  apiBaseUrl: string;
  apiKey: string;
  apiSecret?: string;
  merchantId?: string;
  timeout: number;
  retryCount: number;
}

// ============================================================================
// VALIDATION INTERFACES
// ============================================================================

export interface AccountValidationRequest {
  providerId: string;
  accountNumber: string;
  meterNumber?: string;
}

export interface AccountValidationResult {
  isValid: boolean;
  customerName?: string;
  accountNumber: string;
  meterNumber?: string;
  accountType?: string;
  outstandingBalance?: number;
  minimumPayment?: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// PAYMENT INTERFACES
// ============================================================================

export interface BillPaymentRequest {
  userId: string;
  providerId: string;
  accountNumber: string;
  meterNumber?: string;
  customerName?: string;
  amount: number;
  currency: string;
  phone?: string;
  email?: string;
  idempotencyKey?: string;
}

export interface BillPaymentResult {
  paymentId: string;
  transactionId: string;
  status: BillPaymentStatus;
  receiptNumber?: string;
  providerReference?: string;
  tokenNumber?: string; // For prepaid electricity/water
  units?: string; // kWh, cubic meters, etc.
  amount: number;
  fee: number;
  totalAmount: number;
  currency: string;
  paidAt?: Date;
  estimatedCompletionTime?: string;
  metadata?: Record<string, unknown>;
}

export interface BillPaymentReceipt {
  paymentId: string;
  receiptNumber: string;
  providerName: string;
  providerLogo: string;
  category: BillCategory;
  accountNumber: string;
  customerName?: string;
  amount: number;
  fee: number;
  totalAmount: number;
  currency: string;
  tokenNumber?: string;
  units?: string;
  status: BillPaymentStatus;
  paidAt: Date;
  providerReference?: string;
  qrCode?: string;
}

// ============================================================================
// QUERY INTERFACES
// ============================================================================

export interface GetProvidersQuery {
  country?: SupportedCountry;
  category?: BillCategory;
  isActive?: boolean;
}

export interface GetPaymentHistoryQuery {
  userId: string;
  page?: number;
  limit?: number;
  category?: BillCategory;
  status?: BillPaymentStatus;
  startDate?: Date;
  endDate?: Date;
}

export interface BillPaymentHistoryItem {
  id: string;
  providerId: string;
  providerName: string;
  providerLogo: string;
  category: BillCategory;
  accountNumber: string;
  customerName?: string;
  amount: number;
  fee: number;
  totalAmount: number;
  currency: string;
  status: BillPaymentStatus;
  receiptNumber?: string;
  tokenNumber?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface PaginatedBillPaymentHistory {
  items: BillPaymentHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// ADAPTER INTERFACES
// ============================================================================

export interface IBillProviderAdapter {
  providerId: string;

  /**
   * Validate customer account with the provider
   */
  validateAccount(request: AccountValidationRequest): Promise<AccountValidationResult>;

  /**
   * Process bill payment
   */
  processPayment(request: BillPaymentRequest): Promise<BillPaymentResult>;

  /**
   * Check payment status
   */
  checkPaymentStatus(paymentId: string): Promise<BillPaymentResult>;

  /**
   * Check if the provider is currently available
   */
  isAvailable(): Promise<boolean>;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class BillPaymentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly isRetryable: boolean = false,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'BillPaymentError';
  }
}

export const BillPaymentErrorCodes = {
  INVALID_ACCOUNT: 'INVALID_ACCOUNT',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  AMOUNT_TOO_LOW: 'AMOUNT_TOO_LOW',
  AMOUNT_TOO_HIGH: 'AMOUNT_TOO_HIGH',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_TIMEOUT: 'PAYMENT_TIMEOUT',
  DUPLICATE_PAYMENT: 'DUPLICATE_PAYMENT',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
} as const;
