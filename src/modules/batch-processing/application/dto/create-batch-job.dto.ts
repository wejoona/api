import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsObject,
  IsNumber,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import {
  BatchJobType,
  BatchJobPriority,
} from '../../domain/entities/batch-job.entity';

export class CreateBatchJobDto {
  @IsEnum(BatchJobType)
  @IsNotEmpty()
  type: BatchJobType;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(BatchJobPriority)
  priority?: BatchJobPriority;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsObject()
  @IsNotEmpty()
  payload: Record<string, any>;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedItemCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxRetries?: number;
}
