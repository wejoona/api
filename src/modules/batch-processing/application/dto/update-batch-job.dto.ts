import { IsString, IsOptional } from 'class-validator';

export class UpdateBatchJobDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
