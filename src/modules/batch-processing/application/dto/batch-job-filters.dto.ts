import { IsOptional, IsEnum, IsDateString, IsString } from 'class-validator';
import {
  BatchJobType,
  BatchJobStatus,
} from '../../domain/entities/batch-job.entity';

export class BatchJobFiltersDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsEnum(BatchJobType)
  type?: BatchJobType;

  @IsOptional()
  @IsEnum(BatchJobStatus)
  status?: BatchJobStatus;

  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @IsOptional()
  @IsDateString()
  createdBefore?: string;
}
