/**
 * Example DTOs demonstrating West African validation decorators usage.
 * These are reference examples - copy patterns to your actual DTOs.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
} from 'class-validator';
import {
  IsPhoneE164,
  IsXOFAmount,
  IsMobileMoneyProvider,
  IsWAEMUCountry,
  WAEMUCountry,
  MobileMoneyProvider,
} from './index';

/**
 * Example 1: Basic Transfer DTO
 * Standard money transfer between users
 */
export class CreateTransferDto {
  @IsPhoneE164()
  @IsNotEmpty()
  recipientPhone: string;

  @IsXOFAmount()
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;
}

/**
 * Example 2: Mobile Money Withdrawal
 * Withdraw funds to mobile money account
 */
export class CreateMobileMoneyWithdrawalDto {
  @IsXOFAmount({ checkMobileMoneyLimits: true })
  amount: number;

  @IsMobileMoneyProvider()
  provider: string;

  @IsPhoneE164()
  phoneNumber: string;

  @IsWAEMUCountry({ acceptNames: false })
  countryCode: string;
}

/**
 * Example 3: Mobile Money Deposit
 * Deposit funds from mobile money account
 */
export class CreateMobileMoneyDepositDto {
  @IsXOFAmount({ min: 500, max: 1_000_000 })
  amount: number;

  @IsMobileMoneyProvider()
  provider: string;

  @IsPhoneE164()
  phoneNumber: string;
}

/**
 * Example 4: Country-Specific Transfer (Côte d'Ivoire)
 * Transfer with country-specific constraints
 */
export class CoteDIvoireTransferDto {
  @IsPhoneE164()
  recipientPhone: string;

  @IsXOFAmount({ min: 1000, max: 500_000 })
  amount: number;

  @IsMobileMoneyProvider({
    country: WAEMUCountry.COTE_IVOIRE,
  })
  provider: string;

  @IsWAEMUCountry({
    allowedCountries: [WAEMUCountry.COTE_IVOIRE],
  })
  country: string;
}

/**
 * Example 5: Senegal Transfer
 * Senegal-specific mobile money transfer
 */
export class SenegalTransferDto {
  @IsPhoneE164()
  recipientPhone: string;

  @IsXOFAmount({ min: 500, max: 200_000 })
  amount: number;

  @IsMobileMoneyProvider({
    country: WAEMUCountry.SENEGAL,
    // Allowed: orange_money, wave, free_money
  })
  provider: string;

  @IsWAEMUCountry({
    allowedCountries: [WAEMUCountry.SENEGAL],
    acceptNames: false,
  })
  country: string;
}

/**
 * Example 6: Refund DTO
 * Process refund with negative amount support
 */
export class CreateRefundDto {
  @IsUUID()
  originalTransactionId: string;

  @IsXOFAmount({ allowNegative: true })
  amount: number; // Can be negative for refunds

  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Example 7: International Transfer
 * Transfer to any E.164 phone number (not just WAEMU)
 */
export class InternationalTransferDto {
  @IsPhoneE164(false) // Non-strict: any E.164 number
  recipientPhone: string;

  @IsXOFAmount()
  amountXOF: number;

  @IsOptional()
  @IsString()
  recipientCountry?: string; // Can be any country
}

/**
 * Example 8: User Registration DTO
 * Register new user with West African details
 */
export class RegisterUserDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsPhoneE164()
  phoneNumber: string;

  @IsWAEMUCountry()
  country: string; // Accept both codes and names

  @IsOptional()
  @IsMobileMoneyProvider()
  preferredProvider?: string;
}

/**
 * Example 9: KYC Submission DTO
 * KYC verification with strict country validation
 */
export class SubmitKYCDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsPhoneE164()
  phoneNumber: string;

  @IsWAEMUCountry({ acceptNames: false })
  countryOfResidence: string; // ISO code only

  @IsString()
  @IsNotEmpty()
  documentNumber: string;

  @IsEnum(['passport', 'national_id', 'drivers_license'])
  documentType: string;
}

/**
 * Example 10: Bulk Transfer DTO
 * Transfer to multiple recipients
 */
export class BulkTransferRecipientDto {
  @IsPhoneE164()
  phoneNumber: string;

  @IsXOFAmount({ min: 100, max: 100_000 })
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateBulkTransferDto {
  @IsNotEmpty()
  recipients: BulkTransferRecipientDto[];

  @IsXOFAmount()
  totalAmount: number;

  @IsOptional()
  @IsWAEMUCountry({ acceptNames: false })
  country?: string;
}

/**
 * Example 11: Payment Link DTO
 * Create payment link with XOF amount
 */
export class CreatePaymentLinkDto {
  @IsXOFAmount({ min: 500, max: 5_000_000 })
  amount: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsMobileMoneyProvider()
  acceptedProviders?: string[];

  @IsOptional()
  @IsWAEMUCountry()
  restrictToCountry?: string;
}

/**
 * Example 12: Withdrawal Limits Configuration
 * Configure withdrawal limits per provider
 */
export class WithdrawalLimitDto {
  @IsMobileMoneyProvider()
  provider: string;

  @IsXOFAmount({ min: 100 })
  dailyLimit: number;

  @IsXOFAmount({ min: 100 })
  monthlyLimit: number;

  @IsWAEMUCountry({ acceptNames: false })
  country: string;
}

/**
 * Example 13: Quick Send DTO
 * Quick send to favorite contacts (limited providers)
 */
export class QuickSendDto {
  @IsPhoneE164()
  recipientPhone: string;

  @IsXOFAmount({ min: 100, max: 50_000 })
  amount: number;

  @IsMobileMoneyProvider({
    allowedProviders: [
      MobileMoneyProvider.ORANGE_MONEY,
      MobileMoneyProvider.WAVE,
    ],
  })
  provider: string; // Only Orange Money or Wave
}

/**
 * Example 14: Merchant Payment DTO
 * Payment to merchant with validation
 */
export class CreateMerchantPaymentDto {
  @IsUUID()
  merchantId: string;

  @IsXOFAmount()
  amount: number;

  @IsPhoneE164()
  customerPhone: string;

  @IsWAEMUCountry()
  country: string;

  @IsOptional()
  @IsMobileMoneyProvider()
  preferredProvider?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

/**
 * Example 15: Adjustment DTO
 * Financial adjustment (can be positive or negative)
 */
export class CreateAdjustmentDto {
  @IsUUID()
  userId: string;

  @IsXOFAmount({ allowNegative: true, allowZero: true })
  amount: number; // Can be negative, zero, or positive

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsEnum(['manual_correction', 'fee_reversal', 'system_error', 'other'])
  adjustmentType: string;
}
