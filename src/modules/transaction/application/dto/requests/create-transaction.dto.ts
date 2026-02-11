import { IsString, IsNumber, IsOptional, IsUUID, IsEnum, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER = 'transfer',
  PAYMENT = 'payment',
}

export class CreateTransactionDto {
  @ApiProperty({ description: 'Sender wallet ID' })
  @IsUUID()
  fromWalletId: string;

  @ApiPropertyOptional({ description: 'Recipient wallet ID (for transfers)' })
  @IsOptional()
  @IsUUID()
  toWalletId?: string;

  @ApiProperty({ description: 'Amount in smallest unit', minimum: 1 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'Currency code', default: 'USDC' })
  @IsString()
  @MaxLength(10)
  currency: string;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiPropertyOptional({ description: 'Transaction note/memo' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ description: 'External reference ID' })
  @IsOptional()
  @IsString()
  externalReference?: string;
}
