import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { WatchlistRepository } from '../../domain/repositories/watchlist.repository';
import {
  WatchlistEntry,
  WatchlistListType,
} from '../../domain/entities/watchlist-entry.entity';
import {
  WatchlistMatch,
  WatchlistMatchType,
} from '../../domain/entities/watchlist-match.entity';
import { UserOrmEntity } from '../../../user/infrastructure/orm-entities/user.orm-entity';

/**
 * Screening Result
 */
export interface ScreeningResult {
  userId: string;
  screened: boolean;
  matchCount: number;
  highestScore: number;
  matches: ScreeningMatch[];
  blocked: boolean;
  requiresReview: boolean;
  screenedAt: Date;
}

export interface ScreeningMatch {
  entryId: string;
  entryName: string;
  listType: WatchlistListType;
  matchType: WatchlistMatchType;
  score: number;
  source: string;
}

/**
 * Watchlist Screening Service
 *
 * Provides sanctions, PEP, and adverse media screening for users and transactions.
 * Implements FATF and BCEAO compliance requirements for AML/CFT.
 *
 * Features:
 * - Name matching (exact, fuzzy, phonetic)
 * - Alias matching
 * - Identifier matching (passport, national ID)
 * - Date of birth matching
 * - Nationality matching
 *
 * Integration Points:
 * - KYC onboarding (screen new users)
 * - Transaction screening (screen before transfer)
 * - Periodic rescreening (batch jobs)
 */
@Injectable()
export class WatchlistScreeningService {
  private readonly logger = new Logger(WatchlistScreeningService.name);

  // Configurable thresholds
  private readonly FUZZY_MATCH_THRESHOLD: number;
  private readonly AUTO_BLOCK_THRESHOLD: number;
  private readonly REVIEW_THRESHOLD: number;

  constructor(
    private readonly watchlistRepository: WatchlistRepository,
    @InjectRepository(UserOrmEntity)
    private readonly userRepository: Repository<UserOrmEntity>,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.FUZZY_MATCH_THRESHOLD =
      this.configService.get<number>('compliance.fuzzyMatchThreshold') || 70;
    this.AUTO_BLOCK_THRESHOLD =
      this.configService.get<number>('compliance.autoBlockThreshold') || 95;
    this.REVIEW_THRESHOLD =
      this.configService.get<number>('compliance.reviewThreshold') || 70;
  }

  // ==========================================
  // User Screening
  // ==========================================

  /**
   * Screen a user against all watchlists
   *
   * Called during:
   * - KYC onboarding
   * - Periodic rescreening
   * - Manual compliance review
   */
  async screenUser(userId: string): Promise<ScreeningResult> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    this.logger.log(`Screening user ${userId}`);

    const matches: ScreeningMatch[] = [];

    // Screen against all list types
    const listTypes: WatchlistListType[] = [
      'sanctions',
      'pep',
      'adverse_media',
    ];

    for (const listType of listTypes) {
      const typeMatches = await this.screenUserAgainstList(user, listType);
      matches.push(...typeMatches);
    }

    // Calculate result
    const highestScore =
      matches.length > 0 ? Math.max(...matches.map((m) => m.score)) : 0;
    const blocked = highestScore >= this.AUTO_BLOCK_THRESHOLD;
    const requiresReview =
      !blocked && highestScore >= this.REVIEW_THRESHOLD && matches.length > 0;

    // Save matches to database
    for (const match of matches) {
      await this.createOrUpdateMatch(
        userId,
        match.entryId,
        match.matchType,
        match.score,
      );
    }

    // Emit event for high-risk matches
    if (blocked || requiresReview) {
      this.eventEmitter.emit('compliance.screening.match', {
        userId,
        matchCount: matches.length,
        highestScore,
        blocked,
        requiresReview,
      });
    }

    const result: ScreeningResult = {
      userId,
      screened: true,
      matchCount: matches.length,
      highestScore,
      matches,
      blocked,
      requiresReview,
      screenedAt: new Date(),
    };

    this.logger.log(
      `Screening complete for ${userId}: ${matches.length} matches, highest score: ${highestScore}, blocked: ${blocked}`,
    );

    return result;
  }

  /**
   * Screen user against a specific list type
   */
  private async screenUserAgainstList(
    user: UserOrmEntity,
    listType: WatchlistListType,
  ): Promise<ScreeningMatch[]> {
    const matches: ScreeningMatch[] = [];
    const fullName = this.buildFullName(user);

    // Search by name
    const nameMatches = await this.watchlistRepository.searchEntriesByName(
      fullName,
      listType,
    );

    for (const entry of nameMatches) {
      // Calculate match score
      const { score, matchType } = this.calculateMatchScore(user, entry);

      if (score >= this.FUZZY_MATCH_THRESHOLD) {
        matches.push({
          entryId: entry.id,
          entryName: entry.name,
          listType: entry.listType,
          matchType,
          score,
          source: entry.source,
        });
      }
    }

    // Search by identifiers if available
    // Note: identificationNumber not yet available in UserOrmEntity
    // TODO: Add identificationNumber field to UserOrmEntity when KYC data is integrated

    return matches;
  }

  /**
   * Screen by identifier (passport, national ID)
   */
  private async screenByIdentifier(
    identifier: string,
    listType?: WatchlistListType,
  ): Promise<ScreeningMatch[]> {
    const matches: ScreeningMatch[] = [];
    const identifierTypes = ['passport', 'national_id', 'tax_id'];

    for (const idType of identifierTypes) {
      const entries = await this.watchlistRepository.findEntriesByIdentifier(
        idType,
        identifier,
      );

      for (const entry of entries) {
        if (listType && entry.listType !== listType) continue;

        matches.push({
          entryId: entry.id,
          entryName: entry.name,
          listType: entry.listType,
          matchType: 'identifier',
          score: 100, // Exact identifier match
          source: entry.source,
        });
      }
    }

    return matches;
  }

  /**
   * Calculate match score between user and watchlist entry
   */
  private calculateMatchScore(
    user: UserOrmEntity,
    entry: WatchlistEntry,
  ): { score: number; matchType: WatchlistMatchType } {
    const fullName = this.buildFullName(user);
    let highestScore = 0;
    let matchType: WatchlistMatchType = 'fuzzy_name';

    // Check exact name match
    if (this.normalizeString(fullName) === this.normalizeString(entry.name)) {
      return { score: 100, matchType: 'exact_name' };
    }

    // Check alias matches
    for (const alias of entry.aliases) {
      if (this.normalizeString(fullName) === this.normalizeString(alias)) {
        return { score: 100, matchType: 'alias' };
      }

      const aliasScore = this.calculateFuzzyScore(fullName, alias);
      if (aliasScore > highestScore) {
        highestScore = aliasScore;
        matchType = 'alias';
      }
    }

    // Calculate fuzzy name score
    const nameScore = this.calculateFuzzyScore(fullName, entry.name);
    if (nameScore > highestScore) {
      highestScore = nameScore;
      matchType = 'fuzzy_name';
    }

    // Boost score if DOB matches
    // Note: dateOfBirth not yet available in UserOrmEntity
    // TODO: Add dateOfBirth field when KYC data is integrated

    // Boost score if nationality matches
    if (user.countryCode && entry.nationality) {
      if (
        this.normalizeString(user.countryCode) ===
        this.normalizeString(entry.nationality)
      ) {
        highestScore = Math.min(100, highestScore + 10);
        if (highestScore >= 80 && matchType === 'fuzzy_name') {
          matchType = 'nationality';
        }
      }
    }

    return { score: highestScore, matchType };
  }

  /**
   * Calculate fuzzy match score using Levenshtein distance
   */
  private calculateFuzzyScore(str1: string, str2: string): number {
    const s1 = this.normalizeString(str1);
    const s2 = this.normalizeString(str2);

    if (s1 === s2) return 100;
    if (s1.length === 0 || s2.length === 0) return 0;

    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    const similarity = 1 - distance / maxLength;

    return Math.round(similarity * 100);
  }

  /**
   * Levenshtein distance calculation
   */
  private levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost,
        );
      }
    }

    return dp[m][n];
  }

  /**
   * Normalize string for comparison
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-z0-9\s]/g, '') // Remove special chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Build full name from user entity
   */
  private buildFullName(user: UserOrmEntity): string {
    const parts = [user.firstName, user.lastName].filter(Boolean);
    return parts.join(' ');
  }

  // ==========================================
  // Match Management
  // ==========================================

  /**
   * Create or update a match record
   */
  private async createOrUpdateMatch(
    userId: string,
    entryId: string,
    matchType: WatchlistMatchType,
    score: number,
  ): Promise<WatchlistMatch> {
    // Check for existing match
    const existing = await this.watchlistRepository.findExistingMatch(
      userId,
      entryId,
      matchType,
    );

    if (existing) {
      // If existing match is resolved, don't recreate
      if (existing.status !== 'pending') {
        return existing;
      }
      // Update score if higher
      if (score > existing.matchScore) {
        const updated = WatchlistMatch.fromPersistence({
          ...existing,
          matchScore: score,
        });
        return this.watchlistRepository.saveMatch(updated);
      }
      return existing;
    }

    // Create new match
    const match = WatchlistMatch.create({
      userId,
      watchlistEntryId: entryId,
      matchType,
      matchScore: score,
    });

    return this.watchlistRepository.saveMatch(match);
  }

  /**
   * Review and resolve a match
   */
  async reviewMatch(
    matchId: string,
    reviewerId: string,
    decision: 'confirm' | 'dismiss',
    notes?: string,
  ): Promise<WatchlistMatch> {
    const match = await this.watchlistRepository.findMatchById(matchId);

    if (!match) {
      throw new Error(`Match ${matchId} not found`);
    }

    if (match.status !== 'pending') {
      throw new Error(`Match ${matchId} has already been reviewed`);
    }

    let updatedMatch: WatchlistMatch;

    if (decision === 'confirm') {
      updatedMatch = match.confirm(reviewerId, notes);

      // Emit event for confirmed match
      this.eventEmitter.emit('compliance.match.confirmed', {
        matchId,
        userId: match.userId,
        reviewerId,
      });
    } else {
      updatedMatch = match.dismissAsFalsePositive(reviewerId, notes);
    }

    const saved = await this.watchlistRepository.saveMatch(updatedMatch);

    this.logger.log(`Match ${matchId} ${decision}ed by ${reviewerId}`);

    return saved;
  }

  /**
   * Get pending matches for review queue
   */
  async getPendingMatches(
    minScore?: number,
    limit = 50,
  ): Promise<WatchlistMatch[]> {
    if (minScore) {
      return this.watchlistRepository.findHighPriorityPendingMatches(
        minScore,
        limit,
      );
    }
    return this.watchlistRepository.findMatchesByStatus('pending', limit);
  }

  /**
   * Get match statistics
   */
  async getMatchStatistics(): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    falsePositive: number;
  }> {
    const counts = await this.watchlistRepository.countMatchesByStatus();
    return {
      total: counts.pending + counts.confirmed + counts.false_positive,
      pending: counts.pending,
      confirmed: counts.confirmed,
      falsePositive: counts.false_positive,
    };
  }

  // ==========================================
  // Transaction Screening
  // ==========================================

  /**
   * Screen a transaction before execution
   *
   * Called during transfer initiation to ensure
   * sender and recipient are not on watchlists.
   */
  async screenTransaction(
    senderId: string,
    recipientId?: string,
    recipientName?: string,
  ): Promise<{
    approved: boolean;
    senderResult: ScreeningResult;
    recipientResult?: ScreeningResult;
    blockedReason?: string;
  }> {
    // Screen sender
    const senderResult = await this.screenUser(senderId);

    if (senderResult.blocked) {
      return {
        approved: false,
        senderResult,
        blockedReason: 'Sender matched sanctions list',
      };
    }

    // Screen recipient if internal user
    let recipientResult: ScreeningResult | undefined;

    if (recipientId) {
      recipientResult = await this.screenUser(recipientId);

      if (recipientResult.blocked) {
        return {
          approved: false,
          senderResult,
          recipientResult,
          blockedReason: 'Recipient matched sanctions list',
        };
      }
    }

    // If external recipient, screen by name
    if (!recipientId && recipientName) {
      const nameMatches =
        await this.watchlistRepository.searchEntriesByName(recipientName);

      if (nameMatches.length > 0) {
        const highestScore = Math.max(
          ...nameMatches.map((e) =>
            this.calculateFuzzyScore(recipientName, e.name),
          ),
        );

        if (highestScore >= this.AUTO_BLOCK_THRESHOLD) {
          return {
            approved: false,
            senderResult,
            blockedReason: 'External recipient name matched sanctions list',
          };
        }
      }
    }

    return {
      approved: true,
      senderResult,
      recipientResult,
    };
  }

  // ==========================================
  // Batch Screening
  // ==========================================

  /**
   * Batch screen all users (for periodic rescreening)
   */
  async batchScreenAllUsers(): Promise<{
    usersScreened: number;
    matchesFound: number;
    blockedUsers: number;
  }> {
    this.logger.log('Starting batch user screening');

    const users = await this.userRepository.find({
      where: { status: 'active' },
    });

    let matchesFound = 0;
    let blockedUsers = 0;

    for (const user of users) {
      try {
        const result = await this.screenUser(user.id);
        matchesFound += result.matchCount;
        if (result.blocked) blockedUsers++;
      } catch (error) {
        this.logger.error(`Error screening user ${user.id}: ${error.message}`);
      }
    }

    this.logger.log(
      `Batch screening complete: ${users.length} users, ${matchesFound} matches, ${blockedUsers} blocked`,
    );

    return {
      usersScreened: users.length,
      matchesFound,
      blockedUsers,
    };
  }

  /**
   * Check if user is blocked due to watchlist match
   */
  async isUserBlocked(userId: string): Promise<boolean> {
    return this.watchlistRepository.hasConfirmedMatch(userId);
  }

  /**
   * Get user's screening history
   */
  async getUserScreeningHistory(userId: string): Promise<{
    matches: WatchlistMatch[];
    hasConfirmedMatch: boolean;
    lastScreenedAt?: Date;
  }> {
    const matches = await this.watchlistRepository.findMatchesByUserId(userId);
    const hasConfirmedMatch = matches.some((m) => m.status === 'confirmed');
    const lastScreenedAt =
      matches.length > 0
        ? matches.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
          )[0].createdAt
        : undefined;

    return {
      matches,
      hasConfirmedMatch,
      lastScreenedAt,
    };
  }
}
