import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { SanctionsScreeningProvider } from '../../domain/interfaces/sanctions-screening-provider.interface';
import { ScreeningRecordRepository } from '../../domain/repositories/screening-record.repository';
import { ScreeningRecord } from '../../domain/entities/screening-record.entity';
import { ScreeningMatch } from '../../domain/entities/screening-match.entity';

/**
 * Sanctions Screening Service
 *
 * Orchestrates sanctions screening using configurable providers.
 * Integrates with KYC, transfers, and periodic re-screening workflows.
 *
 * Triggers:
 * - New user registration (KYC onboarding)
 * - KYC submission/update
 * - Before high-value transfers (configurable threshold)
 * - Periodic re-screening (scheduled job)
 * - Manual compliance review
 *
 * Match Handling:
 * - Score >= 95: Auto-block (exact match)
 * - Score >= 70: Flag for manual review (fuzzy match)
 * - Score < 70: Log and monitor
 */
@Injectable()
export class SanctionsScreeningService {
  private readonly logger = new Logger(SanctionsScreeningService.name);
  private readonly highValueThreshold: number;
  private readonly autoBlockThreshold: number;
  private readonly reviewThreshold: number;

  constructor(
    private readonly provider: SanctionsScreeningProvider,
    private readonly repository: ScreeningRecordRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.highValueThreshold =
      this.configService.get<number>('sanctions.highValueThreshold') || 10000;
    this.autoBlockThreshold =
      this.configService.get<number>('sanctions.autoBlockThreshold') || 95;
    this.reviewThreshold =
      this.configService.get<number>('sanctions.reviewThreshold') || 70;
  }

  /**
   * Screen an individual
   * Called during KYC onboarding and updates
   */
  async screenIndividual(
    userId: string,
    name: string,
    dateOfBirth?: Date,
    nationality?: string,
    identificationNumber?: string,
    phone?: string,
  ): Promise<{
    approved: boolean;
    blocked: boolean;
    requiresReview: boolean;
    matchCount: number;
    highestScore: number;
    recordId: string;
  }> {
    this.logger.log(`Screening individual: ${name} (userId: ${userId})`);

    const result = await this.provider.screenIndividual({
      name,
      dateOfBirth,
      nationality,
      identificationNumber,
      phone,
    });

    // Save screening record
    const record = ScreeningRecord.create({
      userId,
      screeningType: 'individual',
      provider: this.getProviderName(),
      requestId: result.requestId,
      screenedName: name,
      matchCount: result.totalMatches,
      highestScore: result.highestScore,
      riskLevel: result.riskLevel,
      requiresReview: result.requiresReview,
      autoBlocked: result.autoBlocked,
      metadata: {
        dateOfBirth,
        nationality,
        phone,
      },
    });

    const savedRecord = await this.repository.save(record);

    // Save matches
    for (const match of result.matches) {
      const screeningMatch = ScreeningMatch.create({
        screeningRecordId: savedRecord.id,
        userId,
        matchId: match.matchId,
        matchedName: match.matchedName,
        listType: match.listType,
        source: match.source,
        matchScore: match.score,
        matchType: match.matchType,
        metadata: match.additionalInfo,
      });
      await this.repository.saveMatch(screeningMatch);
    }

    // Emit events
    if (result.autoBlocked) {
      this.eventEmitter.emit('sanctions.match.auto-blocked', {
        userId,
        recordId: savedRecord.id,
        name,
        highestScore: result.highestScore,
        matches: result.matches,
      });
    } else if (result.requiresReview) {
      this.eventEmitter.emit('sanctions.match.requires-review', {
        userId,
        recordId: savedRecord.id,
        name,
        highestScore: result.highestScore,
        matchCount: result.totalMatches,
      });
    }

    this.logger.log(
      `Screening complete for ${userId}: ${result.totalMatches} matches, highest score: ${result.highestScore}, blocked: ${result.autoBlocked}`,
    );

    return {
      approved: !result.autoBlocked,
      blocked: result.autoBlocked,
      requiresReview: result.requiresReview,
      matchCount: result.totalMatches,
      highestScore: result.highestScore,
      recordId: savedRecord.id,
    };
  }

  /**
   * Screen an entity/organization
   */
  async screenEntity(
    entityId: string,
    name: string,
    country?: string,
    registrationNumber?: string,
  ): Promise<{
    approved: boolean;
    blocked: boolean;
    requiresReview: boolean;
    matchCount: number;
    highestScore: number;
    recordId: string;
  }> {
    this.logger.log(`Screening entity: ${name} (entityId: ${entityId})`);

    const result = await this.provider.screenEntity({
      name,
      country,
      registrationNumber,
    });

    const record = ScreeningRecord.create({
      entityId,
      screeningType: 'entity',
      provider: this.getProviderName(),
      requestId: result.requestId,
      screenedName: name,
      matchCount: result.totalMatches,
      highestScore: result.highestScore,
      riskLevel: result.riskLevel,
      requiresReview: result.requiresReview,
      autoBlocked: result.autoBlocked,
      metadata: {
        country,
        registrationNumber,
      },
    });

    const savedRecord = await this.repository.save(record);

    for (const match of result.matches) {
      const screeningMatch = ScreeningMatch.create({
        screeningRecordId: savedRecord.id,
        matchId: match.matchId,
        matchedName: match.matchedName,
        listType: match.listType,
        source: match.source,
        matchScore: match.score,
        matchType: match.matchType,
        metadata: match.additionalInfo,
      });
      await this.repository.saveMatch(screeningMatch);
    }

    if (result.autoBlocked || result.requiresReview) {
      this.eventEmitter.emit('sanctions.entity.flagged', {
        entityId,
        recordId: savedRecord.id,
        name,
        highestScore: result.highestScore,
        autoBlocked: result.autoBlocked,
      });
    }

    return {
      approved: !result.autoBlocked,
      blocked: result.autoBlocked,
      requiresReview: result.requiresReview,
      matchCount: result.totalMatches,
      highestScore: result.highestScore,
      recordId: savedRecord.id,
    };
  }

  /**
   * Batch screen multiple individuals/entities
   */
  async batchScreen(
    entities: Array<{
      type: 'individual' | 'entity';
      id: string;
      name: string;
      metadata?: any;
    }>,
  ): Promise<{
    totalScreened: number;
    totalBlocked: number;
    totalReview: number;
    results: Array<{
      id: string;
      approved: boolean;
      blocked: boolean;
      requiresReview: boolean;
    }>;
  }> {
    this.logger.log(`Batch screening ${entities.length} entities`);

    const individuals = entities
      .filter((e) => e.type === 'individual')
      .map((e) => ({
        name: e.name,
        dateOfBirth: e.metadata?.dateOfBirth,
        nationality: e.metadata?.nationality,
        identificationNumber: e.metadata?.identificationNumber,
        phone: e.metadata?.phone,
      }));

    const organizations = entities
      .filter((e) => e.type === 'entity')
      .map((e) => ({
        name: e.name,
        country: e.metadata?.country,
        registrationNumber: e.metadata?.registrationNumber,
      }));

    const batchResult = await this.provider.batchScreen({
      individuals,
      entities: organizations,
    });

    const results: Array<{
      id: string;
      approved: boolean;
      blocked: boolean;
      requiresReview: boolean;
    }> = [];

    let totalBlocked = 0;
    let totalReview = 0;

    for (let i = 0; i < batchResult.results.length; i++) {
      const result = batchResult.results[i];
      const entity = entities[i];

      const approved = !result.result.autoBlocked;
      const blocked = result.result.autoBlocked;
      const requiresReview = result.result.requiresReview;

      if (blocked) totalBlocked++;
      if (requiresReview) totalReview++;

      results.push({
        id: entity.id,
        approved,
        blocked,
        requiresReview,
      });
    }

    return {
      totalScreened: entities.length,
      totalBlocked,
      totalReview,
      results,
    };
  }

  /**
   * Screen before high-value transfer
   */
  async screenTransfer(
    senderId: string,
    _senderName: string,
    recipientId?: string,
    recipientName?: string,
    amount?: number,
  ): Promise<{
    approved: boolean;
    blockedReason?: string;
  }> {
    // Only screen if amount exceeds threshold
    if (amount && amount < this.highValueThreshold) {
      return { approved: true };
    }

    // Check if sender is already blocked
    const senderBlocked = await this.repository.hasConfirmedMatch(senderId);
    if (senderBlocked) {
      return {
        approved: false,
        blockedReason: 'Sender has confirmed sanctions match',
      };
    }

    // Check if recipient is blocked (if internal user)
    if (recipientId) {
      const recipientBlocked =
        await this.repository.hasConfirmedMatch(recipientId);
      if (recipientBlocked) {
        return {
          approved: false,
          blockedReason: 'Recipient has confirmed sanctions match',
        };
      }
    }

    return { approved: true };
  }

  /**
   * Review and resolve a match
   */
  async reviewMatch(
    matchId: string,
    reviewerId: string,
    decision: 'confirm' | 'dismiss',
    notes?: string,
  ): Promise<ScreeningMatch> {
    const match = await this.repository.findMatchById(matchId);

    if (!match) {
      throw new Error(`Match ${matchId} not found`);
    }

    if (match.status !== 'pending') {
      throw new Error(`Match ${matchId} has already been reviewed`);
    }

    let updatedMatch: ScreeningMatch;

    if (decision === 'confirm') {
      updatedMatch = match.confirm(reviewerId, notes);

      this.eventEmitter.emit('sanctions.match.confirmed', {
        matchId,
        userId: match.userId,
        reviewerId,
        matchedName: match.matchedName,
        listType: match.listType,
      });
    } else {
      updatedMatch = match.dismissAsFalsePositive(reviewerId, notes);

      this.eventEmitter.emit('sanctions.match.dismissed', {
        matchId,
        userId: match.userId,
        reviewerId,
      });
    }

    const saved = await this.repository.saveMatch(updatedMatch);

    this.logger.log(`Match ${matchId} ${decision}ed by reviewer ${reviewerId}`);

    return saved;
  }

  /**
   * Get match details from provider
   */
  async getMatchDetails(matchId: string) {
    return this.provider.getMatchDetails(matchId);
  }

  /**
   * Get pending matches for review queue
   */
  async getPendingMatches(minScore?: number, limit = 50) {
    if (minScore) {
      return this.repository.findHighPriorityPendingMatches(minScore, limit);
    }
    return this.repository.findPendingMatches(limit);
  }

  /**
   * Get user screening history
   */
  async getUserScreeningHistory(userId: string) {
    const records = await this.repository.findByUserId(userId);
    const matches = await this.repository.findMatchesByUserId(userId);
    const hasConfirmedMatch = await this.repository.hasConfirmedMatch(userId);

    return {
      records,
      matches,
      hasConfirmedMatch,
      totalScreenings: records.length,
      totalMatches: matches.length,
    };
  }

  /**
   * Check if user is blocked
   */
  async isUserBlocked(userId: string): Promise<boolean> {
    return this.repository.hasConfirmedMatch(userId);
  }

  /**
   * Get screening statistics
   */
  async getStatistics(startDate: Date, endDate: Date) {
    const stats = await this.repository.getScreeningStatistics(
      startDate,
      endDate,
    );
    const matchCounts = await this.repository.countMatchesByStatus();

    return {
      ...stats,
      matchCounts,
    };
  }

  /**
   * Provider health check
   */
  async healthCheck(): Promise<boolean> {
    return this.provider.healthCheck();
  }

  private getProviderName(): string {
    return this.provider.constructor.name.replace('Provider', '');
  }
}
