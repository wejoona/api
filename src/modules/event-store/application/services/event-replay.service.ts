import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventStoreRepository } from '../../domain/repositories/event-store.repository';
import { Event } from '../../domain/entities/event.entity';
import {
  EventReplayStartedEvent,
  EventReplayCompletedEvent,
} from '../../domain/events';

/**
 * Event Replay Service
 * Handles replaying events from the event store
 */
@Injectable()
export class EventReplayService {
  private readonly logger = new Logger(EventReplayService.name);

  constructor(
    private readonly eventStoreRepository: EventStoreRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Replay all events for a specific aggregate
   */
  async replayAggregate(
    aggregateId: string,
    aggregateType: string,
    fromVersion?: number,
    toVersion?: number,
  ): Promise<Event[]> {
    const startTime = Date.now();

    this.logger.log(
      `Starting event replay for ${aggregateType}:${aggregateId} from version ${fromVersion || 0}`,
    );

    this.eventEmitter.emit(
      'event_store.replay_started',
      new EventReplayStartedEvent(
        aggregateId,
        aggregateType,
        fromVersion || 0,
        toVersion,
      ),
    );

    // Get all events for the aggregate
    let events = await this.eventStoreRepository.getEventsByAggregate(
      aggregateId,
      aggregateType,
      fromVersion,
    );

    // Filter to toVersion if specified
    if (toVersion !== undefined) {
      events = events.filter((event) => event.version <= toVersion);
    }

    if (events.length === 0) {
      throw new NotFoundException(
        `No events found for ${aggregateType}:${aggregateId}`,
      );
    }

    // Emit each event for replay
    for (const event of events) {
      this.eventEmitter.emit(
        `${event.aggregateType}.${event.eventType}`,
        event,
      );
    }

    const duration = Date.now() - startTime;

    this.logger.log(
      `Completed replaying ${events.length} events for ${aggregateType}:${aggregateId} in ${duration}ms`,
    );

    this.eventEmitter.emit(
      'event_store.replay_completed',
      new EventReplayCompletedEvent(
        aggregateId,
        aggregateType,
        events.length,
        duration,
      ),
    );

    return events;
  }

  /**
   * Replay events within a time range
   */
  async replayByTimeRange(
    startTime: Date,
    endTime: Date,
    aggregateType?: string,
  ): Promise<Event[]> {
    this.logger.log(
      `Replaying events from ${startTime.toISOString()} to ${endTime.toISOString()}`,
    );

    const events = await this.eventStoreRepository.getEventsByTimeRange(
      startTime,
      endTime,
      aggregateType,
    );

    for (const event of events) {
      this.eventEmitter.emit(
        `${event.aggregateType}.${event.eventType}`,
        event,
      );
    }

    this.logger.log(`Replayed ${events.length} events`);

    return events;
  }

  /**
   * Replay events by correlation ID (distributed transaction)
   */
  async replayByCorrelationId(correlationId: string): Promise<Event[]> {
    this.logger.log(`Replaying events for correlation ID: ${correlationId}`);

    const events =
      await this.eventStoreRepository.getEventsByCorrelationId(correlationId);

    for (const event of events) {
      this.eventEmitter.emit(
        `${event.aggregateType}.${event.eventType}`,
        event,
      );
    }

    this.logger.log(
      `Replayed ${events.length} events for correlation ID ${correlationId}`,
    );

    return events;
  }

  /**
   * Get event stream for an aggregate without replaying
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
   * Rebuild aggregate state from events
   */
  async rebuildAggregateState<T>(
    aggregateId: string,
    aggregateType: string,
    initialState: T,
    applyEvent: (state: T, event: Event) => T,
  ): Promise<T> {
    const events = await this.eventStoreRepository.getEventsByAggregate(
      aggregateId,
      aggregateType,
    );

    let state = initialState;
    for (const event of events) {
      state = applyEvent(state, event);
    }

    return state;
  }

  /**
   * Rebuild aggregate state from snapshot + events
   */
  async rebuildAggregateStateFromSnapshot<T>(
    aggregateId: string,
    aggregateType: string,
    applyEvent: (state: T, event: Event) => T,
  ): Promise<T | null> {
    // Get latest snapshot
    const snapshot = await this.eventStoreRepository.getLatestSnapshot(
      aggregateId,
      aggregateType,
    );

    if (!snapshot) {
      return null;
    }

    // Get events after snapshot
    const events = await this.eventStoreRepository.getEventsByAggregate(
      aggregateId,
      aggregateType,
      snapshot.version + 1,
    );

    // Apply events to snapshot state
    let state = snapshot.state as T;
    for (const event of events) {
      state = applyEvent(state, event);
    }

    return state;
  }
}
