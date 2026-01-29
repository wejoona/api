import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentRequestResponse {
  @ApiProperty({ example: 'REQ-ABC123' })
  requestId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  merchantId: string;

  @ApiProperty({ example: 'Cafe Abidjan' })
  merchantName: string;

  @ApiProperty({ example: 25.5 })
  amount: number;

  @ApiProperty({ example: 'USDC' })
  currency: string;

  @ApiPropertyOptional({ example: 'Coffee and croissant' })
  description?: string;

  @ApiProperty({ example: 'joonapay://pay?v=1&t=dynamic&m=...' })
  qrData: string;

  @ApiProperty({ example: 'https://api.qrserver.com/v1/create-qr-code/...' })
  qrCodeUrl: string;

  @ApiProperty({ example: '2026-01-25T10:15:00.000Z' })
  expiresAt: Date;

  @ApiProperty({ example: 900 })
  expiresInSeconds: number;
}

export class PaymentReceiptResponse {
  @ApiProperty({ example: 'PAY-ABC12345' })
  transactionId: string;

  @ApiProperty({ example: 'Cafe Abidjan' })
  merchantName: string;

  @ApiProperty({ example: 'restaurant' })
  merchantCategory: string;

  @ApiProperty({ example: 25.5 })
  amount: number;

  @ApiProperty({ example: 0.38 })
  fee: number;

  @ApiProperty({ example: 25.5 })
  total: number;

  @ApiProperty({ example: '2026-01-25T10:05:00.000Z' })
  timestamp: Date;

  @ApiProperty({ example: 'JNPY-20260125-XYZ789' })
  reference: string;
}

export class ProcessPaymentResponse {
  @ApiProperty({ example: 'PAY-ABC12345' })
  paymentId: string;

  @ApiProperty({ example: 'JNPY-20260125-XYZ789' })
  reference: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  merchantId: string;

  @ApiProperty({ example: 'Cafe Abidjan' })
  merchantName: string;

  @ApiProperty({ example: 25.5 })
  amount: number;

  @ApiProperty({ example: 0.38 })
  fee: number;

  @ApiProperty({ example: 25.12 })
  netAmount: number;

  @ApiProperty({ example: 'USDC' })
  currency: string;

  @ApiProperty({ example: 'completed' })
  status: string;

  @ApiProperty({ example: '2026-01-25T10:05:00.000Z' })
  createdAt: Date;

  @ApiProperty({ type: PaymentReceiptResponse })
  receipt: PaymentReceiptResponse;
}

export class MerchantTransactionResponse {
  @ApiProperty({ example: 'PAY-ABC12345' })
  paymentId: string;

  @ApiProperty({ example: 'JNPY-20260125-XYZ789' })
  reference: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002' })
  customerId: string;

  @ApiProperty({ example: 25.5 })
  amount: number;

  @ApiProperty({ example: 0.38 })
  fee: number;

  @ApiProperty({ example: 25.12 })
  netAmount: number;

  @ApiProperty({ example: 'USDC' })
  currency: string;

  @ApiPropertyOptional({ example: 'Coffee and croissant' })
  description?: string;

  @ApiProperty({ example: 'completed' })
  status: string;

  @ApiProperty({ example: '2026-01-25T10:05:00.000Z' })
  createdAt: Date;
}

export class MerchantTransactionListResponse {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  merchantId: string;

  @ApiProperty({ example: 'Cafe Abidjan' })
  merchantName: string;

  @ApiProperty({ type: [MerchantTransactionResponse] })
  transactions: MerchantTransactionResponse[];

  @ApiProperty({ example: 150 })
  total: number;

  @ApiProperty({ example: 50 })
  limit: number;

  @ApiProperty({ example: 0 })
  offset: number;
}
