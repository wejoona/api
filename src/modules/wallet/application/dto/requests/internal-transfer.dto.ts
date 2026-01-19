import {
  IsNumber,
  IsString,
  IsNotEmpty,
  Min,
  Matches,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InternalTransferDto {
  @ApiProperty({
    description: 'Recipient phone number in international format',
    example: '+2250701234567',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone must be in international format (e.g., +2250701234567)',
  })
  toPhone: string;

  @ApiProperty({
    description: 'Amount in USD to transfer',
    example: 50,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Currency (defaults to USD)',
    example: 'USD',
    required: false,
  })
  @IsOptional()
  @IsString()
  currency?: string;
}
