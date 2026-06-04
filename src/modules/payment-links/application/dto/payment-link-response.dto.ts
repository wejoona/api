import { PaymentLinkStatus } from '../../domain/entities/payment-link.entity';

export class PaymentLinkResponseDto {
  id: string;
  userId: string;
  walletId: string;
  code: string;
  shortCode: string; // Alias for code (mobile compatibility)
  amount: number | null;
  currency: string;
  recipientName?: string; // Mobile expects this field
  description: string | null;
  status: PaymentLinkStatus | 'pending' | 'viewed'; // Extended statuses for mobile
  expiresAt: Date | null;
  paidAt: Date | null;
  paidByUserId: string | null;
  paidByPhone?: string; // Mobile expects this field
  paidByName?: string; // Mobile expects this field
  transactionId?: string; // Mobile expects this field for paid links
  amountDecimal?: string; // Decimal-safe amount for mobile money rendering
  supportReference?: string; // Stable customer support reference
  ledgerReference?: string | null; // Ledger/reference used for settlement
  providerReference?: string | null; // External provider reference when available
  viewCount: number;
  isExpired: boolean;
  isActive: boolean;
  isFlexibleAmount: boolean;
  url: string; // Mobile expects 'url' field
  shareUrl: string;
  createdAt: Date;
  updatedAt: Date;
}
