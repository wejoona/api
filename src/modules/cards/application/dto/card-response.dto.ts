import { CardEntity } from '../../domain/entities/card.entity';

export class CardResponseDto {
  id: string;
  userId: string;
  walletId: string;
  cardNumber: string;
  maskedCardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cardholderName: string;
  cardType: string;
  status: string;
  spendingLimit: number;
  spentAmount: number;
  remainingLimit: number;
  currency: string;
  frozenAt: string | null;
  createdAt: string;
  updatedAt: string;

  static fromEntity(
    card: CardEntity,
    includeSensitive = false,
  ): CardResponseDto {
    return {
      id: card.id,
      userId: card.userId,
      walletId: card.walletId,
      cardNumber: includeSensitive ? card.cardNumber : card.maskedCardNumber,
      maskedCardNumber: card.maskedCardNumber,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      cardholderName: card.cardholderName,
      cardType: card.cardType,
      status: card.status,
      spendingLimit: card.spendingLimit,
      spentAmount: card.spentAmount,
      remainingLimit: card.remainingLimit,
      currency: card.currency,
      frozenAt: card.frozenAt?.toISOString() || null,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
    };
  }
}

export class CardListResponseDto {
  cards: CardResponseDto[];
  data: CardResponseDto[];
  available: boolean;
  status: 'available' | 'unavailable';
  reason: string | null;
  featureReason?: string | null;
  provider: string | null;

  static fromEntities(
    cards: CardEntity[],
    options: {
      available?: boolean;
      reason?: string | null;
      featureReason?: string | null;
      provider?: string | null;
    } = {},
  ): CardListResponseDto {
    const data = cards.map((card) => CardResponseDto.fromEntity(card, false));
    const available = options.available ?? true;
    return {
      cards: data,
      data,
      available,
      status: available ? 'available' : 'unavailable',
      reason: options.reason ?? null,
      featureReason: options.featureReason ?? null,
      provider: options.provider ?? null,
    };
  }
}
