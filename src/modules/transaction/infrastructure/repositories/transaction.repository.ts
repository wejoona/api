import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionMapper } from '../mappers/transaction.mapper';
import { TransactionOrmEntity } from '../orm-entities/transaction.orm-entity';
import { TransactionEntity } from '../../domain/entities/transaction.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TransactionRepository {
  constructor(
    @InjectRepository(TransactionOrmEntity)
    private readonly repository: Repository<TransactionOrmEntity>,
    private readonly mapper: TransactionMapper,
  ) {}

  async save(entity: TransactionEntity): Promise<TransactionEntity> {
    const ormEntity = this.mapper.toOrmEntity(entity);
    const savedOrmEntity = await this.repository.save(ormEntity);
    return this.mapper.toDomainEntity(savedOrmEntity);
  }

  async findById(id: string): Promise<TransactionEntity | null> {
    const ormEntity = await this.repository.findOne({
      where: { id },
    });
    if (!ormEntity) {
      return null;
    }
    return this.mapper.toDomainEntity(ormEntity);
  }

  async findByWalletId(walletId: string): Promise<TransactionEntity[]> {
    const ormEntities = await this.repository.find({
      where: { walletId },
      order: { createdAt: 'DESC' },
    });
    return ormEntities.map((ormEntity) =>
      this.mapper.toDomainEntity(ormEntity),
    );
  }

  async findByYellowCardRef(
    yellowCardRef: string,
  ): Promise<TransactionEntity | null> {
    const ormEntity = await this.repository.findOne({
      where: { yellowCardRef },
    });
    if (!ormEntity) {
      return null;
    }
    return this.mapper.toDomainEntity(ormEntity);
  }

  // Generic alias for provider reference lookup (decoupled from Yellow Card naming)
  async findByProviderRef(
    providerRef: string,
  ): Promise<TransactionEntity | null> {
    return this.findByYellowCardRef(providerRef);
  }

  async findPendingByWalletId(walletId: string): Promise<TransactionEntity[]> {
    const ormEntities = await this.repository.find({
      where: { walletId, status: 'pending' },
      order: { createdAt: 'DESC' },
    });
    return ormEntities.map((ormEntity) =>
      this.mapper.toDomainEntity(ormEntity),
    );
  }

  async findAll(): Promise<TransactionEntity[]> {
    const ormEntities = await this.repository.find({
      order: { createdAt: 'DESC' },
    });
    if (!ormEntities) {
      return [];
    }
    return ormEntities.map((ormEntity) =>
      this.mapper.toDomainEntity(ormEntity),
    );
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
