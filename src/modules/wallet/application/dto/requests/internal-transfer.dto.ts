import {
  IsNumber,
  IsString,
  IsNotEmpty,
  Min,
  Matches,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InternalTransferDto {
  @ApiProperty({
    description: 'Recipient phone number in international format',
    example: '+2250701234567',
    required: false,
  })
  @ValidateIf((dto) => !dto.recipientUsername)
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone must be in international format (e.g., +2250701234567)',
  })
  toPhone?: string;

  @ApiProperty({
    description: 'Recipient username/handle',
    example: 'aminata',
    required: false,
  })
  @ValidateIf((dto) => !dto.toPhone)
  @IsString()
  @IsNotEmpty()
  @Matches(/^@?[a-zA-Z0-9_]{3,20}$/, {
    message:
      'Username must be 3-20 characters and contain only letters, numbers, and underscores',
  })
  recipientUsername?: string;

  @ApiProperty({
    description: 'Amount in USDC to transfer',
    example: 50,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Currency (defaults to USDC)',
    example: 'USDC',
    required: false,
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    description: 'Optional transfer note',
    example: 'Lunch',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;
}
