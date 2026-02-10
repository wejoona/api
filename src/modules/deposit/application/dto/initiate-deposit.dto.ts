import { IsNumber, IsString, IsIn, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InitiateDepositDto {
  @ApiProperty({
    description: 'Deposit amount in minor currency units (centimes for XOF)',
    minimum: 100,
    example: 6000,
  })
  @IsNumber()
  @Min(100) // minimum 100 XOF
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    enum: ['XOF', 'XAF'],
    example: 'XOF',
  })
  @IsString()
  @IsIn(['XOF', 'XAF'])
  currency: string;

  @ApiProperty({
    description: 'Payment provider code',
    example: 'OMCI',
    enum: ['OMCI', 'MTNCI', 'MOOVCI', 'WAVECI'],
  })
  @IsString()
  providerCode: string; // OMCI, MTNCI, MOOVCI, WAVECI

  @ApiPropertyOptional({
    description: 'Phone number (defaults to user\'s registered phone)',
    example: '+2250700000001',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string; // defaults to user's registered phone
}