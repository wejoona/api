import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Audit Log ORM Entity
 *
 * Comprehensive audit trail for regulatory compliance.
 * Records all significant system events for BCEAO reporting.
 *
 * Retention: 7 years per BCEAO mandate.
 */
@Entity('audit_logs')
export class AuditLogOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  @Index()
  eventType: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 100 })
  @Index()
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  @Index()
  entityId: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  @Index()
  userId: string | null;

  @Column({ name: 'user_email', type: 'varchar', length: 255, nullable: true })
  userEmail: string | null;

  @Column({ name: 'user_role', type: 'varchar', length: 50, nullable: true })
  userRole: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ name: 'action', type: 'varchar', length: 100 })
  @Index()
  action: string;

  @Column({
    name: 'resource_path',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  resourcePath: string | null;

  @Column({ name: 'http_method', type: 'varchar', length: 10, nullable: true })
  httpMethod: string | null;

  @Column({ name: 'status_code', type: 'integer', nullable: true })
  statusCode: number | null;

  @Column({ name: 'previous_value', type: 'jsonb', nullable: true })
  previousValue: Record<string, unknown> | null;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue: Record<string, unknown> | null;

  @Column({ name: 'changes', type: 'jsonb', nullable: true })
  changes: Record<string, { old: unknown; new: unknown }> | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'correlation_id', type: 'uuid', nullable: true })
  @Index()
  correlationId: string | null;

  @Column({ name: 'session_id', type: 'varchar', length: 100, nullable: true })
  @Index()
  sessionId: string | null;

  @Column({ name: 'risk_level', type: 'varchar', length: 20, nullable: true })
  riskLevel: string | null;

  @Column({ name: 'is_sensitive', type: 'boolean', default: false })
  isSensitive: boolean;

  @Column({ name: 'country_code', type: 'varchar', length: 3, nullable: true })
  countryCode: string | null;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;

  // Soft delete for compliance
  @Column({ name: 'archived_at', type: 'timestamp', nullable: true })
  @Index()
  archivedAt: Date | null;
}
