import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ConsentType } from '../../domain/enums/consent-type.enum';

@Entity('consent_records')
@Index(['userId', 'consentType'])
@Index(['userId', 'consentType', 'createdAt'])
export class ConsentRecordOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({
    name: 'consent_type',
    type: 'enum',
    enum: ConsentType,
  })
  consentType: ConsentType;

  @Column({ type: 'boolean', default: false })
  granted: boolean;

  @Column({ name: 'granted_at', type: 'timestamptz', nullable: true })
  grantedAt: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'ip_address', type: 'inet' })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  /** Policy/terms version the user consented to */
  @Column({ type: 'varchar', length: 20, default: '1.0' })
  version: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
