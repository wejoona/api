import { Event } from '../../domain/entities/event.entity';
import { EventOrmEntity } from '../orm-entities/event.orm-entity';

export class EventMapper {
  static toDomain(entity: EventOrmEntity): Event {
    return Event.fromPersistence({
      id: entity.id,
      aggregateId: entity.aggregateId,
      aggregateType: entity.aggregateType,
      eventType: entity.eventType,
      eventData: entity.eventData,
      metadata: entity.metadata,
      version: entity.version,
      timestamp: entity.timestamp,
      userId: entity.userId,
      correlationId: entity.correlationId,
      causationId: entity.causationId,
    });
  }

  static toOrmEntity(event: Event): EventOrmEntity {
    const entity = new EventOrmEntity();
    entity.id = event.id;
    entity.aggregateId = event.aggregateId;
    entity.aggregateType = event.aggregateType;
    entity.eventType = event.eventType;
    entity.eventData = event.eventData;
    entity.metadata = event.metadata;
    entity.version = event.version;
    entity.timestamp = event.timestamp;
    entity.userId = event.userId;
    entity.correlationId = event.correlationId;
    entity.causationId = event.causationId;
    return entity;
  }
}
