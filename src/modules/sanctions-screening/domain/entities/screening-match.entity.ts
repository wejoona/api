import { v4 as uuidv4 } from 'uuid';

export type MatchStatus = 'pending' | 'confirmed' | 'false_positive';
export type MatchListType = 'sanctions' | 'pep' | 'adverse_media' | 'enforcement';

export interface ScreeningMatchProps {
  id?: string;
  screeningRecordId: string;
  userId?: string;
  matchId: string; // Provider's match ID
  matchedName: string;
  listType: MatchListType;
  source: string;
  matchScore: number;
  matchType: 'exact' | 'fuzzy' | 'alias' | 'partial';
  status?: MatchStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  resolutionNotes?: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Screening Match Domain Entity
 *
 * Represents a potential match found during sanctions screening.
 * Requires compliance review to confirm or dismiss as false positive.
 */
export class ScreeningMatch {
  readonly id: string;
  readonly screeningRecordId: string;
  readonly userId?: string;
  readonly matchId: string;
  readonly matchedName: string;
  readonly listType: MatchListType;
  readonly source: string;
  readonly matchScore: number;
  readonly matchType: 'exact' | 'fuzzy' | 'alias' | 'partial';
  readonly status: MatchStatus;
  readonly reviewedBy?: string;
  readonly reviewedAt?: Date;
  readonly resolutionNotes?: string;
  readonly metadata: Record<string, any>;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: ScreeningMatchProps) {
    this.id = props.id || uuidv4();
    this.screeningRecordId = props.screeningRecordId;
    this.userId = props.userId;
    this.matchId = props.matchId;
    this.matchedName = props.matchedName;
    this.listType = props.listType;
    this.source = props.source;
    this.matchScore = props.matchScore;
    this.matchType = props.matchType;
    this.status = props.status || 'pending';
    this.reviewedBy = props.reviewedBy;
    this.reviewedAt = props.reviewedAt;
    this.resolutionNotes = props.resolutionNotes;
    this.metadata = props.metadata || {};
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }

  static create(
    props: Omit<
      ScreeningMatchProps,
      'id' | 'status' | 'createdAt' | 'updatedAt'
    >,
  ): ScreeningMatch {
    return new ScreeningMatch(props);
  }

  static fromPersistence(props: ScreeningMatchProps): ScreeningMatch {
    return new ScreeningMatch(props);
  }

  confirm(reviewerId: string, notes?: string): ScreeningMatch {
    return new ScreeningMatch({
      ...this,
      status: 'confirmed',
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      resolutionNotes: notes,
      updatedAt: new Date(),
    });
  }

  dismissAsFalsePositive(reviewerId: string, notes?: string): ScreeningMatch {
    return new ScreeningMatch({
      ...this,
      status: 'false_positive',
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      resolutionNotes: notes,
      updatedAt: new Date(),
    });
  }
}
