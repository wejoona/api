import {
  IsNumber,
  IsString,
  IsNotEmpty,
  Min,
  Matches,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SanitizeNote } from '../../../../../common/decorators';

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
    description: 'Amount in USDC major units to transfer (e.g., 50.25)',
    example: 50.25,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
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
  // SECURITY: Sanitize note to prevent stored XSS (OWASP A03:2021)
  @SanitizeNote(500)
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Note cannot exceed 500 characters' })
  note?: string;
}
