import { CardEntity } from '../entities/card.entity';

export abstract class CardRepository {
  abstract findById(id: string): Promise<CardEntity | null>;
  abstract findByUserId(userId: string): Promise<CardEntity[]>;
  abstract findByWalletId(walletId: string): Promise<CardEntity[]>;
  abstract findActiveByUserId(userId: string): Promise<CardEntity[]>;
  abstract save(card: CardEntity): Promise<CardEntity>;
  abstract delete(id: string): Promise<void>;
  abstract countByUserId(userId: string): Promise<number>;
}
