import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum RetentionLogStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity({ name: 'data_retention_logs', schema: 'system' })
export class DataRetentionLogOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_name', type: 'varchar', length: 100 })
  @Index()
  jobName: string;

  @Column({ name: 'data_type', type: 'varchar', length: 100 })
  @Index()
  dataType: string;

  @Column({ type: 'varchar', length: 20 })
  action: string;

  @Column({ name: 'records_processed', type: 'integer', default: 0 })
  recordsProcessed: number;

  @Column({ name: 'records_deleted', type: 'integer', default: 0 })
  recordsDeleted: number;

  @Column({ name: 'records_anonymized', type: 'integer', default: 0 })
  recordsAnonymized: number;

  @Column({ name: 'records_archived', type: 'integer', default: 0 })
  recordsArchived: number;

  @Column({
    type: 'varchar',
    length: 20,
  })
  status: RetentionLogStatus;

  @Column({ name: 'started_at', type: 'timestamp', default: () => 'now()' })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}
