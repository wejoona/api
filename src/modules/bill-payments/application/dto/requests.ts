import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsUUID,
  IsEmail,
  IsPhoneNumber,
  Min,
  Max,
  MaxLength,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  BillCategory,
  BillPaymentStatus,
  SupportedCountry,
} from '../../domain/types';

// ============================================================================
// GET PROVIDERS
// ============================================================================

export class GetProvidersQueryDto {
  @ApiPropertyOptional({
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'CI',
    enum: [
      'CI',
      'SN',
      'ML',
      'BF',
      'BJ',
      'TG',
      'NE',
      'GW',
      'CM',
      'GA',
      'CG',
      'GH',
      'NG',
    ],
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  country?: SupportedCountry;

  @ApiPropertyOptional({
    description: 'Bill category',
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
  @IsOptional()
  @IsEnum([
    'electricity',
    'water',
    'internet',
    'tv',
    'phone_credit',
    'insurance',
    'education',
    'government',
  ])
  category?: BillCategory;
}

// ============================================================================
// VALIDATE ACCOUNT
// ============================================================================

export class ValidateAccountDto {
  @ApiProperty({
    description: 'Provider ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  providerId: string;

  @ApiProperty({
    description: 'Account or customer number',
    example: '1234567890',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  accountNumber: string;

  @ApiPropertyOptional({
    description: 'Meter number (for electricity/water)',
    example: 'MTR-12345678',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  meterNumber?: string;
}

// ============================================================================
// PAY BILL
// ============================================================================

export class PayBillDto {
  @ApiProperty({
    description: 'Provider ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  providerId: string;

  @ApiProperty({
    description: 'Account or customer number',
    example: '1234567890',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  accountNumber: string;

  @ApiPropertyOptional({
    description: 'Meter number (for electricity/water)',
    example: 'MTR-12345678',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  meterNumber?: string;

  @ApiPropertyOptional({
    description: 'Customer name (for verification)',
    example: 'Jean Kouassi',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  customerName?: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 5000,
    minimum: 100,
    maximum: 10000000,
  })
  @IsNumber()
  @Min(100)
  @Max(10000000)
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'XOF',
    default: 'XOF',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Phone number for receipt SMS',
    example: '+2250701234567',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Email for receipt',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}

// ============================================================================
// GET PAYMENT HISTORY
// ============================================================================

export class GetPaymentHistoryQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by category',
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
  @IsOptional()
  @IsEnum([
    'electricity',
    'water',
    'internet',
    'tv',
    'phone_credit',
    'insurance',
    'education',
    'government',
  ])
  category?: BillCategory;

  @ApiPropertyOptional({
    description: 'Filter by status',
    example: 'completed',
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
  })
  @IsOptional()
  @IsEnum(['pending', 'processing', 'completed', 'failed', 'refunded'])
  status?: BillPaymentStatus;

  @ApiPropertyOptional({
    description: 'Start date filter (ISO 8601)',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'End date filter (ISO 8601)',
    example: '2026-01-31T23:59:59.999Z',
  })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  endDate?: Date;
}
