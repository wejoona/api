import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { AutoDepositFrequency } from '../../domain/entities/savings-pot.entity';

export class UpdateSavingsPotDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  targetAmount?: number;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @IsOptional()
  @IsDateString()
  lockUntil?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  autoDepositAmount?: number;

  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'])
  autoDepositFrequency?: AutoDepositFrequency;
}
