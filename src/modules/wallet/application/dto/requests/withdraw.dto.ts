import {
  IsNumber,
  IsString,
  IsNotEmpty,
  Min,
  Matches,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WithdrawDto {
  @ApiProperty({
    description: 'Amount in USD to withdraw',
    example: 50,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    description: 'Destination wallet address (Ethereum/EVM compatible)',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message:
      'Must be a valid Ethereum address (0x followed by 40 hex characters)',
  })
  destinationAddress: string;

  @ApiProperty({
    description: 'Blockchain network (defaults to polygon)',
    example: 'polygon',
    required: false,
    enum: ['polygon', 'ethereum', 'base'],
  })
  @IsOptional()
  @IsString()
  network?: string;

  @ApiProperty({
    description: 'Withdrawal method (optional)',
    example: 'blockchain',
    required: false,
  })
  @IsOptional()
  @IsString()
  method?: string;
}
