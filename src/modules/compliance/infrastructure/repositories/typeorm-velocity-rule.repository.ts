import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VelocityRuleRepository } from '../../domain/repositories/velocity-rule.repository';
import {
  VelocityRule,
  VelocityRuleType,
  VelocityRuleAction,
  UserTier,
} from '../../domain/entities/velocity-rule.entity';
import { VelocityRuleOrmEntity } from '../orm-entities/velocity-rule.orm-entity';

/**
 * TypeORM implementation of VelocityRuleRepository
 */
@Injectable()
export class TypeOrmVelocityRuleRepository extends VelocityRuleRepository {
  constructor(
    @InjectRepository(VelocityRuleOrmEntity)
    private readonly repo: Repository<VelocityRuleOrmEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<VelocityRule | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAllActive(): Promise<VelocityRule[]> {
    const entities = await this.repo.find({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findActiveByTier(tier: UserTier): Promise<VelocityRule[]> {
    const entities = await this.repo
      .createQueryBuilder('rule')
      .where('rule.is_active = :isActive', { isActive: true })
      .andWhere(':tier = ANY(rule.applies_to_tier)', { tier })
      .orderBy('rule.created_at', 'ASC')
      .getMany();
    return entities.map((e) => this.toDomain(e));
  }

  async findActiveByType(ruleType: VelocityRuleType): Promise<VelocityRule[]> {
    const entities = await this.repo.find({
      where: { isActive: true, ruleType },
      order: { createdAt: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findActiveByTierAndType(
    tier: UserTier,
    ruleType: VelocityRuleType,
  ): Promise<VelocityRule[]> {
    const entities = await this.repo
      .createQueryBuilder('rule')
      .where('rule.is_active = :isActive', { isActive: true })
      .andWhere('rule.rule_type = :ruleType', { ruleType })
      .andWhere(':tier = ANY(rule.applies_to_tier)', { tier })
      .orderBy('rule.created_at', 'ASC')
      .getMany();
    return entities.map((e) => this.toDomain(e));
  }

  async findAll(): Promise<VelocityRule[]> {
    const entities = await this.repo.find({
      order: { createdAt: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async save(rule: VelocityRule): Promise<VelocityRule> {
    const entity = this.toOrmEntity(rule);
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  /**
   * Map ORM entity to domain entity
   */
  private toDomain(entity: VelocityRuleOrmEntity): VelocityRule {
    return VelocityRule.fromPersistence({
      id: entity.id,
      name: entity.name,
      description: entity.description ?? undefined,
      ruleType: entity.ruleType,
      thresholdAmount: entity.thresholdAmount
        ? parseFloat(entity.thresholdAmount)
        : undefined,
      thresholdCount: entity.thresholdCount ?? undefined,
      timeWindowHours: entity.timeWindowHours,
      action: entity.action,
      appliesToTier: entity.appliesToTier,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  /**
   * Map domain entity to ORM entity
   */
  private toOrmEntity(rule: VelocityRule): VelocityRuleOrmEntity {
    const entity = new VelocityRuleOrmEntity();
    entity.id = rule.id;
    entity.name = rule.name;
    entity.description = rule.description;
    entity.ruleType = rule.ruleType;
    entity.thresholdAmount = rule.thresholdAmount?.toString() ?? null;
    entity.thresholdCount = rule.thresholdCount;
    entity.timeWindowHours = rule.timeWindowHours;
    entity.action = rule.action;
    entity.appliesToTier = rule.appliesToTier;
    entity.isActive = rule.isActive;
    return entity;
  }
}
