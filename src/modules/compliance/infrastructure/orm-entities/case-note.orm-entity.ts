import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ComplianceCaseOrmEntity } from './compliance-case.orm-entity';

/**
 * Case Note ORM Entity
 *
 * TypeORM entity for compliance.case_notes table.
 * Stores notes and comments on compliance cases.
 */
@Entity({ name: 'case_notes', schema: 'compliance' })
export class CaseNoteOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'case_id', type: 'uuid' })
  @Index()
  caseId!: string;

  @Column({ name: 'author_id', type: 'uuid' })
  @Index()
  authorId!: string;

  @Column({ name: 'note', type: 'text' })
  note!: string;

  @Column({ name: 'is_internal', type: 'boolean', default: true })
  isInternal!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(
    () => ComplianceCaseOrmEntity,
    (complianceCase) => complianceCase.notes,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'case_id' })
  complianceCase!: ComplianceCaseOrmEntity;
}
