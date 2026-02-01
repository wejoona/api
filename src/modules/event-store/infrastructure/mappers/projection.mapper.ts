import { Projection } from '../../domain/entities/projection.entity';
import { ProjectionOrmEntity } from '../orm-entities/projection.orm-entity';

export class ProjectionMapper {
  static toDomain(entity: ProjectionOrmEntity): Projection {
    return Projection.fromPersistence({
      id: entity.id,
      name: entity.name,
      aggregateId: entity.aggregateId,
      aggregateType: entity.aggregateType,
      data: entity.data,
      lastEventId: entity.lastEventId,
      lastEventVersion: entity.lastEventVersion,
      lastProcessedAt: entity.lastProcessedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toOrmEntity(projection: Projection): ProjectionOrmEntity {
    const entity = new ProjectionOrmEntity();
    entity.id = projection.id;
    entity.name = projection.name;
    entity.aggregateId = projection.aggregateId;
    entity.aggregateType = projection.aggregateType;
    entity.data = projection.data;
    entity.lastEventId = projection.lastEventId;
    entity.lastEventVersion = projection.lastEventVersion;
    entity.lastProcessedAt = projection.lastProcessedAt;
    return entity;
  }
}
