import {
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  Min,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduleFrequency } from '../../domain/interfaces/scheduled-payment.types';

const FREQUENCIES: ScheduleFrequency[] = [
  'once', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly',
];

export class CreateScheduleDto {
  @ApiProperty({ description: 'Schedule name', example: 'Monthly rent' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Schedule description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Recipient ID' })
  @IsString()
  recipientId: string;

  @ApiProperty({ description: 'Recipient type', enum: ['internal', 'external', 'merchant'] })
  @IsString()
  @IsIn(['internal', 'external', 'merchant'])
  recipientType: 'internal' | 'external' | 'merchant';

  @ApiPropertyOptional({ description: 'Recipient display name' })
  @IsOptional()
  @IsString()
  recipientName?: string;

  @ApiProperty({ description: 'Payment amount', example: 50000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'Currency code', example: 'XOF' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Payment frequency', enum: FREQUENCIES })
  @IsString()
  @IsIn(FREQUENCIES)
  frequency: ScheduleFrequency;

  @ApiPropertyOptional({ description: 'Day of week (0=Sun, 6=Sat)', minimum: 0, maximum: 6 })
  @IsOptional()
  @IsInt()
  dayOfWeek?: number;

  @ApiPropertyOptional({ description: 'Day of month (1-31)', minimum: 1, maximum: 31 })
  @IsOptional()
  @IsInt()
  dayOfMonth?: number;

  @ApiProperty({ description: 'Time of day (HH:mm)', example: '09:00' })
  @IsString()
  time: string;

  @ApiProperty({ description: 'Timezone', example: 'Africa/Abidjan' })
  @IsString()
  timezone: string;

  @ApiProperty({ description: 'Start date (ISO)', example: '2026-03-01' })
  @IsString()
  startDate: string;

  @ApiPropertyOptional({ description: 'End date (ISO)', example: '2026-12-31' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Maximum number of occurrences' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxOccurrences?: number;
}
