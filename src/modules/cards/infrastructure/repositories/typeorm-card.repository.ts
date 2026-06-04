import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CardRepository } from '../../domain/repositories/card.repository';
import {
  CardEntity,
  CardType,
  CardStatus,
} from '../../domain/entities/card.entity';
import { CardOrmEntity } from '../orm-entities/card.orm-entity';

@Injectable()
export class TypeOrmCardRepository extends CardRepository {
  constructor(
    @InjectRepository(CardOrmEntity)
    private readonly repo: Repository<CardOrmEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<CardEntity | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByUserId(userId: string): Promise<CardEntity[]> {
    const entities = await this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByWalletId(walletId: string): Promise<CardEntity[]> {
    const entities = await this.repo.find({
      where: { walletId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findActiveByUserId(userId: string): Promise<CardEntity[]> {
    const entities = await this.repo.find({
      where: { userId, status: 'active' },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async save(card: CardEntity): Promise<CardEntity> {
    const entity = this.toOrmEntity(card);
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async countByUserId(userId: string): Promise<number> {
    return this.repo.count({ where: { userId } });
  }

  private toDomain(entity: CardOrmEntity): CardEntity {
    return CardEntity.reconstitute({
      id: entity.id,
      userId: entity.userId,
      walletId: entity.walletId,
      cardNumber: entity.cardNumberEncrypted,
      cvv: entity.cvvEncrypted || '',
      expiryMonth: entity.expiryMonth,
      expiryYear: entity.expiryYear,
      cardholderName: entity.cardholderName,
      cardType: entity.cardType as CardType,
      status: entity.status as CardStatus,
      spendingLimit: Number(entity.spendingLimit),
      spentAmount: Number(entity.spentAmount),
      currency: entity.currency,
      frozenAt: entity.frozenAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private toOrmEntity(card: CardEntity): CardOrmEntity {
    const entity = new CardOrmEntity();
    entity.id = card.id;
    entity.userId = card.userId;
    entity.walletId = card.walletId;
    entity.cardNumberEncrypted = card.cardNumber;
    entity.cardLastFour = card.cardNumber.slice(-4);
    entity.cvvEncrypted = null; // CVV must NOT be persisted (PCI DSS)
    entity.expiryMonth = card.expiryMonth;
    entity.expiryYear = card.expiryYear;
    entity.cardholderName = card.cardholderName;
    entity.cardType = card.cardType;
    entity.status = card.status;
    entity.spendingLimit = card.spendingLimit;
    entity.spentAmount = card.spentAmount;
    entity.currency = card.currency;
    entity.frozenAt = card.frozenAt;
    entity.createdAt = card.createdAt;
    entity.updatedAt = card.updatedAt;
    return entity;
  }
}
