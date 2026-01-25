import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

/**
 * Resolve Dead Letter DTO
 *
 * Request body for resolving a dead-letter entry
 */
export class ResolveDeadletterDto {
  @ApiProperty({
    description: 'User or system that resolved the entry',
    example: 'admin@joonapay.com',
  })
  @IsString()
  resolvedBy: string;

  @ApiProperty({
    description: 'Optional notes about the resolution',
    example: 'Manually reprocessed the deposit after investigating the error',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
