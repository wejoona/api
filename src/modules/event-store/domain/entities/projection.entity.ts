import { v4 as uuidv4 } from 'uuid';

/**
 * Projection Entity
 * Represents a materialized view built from events
 */
export interface ProjectionProps {
  id?: string;
  name: string;
  aggregateId?: string;
  aggregateType?: string;
  data: Record<string, any>;
  lastEventId: string;
  lastEventVersion: number;
  lastProcessedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Projection {
  readonly id: string;
  readonly name: string;
  readonly aggregateId?: string;
  readonly aggregateType?: string;
  readonly data: Record<string, any>;
  readonly lastEventId: string;
  readonly lastEventVersion: number;
  readonly lastProcessedAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: ProjectionProps) {
    this.id = props.id || uuidv4();
    this.name = props.name;
    this.aggregateId = props.aggregateId;
    this.aggregateType = props.aggregateType;
    this.data = props.data;
    this.lastEventId = props.lastEventId;
    this.lastEventVersion = props.lastEventVersion;
    this.lastProcessedAt = props.lastProcessedAt || new Date();
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }

  static create(
    props: Omit<
      ProjectionProps,
      'id' | 'createdAt' | 'updatedAt' | 'lastProcessedAt'
    >,
  ): Projection {
    return new Projection(props);
  }

  static fromPersistence(props: ProjectionProps): Projection {
    return new Projection(props);
  }

  /**
   * Update projection with new event data
   */
  update(
    data: Record<string, any>,
    eventId: string,
    eventVersion: number,
  ): Projection {
    return new Projection({
      ...this,
      data,
      lastEventId: eventId,
      lastEventVersion: eventVersion,
      lastProcessedAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
