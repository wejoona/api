import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DepositStatus, PaymentMethodType, ProviderCode } from '../../domain/entities/deposit.entity';

export class DepositProviderDto {
  @ApiProperty() code: ProviderCode;
  @ApiProperty() name: string;
  @ApiProperty({ enum: PaymentMethodType }) paymentMethodType: PaymentMethodType;
  @ApiProperty() available: boolean;
}

export class DepositResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() amount: number;
  @ApiProperty() usdcAmount: number;
  @ApiProperty() exchangeRate: number;
  @ApiProperty({ enum: ProviderCode }) provider: ProviderCode;
  @ApiProperty({ enum: PaymentMethodType }) paymentMethodType: PaymentMethodType;
  @ApiProperty({ enum: DepositStatus }) status: DepositStatus;
  @ApiPropertyOptional() token?: string;
  @ApiPropertyOptional() instructions?: string;
  @ApiPropertyOptional() qrCodeData?: string;
  @ApiPropertyOptional() deepLinkUrl?: string;
  @ApiPropertyOptional() failureReason?: string;
  @ApiProperty() createdAt: Date;
}
