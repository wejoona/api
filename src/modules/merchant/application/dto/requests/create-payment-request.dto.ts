import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsPositive,
  IsString,
  IsOptional,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreatePaymentRequestDto {
  @ApiProperty({
    description: 'Payment amount in USDC',
    example: 25.5,
    minimum: 0.01,
    maximum: 10000,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(0.01)
  @Max(10000)
  amount: number;

  @ApiPropertyOptional({
    description: 'Currency (default: USDC)',
    example: 'USDC',
    default: 'USDC',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Payment description',
    example: 'Coffee and croissant',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Merchant reference (e.g., order number)',
    example: 'ORD-12345',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  reference?: string;

  @ApiPropertyOptional({
    description: 'Expiration time in minutes (default: 15)',
    example: 15,
    minimum: 1,
    maximum: 60,
    default: 15,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(60)
  expiresInMinutes?: number;
}
