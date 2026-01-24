import {
  IsNumber,
  IsString,
  IsNotEmpty,
  Min,
  Matches,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInternalTransferDto {
  @ApiProperty({
    description: 'Recipient phone number in international format',
    example: '+2250701234567',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone must be in international format (e.g., +2250701234567)',
  })
  recipientPhone: string;

  @ApiProperty({
    description: 'Amount in USDC to transfer (in cents, e.g., 5000 = $50.00)',
    example: 5000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({
    description: 'Currency (defaults to USDC)',
    example: 'USDC',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Optional note/message for the transfer',
    example: 'Payment for lunch',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  note?: string;
}
