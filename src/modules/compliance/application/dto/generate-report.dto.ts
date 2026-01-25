import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Generate Ad-Hoc Report DTO
 */
export class GenerateAdHocReportDto {
  @ApiProperty({
    description: 'Report period start date (ISO format)',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Report period end date (ISO format)',
    example: '2026-01-31T23:59:59.999Z',
  })
  @IsDateString()
  endDate: string;
}

/**
 * Approve Report DTO
 */
export class ApproveReportDto {
  @ApiProperty({
    description: 'Optional notes from reviewer',
    example: 'Report reviewed and approved for submission',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
