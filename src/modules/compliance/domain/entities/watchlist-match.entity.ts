import { v4 as uuidv4 } from 'uuid';

export type WatchlistMatchStatus = 'pending' | 'confirmed' | 'false_positive';

export type WatchlistMatchType =
  | 'exact_name'
  | 'fuzzy_name'
  | 'alias'
  | 'identifier'
  | 'date_of_birth'
  | 'nationality';

export interface WatchlistMatchProps {
  id?: string;
  userId: string;
  watchlistEntryId: string;
  matchScore: number;
  matchType: WatchlistMatchType;
  status?: WatchlistMatchStatus;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  notes?: string | null;
  createdAt?: Date;
}

/**
 * Watchlist Match Domain Entity
 *
 * Represents a potential match between a user and a watchlist entry.
 * Requires compliance review to confirm or dismiss.
 *
 * Match Score Guidelines:
 * - 100: Exact match on name/identifier
 * - 90-99: Very high confidence fuzzy match
 * - 70-89: High confidence, requires review
 * - 50-69: Medium confidence, possible false positive
 * - <50: Low confidence, likely false positive
 *
 * Match Types:
 * - exact_name: User name exactly matches entry name
 * - fuzzy_name: User name partially matches (Levenshtein, Soundex)
 * - alias: User name matches an alias of the entry
 * - identifier: User ID document matches entry identifier
 * - date_of_birth: DOB matches (used with name for confirmation)
 * - nationality: Nationality matches (used with name for confirmation)
 */
export class WatchlistMatch {
  readonly id: string;
  readonly userId: string;
  readonly watchlistEntryId: string;
  readonly matchScore: number;
  readonly matchType: WatchlistMatchType;
  readonly status: WatchlistMatchStatus;
  readonly reviewedBy: string | null;
  readonly reviewedAt: Date | null;
  readonly notes: string | null;
  readonly createdAt: Date;

  private constructor(props: WatchlistMatchProps) {
    this.id = props.id || uuidv4();
    this.userId = props.userId;
    this.watchlistEntryId = props.watchlistEntryId;
    this.matchScore = props.matchScore;
    this.matchType = props.matchType;
    this.status = props.status || 'pending';
    this.reviewedBy = props.reviewedBy || null;
    this.reviewedAt = props.reviewedAt || null;
    this.notes = props.notes || null;
    this.createdAt = props.createdAt || new Date();
  }

  static create(
    props: Omit<
      WatchlistMatchProps,
      'id' | 'status' | 'reviewedBy' | 'reviewedAt' | 'notes' | 'createdAt'
    >,
  ): WatchlistMatch {
    return new WatchlistMatch(props);
  }

  static fromPersistence(props: WatchlistMatchProps): WatchlistMatch {
    return new WatchlistMatch(props);
  }

  /**
   * Check if match requires immediate action (high score)
   */
  isHighPriority(): boolean {
    return this.matchScore >= 80 && this.status === 'pending';
  }

  /**
   * Check if match is pending review
   */
  isPending(): boolean {
    return this.status === 'pending';
  }

  /**
   * Confirm match as true positive
   */
  confirm(reviewerId: string, notes?: string): WatchlistMatch {
    return new WatchlistMatch({
      ...this,
      status: 'confirmed',
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      notes: notes || this.notes,
    });
  }

  /**
   * Dismiss match as false positive
   */
  dismissAsFalsePositive(reviewerId: string, notes?: string): WatchlistMatch {
    return new WatchlistMatch({
      ...this,
      status: 'false_positive',
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      notes: notes || this.notes,
    });
  }
}
