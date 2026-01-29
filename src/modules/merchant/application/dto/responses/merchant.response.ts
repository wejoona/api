import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MerchantResponse {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  merchantId: string;

  @ApiProperty({ example: 'Cafe Abidjan SARL' })
  businessName: string;

  @ApiProperty({ example: 'Cafe Abidjan' })
  displayName: string;

  @ApiProperty({ example: 'restaurant' })
  category: string;

  @ApiProperty({ example: 'CI' })
  country: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  walletId: string;

  @ApiProperty({ example: 'joonapay://pay?v=1&t=static&m=...' })
  qrCode: string;

  @ApiPropertyOptional({
    example: 'https://api.qrserver.com/v1/create-qr-code/...',
  })
  qrCodeUrl?: string;

  @ApiProperty({ example: true })
  isVerified: boolean;

  @ApiProperty({ example: 1.5 })
  feePercent: number;

  @ApiProperty({ example: 10000 })
  dailyLimit: number;

  @ApiProperty({ example: 100000 })
  monthlyLimit: number;

  @ApiProperty({ example: 2500 })
  dailyVolume: number;

  @ApiProperty({ example: 45000 })
  monthlyVolume: number;

  @ApiProperty({ example: 7500 })
  remainingDailyLimit: number;

  @ApiProperty({ example: 55000 })
  remainingMonthlyLimit: number;

  @ApiProperty({ example: 150 })
  totalTransactions: number;

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiPropertyOptional({ example: 'Rue du Commerce, Plateau, Abidjan' })
  businessAddress?: string;

  @ApiPropertyOptional({ example: '+2250700000000' })
  businessPhone?: string;

  @ApiPropertyOptional({ example: 'contact@cafeabidjan.ci' })
  businessEmail?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  logoUrl?: string;

  @ApiProperty({ example: '2026-01-25T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-25T10:00:00.000Z' })
  updatedAt: Date;
}

export class MerchantSummaryResponse {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  merchantId: string;

  @ApiProperty({ example: 'Cafe Abidjan' })
  displayName: string;

  @ApiProperty({ example: 'restaurant' })
  category: string;

  @ApiProperty({ example: true })
  isVerified: boolean;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  logoUrl?: string;
}
