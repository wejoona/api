import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity({ name: 'sla_configurations', schema: 'system' })
@Unique('UQ_sla_category_priority', ['category', 'priority'])
export class SlaConfigurationOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  @Index('IDX_sla_configurations_category')
  category: string;

  @Column({ type: 'varchar', length: 20 })
  @Index('IDX_sla_configurations_priority')
  priority: string;

  @Column({ name: 'response_time_minutes', type: 'integer' })
  responseTimeMinutes: number;

  @Column({ name: 'resolution_time_minutes', type: 'integer' })
  resolutionTimeMinutes: number;

  @Column({ name: 'escalation_after_minutes', type: 'integer', nullable: true })
  escalationAfterMinutes: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @Index('IDX_sla_configurations_is_active')
  isActive: boolean;

  @Column({ name: 'business_hours_only', type: 'boolean', default: false })
  businessHoursOnly: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
