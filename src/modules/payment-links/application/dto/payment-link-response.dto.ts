import { PaymentLinkStatus } from '../../domain/entities/payment-link.entity';

export class PaymentLinkResponseDto {
  id!: string;
  userId!: string;
  walletId!: string;
  code!: string;
  amount!: number | null;
  currency!: string;
  description!: string | null;
  status!: PaymentLinkStatus;
  expiresAt!: Date | null;
  paidAt!: Date | null;
  paidByUserId!: string | null;
  viewCount!: number;
  isExpired!: boolean;
  isActive!: boolean;
  isFlexibleAmount!: boolean;
  shareUrl!: string;
  createdAt!: Date;
  updatedAt!: Date;
}
