import { IsNumber, IsString, IsIn, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiateWithdrawalDto {
  @ApiProperty({
    description: 'Withdrawal amount in USDC minor units (cents)',
    minimum: 100,
    example: 1000,
  })
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiProperty({
    description: 'Target currency for payout',
    enum: ['XOF'],
    example: 'XOF',
  })
  @IsString()
  @IsIn(['XOF'])
  currency: string;

  @ApiProperty({
    description: 'Payout provider code',
    example: 'OMCI',
    enum: ['OMCI', 'MTNCI', 'MOOVCI', 'WAVECI'],
  })
  @IsString()
  providerCode: string;

  @ApiProperty({
    description: 'Recipient phone number for MoMo payout',
    example: '+2250700000001',
  })
  @IsString()
  phoneNumber: string;
}
