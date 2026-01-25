/**
 * Monitoring Rule Repository
 * Database operations for monitoring rules
 */

import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { MonitoringRuleOrmEntity } from '../orm-entities/monitoring-rule.orm-entity';
import { MonitoringRule, RuleCondition, RuleAction } from '../../domain/interfaces/monitoring.types';

@Injectable()
export class MonitoringRuleRepository {
  private readonly repository: Repository<MonitoringRuleOrmEntity>;
  private readonly logger = new Logger(MonitoringRuleRepository.name);

  constructor(private readonly dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(MonitoringRuleOrmEntity);
  }

  /**
   * Find rule by ID
   */
  async findById(ruleId: string): Promise<MonitoringRule | null> {
    const entity = await this.repository.findOne({ where: { ruleId } });
    return entity ? this.toDomain(entity) : null;
  }

  /**
   * Find all active rules
   */
  async findActiveRules(): Promise<MonitoringRule[]> {
    const entities = await this.repository.find({
      where: { isActive: true },
      order: { priority: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  /**
   * Find rules by category
   */
  async findByCategory(category: string): Promise<MonitoringRule[]> {
    const entities = await this.repository.find({
      where: { category, isActive: true },
      order: { priority: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  /**
   * Find user-configurable rules
   */
  async findUserConfigurable(): Promise<MonitoringRule[]> {
    const entities = await this.repository.find({
      where: { isUserConfigurable: true, isActive: true },
      order: { priority: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  /**
   * Create a rule
   */
  async create(rule: MonitoringRule): Promise<MonitoringRule> {
    const entity = this.toEntity(rule);
    const saved = await this.repository.save(entity);
    this.logger.log(`Created monitoring rule: ${saved.name}`);
    return this.toDomain(saved);
  }

  /**
   * Update a rule
   */
  async update(ruleId: string, updates: Partial<MonitoringRule>): Promise<MonitoringRule | null> {
    const existing = await this.findById(ruleId);
    if (!existing) {
      return null;
    }

    const updated: MonitoringRule = {
      ...existing,
      ...updates,
      ruleId,
      updatedAt: new Date(),
    };

    const entity = this.toEntity(updated);
    await this.repository.save(entity);
    this.logger.log(`Updated monitoring rule: ${ruleId}`);
    return updated;
  }

  /**
   * Activate/deactivate a rule
   */
  async setActive(ruleId: string, isActive: boolean): Promise<void> {
    await this.repository.update(
      { ruleId },
      { isActive, updatedAt: new Date() },
    );
    this.logger.log(`Rule ${ruleId} ${isActive ? 'activated' : 'deactivated'}`);
  }

  /**
   * Delete a rule
   */
  async delete(ruleId: string): Promise<void> {
    await this.repository.delete({ ruleId });
    this.logger.log(`Deleted monitoring rule: ${ruleId}`);
  }

  /**
   * Get all rules (including inactive)
   */
  async findAll(): Promise<MonitoringRule[]> {
    const entities = await this.repository.find({
      order: { priority: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  /**
   * Check if rule name exists
   */
  async nameExists(name: string, excludeRuleId?: string): Promise<boolean> {
    const query = this.repository.createQueryBuilder('rule')
      .where('rule.name = :name', { name });

    if (excludeRuleId) {
      query.andWhere('rule.ruleId != :excludeRuleId', { excludeRuleId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  // Mapping methods
  private toEntity(rule: MonitoringRule): MonitoringRuleOrmEntity {
    const entity = new MonitoringRuleOrmEntity();
    entity.ruleId = rule.ruleId;
    entity.name = rule.name;
    entity.description = rule.description;
    entity.category = rule.category;
    entity.conditions = rule.conditions as any;
    entity.conditionLogic = rule.conditionLogic;
    entity.action = rule.action as any;
    entity.isActive = rule.isActive;
    entity.priority = rule.priority;
    entity.isUserConfigurable = rule.isUserConfigurable;
    entity.createdAt = rule.createdAt;
    entity.updatedAt = rule.updatedAt;
    return entity;
  }

  private toDomain(entity: MonitoringRuleOrmEntity): MonitoringRule {
    return {
      ruleId: entity.ruleId,
      name: entity.name,
      description: entity.description,
      category: entity.category as any,
      conditions: entity.conditions as RuleCondition[],
      conditionLogic: entity.conditionLogic as 'AND' | 'OR',
      action: entity.action as RuleAction,
      isActive: entity.isActive,
      priority: entity.priority,
      isUserConfigurable: entity.isUserConfigurable,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
