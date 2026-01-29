import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BillProvider,
  BillCategory,
  BillPaymentStatus,
  SupportedCountry,
  AccountValidationResult,
  BillPaymentResult,
  BillPaymentHistoryItem,
  BillPaymentReceipt,
} from '../../domain/types';

// ============================================================================
// PROVIDER RESPONSES
// ============================================================================

export class BillProviderResponseDto implements BillProvider {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'CIE - Compagnie Ivoirienne dElectricite' })
  name: string;

  @ApiProperty({ example: 'CIE' })
  shortName: string;

  @ApiProperty({
    example: 'electricity',
    enum: [
      'electricity',
      'water',
      'internet',
      'tv',
      'phone_credit',
      'insurance',
      'education',
      'government',
    ],
  })
  category: BillCategory;

  @ApiProperty({ example: 'CI' })
  country: SupportedCountry;

  @ApiProperty({ example: 'https://cdn.joonapay.com/providers/cie.png' })
  logo: string;

  @ApiProperty({ example: true })
  requiresAccountNumber: boolean;

  @ApiProperty({ example: true })
  requiresMeterNumber: boolean;

  @ApiProperty({ example: false })
  requiresCustomerName: boolean;

  @ApiProperty({ example: 'Contract Number' })
  accountNumberLabel: string;

  @ApiPropertyOptional({ example: '^[0-9]{10}$' })
  accountNumberPattern?: string;

  @ApiPropertyOptional({ example: 10 })
  accountNumberLength?: number;

  @ApiProperty({ example: 500 })
  minimumAmount: number;

  @ApiProperty({ example: 1000000 })
  maximumAmount: number;

  @ApiProperty({ example: 100 })
  processingFee: number;

  @ApiProperty({ example: 'fixed', enum: ['fixed', 'percentage'] })
  processingFeeType: 'fixed' | 'percentage';

  @ApiProperty({ example: 'XOF' })
  currency: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: true })
  supportsValidation: boolean;

  @ApiProperty({ example: 'Instant' })
  estimatedProcessingTime: string;

  @ApiPropertyOptional({
    example: { start: '06:00', end: '22:00', timezone: 'Africa/Abidjan' },
  })
  operatingHours?: { start: string; end: string; timezone: string };

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;
}

export class GetProvidersResponseDto {
  @ApiProperty({ type: [BillProviderResponseDto] })
  providers: BillProviderResponseDto[];

  @ApiProperty({ example: ['CI', 'SN', 'ML'] })
  availableCountries: SupportedCountry[];

  @ApiProperty({ example: ['electricity', 'water', 'phone_credit'] })
  availableCategories: BillCategory[];
}

// ============================================================================
// VALIDATION RESPONSES
// ============================================================================

export class ValidateAccountResponseDto implements AccountValidationResult {
  @ApiProperty({ example: true })
  isValid: boolean;

  @ApiPropertyOptional({ example: 'Jean Kouassi' })
  customerName?: string;

  @ApiProperty({ example: '1234567890' })
  accountNumber: string;

  @ApiPropertyOptional({ example: 'MTR-12345678' })
  meterNumber?: string;

  @ApiPropertyOptional({ example: 'Residential' })
  accountType?: string;

  @ApiPropertyOptional({ example: 15000 })
  outstandingBalance?: number;

  @ApiPropertyOptional({ example: 5000 })
  minimumPayment?: number;

  @ApiPropertyOptional({ example: 'Account validated successfully' })
  message?: string;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;
}

// ============================================================================
// PAYMENT RESPONSES
// ============================================================================

export class PayBillResponseDto implements BillPaymentResult {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  paymentId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  transactionId: string;

  @ApiProperty({
    example: 'completed',
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
  })
  status: BillPaymentStatus;

  @ApiPropertyOptional({ example: 'RCP-20260125-123456' })
  receiptNumber?: string;

  @ApiPropertyOptional({ example: 'CIE-TXN-789012' })
  providerReference?: string;

  @ApiPropertyOptional({ example: '1234-5678-9012-3456-7890' })
  tokenNumber?: string;

  @ApiPropertyOptional({ example: '50.5 kWh' })
  units?: string;

  @ApiProperty({ example: 5000 })
  amount: number;

  @ApiProperty({ example: 100 })
  fee: number;

  @ApiProperty({ example: 5100 })
  totalAmount: number;

  @ApiProperty({ example: 'XOF' })
  currency: string;

  @ApiPropertyOptional({ example: '2026-01-25T12:00:00.000Z' })
  paidAt?: Date;

  @ApiPropertyOptional({ example: '1-5 minutes' })
  estimatedCompletionTime?: string;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;
}

// ============================================================================
// HISTORY RESPONSES
// ============================================================================

export class BillPaymentHistoryItemDto implements BillPaymentHistoryItem {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  providerId: string;

  @ApiProperty({ example: 'CIE' })
  providerName: string;

  @ApiProperty({ example: 'https://cdn.joonapay.com/providers/cie.png' })
  providerLogo: string;

  @ApiProperty({ example: 'electricity' })
  category: BillCategory;

  @ApiProperty({ example: '1234567890' })
  accountNumber: string;

  @ApiPropertyOptional({ example: 'Jean Kouassi' })
  customerName?: string;

  @ApiProperty({ example: 5000 })
  amount: number;

  @ApiProperty({ example: 100 })
  fee: number;

  @ApiProperty({ example: 5100 })
  totalAmount: number;

  @ApiProperty({ example: 'XOF' })
  currency: string;

  @ApiProperty({ example: 'completed' })
  status: BillPaymentStatus;

  @ApiPropertyOptional({ example: 'RCP-20260125-123456' })
  receiptNumber?: string;

  @ApiPropertyOptional({ example: '1234-5678-9012-3456-7890' })
  tokenNumber?: string;

  @ApiProperty({ example: '2026-01-25T12:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ example: '2026-01-25T12:00:05.000Z' })
  completedAt?: Date;
}

export class PaginationDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class GetPaymentHistoryResponseDto {
  @ApiProperty({ type: [BillPaymentHistoryItemDto] })
  items: BillPaymentHistoryItemDto[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}

// ============================================================================
// RECEIPT RESPONSE
// ============================================================================

export class BillPaymentReceiptDto implements BillPaymentReceipt {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  paymentId: string;

  @ApiProperty({ example: 'RCP-20260125-123456' })
  receiptNumber: string;

  @ApiProperty({ example: 'CIE - Compagnie Ivoirienne dElectricite' })
  providerName: string;

  @ApiProperty({ example: 'https://cdn.joonapay.com/providers/cie.png' })
  providerLogo: string;

  @ApiProperty({ example: 'electricity' })
  category: BillCategory;

  @ApiProperty({ example: '1234567890' })
  accountNumber: string;

  @ApiPropertyOptional({ example: 'Jean Kouassi' })
  customerName?: string;

  @ApiProperty({ example: 5000 })
  amount: number;

  @ApiProperty({ example: 100 })
  fee: number;

  @ApiProperty({ example: 5100 })
  totalAmount: number;

  @ApiProperty({ example: 'XOF' })
  currency: string;

  @ApiPropertyOptional({ example: '1234-5678-9012-3456-7890' })
  tokenNumber?: string;

  @ApiPropertyOptional({ example: '50.5 kWh' })
  units?: string;

  @ApiProperty({ example: 'completed' })
  status: BillPaymentStatus;

  @ApiProperty({ example: '2026-01-25T12:00:00.000Z' })
  paidAt: Date;

  @ApiPropertyOptional({ example: 'CIE-TXN-789012' })
  providerReference?: string;

  @ApiPropertyOptional({ example: 'data:image/png;base64,...' })
  qrCode?: string;
}

// ============================================================================
// CATEGORIES RESPONSE
// ============================================================================

export class CategoryInfoDto {
  @ApiProperty({ example: 'electricity' })
  category: BillCategory;

  @ApiProperty({ example: 'Electricity' })
  displayName: string;

  @ApiProperty({ example: 'Pay your electricity bills' })
  description: string;

  @ApiProperty({ example: 'bolt' })
  icon: string;

  @ApiProperty({ example: 5 })
  providerCount: number;
}

export class GetCategoriesResponseDto {
  @ApiProperty({ type: [CategoryInfoDto] })
  categories: CategoryInfoDto[];
}
