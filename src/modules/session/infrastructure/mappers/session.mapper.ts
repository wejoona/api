import { Injectable } from '@nestjs/common';
import { Session } from '../../domain/entities/session.entity';
import { SessionOrmEntity } from '../orm-entities/session.orm-entity';

@Injectable()
export class SessionMapper {
  toDomain(entity: SessionOrmEntity): Session {
    return Session.reconstitute({
      id: entity.id,
      userId: entity.userId,
      deviceId: entity.deviceId,
      refreshTokenHash: entity.refreshTokenHash,
      ipAddress: entity.ipAddress,
      userAgent: entity.userAgent,
      location: entity.location,
      isActive: entity.isActive,
      lastActivityAt: entity.lastActivityAt,
      expiresAt: entity.expiresAt,
      revokedAt: entity.revokedAt,
      revokedReason: entity.revokedReason,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toOrmEntity(session: Session): SessionOrmEntity {
    const entity = new SessionOrmEntity();
    entity.id = session.id;
    entity.userId = session.userId;
    entity.deviceId = session.deviceId;
    entity.refreshTokenHash = session.refreshTokenHash;
    entity.ipAddress = session.ipAddress;
    entity.userAgent = session.userAgent;
    entity.location = session.location;
    entity.isActive = session.isActive;
    entity.lastActivityAt = session.lastActivityAt;
    entity.expiresAt = session.expiresAt;
    entity.revokedAt = session.revokedAt;
    entity.revokedReason = session.revokedReason;
    return entity;
  }
}
