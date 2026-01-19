import {
  IsNumber,
  IsString,
  IsNotEmpty,
  Min,
  Matches,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExternalTransferDto {
  @ApiProperty({
    description: 'Recipient wallet address (Ethereum/EVM compatible)',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message:
      'Must be a valid Ethereum address (0x followed by 40 hex characters)',
  })
  toAddress: string;

  @ApiProperty({
    description: 'Amount in USD to transfer',
    example: 50,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    description: 'Currency (defaults to USD)',
    example: 'USD',
    required: false,
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    description: 'Blockchain network (defaults to polygon)',
    example: 'polygon',
    required: false,
    enum: ['polygon', 'ethereum', 'base'],
  })
  @IsOptional()
  @IsString()
  network?: string;
}
