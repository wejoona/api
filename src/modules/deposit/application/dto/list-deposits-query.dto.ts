import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DepositStatus } from '../../domain/enums/deposit-status.enum';

export class ListDepositsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: DepositStatus })
  @IsOptional()
  @IsEnum(DepositStatus)
  status?: DepositStatus;

  @ApiPropertyOptional({ description: 'Max results', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Offset for pagination', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
