import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureFlagRepository } from '../../domain/repositories/feature-flag.repository';
import { FeatureFlag } from '../../domain/entities/feature-flag.entity';
import { FeatureFlagOrmEntity } from '../orm-entities/feature-flag.orm-entity';
import { FeatureFlagMapper } from '../mappers/feature-flag.mapper';

@Injectable()
export class TypeOrmFeatureFlagRepository extends FeatureFlagRepository {
  constructor(
    @InjectRepository(FeatureFlagOrmEntity)
    private readonly repo: Repository<FeatureFlagOrmEntity>,
    private readonly mapper: FeatureFlagMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<FeatureFlag | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByKey(key: string): Promise<FeatureFlag | null> {
    const entity = await this.repo.findOne({ where: { key } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findAll(): Promise<FeatureFlag[]> {
    const entities = await this.repo.find({
      order: { key: 'ASC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findEnabled(): Promise<FeatureFlag[]> {
    const entities = await this.repo.find({
      where: { isEnabled: true },
      order: { key: 'ASC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async save(featureFlag: FeatureFlag): Promise<FeatureFlag> {
    const entity = this.mapper.toOrmEntity(featureFlag);
    const saved = await this.repo.save(entity);
    return this.mapper.toDomain(saved);
  }

  async delete(key: string): Promise<void> {
    await this.repo.delete({ key });
  }
}
