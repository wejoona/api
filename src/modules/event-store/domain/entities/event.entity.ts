import { v4 as uuidv4 } from 'uuid';

/**
 * Domain Event Entity
 * Represents an immutable business event in the system
 */
export interface EventProps {
  id?: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  eventData: Record<string, any>;
  metadata: EventMetadata;
  version: number;
  timestamp?: Date;
  userId?: string;
  correlationId?: string;
  causationId?: string;
}

export interface EventMetadata {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  requestId?: string;
  source?: string;
  [key: string]: any;
}

export class Event {
  readonly id: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly eventType: string;
  readonly eventData: Record<string, any>;
  readonly metadata: EventMetadata;
  readonly version: number;
  readonly timestamp: Date;
  readonly userId?: string;
  readonly correlationId?: string;
  readonly causationId?: string;

  private constructor(props: EventProps) {
    this.id = props.id || uuidv4();
    this.aggregateId = props.aggregateId;
    this.aggregateType = props.aggregateType;
    this.eventType = props.eventType;
    this.eventData = props.eventData;
    this.metadata = props.metadata;
    this.version = props.version;
    this.timestamp = props.timestamp || new Date();
    this.userId = props.userId;
    this.correlationId = props.correlationId;
    this.causationId = props.causationId;
  }

  static create(props: Omit<EventProps, 'id' | 'timestamp'>): Event {
    return new Event(props);
  }

  static fromPersistence(props: EventProps): Event {
    return new Event(props);
  }

  /**
   * Check if this event is of a specific type
   */
  isEventType(eventType: string): boolean {
    return this.eventType === eventType;
  }

  /**
   * Check if this event belongs to a specific aggregate
   */
  belongsToAggregate(aggregateId: string, aggregateType?: string): boolean {
    if (aggregateType) {
      return (
        this.aggregateId === aggregateId && this.aggregateType === aggregateType
      );
    }
    return this.aggregateId === aggregateId;
  }
}
