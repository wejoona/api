import {
  IsNumber,
  IsString,
  IsNotEmpty,
  Min,
  Matches,
  IsOptional,
  ValidateIf,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const SUPPORTED_EXTERNAL_TRANSFER_NETWORKS = [
  'polygon',
  'ethereum',
  'base',
  'arbitrum',
  'avalanche',
  'optimism',
] as const;

export class ExternalTransferDto {
  @ApiProperty({
    description:
      'Recipient wallet address (Ethereum/EVM compatible). Can use "address" or "toAddress".',
    example: '0x1234567890abcdef1234567890abcdef12345678',
    required: false,
  })
  @ValidateIf((o) => !o.address)
  @IsNotEmpty({ message: 'Either toAddress or address must be provided' })
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message:
      'Must be a valid Ethereum address (0x followed by 40 hex characters)',
  })
  toAddress?: string;

  @ApiProperty({
    description:
      'Recipient wallet address (alternative field name for mobile compatibility)',
    example: '0x1234567890abcdef1234567890abcdef12345678',
    required: false,
  })
  @ValidateIf((o) => !o.toAddress)
  @IsNotEmpty({ message: 'Either address or toAddress must be provided' })
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message:
      'Must be a valid Ethereum address (0x followed by 40 hex characters)',
  })
  address?: string;

  // Helper method to get the actual address value
  getAddress(): string {
    return this.address || this.toAddress || '';
  }

  @ApiProperty({
    description: 'Amount in USDC to transfer',
    example: 50,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
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
    description: 'Blockchain network (defaults to polygon)',
    example: 'polygon',
    required: false,
    enum: SUPPORTED_EXTERNAL_TRANSFER_NETWORKS,
  })
  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_EXTERNAL_TRANSFER_NETWORKS, {
    message:
      'network must be one of: polygon, ethereum, base, arbitrum, avalanche, optimism',
  })
  network?: string;
}
