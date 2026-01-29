import {
  ComplianceCase,
  CaseType,
  CaseStatus,
  CasePriority,
} from '../entities/compliance-case.entity';
import { CaseNote } from '../entities/case-note.entity';
import { CaseEvidence } from '../entities/case-evidence.entity';

export interface CaseSearchCriteria {
  caseType?: CaseType;
  status?: CaseStatus;
  priority?: CasePriority;
  subjectUserId?: string;
  assignedTo?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface PaginatedCases {
  items: ComplianceCase[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Compliance Case Repository Interface
 *
 * Defines persistence operations for compliance cases, notes, and evidence.
 */
export abstract class ComplianceCaseRepository {
  // Case operations
  abstract findById(id: string): Promise<ComplianceCase | null>;
  abstract findByCaseNumber(caseNumber: string): Promise<ComplianceCase | null>;
  abstract findBySubjectUserId(userId: string): Promise<ComplianceCase[]>;
  abstract findByAssignedTo(agentId: string): Promise<ComplianceCase[]>;
  abstract search(
    criteria: CaseSearchCriteria,
    page: number,
    limit: number,
  ): Promise<PaginatedCases>;
  abstract save(complianceCase: ComplianceCase): Promise<ComplianceCase>;
  abstract generateCaseNumber(): Promise<string>;

  // Case notes operations
  abstract findNotesByCaseId(caseId: string): Promise<CaseNote[]>;
  abstract saveNote(note: CaseNote): Promise<CaseNote>;
  abstract deleteNote(noteId: string): Promise<void>;

  // Case evidence operations
  abstract findEvidenceByCaseId(caseId: string): Promise<CaseEvidence[]>;
  abstract saveEvidence(evidence: CaseEvidence): Promise<CaseEvidence>;
  abstract deleteEvidence(evidenceId: string): Promise<void>;

  // Statistics
  abstract countByStatus(): Promise<Record<CaseStatus, number>>;
  abstract countByType(): Promise<Record<CaseType, number>>;
  abstract countOpenByPriority(): Promise<Record<CasePriority, number>>;
}
