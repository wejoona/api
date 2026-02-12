import { IsInt, IsIn, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateQuarterlySummaryDto {
  @ApiProperty({ description: 'Quarter (1-4)', example: 1, enum: [1, 2, 3, 4] })
  @IsInt()
  @IsIn([1, 2, 3, 4])
  quarter: 1 | 2 | 3 | 4;

  @ApiProperty({ description: 'Year', example: 2026 })
  @IsInt()
  @Min(2020)
  @Max(2100)
  year: number;
}
