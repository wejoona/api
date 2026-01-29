import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  ComplianceCaseRepository,
  CaseSearchCriteria,
  PaginatedCases,
} from '../../domain/repositories/compliance-case.repository';
import {
  ComplianceCase,
  CaseType,
  CaseStatus,
  CasePriority,
} from '../../domain/entities/compliance-case.entity';
import { CaseNote } from '../../domain/entities/case-note.entity';
import { CaseEvidence } from '../../domain/entities/case-evidence.entity';
import { ComplianceCaseOrmEntity } from '../orm-entities/compliance-case.orm-entity';
import { CaseNoteOrmEntity } from '../orm-entities/case-note.orm-entity';
import { CaseEvidenceOrmEntity } from '../orm-entities/case-evidence.orm-entity';

@Injectable()
export class TypeOrmComplianceCaseRepository extends ComplianceCaseRepository {
  constructor(
    @InjectRepository(ComplianceCaseOrmEntity)
    private readonly caseRepo: Repository<ComplianceCaseOrmEntity>,
    @InjectRepository(CaseNoteOrmEntity)
    private readonly noteRepo: Repository<CaseNoteOrmEntity>,
    @InjectRepository(CaseEvidenceOrmEntity)
    private readonly evidenceRepo: Repository<CaseEvidenceOrmEntity>,
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async findById(id: string): Promise<ComplianceCase | null> {
    const entity = await this.caseRepo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByCaseNumber(caseNumber: string): Promise<ComplianceCase | null> {
    const entity = await this.caseRepo.findOne({ where: { caseNumber } });
    return entity ? this.toDomain(entity) : null;
  }

  async findBySubjectUserId(userId: string): Promise<ComplianceCase[]> {
    const entities = await this.caseRepo.find({
      where: { subjectUserId: userId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByAssignedTo(agentId: string): Promise<ComplianceCase[]> {
    const entities = await this.caseRepo.find({
      where: { assignedTo: agentId },
      order: { priority: 'ASC', createdAt: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async search(
    criteria: CaseSearchCriteria,
    page: number,
    limit: number,
  ): Promise<PaginatedCases> {
    const queryBuilder = this.caseRepo.createQueryBuilder('case');

    if (criteria.caseType) {
      queryBuilder.andWhere('case.caseType = :caseType', {
        caseType: criteria.caseType,
      });
    }

    if (criteria.status) {
      queryBuilder.andWhere('case.status = :status', {
        status: criteria.status,
      });
    }

    if (criteria.priority) {
      queryBuilder.andWhere('case.priority = :priority', {
        priority: criteria.priority,
      });
    }

    if (criteria.subjectUserId) {
      queryBuilder.andWhere('case.subjectUserId = :subjectUserId', {
        subjectUserId: criteria.subjectUserId,
      });
    }

    if (criteria.assignedTo) {
      queryBuilder.andWhere('case.assignedTo = :assignedTo', {
        assignedTo: criteria.assignedTo,
      });
    }

    if (criteria.createdAfter) {
      queryBuilder.andWhere('case.createdAt >= :createdAfter', {
        createdAfter: criteria.createdAfter,
      });
    }

    if (criteria.createdBefore) {
      queryBuilder.andWhere('case.createdAt <= :createdBefore', {
        createdBefore: criteria.createdBefore,
      });
    }

    const [entities, total] = await queryBuilder
      .orderBy('case.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: entities.map((e) => this.toDomain(e)),
      total,
      page,
      limit,
    };
  }

  async save(complianceCase: ComplianceCase): Promise<ComplianceCase> {
    const entity = this.toOrmEntity(complianceCase);
    const saved = await this.caseRepo.save(entity);
    return this.toDomain(saved);
  }

  async generateCaseNumber(): Promise<string> {
    const result = await this.dataSource.query(
      `SELECT compliance.generate_case_number() as case_number`,
    );
    return result[0].case_number;
  }

  // Case notes operations
  async findNotesByCaseId(caseId: string): Promise<CaseNote[]> {
    const entities = await this.noteRepo.find({
      where: { caseId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.noteToDomain(e));
  }

  async saveNote(note: CaseNote): Promise<CaseNote> {
    const entity = this.noteToOrmEntity(note);
    const saved = await this.noteRepo.save(entity);
    return this.noteToDomain(saved);
  }

  async deleteNote(noteId: string): Promise<void> {
    await this.noteRepo.delete(noteId);
  }

  // Case evidence operations
  async findEvidenceByCaseId(caseId: string): Promise<CaseEvidence[]> {
    const entities = await this.evidenceRepo.find({
      where: { caseId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.evidenceToDomain(e));
  }

  async saveEvidence(evidence: CaseEvidence): Promise<CaseEvidence> {
    const entity = this.evidenceToOrmEntity(evidence);
    const saved = await this.evidenceRepo.save(entity);
    return this.evidenceToDomain(saved);
  }

  async deleteEvidence(evidenceId: string): Promise<void> {
    await this.evidenceRepo.delete(evidenceId);
  }

  // Statistics
  async countByStatus(): Promise<Record<CaseStatus, number>> {
    const result = await this.caseRepo
      .createQueryBuilder('case')
      .select('case.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('case.status')
      .getRawMany();

    const counts: Record<CaseStatus, number> = {
      [CaseStatus.OPEN]: 0,
      [CaseStatus.INVESTIGATING]: 0,
      [CaseStatus.ESCALATED]: 0,
      [CaseStatus.CLOSED]: 0,
    };

    result.forEach((r) => {
      counts[r.status as CaseStatus] = parseInt(r.count, 10);
    });

    return counts;
  }

  async countByType(): Promise<Record<CaseType, number>> {
    const result = await this.caseRepo
      .createQueryBuilder('case')
      .select('case.caseType', 'caseType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('case.caseType')
      .getRawMany();

    const counts: Record<CaseType, number> = {
      [CaseType.FRAUD]: 0,
      [CaseType.AML]: 0,
      [CaseType.KYC_REVIEW]: 0,
      [CaseType.COMPLAINT]: 0,
    };

    result.forEach((r) => {
      counts[r.caseType as CaseType] = parseInt(r.count, 10);
    });

    return counts;
  }

  async countOpenByPriority(): Promise<Record<CasePriority, number>> {
    const result = await this.caseRepo
      .createQueryBuilder('case')
      .select('case.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .where('case.status IN (:...statuses)', {
        statuses: [
          CaseStatus.OPEN,
          CaseStatus.INVESTIGATING,
          CaseStatus.ESCALATED,
        ],
      })
      .groupBy('case.priority')
      .getRawMany();

    const counts: Record<CasePriority, number> = {
      [CasePriority.CRITICAL]: 0,
      [CasePriority.HIGH]: 0,
      [CasePriority.MEDIUM]: 0,
      [CasePriority.LOW]: 0,
    };

    result.forEach((r) => {
      counts[r.priority as CasePriority] = parseInt(r.count, 10);
    });

    return counts;
  }

  // Mappers for ComplianceCase
  private toDomain(entity: ComplianceCaseOrmEntity): ComplianceCase {
    return ComplianceCase.fromPersistence({
      id: entity.id,
      caseNumber: entity.caseNumber,
      caseType: entity.caseType,
      subjectUserId: entity.subjectUserId,
      status: entity.status,
      priority: entity.priority,
      assignedTo: entity.assignedTo,
      escalatedTo: entity.escalatedTo,
      createdBy: entity.createdBy,
      summary: entity.summary,
      findings: entity.findings,
      resolution: entity.resolution,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      closedAt: entity.closedAt,
    });
  }

  private toOrmEntity(domain: ComplianceCase): ComplianceCaseOrmEntity {
    const entity = new ComplianceCaseOrmEntity();
    entity.id = domain.id;
    entity.caseNumber = domain.caseNumber;
    entity.caseType = domain.caseType;
    entity.subjectUserId = domain.subjectUserId;
    entity.status = domain.status;
    entity.priority = domain.priority;
    entity.assignedTo = domain.assignedTo;
    entity.escalatedTo = domain.escalatedTo;
    entity.createdBy = domain.createdBy;
    entity.summary = domain.summary;
    entity.findings = domain.findings;
    entity.resolution = domain.resolution;
    entity.closedAt = domain.closedAt;
    return entity;
  }

  // Mappers for CaseNote
  private noteToDomain(entity: CaseNoteOrmEntity): CaseNote {
    return CaseNote.fromPersistence({
      id: entity.id,
      caseId: entity.caseId,
      authorId: entity.authorId,
      note: entity.note,
      isInternal: entity.isInternal,
      createdAt: entity.createdAt,
    });
  }

  private noteToOrmEntity(domain: CaseNote): CaseNoteOrmEntity {
    const entity = new CaseNoteOrmEntity();
    entity.id = domain.id;
    entity.caseId = domain.caseId;
    entity.authorId = domain.authorId;
    entity.note = domain.note;
    entity.isInternal = domain.isInternal;
    return entity;
  }

  // Mappers for CaseEvidence
  private evidenceToDomain(entity: CaseEvidenceOrmEntity): CaseEvidence {
    return CaseEvidence.fromPersistence({
      id: entity.id,
      caseId: entity.caseId,
      evidenceType: entity.evidenceType,
      fileUrl: entity.fileUrl,
      description: entity.description,
      uploadedBy: entity.uploadedBy,
      createdAt: entity.createdAt,
    });
  }

  private evidenceToOrmEntity(domain: CaseEvidence): CaseEvidenceOrmEntity {
    const entity = new CaseEvidenceOrmEntity();
    entity.id = domain.id;
    entity.caseId = domain.caseId;
    entity.evidenceType = domain.evidenceType;
    entity.fileUrl = domain.fileUrl;
    entity.description = domain.description;
    entity.uploadedBy = domain.uploadedBy;
    return entity;
  }
}
