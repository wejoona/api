import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MerchantEntity } from '../../domain/entities/merchant.entity';
import { IMerchantRepository } from '../../domain/repositories/merchant.repository';
import { MerchantOrmEntity } from '../orm-entities/merchant.orm-entity';
import { MerchantMapper } from '../mappers/merchant.mapper';

@Injectable()
export class MerchantRepository implements IMerchantRepository {
  constructor(
    @InjectRepository(MerchantOrmEntity)
    private readonly repository: Repository<MerchantOrmEntity>,
    private readonly mapper: MerchantMapper,
  ) {}

  async findById(id: string): Promise<MerchantEntity | null> {
    const orm = await this.repository.findOne({ where: { id } });
    return orm ? this.mapper.toDomain(orm) : null;
  }

  async findByOwnerId(ownerId: string): Promise<MerchantEntity | null> {
    const orm = await this.repository.findOne({ where: { ownerId } });
    return orm ? this.mapper.toDomain(orm) : null;
  }

  async findByWalletId(walletId: string): Promise<MerchantEntity | null> {
    const orm = await this.repository.findOne({ where: { walletId } });
    return orm ? this.mapper.toDomain(orm) : null;
  }

  async findAllByOwnerId(ownerId: string): Promise<MerchantEntity[]> {
    const orms = await this.repository.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
    return orms.map((orm) => this.mapper.toDomain(orm));
  }

  async findByStatus(
    status: string,
    limit = 100,
    offset = 0,
  ): Promise<MerchantEntity[]> {
    const orms = await this.repository.find({
      where: { status },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return orms.map((orm) => this.mapper.toDomain(orm));
  }

  async save(merchant: MerchantEntity): Promise<MerchantEntity> {
    const persistence = this.mapper.toPersistence(merchant);
    const saved = await this.repository.save(persistence as MerchantOrmEntity);
    return this.mapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async existsByBusinessName(
    businessName: string,
    excludeId?: string,
  ): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder('merchant')
      .where('LOWER(merchant.business_name) = LOWER(:businessName)', {
        businessName,
      });

    if (excludeId) {
      query.andWhere('merchant.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  async countByOwnerId(ownerId: string): Promise<number> {
    return this.repository.count({ where: { ownerId } });
  }

  async resetAllDailyVolumes(): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(MerchantOrmEntity)
      .set({ dailyVolume: 0, updatedAt: new Date() })
      .execute();
  }

  async resetAllMonthlyVolumes(): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(MerchantOrmEntity)
      .set({ monthlyVolume: 0, updatedAt: new Date() })
      .execute();
  }
}
