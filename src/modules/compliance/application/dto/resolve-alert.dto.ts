import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Resolve Alert DTO
 */
export class ResolveAlertDto {
  @ApiProperty({
    description: 'Resolution explanation',
    example:
      'Verified legitimate business transaction with supporting documentation',
  })
  @IsString()
  resolution: string;

  @ApiProperty({
    description: 'Whether to escalate to full SAR investigation',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  escalateToSar?: boolean;
}
