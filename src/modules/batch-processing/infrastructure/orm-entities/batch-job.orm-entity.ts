import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('batch_jobs')
@Index(['userId', 'status'])
@Index(['organizationId', 'status'])
@Index(['type', 'status'])
@Index(['scheduledAt'])
@Index(['createdAt'])
export class BatchJobOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: [
      'bulk_kyc',
      'mass_notification',
      'scheduled_report',
      'data_export',
      'bulk_transaction',
      'user_migration',
    ],
  })
  @Index()
  type: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: [
      'pending',
      'queued',
      'processing',
      'completed',
      'failed',
      'cancelled',
      'partially_completed',
    ],
    default: 'pending',
  })
  @Index()
  status: string;

  @Column({ type: 'int', default: 5 })
  priority: number;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  @Index()
  organizationId: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any>;

  @Column({ type: 'jsonb', default: {} })
  metrics: {
    totalItems: number;
    processedItems: number;
    successfulItems: number;
    failedItems: number;
    skippedItems: number;
    progress: number;
    estimatedTimeRemaining?: number;
  };

  @Column({ name: 'scheduled_at', type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'error_details', type: 'jsonb', nullable: true })
  errorDetails: Record<string, any>;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'max_retries', type: 'int', default: 3 })
  maxRetries: number;

  @Column({ type: 'jsonb', nullable: true })
  results: Record<string, any>;

  @Column({ name: 'result_file_url', type: 'text', nullable: true })
  resultFileUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;
}
