/**
 * Monitoring Rule ORM Entity
 * Database entity for monitoring rules configuration
 */

import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('monitoring_rules')
@Index(['isActive', 'priority'])
@Index(['category', 'isActive'])
export class MonitoringRuleOrmEntity {
  @PrimaryColumn({ name: 'rule_id', type: 'uuid' })
  ruleId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 30 })
  @Index()
  category: string;

  // Rule conditions stored as JSON
  @Column({ type: 'jsonb' })
  conditions: Record<string, any>[];

  @Column({
    name: 'condition_logic',
    type: 'varchar',
    length: 10,
    default: 'AND',
  })
  conditionLogic: string;

  // Rule action configuration
  @Column({ type: 'jsonb' })
  action: Record<string, any>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @Column({ type: 'integer', default: 100 })
  priority: number;

  @Column({ name: 'is_user_configurable', type: 'boolean', default: false })
  isUserConfigurable: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
