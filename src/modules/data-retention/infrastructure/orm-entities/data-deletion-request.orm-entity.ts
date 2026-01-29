import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserOrmEntity } from '../../../user/infrastructure/orm-entities/user.orm-entity';

export enum DeletionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum DeletionType {
  GDPR = 'gdpr',
  ACCOUNT_CLOSURE = 'account_closure',
  ADMIN = 'admin',
}

@Entity({ name: 'data_deletion_requests', schema: 'system' })
export class DataDeletionRequestOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;

  @Column({ name: 'requested_by_user_id', type: 'uuid', nullable: true })
  requestedByUserId: string | null;

  @ManyToOne(() => UserOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'requested_by_user_id' })
  requestedBy?: UserOrmEntity;

  @Column({
    type: 'varchar',
    length: 20,
    default: DeletionStatus.PENDING,
  })
  @Index()
  status: DeletionStatus;

  @Column({
    name: 'deletion_type',
    type: 'varchar',
    length: 20,
  })
  deletionType: DeletionType;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'scheduled_for', type: 'timestamp' })
  @Index()
  scheduledFor: Date;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'failed_at', type: 'timestamp', nullable: true })
  failedAt: Date | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'audit_trail', type: 'jsonb', default: '[]' })
  auditTrail: Array<{
    action: string;
    timestamp: Date;
    details: Record<string, unknown>;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
