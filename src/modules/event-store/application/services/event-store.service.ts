import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventStoreRepository } from '../../domain/repositories/event-store.repository';
import { Event, EventProps } from '../../domain/entities/event.entity';
import { Snapshot } from '../../domain/entities/snapshot.entity';
import {
  EventAppendedEvent,
  EventsBatchAppendedEvent,
  SnapshotCreatedEvent,
  EventAppendFailedEvent,
} from '../../domain/events';

/**
 * Event Store Service
 * Main service for interacting with the event store
 */
@Injectable()
export class EventStoreService {
  private readonly logger = new Logger(EventStoreService.name);
  private readonly snapshotInterval = 10; // Create snapshot every 10 events

  constructor(
    private readonly eventStoreRepository: EventStoreRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Append a new event to the store
   */
  async appendEvent(
    props: Omit<EventProps, 'id' | 'timestamp'>,
  ): Promise<Event> {
    try {
      const event = Event.create(props);
      const saved = await this.eventStoreRepository.append(event);

      // Emit event for listeners
      this.eventEmitter.emit(
        `${event.aggregateType}.${event.eventType}`,
        saved,
      );
      this.eventEmitter.emit(
        'event_store.event_appended',
        new EventAppendedEvent(saved),
      );

      // Check if we should create a snapshot
      if (event.version > 0 && event.version % this.snapshotInterval === 0) {
        // Note: Snapshot creation should be handled by aggregate-specific logic
        this.logger.debug(
          `Snapshot threshold reached for ${event.aggregateType}:${event.aggregateId} at version ${event.version}`,
        );
      }

      return saved;
    } catch (error) {
      this.logger.error(
        `Failed to append event ${props.eventType} for ${props.aggregateType}:${props.aggregateId}`,
        error.stack,
      );

      this.eventEmitter.emit(
        'event_store.append_failed',
        new EventAppendFailedEvent(
          props.aggregateId,
          props.aggregateType,
          error.message,
          props.eventType,
        ),
      );

      throw error;
    }
  }

  /**
   * Append multiple events atomically
   */
  async appendEvents(
    events: Omit<EventProps, 'id' | 'timestamp'>[],
  ): Promise<Event[]> {
    if (events.length === 0) {
      return [];
    }

    try {
      const eventEntities = events.map((props) => Event.create(props));
      const saved = await this.eventStoreRepository.appendBatch(eventEntities);

      // Emit events
      for (const event of saved) {
        this.eventEmitter.emit(
          `${event.aggregateType}.${event.eventType}`,
          event,
        );
      }

      this.eventEmitter.emit(
        'event_store.events_batch_appended',
        new EventsBatchAppendedEvent(
          saved,
          saved[0].aggregateId,
          saved[0].aggregateType,
        ),
      );

      return saved;
    } catch (error) {
      this.logger.error(
        `Failed to append batch of ${events.length} events`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get event stream for an aggregate
   */
  async getEventStream(
    aggregateId: string,
    aggregateType: string,
    fromVersion?: number,
  ): Promise<Event[]> {
    return this.eventStoreRepository.getEventsByAggregate(
      aggregateId,
      aggregateType,
      fromVersion,
    );
  }

  /**
   * Get events by type
   */
  async getEventsByType(
    eventType: string,
    limit?: number,
    offset?: number,
  ): Promise<Event[]> {
    return this.eventStoreRepository.getEventsByType(eventType, limit, offset);
  }

  /**
   * Get events by correlation ID
   */
  async getEventsByCorrelationId(correlationId: string): Promise<Event[]> {
    return this.eventStoreRepository.getEventsByCorrelationId(correlationId);
  }

  /**
   * Get events within time range
   */
  async getEventsByTimeRange(
    startTime: Date,
    endTime: Date,
    aggregateType?: string,
  ): Promise<Event[]> {
    return this.eventStoreRepository.getEventsByTimeRange(
      startTime,
      endTime,
      aggregateType,
    );
  }

  /**
   * Get latest event for aggregate
   */
  async getLatestEvent(
    aggregateId: string,
    aggregateType: string,
  ): Promise<Event | null> {
    return this.eventStoreRepository.getLatestEvent(aggregateId, aggregateType);
  }

  /**
   * Get event count for aggregate
   */
  async getEventCount(
    aggregateId: string,
    aggregateType: string,
  ): Promise<number> {
    return this.eventStoreRepository.getEventCount(aggregateId, aggregateType);
  }

  /**
   * Create snapshot for aggregate
   */
  async createSnapshot(
    aggregateId: string,
    aggregateType: string,
    version: number,
    state: Record<string, any>,
  ): Promise<Snapshot> {
    const snapshot = Snapshot.create({
      aggregateId,
      aggregateType,
      version,
      state,
    });

    const saved = await this.eventStoreRepository.saveSnapshot(snapshot);

    this.eventEmitter.emit(
      'event_store.snapshot_created',
      new SnapshotCreatedEvent(aggregateId, aggregateType, version),
    );

    this.logger.log(
      `Snapshot created for ${aggregateType}:${aggregateId} at version ${version}`,
    );

    return saved;
  }

  /**
   * Get latest snapshot
   */
  async getLatestSnapshot(
    aggregateId: string,
    aggregateType: string,
  ): Promise<Snapshot | null> {
    return this.eventStoreRepository.getLatestSnapshot(
      aggregateId,
      aggregateType,
    );
  }

  /**
   * Check if event exists
   */
  async eventExists(eventId: string): Promise<boolean> {
    return this.eventStoreRepository.eventExists(eventId);
  }

  /**
   * Get aggregate current version
   */
  async getAggregateVersion(
    aggregateId: string,
    aggregateType: string,
  ): Promise<number> {
    const latestEvent = await this.getLatestEvent(aggregateId, aggregateType);
    return latestEvent ? latestEvent.version : 0;
  }
}
