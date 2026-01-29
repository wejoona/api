import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { Session } from '../../domain/entities/session.entity';
import { SessionOrmEntity } from '../orm-entities/session.orm-entity';
import { SessionMapper } from '../mappers/session.mapper';

@Injectable()
export class TypeOrmSessionRepository extends SessionRepository {
  constructor(
    @InjectRepository(SessionOrmEntity)
    private readonly repo: Repository<SessionOrmEntity>,
    private readonly mapper: SessionMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<Session | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByRefreshTokenHash(tokenHash: string): Promise<Session | null> {
    const entity = await this.repo.findOne({
      where: { refreshTokenHash: tokenHash },
    });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByUserId(userId: string): Promise<Session[]> {
    const entities = await this.repo.find({
      where: { userId },
      order: { lastActivityAt: 'DESC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findActiveByUserId(userId: string): Promise<Session[]> {
    const entities = await this.repo.find({
      where: { userId, isActive: true },
      order: { lastActivityAt: 'DESC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async save(session: Session): Promise<Session> {
    const entity = this.mapper.toOrmEntity(session);
    const saved = await this.repo.save(entity);
    return this.mapper.toDomain(saved);
  }

  async revokeAllForUser(userId: string, reason?: string): Promise<number> {
    const result = await this.repo.update(
      { userId, isActive: true },
      {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: reason ?? 'logout_all',
      },
    );
    return result.affected ?? 0;
  }

  async revokeByDeviceId(deviceId: string, reason?: string): Promise<number> {
    const result = await this.repo.update(
      { deviceId, isActive: true },
      {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: reason ?? 'device_revoked',
      },
    );
    return result.affected ?? 0;
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.repo.update(
      {
        isActive: true,
        expiresAt: LessThan(new Date()),
      },
      {
        isActive: false,
        revokedReason: 'expired',
      },
    );
    return result.affected ?? 0;
  }

  async countActiveByUserId(userId: string): Promise<number> {
    return this.repo.count({
      where: { userId, isActive: true },
    });
  }
}
