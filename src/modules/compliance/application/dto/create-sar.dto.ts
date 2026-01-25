import { IsString, IsArray, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Create Manual SAR DTO
 *
 * Used by compliance officers to manually flag suspicious activity
 */
export class CreateManualSARDto {
  @ApiProperty({
    description: 'User ID subject of the SAR',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Transaction IDs related to suspicious activity',
    example: [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
    ],
  })
  @IsArray()
  @IsString({ each: true })
  transactionIds: string[];

  @ApiProperty({
    description: 'Detailed narrative explaining suspicious activity',
    example:
      'User conducted multiple transactions just below reporting threshold within 24 hours...',
  })
  @IsString()
  narrative: string;

  @ApiProperty({
    description: 'Risk score (0-100)',
    example: 75,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  riskScore?: number;
}
