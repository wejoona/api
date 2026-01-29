import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavingsPotMapper } from '../mappers/savings-pot.mapper';
import { SavingsPotOrmEntity } from '../orm-entities/savings-pot.orm-entity';
import { SavingsPotEntity } from '../../domain/entities/savings-pot.entity';
import { ISavingsPotRepository } from '../../domain/repositories/savings-pot.repository';

@Injectable()
export class SavingsPotRepository implements ISavingsPotRepository {
  constructor(
    @InjectRepository(SavingsPotOrmEntity)
    private readonly repository: Repository<SavingsPotOrmEntity>,
    private readonly mapper: SavingsPotMapper,
  ) {}

  async save(entity: SavingsPotEntity): Promise<SavingsPotEntity> {
    const ormEntity = this.mapper.toOrmEntity(entity);
    const savedOrmEntity = await this.repository.save(ormEntity);
    return this.mapper.toDomainEntity(savedOrmEntity);
  }

  async findById(id: string): Promise<SavingsPotEntity | null> {
    const ormEntity = await this.repository.findOne({
      where!: { id },
    });
    if (!ormEntity) {
      return null;
    }
    return this.mapper.toDomainEntity(ormEntity);
  }

  async findByWalletId(walletId: string): Promise<SavingsPotEntity[]> {
    const ormEntities = await this.repository.find({
      where!: { walletId },
      order: { createdAt: 'DESC' },
    });
    return ormEntities.map((e) => this.mapper.toDomainEntity(e));
  }

  async findActiveByWalletId(walletId: string): Promise<SavingsPotEntity[]> {
    const ormEntities = await this.repository.find({
      where!: { walletId, status: 'active' },
      order: { createdAt: 'DESC' },
    });
    return ormEntities.map((e) => this.mapper.toDomainEntity(e));
  }

  async findWithAutoDeposit(): Promise<SavingsPotEntity[]> {
    const ormEntities = await this.repository
      .createQueryBuilder('sp')
      .where('sp.status = :status', { status: 'active' })
      .andWhere('sp.auto_deposit_frequency IS NOT NULL')
      .andWhere('sp.auto_deposit_amount IS NOT NULL')
      .getMany();
    return ormEntities.map((e) => this.mapper.toDomainEntity(e));
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
