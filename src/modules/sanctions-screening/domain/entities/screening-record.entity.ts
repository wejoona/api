import { v4 as uuidv4 } from 'uuid';

export interface ScreeningRecordProps {
  id?: string;
  userId?: string;
  entityId?: string;
  screeningType: 'individual' | 'entity';
  provider: string;
  requestId: string;
  screenedName: string;
  matchCount: number;
  highestScore: number;
  riskLevel: 'high' | 'medium' | 'low' | 'none';
  requiresReview: boolean;
  autoBlocked: boolean;
  metadata?: Record<string, any>;
  createdAt?: Date;
}

/**
 * Screening Record Domain Entity
 *
 * Records each screening request and its results for audit purposes.
 */
export class ScreeningRecord {
  readonly id: string;
  readonly userId?: string;
  readonly entityId?: string;
  readonly screeningType: 'individual' | 'entity';
  readonly provider: string;
  readonly requestId: string;
  readonly screenedName: string;
  readonly matchCount: number;
  readonly highestScore: number;
  readonly riskLevel: 'high' | 'medium' | 'low' | 'none';
  readonly requiresReview: boolean;
  readonly autoBlocked: boolean;
  readonly metadata: Record<string, any>;
  readonly createdAt: Date;

  private constructor(props: ScreeningRecordProps) {
    this.id = props.id || uuidv4();
    this.userId = props.userId;
    this.entityId = props.entityId;
    this.screeningType = props.screeningType;
    this.provider = props.provider;
    this.requestId = props.requestId;
    this.screenedName = props.screenedName;
    this.matchCount = props.matchCount;
    this.highestScore = props.highestScore;
    this.riskLevel = props.riskLevel;
    this.requiresReview = props.requiresReview;
    this.autoBlocked = props.autoBlocked;
    this.metadata = props.metadata || {};
    this.createdAt = props.createdAt || new Date();
  }

  static create(
    props: Omit<ScreeningRecordProps, 'id' | 'createdAt'>,
  ): ScreeningRecord {
    return new ScreeningRecord(props);
  }

  static fromPersistence(props: ScreeningRecordProps): ScreeningRecord {
    return new ScreeningRecord(props);
  }
}
