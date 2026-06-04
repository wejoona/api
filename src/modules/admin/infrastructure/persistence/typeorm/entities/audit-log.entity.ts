import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type ActorType = 'user' | 'admin' | 'system';

@Entity('audit_logs')
@Index(['actorId'])
@Index(['action'])
@Index(['resourceType'])
@Index(['resourceId'])
@Index(['createdAt'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ name: 'actor_type', type: 'varchar', length: 20, default: 'user' })
  actorType: ActorType;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  eventType: string;

  @Column({ name: 'resource_type', type: 'varchar', length: 50 })
  resourceType: string;

  @Column({ name: 'resource_id', type: 'varchar', length: 100, nullable: true })
  resourceId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown> | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
