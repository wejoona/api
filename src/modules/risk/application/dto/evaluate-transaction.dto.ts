import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsIn,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EvaluateTransactionDto {
  @ApiProperty({ description: 'Transaction type', enum: ['transfer', 'deposit', 'withdrawal', 'exchange'] })
  @IsString()
  @IsIn(['transfer', 'deposit', 'withdrawal', 'exchange'])
  type: 'transfer' | 'deposit' | 'withdrawal' | 'exchange';

  @ApiProperty({ description: 'Transaction amount', example: 50000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Currency code', example: 'XOF' })
  @IsString()
  currency: string;

  @ApiPropertyOptional({ description: 'Recipient ID' })
  @IsOptional()
  @IsString()
  recipientId?: string;

  @ApiPropertyOptional({ description: 'Recipient type', enum: ['internal', 'external', 'merchant'] })
  @IsOptional()
  @IsString()
  @IsIn(['internal', 'external', 'merchant'])
  recipientType?: 'internal' | 'external' | 'merchant';

  @ApiPropertyOptional({ description: 'Whether this is first transaction to this recipient' })
  @IsOptional()
  @IsBoolean()
  isFirstTransactionToRecipient?: boolean;

  @ApiPropertyOptional({ description: 'Device ID' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
