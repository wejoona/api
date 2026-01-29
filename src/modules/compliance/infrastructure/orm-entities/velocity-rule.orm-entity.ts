import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import {
  VelocityRuleType,
  VelocityRuleAction,
  UserTier,
} from '../../domain/entities/velocity-rule.entity';

/**
 * Velocity Rule ORM Entity
 *
 * TypeORM entity for velocity_rules table in the compliance schema.
 * Defines transaction speed and volume limits for compliance monitoring.
 */
@Entity({ name: 'velocity_rules', schema: 'compliance' })
export class VelocityRuleOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name', type: 'varchar', length: 200 })
  name!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @Column({
    name: 'rule_type',
    type: 'enum',
    enum: VelocityRuleType,
    enumName!: 'velocity_rule_type_enum',
  })
  @Index()
  ruleType!: VelocityRuleType;

  @Column({
    name: 'threshold_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  thresholdAmount: string | null; // Stored as string due to decimal precision

  @Column({ name: 'threshold_count', type: 'integer', nullable: true })
  thresholdCount!: number | null;

  @Column({ name: 'time_window_hours', type: 'integer', default: 24 })
  timeWindowHours!: number;

  @Column({
    name: 'action',
    type: 'enum',
    enum: VelocityRuleAction,
    enumName: 'velocity_rule_action_enum',
    default: VelocityRuleAction.FLAG,
  })
  action!: VelocityRuleAction;

  @Column({
    name: 'applies_to_tier',
    type: 'varchar',
    array: true,
    default: '{}',
  })
  appliesToTier!: UserTier[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @Index()
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
