import {
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  IsInt,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduleFrequency } from '../../domain/interfaces/scheduled-payment.types';

const FREQUENCIES: ScheduleFrequency[] = [
  'once', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly',
];

export class UpdateScheduleDto {
  @ApiPropertyOptional({ description: 'Schedule name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Schedule description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Payment amount' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @ApiPropertyOptional({ description: 'Payment frequency', enum: FREQUENCIES })
  @IsOptional()
  @IsString()
  @IsIn(FREQUENCIES)
  frequency?: ScheduleFrequency;

  @ApiPropertyOptional({ description: 'Day of week (0-6)' })
  @IsOptional()
  @IsInt()
  dayOfWeek?: number;

  @ApiPropertyOptional({ description: 'Day of month (1-31)' })
  @IsOptional()
  @IsInt()
  dayOfMonth?: number;

  @ApiPropertyOptional({ description: 'Time of day (HH:mm)' })
  @IsOptional()
  @IsString()
  time?: string;

  @ApiPropertyOptional({ description: 'End date (ISO)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Maximum number of occurrences' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxOccurrences?: number;
}
