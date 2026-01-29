import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WatchlistRepository } from '../../domain/repositories/watchlist.repository';
import {
  WatchlistEntry,
  WatchlistListType,
} from '../../domain/entities/watchlist-entry.entity';
import {
  WatchlistMatch,
  WatchlistMatchStatus,
  WatchlistMatchType,
} from '../../domain/entities/watchlist-match.entity';
import { WatchlistEntryOrmEntity } from '../orm-entities/watchlist-entry.orm-entity';
import { WatchlistMatchOrmEntity } from '../orm-entities/watchlist-match.orm-entity';

@Injectable()
export class TypeOrmWatchlistRepository extends WatchlistRepository {
  constructor(
    @InjectRepository(WatchlistEntryOrmEntity)
    private readonly entryRepo: Repository<WatchlistEntryOrmEntity>,
    @InjectRepository(WatchlistMatchOrmEntity)
    private readonly matchRepo: Repository<WatchlistMatchOrmEntity>,
  ) {
    super();
  }

  // ==========================================
  // Entry Operations
  // ==========================================

  async findEntryById(id: string): Promise<WatchlistEntry | null> {
    const entity = await this.entryRepo.findOne({ where: { id } });
    return entity ? this.entryToDomain(entity) : null;
  }

  async findEntriesByType(
    listType: WatchlistListType,
  ): Promise<WatchlistEntry[]> {
    const entities = await this.entryRepo.find({
      where: { listType, isActive: true },
    });
    return entities.map((e) => this.entryToDomain(e));
  }

  async searchEntriesByName(
    name: string,
    listType?: WatchlistListType,
  ): Promise<WatchlistEntry[]> {
    const queryBuilder = this.entryRepo
      .createQueryBuilder('entry')
      .where('entry.is_active = :isActive', { isActive: true })
      .andWhere(
        '(LOWER(entry.name) LIKE LOWER(:name) OR entry.aliases::text ILIKE :aliasPattern)',
        {
          name: `%${name}%`,
          aliasPattern: `%${name}%`,
        },
      );

    if (listType) {
      queryBuilder.andWhere('entry.list_type = :listType', { listType });
    }

    const entities = await queryBuilder.getMany();
    return entities.map((e) => this.entryToDomain(e));
  }

  async findEntriesByIdentifier(
    identifierType: string,
    identifierValue: string,
  ): Promise<WatchlistEntry[]> {
    const entities = await this.entryRepo
      .createQueryBuilder('entry')
      .where('entry.is_active = :isActive', { isActive: true })
      .andWhere(`entry.identifiers->:type ? :value`, {
        type: identifierType,
        value: identifierValue,
      })
      .getMany();

    return entities.map((e) => this.entryToDomain(e));
  }

  async findActiveEntries(): Promise<WatchlistEntry[]> {
    const entities = await this.entryRepo.find({ where: { isActive: true } });
    return entities.map((e) => this.entryToDomain(e));
  }

  async saveEntry(entry: WatchlistEntry): Promise<WatchlistEntry> {
    const ormEntity = this.entryToOrm(entry);
    const saved = await this.entryRepo.save(ormEntity);
    return this.entryToDomain(saved);
  }

  async bulkInsertEntries(entries: WatchlistEntry[]): Promise<number> {
    const ormEntities = entries.map((e) => this.entryToOrm(e));
    const result = await this.entryRepo.insert(ormEntities);
    return result.identifiers.length;
  }

  async deactivateBySource(source: string): Promise<number> {
    const result = await this.entryRepo.update(
      { source, isActive: true },
      { isActive: false, updatedAt: new Date() },
    );
    return result.affected || 0;
  }

  // ==========================================
  // Match Operations
  // ==========================================

  async findMatchById(id: string): Promise<WatchlistMatch | null> {
    const entity = await this.matchRepo.findOne({ where: { id } });
    return entity ? this.matchToDomain(entity) : null;
  }

  async findMatchesByUserId(userId: string): Promise<WatchlistMatch[]> {
    const entities = await this.matchRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.matchToDomain(e));
  }

  async findMatchesByStatus(
    status: WatchlistMatchStatus,
    limit = 50,
  ): Promise<WatchlistMatch[]> {
    const entities = await this.matchRepo.find({
      where: { status },
      order: { matchScore: 'DESC', createdAt: 'DESC' },
      take: limit,
    });
    return entities.map((e) => this.matchToDomain(e));
  }

  async findHighPriorityPendingMatches(
    minScore: number,
    limit = 50,
  ): Promise<WatchlistMatch[]> {
    const entities = await this.matchRepo
      .createQueryBuilder('match')
      .where('match.status = :status', { status: 'pending' })
      .andWhere('match.match_score >= :minScore', { minScore })
      .orderBy('match.match_score', 'DESC')
      .addOrderBy('match.created_at', 'ASC')
      .take(limit)
      .getMany();

    return entities.map((e) => this.matchToDomain(e));
  }

  async hasConfirmedMatch(userId: string): Promise<boolean> {
    const count = await this.matchRepo.count({
      where: { userId, status: 'confirmed' },
    });
    return count > 0;
  }

  async saveMatch(match: WatchlistMatch): Promise<WatchlistMatch> {
    const ormEntity = this.matchToOrm(match);
    const saved = await this.matchRepo.save(ormEntity);
    return this.matchToDomain(saved);
  }

  async findExistingMatch(
    userId: string,
    watchlistEntryId: string,
    matchType: string,
  ): Promise<WatchlistMatch | null> {
    const entity = await this.matchRepo.findOne({
      where: {
        userId,
        watchlistEntryId,
        matchType: matchType as WatchlistMatchType,
      },
    });
    return entity ? this.matchToDomain(entity) : null;
  }

  async countMatchesByStatus(): Promise<Record<WatchlistMatchStatus, number>> {
    const results = await this.matchRepo
      .createQueryBuilder('match')
      .select('match.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('match.status')
      .getRawMany();

    const counts: Record<WatchlistMatchStatus, number> = {
      pending: 0,
      confirmed: 0,
      false_positive: 0,
    };

    for (const row of results) {
      counts[row.status as WatchlistMatchStatus] = parseInt(row.count, 10);
    }

    return counts;
  }

  async findMatchWithEntry(
    matchId: string,
  ): Promise<{ match: WatchlistMatch; entry: WatchlistEntry } | null> {
    const entity = await this.matchRepo.findOne({
      where: { id: matchId },
      relations: ['watchlistEntry'],
    });

    if (!entity || !entity.watchlistEntry) {
      return null;
    }

    return {
      match: this.matchToDomain(entity),
      entry: this.entryToDomain(entity.watchlistEntry),
    };
  }

  // ==========================================
  // Mappers
  // ==========================================

  private entryToDomain(entity: WatchlistEntryOrmEntity): WatchlistEntry {
    return WatchlistEntry.fromPersistence({
      id: entity.id,
      listType: entity.listType,
      name: entity.name,
      aliases: entity.aliases,
      nationality: entity.nationality,
      dateOfBirth: entity.dateOfBirth,
      identifiers: entity.identifiers,
      source: entity.source,
      sourceUrl: entity.sourceUrl,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private entryToOrm(entry: WatchlistEntry): WatchlistEntryOrmEntity {
    const entity = new WatchlistEntryOrmEntity();
    entity.id = entry.id;
    entity.listType = entry.listType;
    entity.name = entry.name;
    entity.aliases = entry.aliases;
    entity.nationality = entry.nationality;
    entity.dateOfBirth = entry.dateOfBirth;
    entity.identifiers = entry.identifiers;
    entity.source = entry.source;
    entity.sourceUrl = entry.sourceUrl;
    entity.isActive = entry.isActive;
    return entity;
  }

  private matchToDomain(entity: WatchlistMatchOrmEntity): WatchlistMatch {
    return WatchlistMatch.fromPersistence({
      id: entity.id,
      userId: entity.userId,
      watchlistEntryId: entity.watchlistEntryId,
      matchScore: Number(entity.matchScore),
      matchType: entity.matchType,
      status: entity.status,
      reviewedBy: entity.reviewedBy,
      reviewedAt: entity.reviewedAt,
      notes: entity.notes,
      createdAt: entity.createdAt,
    });
  }

  private matchToOrm(match: WatchlistMatch): WatchlistMatchOrmEntity {
    const entity = new WatchlistMatchOrmEntity();
    entity.id = match.id;
    entity.userId = match.userId;
    entity.watchlistEntryId = match.watchlistEntryId;
    entity.matchScore = match.matchScore;
    entity.matchType = match.matchType;
    entity.status = match.status;
    entity.reviewedBy = match.reviewedBy;
    entity.reviewedAt = match.reviewedAt;
    entity.notes = match.notes;
    return entity;
  }
}
