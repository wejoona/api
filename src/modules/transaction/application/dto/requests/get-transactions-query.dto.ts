import {
  IsOptional,
  IsEnum,
  IsIn,
  IsDateString,
  IsNumber,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const TRANSACTION_TYPE_FILTERS = [
  'deposit',
  'withdrawal',
  'transfer_internal',
  'transfer_external',
  'internal_transfer_sent',
  'internal_transfer_received',
  'external_transfer',
  'mobile_money_deposit',
  'mobile_money_withdrawal',
  'all',
] as const;

export class GetTransactionsQueryDto {
  @ApiPropertyOptional({
    enum: TRANSACTION_TYPE_FILTERS,
    description: 'Filter by transaction type',
  })
  @IsOptional()
  @IsIn(TRANSACTION_TYPE_FILTERS)
  type?: string;

  @ApiPropertyOptional({
    enum: ['pending', 'processing', 'completed', 'failed'],
    description: 'Filter by transaction status',
  })
  @IsOptional()
  @IsEnum(['pending', 'processing', 'completed', 'failed'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter transactions from this date (ISO 8601 format)',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter transactions until this date (ISO 8601 format)',
    example: '2026-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter transactions with amount >= minAmount',
    minimum: 0,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({
    description: 'Filter transactions with amount <= maxAmount',
    example: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxAmount?: number;

  @ApiPropertyOptional({
    description: 'Search by reference, description, or recipient',
    example: 'payment',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({
    enum: ['createdAt', 'amount'],
    description: 'Field to sort by',
    default: 'createdAt',
  })
  @IsOptional()
  @IsEnum(['createdAt', 'amount'])
  sortBy?: 'createdAt' | 'amount';

  @ApiPropertyOptional({
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({
    description: 'Number of results per page',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Number of results to skip (for pagination)',
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

/**
 * Interface for transaction filters used in repository
 */
export interface TransactionFilters {
  type?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  sortBy?: 'createdAt' | 'amount';
  sortOrder?: 'ASC' | 'DESC';
  limit: number;
  offset: number;
}
