import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { EventStoreRepository } from '../../domain/repositories/event-store.repository';
import { Event } from '../../domain/entities/event.entity';
import { Snapshot } from '../../domain/entities/snapshot.entity';
import { EventOrmEntity } from '../orm-entities/event.orm-entity';
import { SnapshotOrmEntity } from '../orm-entities/snapshot.orm-entity';
import { EventMapper } from '../mappers/event.mapper';
import { SnapshotMapper } from '../mappers/snapshot.mapper';

@Injectable()
export class TypeOrmEventStoreRepository extends EventStoreRepository {
  private readonly logger = new Logger(TypeOrmEventStoreRepository.name);

  constructor(
    @InjectRepository(EventOrmEntity)
    private readonly eventRepo: Repository<EventOrmEntity>,
    @InjectRepository(SnapshotOrmEntity)
    private readonly snapshotRepo: Repository<SnapshotOrmEntity>,
  ) {
    super();
  }

  async append(event: Event): Promise<Event> {
    try {
      const entity = EventMapper.toOrmEntity(event);
      const saved = await this.eventRepo.save(entity);
      this.logger.debug(
        `Event appended: ${event.eventType} for ${event.aggregateType}:${event.aggregateId} v${event.version}`,
      );
      return EventMapper.toDomain(saved);
    } catch (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        throw new ConflictException(
          `Event version conflict for ${event.aggregateType}:${event.aggregateId} v${event.version}`,
        );
      }
      this.logger.error(
        `Failed to append event: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async appendBatch(events: Event[]): Promise<Event[]> {
    if (events.length === 0) {
      return [];
    }

    try {
      const entities = events.map(EventMapper.toOrmEntity);
      const saved = await this.eventRepo.save(entities);
      this.logger.debug(
        `Batch of ${events.length} events appended for ${events[0].aggregateType}:${events[0].aggregateId}`,
      );
      return saved.map(EventMapper.toDomain);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException(
          `Event version conflict in batch for ${events[0].aggregateType}:${events[0].aggregateId}`,
        );
      }
      this.logger.error(
        `Failed to append batch: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getEventsByAggregate(
    aggregateId: string,
    aggregateType: string,
    fromVersion?: number,
  ): Promise<Event[]> {
    const query: any = {
      where: {
        aggregateId,
        aggregateType,
      },
      order: {
        version: 'ASC',
      },
    };

    if (fromVersion !== undefined) {
      query.where.version = MoreThanOrEqual(fromVersion);
    }

    const entities = await this.eventRepo.find(query);
    return entities.map(EventMapper.toDomain);
  }

  async getEventsByType(
    eventType: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<Event[]> {
    const entities = await this.eventRepo.find({
      where: { eventType },
      order: { timestamp: 'DESC' },
      take: limit,
      skip: offset,
    });
    return entities.map(EventMapper.toDomain);
  }

  async getEventsByCorrelationId(correlationId: string): Promise<Event[]> {
    const entities = await this.eventRepo.find({
      where: { correlationId },
      order: { timestamp: 'ASC' },
    });
    return entities.map(EventMapper.toDomain);
  }

  async getEventsByTimeRange(
    startTime: Date,
    endTime: Date,
    aggregateType?: string,
  ): Promise<Event[]> {
    const query: any = {
      where: {
        timestamp: Between(startTime, endTime),
      },
      order: {
        timestamp: 'ASC',
      },
    };

    if (aggregateType) {
      query.where.aggregateType = aggregateType;
    }

    const entities = await this.eventRepo.find(query);
    return entities.map(EventMapper.toDomain);
  }

  async getLatestEvent(
    aggregateId: string,
    aggregateType: string,
  ): Promise<Event | null> {
    const entity = await this.eventRepo.findOne({
      where: { aggregateId, aggregateType },
      order: { version: 'DESC' },
    });
    return entity ? EventMapper.toDomain(entity) : null;
  }

  async getEventCount(
    aggregateId: string,
    aggregateType: string,
  ): Promise<number> {
    return this.eventRepo.count({
      where: { aggregateId, aggregateType },
    });
  }

  async eventExists(eventId: string): Promise<boolean> {
    const count = await this.eventRepo.count({
      where: { id: eventId },
    });
    return count > 0;
  }

  async saveSnapshot(snapshot: Snapshot): Promise<Snapshot> {
    const entity = SnapshotMapper.toOrmEntity(snapshot);
    const saved = await this.snapshotRepo.save(entity);
    this.logger.debug(
      `Snapshot saved for ${snapshot.aggregateType}:${snapshot.aggregateId} v${snapshot.version}`,
    );
    return SnapshotMapper.toDomain(saved);
  }

  async getLatestSnapshot(
    aggregateId: string,
    aggregateType: string,
  ): Promise<Snapshot | null> {
    const entity = await this.snapshotRepo.findOne({
      where: { aggregateId, aggregateType },
      order: { version: 'DESC' },
    });
    return entity ? SnapshotMapper.toDomain(entity) : null;
  }

  async getSnapshotAtVersion(
    aggregateId: string,
    aggregateType: string,
    version: number,
  ): Promise<Snapshot | null> {
    const entity = await this.snapshotRepo.findOne({
      where: { aggregateId, aggregateType, version },
    });
    return entity ? SnapshotMapper.toDomain(entity) : null;
  }
}
