import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DeleteTransactionDto {
  @ApiPropertyOptional({ description: 'Reason for cancellation/deletion' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
