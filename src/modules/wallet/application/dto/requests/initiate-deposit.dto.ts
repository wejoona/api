import { IsNumber, IsString, IsNotEmpty, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiateDepositDto {
  @ApiProperty({
    description: 'Amount in source currency (e.g., XOF)',
    example: 10000,
    minimum: 1,
    maximum: 10000000,
  })
  @IsNumber()
  @Min(1)
  @Max(10000000)
  amount: number;

  @ApiProperty({
    description: 'Source currency code',
    example: 'XOF',
  })
  @IsString()
  @IsNotEmpty()
  sourceCurrency: string;

  @ApiProperty({
    description: 'Payment channel ID (from /wallet/deposit/channels)',
    example: 'orange_money_ci',
  })
  @IsString()
  @IsNotEmpty()
  channelId: string;
}
