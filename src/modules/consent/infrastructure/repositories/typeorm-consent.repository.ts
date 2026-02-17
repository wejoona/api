import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConsentRepository } from '../../domain/repositories/consent.repository';
import { ConsentRecord } from '../../domain/entities/consent-record.entity';
import { ConsentType } from '../../domain/enums/consent-type.enum';
import { ConsentRecordOrmEntity } from '../orm-entities/consent-record.orm-entity';
import { ConsentRecordMapper } from '../mappers/consent-record.mapper';

@Injectable()
export class TypeOrmConsentRepository extends ConsentRepository {
  constructor(
    @InjectRepository(ConsentRecordOrmEntity)
    private readonly repo: Repository<ConsentRecordOrmEntity>,
  ) {
    super();
  }

  async save(record: ConsentRecord): Promise<ConsentRecord> {
    const orm = this.repo.create(ConsentRecordMapper.toOrm(record));
    const saved = await this.repo.save(orm);
    return ConsentRecordMapper.toDomain(saved);
  }

  async findLatest(
    userId: string,
    consentType: ConsentType,
  ): Promise<ConsentRecord | null> {
    const orm = await this.repo.findOne({
      where: { userId, consentType },
      order: { createdAt: 'DESC' },
    });
    return orm ? ConsentRecordMapper.toDomain(orm) : null;
  }

  async findAllLatestByUser(userId: string): Promise<ConsentRecord[]> {
    // For each consent type, get the latest record
    const subQuery = this.repo
      .createQueryBuilder('cr')
      .select('DISTINCT ON (cr.consent_type) cr.*')
      .where('cr.user_id = :userId', { userId })
      .orderBy('cr.consent_type')
      .addOrderBy('cr.created_at', 'DESC');

    const results = await subQuery.getRawMany();

    return results.map((raw) =>
      ConsentRecordMapper.toDomain({
        id: raw.id,
        userId: raw.user_id,
        consentType: raw.consent_type,
        granted: raw.granted,
        grantedAt: raw.granted_at,
        revokedAt: raw.revoked_at,
        ipAddress: raw.ip_address,
        userAgent: raw.user_agent,
        version: raw.version,
        createdAt: raw.created_at,
      } as ConsentRecordOrmEntity),
    );
  }

  async findHistory(
    userId: string,
    consentType?: ConsentType,
    limit = 50,
    offset = 0,
  ): Promise<{ records: ConsentRecord[]; total: number }> {
    const qb = this.repo
      .createQueryBuilder('cr')
      .where('cr.user_id = :userId', { userId })
      .orderBy('cr.created_at', 'DESC')
      .skip(offset)
      .take(limit);

    if (consentType) {
      qb.andWhere('cr.consent_type = :consentType', { consentType });
    }

    const [entities, total] = await qb.getManyAndCount();
    return {
      records: entities.map(ConsentRecordMapper.toDomain),
      total,
    };
  }
}
