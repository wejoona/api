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
import { SARTriggerReason, RiskLevel } from '../../domain/compliance.types';
import { UserOrmEntity } from '../../../user/infrastructure/orm-entities/user.orm-entity';

/**
 * Compliance Alert Entity
 *
 * Real-time alerts for compliance officers when suspicious patterns are detected.
 * These may escalate to full SAR investigations.
 */
@Entity('compliance_alerts')
export class ComplianceAlertOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'alert_type', type: 'varchar', length: 50 })
  @Index()
  alertType: SARTriggerReason;

  @Column({ name: 'severity', type: 'varchar', length: 20 })
  @Index()
  severity: RiskLevel;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  @Index()
  transactionId: string | null;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'description', type: 'text' })
  description: string;

  @Column({ name: 'resolved', type: 'boolean', default: false })
  @Index()
  resolved: boolean;

  @Column({ name: 'acknowledged_at', type: 'timestamp', nullable: true })
  acknowledgedAt: Date | null;

  @Column({ name: 'acknowledged_by', type: 'uuid', nullable: true })
  acknowledgedBy: string | null;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy: string | null;

  @Column({ name: 'resolution', type: 'text', nullable: true })
  resolution: string | null;

  @Column({ name: 'escalated_to_sar', type: 'boolean', default: false })
  escalatedToSar: boolean;

  @Column({ name: 'sar_id', type: 'uuid', nullable: true })
  @Index()
  sarId: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => UserOrmEntity)
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;
}
