import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { VerificationRepository } from '../../domain/repositories/verification.repository';
import {
  Verification,
  VerificationStatus,
  VerificationType,
} from '../../domain/entities/verification.entity';
import {
  VerificationOrmEntity,
  VerificationStatus as OrmStatus,
  VerificationType as OrmType,
} from '../orm-entities/verification.orm-entity';
import { VerificationMapper } from '../mappers/verification.mapper';

@Injectable()
export class TypeOrmVerificationRepository extends VerificationRepository {
  constructor(
    @InjectRepository(VerificationOrmEntity)
    private readonly repo: Repository<VerificationOrmEntity>,
    private readonly mapper: VerificationMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<Verification | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByIdentifierAndType(
    identifier: string,
    type: VerificationType,
    status?: VerificationStatus,
  ): Promise<Verification | null> {
    const whereConditions: Record<string, unknown> = {
      identifier,
      type: type as unknown as OrmType,
    };

    if (status) {
      whereConditions.status = status as unknown as OrmStatus;
    }

    const entity = await this.repo.findOne({
      where: whereConditions,
      order: { createdAt: 'DESC' },
    });

    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findPendingByIdentifier(
    identifier: string,
    type: VerificationType,
  ): Promise<Verification | null> {
    const entity = await this.repo.findOne({
      where: {
        identifier,
        type: type as unknown as OrmType,
        status: OrmStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });

    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByUserId(
    userId: string,
    limit: number = 50,
  ): Promise<Verification[]> {
    const entities = await this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return entities.map((e) => this.mapper.toDomain(e));
  }

  async save(verification: Verification): Promise<Verification> {
    const entity = this.mapper.toOrmEntity(verification);
    const saved = await this.repo.save(entity);
    return this.mapper.toDomain(saved);
  }

  async expireOldVerifications(): Promise<number> {
    const result = await this.repo.update(
      {
        status: OrmStatus.PENDING,
        expiresAt: LessThan(new Date()),
      },
      {
        status: OrmStatus.EXPIRED,
      },
    );

    return result.affected ?? 0;
  }

  async deleteExpired(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.repo.delete({
      status: OrmStatus.EXPIRED,
      expiresAt: LessThan(cutoffDate),
    });

    return result.affected ?? 0;
  }
}
