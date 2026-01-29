import {
  WatchlistEntry,
  WatchlistListType,
} from '../entities/watchlist-entry.entity';
import {
  WatchlistMatch,
  WatchlistMatchStatus,
} from '../entities/watchlist-match.entity';

/**
 * Watchlist Repository Interface
 *
 * Provides data access for watchlist entries and matches.
 * Implements repository pattern for clean architecture.
 */
export abstract class WatchlistRepository {
  // ==========================================
  // Watchlist Entry Operations
  // ==========================================

  /**
   * Find entry by ID
   */
  abstract findEntryById(id: string): Promise<WatchlistEntry | null>;

  /**
   * Find entries by list type
   */
  abstract findEntriesByType(
    listType: WatchlistListType,
  ): Promise<WatchlistEntry[]>;

  /**
   * Search entries by name (case-insensitive, includes aliases)
   */
  abstract searchEntriesByName(
    name: string,
    listType?: WatchlistListType,
  ): Promise<WatchlistEntry[]>;

  /**
   * Find entries by identifier
   */
  abstract findEntriesByIdentifier(
    identifierType: string,
    identifierValue: string,
  ): Promise<WatchlistEntry[]>;

  /**
   * Get all active entries
   */
  abstract findActiveEntries(): Promise<WatchlistEntry[]>;

  /**
   * Save or update entry
   */
  abstract saveEntry(entry: WatchlistEntry): Promise<WatchlistEntry>;

  /**
   * Bulk insert entries (for list imports)
   */
  abstract bulkInsertEntries(entries: WatchlistEntry[]): Promise<number>;

  /**
   * Deactivate all entries from a source
   */
  abstract deactivateBySource(source: string): Promise<number>;

  // ==========================================
  // Watchlist Match Operations
  // ==========================================

  /**
   * Find match by ID
   */
  abstract findMatchById(id: string): Promise<WatchlistMatch | null>;

  /**
   * Find matches for a user
   */
  abstract findMatchesByUserId(userId: string): Promise<WatchlistMatch[]>;

  /**
   * Find matches by status
   */
  abstract findMatchesByStatus(
    status: WatchlistMatchStatus,
    limit?: number,
  ): Promise<WatchlistMatch[]>;

  /**
   * Find pending high-priority matches
   */
  abstract findHighPriorityPendingMatches(
    minScore: number,
    limit?: number,
  ): Promise<WatchlistMatch[]>;

  /**
   * Check if user has confirmed match
   */
  abstract hasConfirmedMatch(userId: string): Promise<boolean>;

  /**
   * Save match
   */
  abstract saveMatch(match: WatchlistMatch): Promise<WatchlistMatch>;

  /**
   * Find existing match (to prevent duplicates)
   */
  abstract findExistingMatch(
    userId: string,
    watchlistEntryId: string,
    matchType: string,
  ): Promise<WatchlistMatch | null>;

  /**
   * Count matches by status
   */
  abstract countMatchesByStatus(): Promise<
    Record<WatchlistMatchStatus, number>
  >;

  /**
   * Get match with entry details
   */
  abstract findMatchWithEntry(
    matchId: string,
  ): Promise<{ match: WatchlistMatch; entry: WatchlistEntry } | null>;
}
