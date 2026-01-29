import { ScreeningRecord } from '../entities/screening-record.entity';
import { ScreeningMatch } from '../entities/screening-match.entity';

export abstract class ScreeningRecordRepository {
  abstract save(record: ScreeningRecord): Promise<ScreeningRecord>;

  abstract findById(id: string): Promise<ScreeningRecord | null>;

  abstract findByUserId(userId: string): Promise<ScreeningRecord[]>;

  abstract findByRequestId(requestId: string): Promise<ScreeningRecord | null>;

  abstract findRecentByUserId(
    userId: string,
    limit: number,
  ): Promise<ScreeningRecord[]>;

  abstract saveMatch(match: ScreeningMatch): Promise<ScreeningMatch>;

  abstract findMatchById(id: string): Promise<ScreeningMatch | null>;

  abstract findMatchesByScreeningRecordId(
    recordId: string,
  ): Promise<ScreeningMatch[]>;

  abstract findMatchesByUserId(userId: string): Promise<ScreeningMatch[]>;

  abstract findPendingMatches(limit?: number): Promise<ScreeningMatch[]>;

  abstract findHighPriorityPendingMatches(
    minScore: number,
    limit?: number,
  ): Promise<ScreeningMatch[]>;

  abstract hasConfirmedMatch(userId: string): Promise<boolean>;

  abstract countMatchesByStatus(): Promise<{
    pending: number;
    confirmed: number;
    false_positive: number;
  }>;

  abstract getScreeningStatistics(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalScreenings: number;
    totalMatches: number;
    autoBlocked: number;
    requiresReview: number;
    avgMatchScore: number;
  }>;
}
