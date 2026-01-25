import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

/**
 * Ignore Dead Letter DTO
 *
 * Request body for ignoring a dead-letter entry
 */
export class IgnoreDeadletterDto {
  @ApiProperty({
    description: 'User or system that ignored the entry',
    example: 'admin@joonapay.com',
  })
  @IsString()
  ignoredBy: string;

  @ApiProperty({
    description: 'Reason for ignoring the entry',
    example: 'Duplicate event, already processed under different webhook ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
