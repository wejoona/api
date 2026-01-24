import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

@Entity('scheduled_jobs')
@Index(['jobName'])
@Index(['status'])
export class ScheduledJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_name', type: 'varchar', length: 100 })
  jobName: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: JobStatus;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'records_processed', type: 'integer', default: 0 })
  recordsProcessed: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
