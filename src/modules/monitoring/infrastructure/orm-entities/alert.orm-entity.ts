/**
 * Alert ORM Entity
 * Database entity for transaction alerts
 */

import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserOrmEntity } from '../../../user/infrastructure/orm-entities';

@Entity('transaction_alerts')
@Index(['userId', 'createdAt'])
@Index(['userId', 'isRead'])
@Index(['alertType', 'createdAt'])
@Index(['severity', 'createdAt'])
export class AlertOrmEntity {
  @PrimaryColumn('uuid')
  alertId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  @Index()
  transactionId: string | null;

  @Column({ name: 'alert_type', type: 'varchar', length: 50 })
  @Index()
  alertType: string;

  @Column({ type: 'varchar', length: 20 })
  severity: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  @Index()
  isRead: boolean;

  @Column({ name: 'is_action_required', type: 'boolean', default: false })
  isActionRequired: boolean;

  @Column({ name: 'action_taken', type: 'varchar', length: 50, nullable: true })
  actionTaken: string | null;

  @Column({ name: 'action_taken_at', type: 'timestamp', nullable: true })
  actionTakenAt: Date | null;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => UserOrmEntity)
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;
}
