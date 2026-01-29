import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import {
  CaseType,
  CaseStatus,
  CasePriority,
} from '../../domain/entities/compliance-case.entity';
import { CaseNoteOrmEntity } from './case-note.orm-entity';
import { CaseEvidenceOrmEntity } from './case-evidence.orm-entity';

/**
 * Compliance Case ORM Entity
 *
 * TypeORM entity for compliance.cases table.
 * Stores compliance investigation cases for fraud, AML, KYC reviews, and complaints.
 */
@Entity({ name: 'cases', schema: 'compliance' })
export class ComplianceCaseOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'case_number', type: 'varchar', length: 50, unique: true })
  @Index()
  caseNumber!: string;

  @Column({
    name: 'case_type',
    type: 'enum',
    enum: CaseType,
    enumName: 'case_type',
  })
  @Index()
  caseType!: CaseType;

  @Column({ name: 'subject_user_id', type: 'uuid' })
  @Index()
  subjectUserId!: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: CaseStatus,
    enumName: 'case_status',
    default: CaseStatus.OPEN,
  })
  @Index()
  status!: CaseStatus;

  @Column({
    name: 'priority',
    type: 'enum',
    enum: CasePriority,
    enumName: 'case_priority',
    default: CasePriority.MEDIUM,
  })
  @Index()
  priority!: CasePriority;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  @Index()
  assignedTo!: string | null;

  @Column({ name: 'escalated_to', type: 'uuid', nullable: true })
  escalatedTo!: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @Column({ name: 'summary', type: 'text' })
  summary!: string;

  @Column({ name: 'findings', type: 'text', nullable: true })
  findings!: string | null;

  @Column({ name: 'resolution', type: 'text', nullable: true })
  resolution!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt!: Date | null;

  @OneToMany(() => CaseNoteOrmEntity, (note) => note.complianceCase)
  notes!: CaseNoteOrmEntity[];

  @OneToMany(() => CaseEvidenceOrmEntity, (evidence) => evidence.complianceCase)
  evidence!: CaseEvidenceOrmEntity[];
}
