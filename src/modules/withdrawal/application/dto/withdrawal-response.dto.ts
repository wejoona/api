import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WithdrawalStatus } from '../../domain/enums/withdrawal-status.enum';

export class WithdrawalResponseDto {
  @ApiProperty({ example: 'wdr_12345678-1234-1234-1234-123456789012' })
  id: string;

  @ApiProperty({ enum: WithdrawalStatus })
  status: WithdrawalStatus;

  @ApiProperty({ description: 'USDC amount in minor units', example: 1000 })
  amount: number;

  @ApiProperty({ description: 'Fiat amount in minor units', example: 600000 })
  fiatAmount: number;

  @ApiProperty({ example: 'XOF' })
  currency: string;

  @ApiProperty({ example: 'OMCI' })
  providerCode: string;

  @ApiProperty({ example: '+2250700000001' })
  phoneNumber: string;

  @ApiPropertyOptional()
  exchangeRate?: number;

  @ApiPropertyOptional()
  providerReference?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  completedAt?: Date;
}
