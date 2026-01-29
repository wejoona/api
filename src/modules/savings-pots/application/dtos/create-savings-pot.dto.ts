import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { AutoDepositFrequency } from '../../domain/entities/savings-pot.entity';

export class CreateSavingsPotDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsNumber()
  @Min(0.01)
  targetAmount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

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
