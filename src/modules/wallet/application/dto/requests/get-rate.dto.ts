import {
  IsNumber,
  IsString,
  IsNotEmpty,
  Min,
  IsOptional,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetRateDto {
  @ApiProperty({
    description: 'Source currency code',
    example: 'XOF',
  })
  @IsString()
  @IsNotEmpty()
  sourceCurrency: string;

  @ApiProperty({
    description: 'Target currency code',
    example: 'USD',
  })
  @IsString()
  @IsNotEmpty()
  targetCurrency: string;

  @ApiProperty({
    description: 'Amount in source currency',
    example: 10000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    description: 'Direction of the conversion',
    example: 'buy',
    required: false,
    enum: ['buy', 'sell'],
  })
  @IsOptional()
  @IsIn(['buy', 'sell'])
  direction?: 'buy' | 'sell';
}
