import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import {
  CaseType,
  CaseStatus,
  CasePriority,
} from '../../domain/entities/compliance-case.entity';
import { EvidenceType } from '../../domain/entities/case-evidence.entity';

/**
 * DTO for creating a new compliance case
 */
export class CreateCaseDto {
  @IsEnum(CaseType)
  caseType: CaseType;

  @IsUUID()
  subjectUserId: string;

  @IsEnum(CasePriority)
  @IsOptional()
  priority?: CasePriority;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  summary: string;

  @IsUUID()
  @IsOptional()
  assignedTo?: string;
}

/**
 * DTO for updating a compliance case
 */
export class UpdateCaseDto {
  @IsEnum(CasePriority)
  @IsOptional()
  priority?: CasePriority;

  @IsUUID()
  @IsOptional()
  assignedTo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10000)
  findings?: string;
}

/**
 * DTO for escalating a case
 */
export class EscalateCaseDto {
  @IsUUID()
  escalatedTo: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  reason?: string;
}

/**
 * DTO for closing a case
 */
export class CloseCaseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  resolution: string;
}

/**
 * DTO for adding a note to a case
 */
export class AddCaseNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  note: string;

  @IsBoolean()
  @IsOptional()
  isInternal?: boolean;
}

/**
 * DTO for adding evidence to a case
 */
export class AddCaseEvidenceDto {
  @IsEnum(EvidenceType)
  evidenceType: EvidenceType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  fileUrl: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;
}

/**
 * DTO for searching cases
 */
export class SearchCasesDto {
  @IsEnum(CaseType)
  @IsOptional()
  caseType?: CaseType;

  @IsEnum(CaseStatus)
  @IsOptional()
  status?: CaseStatus;

  @IsEnum(CasePriority)
  @IsOptional()
  priority?: CasePriority;

  @IsUUID()
  @IsOptional()
  subjectUserId?: string;

  @IsUUID()
  @IsOptional()
  assignedTo?: string;
}

/**
 * Response DTO for a compliance case
 */
export class CaseResponseDto {
  id: string;
  caseNumber: string;
  caseType: CaseType;
  subjectUserId: string;
  status: CaseStatus;
  priority: CasePriority;
  assignedTo: string | null;
  escalatedTo: string | null;
  createdBy: string;
  summary: string;
  findings: string | null;
  resolution: string | null;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
}

/**
 * Response DTO for a case note
 */
export class CaseNoteResponseDto {
  id: string;
  caseId: string;
  authorId: string;
  note: string;
  isInternal: boolean;
  createdAt: Date;
}

/**
 * Response DTO for case evidence
 */
export class CaseEvidenceResponseDto {
  id: string;
  caseId: string;
  evidenceType: EvidenceType;
  fileUrl: string;
  description: string | null;
  uploadedBy: string;
  createdAt: Date;
}

/**
 * Response DTO for case statistics
 */
export class CaseStatsResponseDto {
  byStatus: Record<CaseStatus, number>;
  byType: Record<CaseType, number>;
  openByPriority: Record<CasePriority, number>;
}
