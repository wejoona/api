import { Event } from '../entities/event.entity';
import { Projection } from '../entities/projection.entity';

/**
 * Base event class for event store events
 */
export abstract class EventStoreEvent {
  readonly timestamp: Date = new Date();
  abstract readonly eventType: string;
}

/**
 * Emitted when an event is successfully appended to the store
 */
export class EventAppendedEvent extends EventStoreEvent {
  readonly eventType = 'event_store.event_appended';

  constructor(public readonly event: Event) {
    super();
  }
}

/**
 * Emitted when multiple events are appended in a batch
 */
export class EventsBatchAppendedEvent extends EventStoreEvent {
  readonly eventType = 'event_store.events_batch_appended';

  constructor(
    public readonly events: Event[],
    public readonly aggregateId: string,
    public readonly aggregateType: string,
  ) {
    super();
  }
}

/**
 * Emitted when a snapshot is created
 */
export class SnapshotCreatedEvent extends EventStoreEvent {
  readonly eventType = 'event_store.snapshot_created';

  constructor(
    public readonly aggregateId: string,
    public readonly aggregateType: string,
    public readonly version: number,
  ) {
    super();
  }
}

/**
 * Emitted when a projection is updated
 */
export class ProjectionUpdatedEvent extends EventStoreEvent {
  readonly eventType = 'event_store.projection_updated';

  constructor(
    public readonly projection: Projection,
    public readonly eventsProcessed: number,
  ) {
    super();
  }
}

/**
 * Emitted when a projection rebuild is started
 */
export class ProjectionRebuildStartedEvent extends EventStoreEvent {
  readonly eventType = 'event_store.projection_rebuild_started';

  constructor(public readonly projectionName: string) {
    super();
  }
}

/**
 * Emitted when a projection rebuild is completed
 */
export class ProjectionRebuildCompletedEvent extends EventStoreEvent {
  readonly eventType = 'event_store.projection_rebuild_completed';

  constructor(
    public readonly projectionName: string,
    public readonly eventsProcessed: number,
    public readonly duration: number, // milliseconds
  ) {
    super();
  }
}

/**
 * Emitted when event replay is started
 */
export class EventReplayStartedEvent extends EventStoreEvent {
  readonly eventType = 'event_store.replay_started';

  constructor(
    public readonly aggregateId: string,
    public readonly aggregateType: string,
    public readonly fromVersion: number,
    public readonly toVersion?: number,
  ) {
    super();
  }
}

/**
 * Emitted when event replay is completed
 */
export class EventReplayCompletedEvent extends EventStoreEvent {
  readonly eventType = 'event_store.replay_completed';

  constructor(
    public readonly aggregateId: string,
    public readonly aggregateType: string,
    public readonly eventsReplayed: number,
    public readonly duration: number,
  ) {
    super();
  }
}

/**
 * Emitted when there's an error appending events
 */
export class EventAppendFailedEvent extends EventStoreEvent {
  readonly eventType = 'event_store.append_failed';

  constructor(
    public readonly aggregateId: string,
    public readonly aggregateType: string,
    public readonly error: string,
    public readonly failedEventType: string,
  ) {
    super();
  }
}

/**
 * Emitted when projection update fails
 */
export class ProjectionUpdateFailedEvent extends EventStoreEvent {
  readonly eventType = 'event_store.projection_update_failed';

  constructor(
    public readonly projectionName: string,
    public readonly eventId: string,
    public readonly error: string,
  ) {
    super();
  }
}
