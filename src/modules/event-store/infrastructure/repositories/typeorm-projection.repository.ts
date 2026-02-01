import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ProjectionRepository } from '../../domain/repositories/projection.repository';
import { Projection } from '../../domain/entities/projection.entity';
import { ProjectionOrmEntity } from '../orm-entities/projection.orm-entity';
import { ProjectionMapper } from '../mappers/projection.mapper';

@Injectable()
export class TypeOrmProjectionRepository extends ProjectionRepository {
  private readonly logger = new Logger(TypeOrmProjectionRepository.name);

  constructor(
    @InjectRepository(ProjectionOrmEntity)
    private readonly repo: Repository<ProjectionOrmEntity>,
  ) {
    super();
  }

  async findByName(
    name: string,
    aggregateId?: string,
  ): Promise<Projection | null> {
    const query: any = { where: { name } };

    if (aggregateId) {
      query.where.aggregateId = aggregateId;
    }

    const entity = await this.repo.findOne(query);
    return entity ? ProjectionMapper.toDomain(entity) : null;
  }

  async findAllByName(name: string): Promise<Projection[]> {
    const entities = await this.repo.find({
      where: { name },
      order: { updatedAt: 'DESC' },
    });
    return entities.map(ProjectionMapper.toDomain);
  }

  async save(projection: Projection): Promise<Projection> {
    const entity = ProjectionMapper.toOrmEntity(projection);
    const saved = await this.repo.save(entity);
    this.logger.debug(`Projection saved: ${projection.name}`);
    return ProjectionMapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
    this.logger.debug(`Projection deleted: ${id}`);
  }

  async deleteAllByName(name: string): Promise<void> {
    await this.repo.delete({ name });
    this.logger.debug(`All projections deleted for: ${name}`);
  }

  async findById(id: string): Promise<Projection | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? ProjectionMapper.toDomain(entity) : null;
  }

  async findOutdated(
    name: string,
    beforeEventId: string,
  ): Promise<Projection[]> {
    const entities = await this.repo.find({
      where: {
        name,
        lastEventId: LessThan(beforeEventId),
      },
    });
    return entities.map(ProjectionMapper.toDomain);
  }
}
