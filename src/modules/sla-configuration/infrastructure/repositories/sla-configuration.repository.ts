import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SlaConfigurationRepository } from '../../domain/repositories/sla-configuration.repository';
import {
  SlaConfiguration,
  SlaCategory,
  SlaPriority,
} from '../../domain/entities/sla-configuration.entity';
import { SlaConfigurationOrmEntity } from '../orm-entities/sla-configuration.orm-entity';
import { SlaConfigurationMapper } from '../mappers/sla-configuration.mapper';

@Injectable()
export class TypeOrmSlaConfigurationRepository extends SlaConfigurationRepository {
  constructor(
    @InjectRepository(SlaConfigurationOrmEntity)
    private readonly repo: Repository<SlaConfigurationOrmEntity>,
    private readonly mapper: SlaConfigurationMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<SlaConfiguration | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByCategoryAndPriority(
    category: SlaCategory,
    priority: SlaPriority,
  ): Promise<SlaConfiguration | null> {
    const entity = await this.repo.findOne({
      where: {
        category,
        priority,
        isActive: true,
      },
    });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByCategory(category: SlaCategory): Promise<SlaConfiguration[]> {
    const entities = await this.repo.find({
      where: { category, isActive: true },
      order: { priority: 'DESC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findAllActive(): Promise<SlaConfiguration[]> {
    const entities = await this.repo.find({
      where: { isActive: true },
      order: { category: 'ASC', priority: 'DESC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findAll(): Promise<SlaConfiguration[]> {
    const entities = await this.repo.find({
      order: { category: 'ASC', priority: 'DESC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async save(config: SlaConfiguration): Promise<SlaConfiguration> {
    const entity = this.mapper.toOrmEntity(config);
    const saved = await this.repo.save(entity);
    return this.mapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
