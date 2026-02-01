import { Event } from '../entities/event.entity';
import { Snapshot } from '../entities/snapshot.entity';

/**
 * Event Store Repository Interface
 * Defines contract for event persistence and retrieval
 */
export abstract class EventStoreRepository {
  /**
   * Append a new event to the event stream
   */
  abstract append(event: Event): Promise<Event>;

  /**
   * Append multiple events atomically
   */
  abstract appendBatch(events: Event[]): Promise<Event[]>;

  /**
   * Get all events for a specific aggregate
   */
  abstract getEventsByAggregate(
    aggregateId: string,
    aggregateType: string,
    fromVersion?: number,
  ): Promise<Event[]>;

  /**
   * Get events by type
   */
  abstract getEventsByType(
    eventType: string,
    limit?: number,
    offset?: number,
  ): Promise<Event[]>;

  /**
   * Get events by correlation ID (for distributed tracing)
   */
  abstract getEventsByCorrelationId(correlationId: string): Promise<Event[]>;

  /**
   * Get events within a time range
   */
  abstract getEventsByTimeRange(
    startTime: Date,
    endTime: Date,
    aggregateType?: string,
  ): Promise<Event[]>;

  /**
   * Get latest event for an aggregate
   */
  abstract getLatestEvent(
    aggregateId: string,
    aggregateType: string,
  ): Promise<Event | null>;

  /**
   * Get total event count for an aggregate
   */
  abstract getEventCount(
    aggregateId: string,
    aggregateType: string,
  ): Promise<number>;

  /**
   * Check if an event exists
   */
  abstract eventExists(eventId: string): Promise<boolean>;

  /**
   * Save a snapshot
   */
  abstract saveSnapshot(snapshot: Snapshot): Promise<Snapshot>;

  /**
   * Get the latest snapshot for an aggregate
   */
  abstract getLatestSnapshot(
    aggregateId: string,
    aggregateType: string,
  ): Promise<Snapshot | null>;

  /**
   * Get snapshot at specific version
   */
  abstract getSnapshotAtVersion(
    aggregateId: string,
    aggregateType: string,
    version: number,
  ): Promise<Snapshot | null>;
}
