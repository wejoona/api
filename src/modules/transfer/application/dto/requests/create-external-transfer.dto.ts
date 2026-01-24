import {
  IsNumber,
  IsString,
  IsNotEmpty,
  Min,
  Matches,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExternalTransferDto {
  @ApiProperty({
    description: 'Recipient blockchain wallet address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'Address must be a valid Ethereum/EVM address',
  })
  recipientAddress: string;

  @ApiProperty({
    description: 'Amount in USDC to transfer (in cents, e.g., 5000 = $50.00)',
    example: 5000,
    minimum: 100,
  })
  @IsNumber()
  @Min(100, { message: 'Minimum transfer amount is $1.00' })
  amount: number;

  @ApiPropertyOptional({
    description: 'Blockchain network (defaults to polygon)',
    example: 'polygon',
    enum: ['polygon', 'ethereum', 'avalanche', 'solana'],
  })
  @IsOptional()
  @IsString()
  network?: string;

  @ApiPropertyOptional({
    description: 'Currency (defaults to USDC)',
    example: 'USDC',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Optional note for the transfer',
    example: 'Withdrawal to personal wallet',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  note?: string;
}
