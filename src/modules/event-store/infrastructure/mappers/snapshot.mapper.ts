import { Snapshot } from '../../domain/entities/snapshot.entity';
import { SnapshotOrmEntity } from '../orm-entities/snapshot.orm-entity';

export class SnapshotMapper {
  static toDomain(entity: SnapshotOrmEntity): Snapshot {
    return Snapshot.fromPersistence({
      id: entity.id,
      aggregateId: entity.aggregateId,
      aggregateType: entity.aggregateType,
      version: entity.version,
      state: entity.state,
      timestamp: entity.timestamp,
    });
  }

  static toOrmEntity(snapshot: Snapshot): SnapshotOrmEntity {
    const entity = new SnapshotOrmEntity();
    entity.id = snapshot.id;
    entity.aggregateId = snapshot.aggregateId;
    entity.aggregateType = snapshot.aggregateType;
    entity.version = snapshot.version;
    entity.state = snapshot.state;
    entity.timestamp = snapshot.timestamp;
    return entity;
  }
}
