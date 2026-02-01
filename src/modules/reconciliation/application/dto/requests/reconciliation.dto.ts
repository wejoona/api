import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ReconciliationReportType,
  ReconciliationReportStatus,
} from '../../../domain/entities/reconciliation-report.entity';

/**
 * Run Reconciliation Request DTO
 */
export class RunReconciliationDto {
  @ApiProperty({
    description: 'Type of reconciliation to run',
    enum: ReconciliationReportType,
    example: ReconciliationReportType.DAILY_TRANSACTION,
  })
  @IsEnum(ReconciliationReportType)
  type: ReconciliationReportType;

  @ApiProperty({
    description: 'Start of reconciliation period',
    example: '2024-01-28T00:00:00Z',
  })
  @IsDateString()
  periodStart: string;

  @ApiProperty({
    description: 'End of reconciliation period',
    example: '2024-01-28T23:59:59Z',
  })
  @IsDateString()
  periodEnd: string;
}

/**
 * Query Reconciliation Reports DTO
 */
export class QueryReconciliationReportsDto {
  @ApiPropertyOptional({
    description: 'Filter by report type',
    enum: ReconciliationReportType,
  })
  @IsOptional()
  @IsEnum(ReconciliationReportType)
  type?: ReconciliationReportType;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ReconciliationReportStatus,
  })
  @IsOptional()
  @IsEnum(ReconciliationReportStatus)
  status?: ReconciliationReportStatus;

  @ApiPropertyOptional({
    description: 'Filter by period start (from)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  periodStartFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by period end (to)',
    example: '2024-01-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  periodEndTo?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of results',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Offset for pagination',
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  offset?: number;
}

/**
 * Mark Report Reviewed DTO
 */
export class MarkReportReviewedDto {
  @ApiPropertyOptional({
    description: 'Notes from reviewer',
    example: 'Verified all discrepancies, no action needed',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Get Provider Settlement DTO
 */
export class GetProviderSettlementDto {
  @ApiProperty({
    description: 'Provider name',
    example: 'yellowcard',
  })
  @IsString()
  provider: string;

  @ApiProperty({
    description: 'Start of period',
    example: '2024-01-28T00:00:00Z',
  })
  @IsDateString()
  periodStart: string;

  @ApiProperty({
    description: 'End of period',
    example: '2024-01-28T23:59:59Z',
  })
  @IsDateString()
  periodEnd: string;
}

/**
 * Verify Transaction Fee DTO
 */
export class VerifyTransactionFeeDto {
  @ApiProperty({
    description: 'Transaction ID to verify',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  transactionId: string;
}

/**
 * Generate Settlement Report DTO
 */
export class GenerateSettlementReportDto {
  @ApiProperty({
    description: 'Start of settlement period',
    example: '2024-01-28T00:00:00Z',
  })
  @IsDateString()
  periodStart: string;

  @ApiProperty({
    description: 'End of settlement period',
    example: '2024-01-28T23:59:59Z',
  })
  @IsDateString()
  periodEnd: string;
}

/**
 * Generate Monthly Settlement DTO
 */
export class GenerateMonthlySettlementDto {
  @ApiProperty({
    description: 'Year',
    example: 2024,
  })
  @Type(() => Number)
  year: number;

  @ApiProperty({
    description: 'Month (1-12)',
    example: 1,
  })
  @Type(() => Number)
  month: number;
}

/**
 * Reconcile Provider DTO
 */
export class ReconcileProviderDto {
  @ApiProperty({
    description: 'Provider to reconcile',
    enum: ['blnk', 'circle'],
    example: 'blnk',
  })
  @IsString()
  provider: 'blnk' | 'circle';
}
