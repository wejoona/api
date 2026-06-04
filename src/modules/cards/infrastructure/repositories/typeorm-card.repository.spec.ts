import { Repository } from 'typeorm';
import { CardEntity } from '../../domain/entities/card.entity';
import { CardOrmEntity } from '../orm-entities/card.orm-entity';
import { TypeOrmCardRepository } from './typeorm-card.repository';

describe('TypeOrmCardRepository', () => {
  it('persists card_last_four for display-safe card records', () => {
    const repository = new TypeOrmCardRepository(
      {} as Repository<CardOrmEntity>,
    );
    const card = CardEntity.create({
      userId: 'user-1',
      walletId: 'wallet-1',
      cardholderName: 'E2E Test User',
      spendingLimit: 250,
    });

    const orm = (
      repository as unknown as {
        toOrmEntity(card: CardEntity): CardOrmEntity;
      }
    ).toOrmEntity(card);

    expect(orm.cardLastFour).toBe(card.cardNumber.slice(-4));
    expect(orm.cardLastFour).toHaveLength(4);
  });
});
