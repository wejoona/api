import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsNotEmpty,
  Min,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum ProviderCode {
  OMCI = 'OMCI',     // Orange Money CI
  MTNCI = 'MTNCI',   // MTN MoMo CI  
  MOOVCI = 'MOOVCI', // Moov Money CI
  WAVECI = 'WAVECI', // Wave CI
}

export class InitiateDepositDto {
  @ApiProperty({
    description: 'Mobile money provider code',
    example: 'OMCI',
    enum: ProviderCode,
  })
  @IsEnum(ProviderCode)
  @IsNotEmpty()
  provider: ProviderCode;

  @ApiProperty({
    description: 'Deposit amount in XOF',
    example: 1000,
    minimum: 100,
  })
  @IsNumber()
  @Min(100)
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: 'Phone number for mobile money',
    example: '+2250700000001',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Transform(({ value }) => value?.trim())
  phoneNumber: string;
}