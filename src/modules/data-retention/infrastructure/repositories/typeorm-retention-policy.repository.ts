import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RetentionPolicyRepository } from '../../domain/repositories/retention-policy.repository';
import { RetentionPolicy } from '../../domain/entities/retention-policy.entity';
import { RetentionPolicyOrmEntity } from '../orm-entities/retention-policy.orm-entity';

@Injectable()
export class TypeOrmRetentionPolicyRepository extends RetentionPolicyRepository {
  constructor(
    @InjectRepository(RetentionPolicyOrmEntity)
    private readonly repo: Repository<RetentionPolicyOrmEntity>,
  ) {
    super();
  }

  async findAll(): Promise<RetentionPolicy[]> {
    const entities = await this.repo.find();
    return entities.map((e) => this.toDomain(e));
  }

  async findByDataType(dataType: string): Promise<RetentionPolicy | null> {
    const entity = await this.repo.findOne({ where: { dataType } });
    return entity ? this.toDomain(entity) : null;
  }

  async findEnabled(): Promise<RetentionPolicy[]> {
    const entities = await this.repo.find({ where: { isEnabled: true } });
    return entities.map((e) => this.toDomain(e));
  }

  async save(policy: RetentionPolicy): Promise<RetentionPolicy> {
    const entity = this.toOrmEntity(policy);
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async update(
    dataType: string,
    updates: Partial<RetentionPolicy>,
  ): Promise<void> {
    await this.repo.update({ dataType }, updates as any);
  }

  private toDomain(entity: RetentionPolicyOrmEntity): RetentionPolicy {
    return RetentionPolicy.fromPersistence({
      id: entity.id,
      dataType: entity.dataType,
      retentionDays: entity.retentionDays,
      action: entity.action,
      gracePeriodDays: entity.gracePeriodDays,
      isEnabled: entity.isEnabled,
      description: entity.description,
      complianceRequirement: entity.complianceRequirement,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private toOrmEntity(policy: RetentionPolicy): RetentionPolicyOrmEntity {
    const entity = new RetentionPolicyOrmEntity();
    if (policy.id) entity.id = policy.id;
    entity.dataType = policy.dataType;
    entity.retentionDays = policy.retentionDays;
    entity.action = policy.action;
    entity.gracePeriodDays = policy.gracePeriodDays;
    entity.isEnabled = policy.isEnabled;
    entity.description = policy.description;
    entity.complianceRequirement = policy.complianceRequirement;
    return entity;
  }
}
