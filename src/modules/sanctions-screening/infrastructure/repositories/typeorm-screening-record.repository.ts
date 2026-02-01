import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ScreeningRecordRepository } from '../../domain/repositories/screening-record.repository';
import { ScreeningRecord } from '../../domain/entities/screening-record.entity';
import { ScreeningMatch } from '../../domain/entities/screening-match.entity';
import { ScreeningRecordOrmEntity } from '../orm-entities/screening-record.orm-entity';
import { ScreeningMatchOrmEntity } from '../orm-entities/screening-match.orm-entity';

@Injectable()
export class TypeOrmScreeningRecordRepository extends ScreeningRecordRepository {
  constructor(
    @InjectRepository(ScreeningRecordOrmEntity)
    private readonly recordRepo: Repository<ScreeningRecordOrmEntity>,
    @InjectRepository(ScreeningMatchOrmEntity)
    private readonly matchRepo: Repository<ScreeningMatchOrmEntity>,
  ) {
    super();
  }

  async save(record: ScreeningRecord): Promise<ScreeningRecord> {
    const entity = this.toRecordOrmEntity(record);
    const saved = await this.recordRepo.save(entity);
    return this.recordToDomain(saved);
  }

  async findById(id: string): Promise<ScreeningRecord | null> {
    const entity = await this.recordRepo.findOne({ where: { id } });
    return entity ? this.recordToDomain(entity) : null;
  }

  async findByUserId(userId: string): Promise<ScreeningRecord[]> {
    const entities = await this.recordRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.recordToDomain(e));
  }

  async findByRequestId(requestId: string): Promise<ScreeningRecord | null> {
    const entity = await this.recordRepo.findOne({ where: { requestId } });
    return entity ? this.recordToDomain(entity) : null;
  }

  async findRecentByUserId(
    userId: string,
    limit: number,
  ): Promise<ScreeningRecord[]> {
    const entities = await this.recordRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return entities.map((e) => this.recordToDomain(e));
  }

  async saveMatch(match: ScreeningMatch): Promise<ScreeningMatch> {
    const entity = this.toMatchOrmEntity(match);
    const saved = await this.matchRepo.save(entity);
    return this.matchToDomain(saved);
  }

  async findMatchById(id: string): Promise<ScreeningMatch | null> {
    const entity = await this.matchRepo.findOne({ where: { id } });
    return entity ? this.matchToDomain(entity) : null;
  }

  async findMatchesByScreeningRecordId(
    recordId: string,
  ): Promise<ScreeningMatch[]> {
    const entities = await this.matchRepo.find({
      where: { screeningRecordId: recordId },
      order: { matchScore: 'DESC' },
    });
    return entities.map((e) => this.matchToDomain(e));
  }

  async findMatchesByUserId(userId: string): Promise<ScreeningMatch[]> {
    const entities = await this.matchRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.matchToDomain(e));
  }

  async findPendingMatches(limit = 50): Promise<ScreeningMatch[]> {
    const entities = await this.matchRepo.find({
      where: { status: 'pending' },
      order: { matchScore: 'DESC', createdAt: 'DESC' },
      take: limit,
    });
    return entities.map((e) => this.matchToDomain(e));
  }

  async findHighPriorityPendingMatches(
    minScore: number,
    limit = 50,
  ): Promise<ScreeningMatch[]> {
    const entities = await this.matchRepo.find({
      where: {
        status: 'pending',
        matchScore: MoreThan(minScore),
      },
      order: { matchScore: 'DESC', createdAt: 'DESC' },
      take: limit,
    });
    return entities.map((e) => this.matchToDomain(e));
  }

  async hasConfirmedMatch(userId: string): Promise<boolean> {
    const count = await this.matchRepo.count({
      where: { userId, status: 'confirmed' },
    });
    return count > 0;
  }

  async countMatchesByStatus(): Promise<{
    pending: number;
    confirmed: number;
    false_positive: number;
  }> {
    const [pending, confirmed, falsePositive] = await Promise.all([
      this.matchRepo.count({ where: { status: 'pending' } }),
      this.matchRepo.count({ where: { status: 'confirmed' } }),
      this.matchRepo.count({ where: { status: 'false_positive' } }),
    ]);

    return {
      pending,
      confirmed,
      false_positive: falsePositive,
    };
  }

  async getScreeningStatistics(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalScreenings: number;
    totalMatches: number;
    autoBlocked: number;
    requiresReview: number;
    avgMatchScore: number;
  }> {
    const records = await this.recordRepo
      .createQueryBuilder('record')
      .where('record.created_at >= :startDate', { startDate })
      .andWhere('record.created_at <= :endDate', { endDate })
      .getMany();

    const matches = await this.matchRepo
      .createQueryBuilder('match')
      .where('match.created_at >= :startDate', { startDate })
      .andWhere('match.created_at <= :endDate', { endDate })
      .getMany();

    const avgMatchScore =
      matches.length > 0
        ? matches.reduce((sum, m) => sum + Number(m.matchScore), 0) /
          matches.length
        : 0;

    return {
      totalScreenings: records.length,
      totalMatches: matches.length,
      autoBlocked: records.filter((r) => r.autoBlocked).length,
      requiresReview: records.filter((r) => r.requiresReview).length,
      avgMatchScore: Math.round(avgMatchScore * 100) / 100,
    };
  }

  private recordToDomain(entity: ScreeningRecordOrmEntity): ScreeningRecord {
    return ScreeningRecord.fromPersistence({
      id: entity.id,
      userId: entity.userId || undefined,
      entityId: entity.entityId || undefined,
      screeningType: entity.screeningType,
      provider: entity.provider,
      requestId: entity.requestId,
      screenedName: entity.screenedName,
      matchCount: entity.matchCount,
      highestScore: Number(entity.highestScore),
      riskLevel: entity.riskLevel,
      requiresReview: entity.requiresReview,
      autoBlocked: entity.autoBlocked,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
    });
  }

  private toRecordOrmEntity(record: ScreeningRecord): ScreeningRecordOrmEntity {
    const entity = new ScreeningRecordOrmEntity();
    entity.id = record.id;
    entity.userId = record.userId || null;
    entity.entityId = record.entityId || null;
    entity.screeningType = record.screeningType;
    entity.provider = record.provider;
    entity.requestId = record.requestId;
    entity.screenedName = record.screenedName;
    entity.matchCount = record.matchCount;
    entity.highestScore = record.highestScore;
    entity.riskLevel = record.riskLevel;
    entity.requiresReview = record.requiresReview;
    entity.autoBlocked = record.autoBlocked;
    entity.metadata = record.metadata;
    return entity;
  }

  private matchToDomain(entity: ScreeningMatchOrmEntity): ScreeningMatch {
    return ScreeningMatch.fromPersistence({
      id: entity.id,
      screeningRecordId: entity.screeningRecordId,
      userId: entity.userId || undefined,
      matchId: entity.matchId,
      matchedName: entity.matchedName,
      listType: entity.listType,
      source: entity.source,
      matchScore: Number(entity.matchScore),
      matchType: entity.matchType,
      status: entity.status,
      reviewedBy: entity.reviewedBy || undefined,
      reviewedAt: entity.reviewedAt || undefined,
      resolutionNotes: entity.resolutionNotes || undefined,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private toMatchOrmEntity(match: ScreeningMatch): ScreeningMatchOrmEntity {
    const entity = new ScreeningMatchOrmEntity();
    entity.id = match.id;
    entity.screeningRecordId = match.screeningRecordId;
    entity.userId = match.userId || null;
    entity.matchId = match.matchId;
    entity.matchedName = match.matchedName;
    entity.listType = match.listType;
    entity.source = match.source;
    entity.matchScore = match.matchScore;
    entity.matchType = match.matchType;
    entity.status = match.status;
    entity.reviewedBy = match.reviewedBy || null;
    entity.reviewedAt = match.reviewedAt || null;
    entity.resolutionNotes = match.resolutionNotes || null;
    entity.metadata = match.metadata;
    return entity;
  }
}
