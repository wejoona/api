import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsDateString,
  MaxLength,
  Matches,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Supported currencies for payment links
 * SECURITY: Enum validation prevents arbitrary currency injection
 */
export enum PaymentLinkCurrency {
  USD = 'USD',
  USDC = 'USDC',
  XOF = 'XOF',
}

export class CreatePaymentLinkDto {
  @ApiPropertyOptional({
    description: 'Payment amount (optional for tip/donation links)',
    minimum: 0.01,
    maximum: 1000000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'Amount must be at least $0.01' })
  @Max(1000000, { message: 'Amount cannot exceed $1,000,000' })
  amount?: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    enum: PaymentLinkCurrency,
    default: 'USD',
  })
  @IsOptional()
  @IsEnum(PaymentLinkCurrency, {
    message: 'Currency must be USD, USDC, or XOF',
  })
  currency?: PaymentLinkCurrency;

  @ApiPropertyOptional({
    description: 'Payment link description',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  // SECURITY: Sanitize HTML/script tags to prevent XSS
  @Matches(/^[^<>]*$/, {
    message: 'Description cannot contain HTML tags',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Expiration date (ISO 8601 format)',
    example: '2026-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'expiresAt must be a valid ISO 8601 date' })
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Expiration time in hours from now (alternative to expiresAt)',
    minimum: 1,
    maximum: 8760, // 1 year
    example: 24,
  })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Expiry hours must be at least 1' })
  @Max(8760, { message: 'Expiry hours cannot exceed 1 year' })
  expiryHours?: number;
}
