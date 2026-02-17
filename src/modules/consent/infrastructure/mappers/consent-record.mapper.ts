import { ConsentRecord } from '../../domain/entities/consent-record.entity';
import { ConsentRecordOrmEntity } from '../orm-entities/consent-record.orm-entity';

export class ConsentRecordMapper {
  static toDomain(orm: ConsentRecordOrmEntity): ConsentRecord {
    return new ConsentRecord({
      id: orm.id,
      userId: orm.userId,
      consentType: orm.consentType,
      granted: orm.granted,
      grantedAt: orm.grantedAt,
      revokedAt: orm.revokedAt,
      ipAddress: orm.ipAddress,
      userAgent: orm.userAgent,
      version: orm.version,
      createdAt: orm.createdAt,
    });
  }

  static toOrm(domain: ConsentRecord): Partial<ConsentRecordOrmEntity> {
    return {
      id: domain.id,
      userId: domain.userId,
      consentType: domain.consentType,
      granted: domain.granted,
      grantedAt: domain.grantedAt,
      revokedAt: domain.revokedAt,
      ipAddress: domain.ipAddress,
      userAgent: domain.userAgent,
      version: domain.version,
    };
  }
}
