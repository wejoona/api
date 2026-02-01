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

  static fromEntities(cards: CardEntity[]): CardListResponseDto {
    return {
      cards: cards.map((card) => CardResponseDto.fromEntity(card, false)),
    };
  }
}
