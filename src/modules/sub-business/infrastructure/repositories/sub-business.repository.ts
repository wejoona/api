import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubBusinessRepository } from '../../domain/repositories/sub-business.repository';
import { SubBusiness } from '../../domain/entities/sub-business.entity';
import { SubBusinessOrmEntity } from '../orm-entities/sub-business.orm-entity';
import { SubBusinessMapper } from '../mappers/sub-business.mapper';

@Injectable()
export class TypeOrmSubBusinessRepository extends SubBusinessRepository {
  constructor(
    @InjectRepository(SubBusinessOrmEntity)
    private readonly repo: Repository<SubBusinessOrmEntity>,
    private readonly mapper: SubBusinessMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<SubBusiness | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByBusinessId(businessId: string): Promise<SubBusiness[]> {
    const entities = await this.repo.find({ where: { businessId } });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findByWalletId(walletId: string): Promise<SubBusiness | null> {
    const entity = await this.repo.findOne({ where: { walletId } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async save(subBusiness: SubBusiness): Promise<SubBusiness> {
    const entity = this.mapper.toOrmEntity(subBusiness);
    const saved = await this.repo.save(entity);
    return this.mapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
