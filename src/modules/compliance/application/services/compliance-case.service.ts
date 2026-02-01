import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ComplianceCaseRepository,
  CaseSearchCriteria,
  PaginatedCases,
} from '../../domain/repositories/compliance-case.repository';
import {
  ComplianceCase,
  CasePriority,
} from '../../domain/entities/compliance-case.entity';
import { CaseNote } from '../../domain/entities/case-note.entity';
import { CaseEvidence } from '../../domain/entities/case-evidence.entity';
import {
  CreateCaseDto,
  UpdateCaseDto,
  EscalateCaseDto,
  CloseCaseDto,
  AddCaseNoteDto,
  AddCaseEvidenceDto,
  SearchCasesDto,
  CaseResponseDto,
  CaseNoteResponseDto,
  CaseEvidenceResponseDto,
  CaseStatsResponseDto,
} from '../dto/compliance-case.dto';

/**
 * Compliance Case Management Service
 *
 * Handles all operations related to compliance case management including:
 * - Case creation, updates, and status transitions
 * - Case notes and evidence management
 * - Case search and statistics
 */
@Injectable()
export class ComplianceCaseService {
  constructor(private readonly caseRepository: ComplianceCaseRepository) {}

  /**
   * Create a new compliance case
   */
  async createCase(
    dto: CreateCaseDto,
    createdBy: string,
  ): Promise<CaseResponseDto> {
    const caseNumber = await this.caseRepository.generateCaseNumber();

    const complianceCase = ComplianceCase.create({
      caseNumber,
      caseType: dto.caseType,
      subjectUserId: dto.subjectUserId,
      priority: dto.priority || CasePriority.MEDIUM,
      createdBy,
      summary: dto.summary,
      assignedTo: dto.assignedTo,
    });

    const saved = await this.caseRepository.save(complianceCase);
    return this.toResponseDto(saved);
  }

  /**
   * Get a case by ID
   */
  async getCaseById(id: string): Promise<CaseResponseDto> {
    const complianceCase = await this.caseRepository.findById(id);
    if (!complianceCase) {
      throw new NotFoundException(`Case with ID ${id} not found`);
    }
    return this.toResponseDto(complianceCase);
  }

  /**
   * Get a case by case number
   */
  async getCaseByCaseNumber(caseNumber: string): Promise<CaseResponseDto> {
    const complianceCase =
      await this.caseRepository.findByCaseNumber(caseNumber);
    if (!complianceCase) {
      throw new NotFoundException(`Case ${caseNumber} not found`);
    }
    return this.toResponseDto(complianceCase);
  }

  /**
   * Get all cases for a subject user
   */
  async getCasesBySubjectUser(userId: string): Promise<CaseResponseDto[]> {
    const cases = await this.caseRepository.findBySubjectUserId(userId);
    return cases.map((c) => this.toResponseDto(c));
  }

  /**
   * Get all cases assigned to an agent
   */
  async getCasesByAssignee(agentId: string): Promise<CaseResponseDto[]> {
    const cases = await this.caseRepository.findByAssignedTo(agentId);
    return cases.map((c) => this.toResponseDto(c));
  }

  /**
   * Search cases with criteria
   */
  async searchCases(
    dto: SearchCasesDto,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    items: CaseResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const criteria: CaseSearchCriteria = {
      caseType: dto.caseType,
      status: dto.status,
      priority: dto.priority,
      subjectUserId: dto.subjectUserId,
      assignedTo: dto.assignedTo,
    };

    const result = await this.caseRepository.search(criteria, page, limit);
    return {
      items: result.items.map((c) => this.toResponseDto(c)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /**
   * Update a case
   */
  async updateCase(id: string, dto: UpdateCaseDto): Promise<CaseResponseDto> {
    const complianceCase = await this.caseRepository.findById(id);
    if (!complianceCase) {
      throw new NotFoundException(`Case with ID ${id} not found`);
    }

    if (dto.priority) {
      complianceCase.updatePriority(dto.priority);
    }

    if (dto.assignedTo) {
      complianceCase.assignTo(dto.assignedTo);
    }

    if (dto.findings) {
      complianceCase.addFindings(dto.findings);
    }

    const saved = await this.caseRepository.save(complianceCase);
    return this.toResponseDto(saved);
  }

  /**
   * Assign a case to an agent
   */
  async assignCase(id: string, agentId: string): Promise<CaseResponseDto> {
    const complianceCase = await this.caseRepository.findById(id);
    if (!complianceCase) {
      throw new NotFoundException(`Case with ID ${id} not found`);
    }

    complianceCase.assignTo(agentId);
    const saved = await this.caseRepository.save(complianceCase);
    return this.toResponseDto(saved);
  }

  /**
   * Start investigation on a case
   */
  async startInvestigation(id: string): Promise<CaseResponseDto> {
    const complianceCase = await this.caseRepository.findById(id);
    if (!complianceCase) {
      throw new NotFoundException(`Case with ID ${id} not found`);
    }

    complianceCase.startInvestigation();
    const saved = await this.caseRepository.save(complianceCase);
    return this.toResponseDto(saved);
  }

  /**
   * Escalate a case
   */
  async escalateCase(
    id: string,
    dto: EscalateCaseDto,
  ): Promise<CaseResponseDto> {
    const complianceCase = await this.caseRepository.findById(id);
    if (!complianceCase) {
      throw new NotFoundException(`Case with ID ${id} not found`);
    }

    complianceCase.escalateTo(dto.escalatedTo);

    // Add escalation note if reason provided
    if (dto.reason) {
      const note = CaseNote.createInternal(
        complianceCase.id,
        complianceCase.assignedTo || complianceCase.createdBy,
        `Case escalated: ${dto.reason}`,
      );
      await this.caseRepository.saveNote(note);
    }

    const saved = await this.caseRepository.save(complianceCase);
    return this.toResponseDto(saved);
  }

  /**
   * Close a case with resolution
   */
  async closeCase(id: string, dto: CloseCaseDto): Promise<CaseResponseDto> {
    const complianceCase = await this.caseRepository.findById(id);
    if (!complianceCase) {
      throw new NotFoundException(`Case with ID ${id} not found`);
    }

    complianceCase.close(dto.resolution);
    const saved = await this.caseRepository.save(complianceCase);
    return this.toResponseDto(saved);
  }

  /**
   * Reopen a closed case
   */
  async reopenCase(id: string): Promise<CaseResponseDto> {
    const complianceCase = await this.caseRepository.findById(id);
    if (!complianceCase) {
      throw new NotFoundException(`Case with ID ${id} not found`);
    }

    complianceCase.reopen();
    const saved = await this.caseRepository.save(complianceCase);
    return this.toResponseDto(saved);
  }

  // Case Notes

  /**
   * Add a note to a case
   */
  async addNote(
    caseId: string,
    dto: AddCaseNoteDto,
    authorId: string,
  ): Promise<CaseNoteResponseDto> {
    const complianceCase = await this.caseRepository.findById(caseId);
    if (!complianceCase) {
      throw new NotFoundException(`Case with ID ${caseId} not found`);
    }

    const note = CaseNote.create({
      caseId,
      authorId,
      note: dto.note,
      isInternal: dto.isInternal ?? true,
    });

    const saved = await this.caseRepository.saveNote(note);
    return this.noteToResponseDto(saved);
  }

  /**
   * Get all notes for a case
   */
  async getNotes(caseId: string): Promise<CaseNoteResponseDto[]> {
    const notes = await this.caseRepository.findNotesByCaseId(caseId);
    return notes.map((n) => this.noteToResponseDto(n));
  }

  /**
   * Delete a note
   */
  async deleteNote(noteId: string): Promise<void> {
    await this.caseRepository.deleteNote(noteId);
  }

  // Case Evidence

  /**
   * Add evidence to a case
   */
  async addEvidence(
    caseId: string,
    dto: AddCaseEvidenceDto,
    uploadedBy: string,
  ): Promise<CaseEvidenceResponseDto> {
    const complianceCase = await this.caseRepository.findById(caseId);
    if (!complianceCase) {
      throw new NotFoundException(`Case with ID ${caseId} not found`);
    }

    const evidence = CaseEvidence.create({
      caseId,
      evidenceType: dto.evidenceType,
      fileUrl: dto.fileUrl,
      description: dto.description,
      uploadedBy,
    });

    const saved = await this.caseRepository.saveEvidence(evidence);
    return this.evidenceToResponseDto(saved);
  }

  /**
   * Get all evidence for a case
   */
  async getEvidence(caseId: string): Promise<CaseEvidenceResponseDto[]> {
    const evidence = await this.caseRepository.findEvidenceByCaseId(caseId);
    return evidence.map((e) => this.evidenceToResponseDto(e));
  }

  /**
   * Delete evidence
   */
  async deleteEvidence(evidenceId: string): Promise<void> {
    await this.caseRepository.deleteEvidence(evidenceId);
  }

  // Statistics

  /**
   * Get case statistics
   */
  async getStats(): Promise<CaseStatsResponseDto> {
    const [byStatus, byType, openByPriority] = await Promise.all([
      this.caseRepository.countByStatus(),
      this.caseRepository.countByType(),
      this.caseRepository.countOpenByPriority(),
    ]);

    return {
      byStatus,
      byType,
      openByPriority,
    };
  }

  // Mappers

  private toResponseDto(complianceCase: ComplianceCase): CaseResponseDto {
    return {
      id: complianceCase.id,
      caseNumber: complianceCase.caseNumber,
      caseType: complianceCase.caseType,
      subjectUserId: complianceCase.subjectUserId,
      status: complianceCase.status,
      priority: complianceCase.priority,
      assignedTo: complianceCase.assignedTo,
      escalatedTo: complianceCase.escalatedTo,
      createdBy: complianceCase.createdBy,
      summary: complianceCase.summary,
      findings: complianceCase.findings,
      resolution: complianceCase.resolution,
      createdAt: complianceCase.createdAt,
      updatedAt: complianceCase.updatedAt,
      closedAt: complianceCase.closedAt,
    };
  }

  private noteToResponseDto(note: CaseNote): CaseNoteResponseDto {
    return {
      id: note.id,
      caseId: note.caseId,
      authorId: note.authorId,
      note: note.note,
      isInternal: note.isInternal,
      createdAt: note.createdAt,
    };
  }

  private evidenceToResponseDto(
    evidence: CaseEvidence,
  ): CaseEvidenceResponseDto {
    return {
      id: evidence.id,
      caseId: evidence.caseId,
      evidenceType: evidence.evidenceType,
      fileUrl: evidence.fileUrl,
      description: evidence.description,
      uploadedBy: evidence.uploadedBy,
      createdAt: evidence.createdAt,
    };
  }
}
