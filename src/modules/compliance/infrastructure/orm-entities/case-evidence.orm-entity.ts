import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EvidenceType } from '../../domain/entities/case-evidence.entity';
import { ComplianceCaseOrmEntity } from './compliance-case.orm-entity';

/**
 * Case Evidence ORM Entity
 *
 * TypeORM entity for compliance.case_evidence table.
 * Stores evidence files attached to compliance cases.
 */
@Entity({ name: 'case_evidence', schema: 'compliance' })
export class CaseEvidenceOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'case_id', type: 'uuid' })
  @Index()
  caseId: string;

  @Column({
    name: 'evidence_type',
    type: 'enum',
    enum: EvidenceType,
    enumName: 'evidence_type',
  })
  @Index()
  evidenceType: EvidenceType;

  @Column({ name: 'file_url', type: 'varchar', length: 500 })
  fileUrl: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploadedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(
    () => ComplianceCaseOrmEntity,
    (complianceCase) => complianceCase.evidence,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'case_id' })
  complianceCase: ComplianceCaseOrmEntity;
}
