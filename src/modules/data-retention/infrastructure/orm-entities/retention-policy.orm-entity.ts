import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum RetentionAction {
  DELETE = 'delete',
  ANONYMIZE = 'anonymize',
  ARCHIVE = 'archive',
}

@Entity({ name: 'retention_policies', schema: 'system' })
export class RetentionPolicyOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'data_type', type: 'varchar', length: 100, unique: true })
  @Index()
  dataType: string;

  @Column({ name: 'retention_days', type: 'integer' })
  retentionDays: number;

  @Column({
    type: 'varchar',
    length: 20,
  })
  action: RetentionAction;

  @Column({ name: 'grace_period_days', type: 'integer', default: 30 })
  gracePeriodDays: number;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  @Index()
  isEnabled: boolean;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'compliance_requirement',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  complianceRequirement: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
