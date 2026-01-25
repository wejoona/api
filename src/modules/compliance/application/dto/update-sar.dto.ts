import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Update SAR Investigation DTO
 */
export class UpdateSARInvestigationDto {
  @ApiProperty({
    description: 'Investigation notes from compliance officer',
    example:
      'Reviewed transaction history. Pattern consistent with structuring. Recommend filing with BCEAO.',
  })
  @IsString()
  notes: string;
}

/**
 * Close SAR DTO
 */
export class CloseSARDto {
  @ApiProperty({
    description: 'Reason for closing SAR',
    example: 'False positive - legitimate business activity verified',
  })
  @IsString()
  reason: string;
}
