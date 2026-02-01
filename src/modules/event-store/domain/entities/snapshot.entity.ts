import { v4 as uuidv4 } from 'uuid';

/**
 * Snapshot Entity
 * Represents a point-in-time state of an aggregate for performance optimization
 */
export interface SnapshotProps {
  id?: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  state: Record<string, any>;
  timestamp?: Date;
}

export class Snapshot {
  readonly id: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly version: number;
  readonly state: Record<string, any>;
  readonly timestamp: Date;

  private constructor(props: SnapshotProps) {
    this.id = props.id || uuidv4();
    this.aggregateId = props.aggregateId;
    this.aggregateType = props.aggregateType;
    this.version = props.version;
    this.state = props.state;
    this.timestamp = props.timestamp || new Date();
  }

  static create(props: Omit<SnapshotProps, 'id' | 'timestamp'>): Snapshot {
    return new Snapshot(props);
  }

  static fromPersistence(props: SnapshotProps): Snapshot {
    return new Snapshot(props);
  }

  /**
   * Check if this snapshot is for a specific aggregate
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
