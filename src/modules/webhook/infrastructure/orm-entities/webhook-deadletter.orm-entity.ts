import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Webhook Dead Letter Entity
 *
 * Stores webhooks that failed processing for later investigation and retry.
 * This ensures no payment events are lost even if processing fails.
 */
@Entity('webhook_deadletters')
export class WebhookDeadletterOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  provider: string; // 'yellowcard' | 'circle' | 'generic'

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  @Index()
  eventType: string;

  @Column({ name: 'webhook_id', type: 'varchar', length: 255, nullable: true })
  @Index()
  webhookId: string | null;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ name: 'error_message', type: 'text' })
  errorMessage: string;

  @Column({ name: 'error_stack', type: 'text', nullable: true })
  errorStack: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  @Index()
  status: 'pending' | 'resolved' | 'ignored';

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'last_retry_at', type: 'timestamp', nullable: true })
  lastRetryAt: Date | null;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'resolved_by', type: 'varchar', length: 255, nullable: true })
  resolvedBy: string | null;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
