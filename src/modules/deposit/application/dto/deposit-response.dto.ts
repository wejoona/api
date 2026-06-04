import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethodType } from '../../domain/enums/payment-method-type.enum';
import { DepositStatus } from '../../domain/enums/deposit-status.enum';

export class InitiateDepositResponseDto {
  @ApiProperty({
    description: 'Unique deposit identifier',
    example: 'dep_12345678-1234-1234-1234-123456789012',
  })
  depositId: string;

  @ApiProperty({
    description: 'Encrypted token for confirmation',
    example: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...',
  })
  token: string;

  @ApiProperty({
    description: 'Payment method type',
    enum: PaymentMethodType,
    example: PaymentMethodType.OTP,
  })
  paymentMethodType: PaymentMethodType;

  @ApiProperty({
    description: 'User instructions for completing the payment',
    example: 'Composez #144*82# pour obtenir votre code OTP',
  })
  instructions: string;

  @ApiPropertyOptional({
    description: 'QR code data (for QR_LINK payment methods)',
    example: 'wave://pay?amount=6000&currency=XOF&ref=dep_12345',
  })
  qrCodeData?: string;

  @ApiPropertyOptional({
    description: 'Deep link URL (for QR_LINK payment methods)',
    example: 'https://wave.com/pay?amount=6000&currency=XOF&ref=dep_12345',
  })
  deepLinkUrl?: string;

  @ApiProperty({
    description: 'Token expiration time',
    example: '2026-02-10T01:46:00.000Z',
  })
  expiresAt: string;
}

export class DepositStatusResponseDto {
  @ApiProperty({
    description: 'Unique deposit identifier',
    example: 'dep_12345678-1234-1234-1234-123456789012',
  })
  id: string;

  @ApiProperty({
    description: 'Deposit status',
    enum: DepositStatus,
    example: DepositStatus.COMPLETED,
  })
  status: DepositStatus;

  @ApiProperty({
    description: 'Deposit amount in minor currency units',
    example: 6000,
  })
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'XOF',
  })
  currency: string;

  @ApiProperty({
    description: 'Provider code',
    example: 'OMCI',
  })
  providerCode: string;

  @ApiProperty({
    description: 'Payment method type',
    enum: PaymentMethodType,
    example: PaymentMethodType.OTP,
  })
  paymentMethodType: PaymentMethodType;

  @ApiPropertyOptional({
    description: 'Provider transaction reference',
  })
  providerReference?: string;

  @ApiPropertyOptional({
    description: 'Failure reason (if status is FAILED)',
  })
  failureReason?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-02-10T00:46:00.000Z',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Completion timestamp',
    example: '2026-02-10T00:51:00.000Z',
  })
  completedAt?: Date;
}

export class ProviderInfoDto {
  @ApiProperty({
    description: 'Provider code',
    example: 'OMCI',
  })
  code: string;

  @ApiProperty({
    description: 'Provider name',
    example: "Orange Money Côte d'Ivoire",
  })
  name: string;

  @ApiProperty({
    description: 'Payment method type',
    enum: PaymentMethodType,
    example: PaymentMethodType.OTP,
  })
  paymentMethodType: PaymentMethodType;

  @ApiProperty({
    description: 'Supported currencies',
    example: ['XOF'],
  })
  supportedCurrencies: string[];

  @ApiPropertyOptional({
    description: 'Provider runtime status',
    example: 'mock',
  })
  status?: 'mock' | 'available' | 'unavailable';

  @ApiPropertyOptional({
    description: 'Whether the provider can currently initiate deposits',
    example: true,
  })
  available?: boolean;

  @ApiPropertyOptional({
    description: 'Stable machine-readable reason when unavailable',
    example: 'provider_not_implemented',
  })
  reason?: string | null;

  @ApiPropertyOptional({
    description: 'Feature-specific reason for client messaging',
    example: 'deposit_provider_not_connected',
  })
  featureReason?: string | null;
}
