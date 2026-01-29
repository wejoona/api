import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsPositive,
  IsString,
  IsOptional,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';

export class ProcessPaymentDto {
  @ApiProperty({
    description: 'QR code data scanned from merchant',
    example:
      'joonapay://pay?v=1&t=static&m=123e4567-e89b-12d3-a456-426614174000&ts=1706000000000&s=abc123',
  })
  @IsString()
  @IsNotEmpty()
  qrData: string;

  @ApiPropertyOptional({
    description:
      'Payment amount (required for static QR, optional for dynamic QR)',
    example: 25.5,
    minimum: 0.01,
    maximum: 10000,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @IsPositive()
  @Min(0.01)
  @Max(10000)
  amount?: number;
}

export class DecodeQrDto {
  @ApiProperty({
    description: 'QR code data to decode',
    example:
      'joonapay://pay?v=1&t=static&m=123e4567-e89b-12d3-a456-426614174000&ts=1706000000000&s=abc123',
  })
  @IsString()
  @IsNotEmpty()
  qrData: string;
}
