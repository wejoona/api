import { v4 as uuidv4 } from 'uuid';

/**
 * Evidence types for compliance cases
 */
export enum EvidenceType {
  DOCUMENT = 'document',
  TRANSACTION = 'transaction',
  SCREENSHOT = 'screenshot',
}

export interface CaseEvidenceProps {
  id?: string;
  caseId: string;
  evidenceType: EvidenceType;
  fileUrl: string;
  description?: string | null;
  uploadedBy: string;
  createdAt?: Date;
}

/**
 * Case Evidence Domain Entity
 *
 * Represents evidence attached to a compliance case.
 * Evidence can be documents, transaction records, or screenshots.
 */
export class CaseEvidence {
  readonly id: string;
  readonly caseId: string;
  readonly evidenceType: EvidenceType;
  readonly fileUrl: string;
  readonly description: string | null;
  readonly uploadedBy: string;
  readonly createdAt: Date;

  private constructor(props: CaseEvidenceProps) {
    this.id = props.id || uuidv4();
    this.caseId = props.caseId;
    this.evidenceType = props.evidenceType;
    this.fileUrl = props.fileUrl;
    this.description = props.description || null;
    this.uploadedBy = props.uploadedBy;
    this.createdAt = props.createdAt || new Date();
  }

  /**
   * Create new case evidence
   */
  static create(
    props: Omit<CaseEvidenceProps, 'id' | 'createdAt'>,
  ): CaseEvidence {
    return new CaseEvidence(props);
  }

  /**
   * Create document evidence
   */
  static createDocument(
    caseId: string,
    fileUrl: string,
    uploadedBy: string,
    description?: string,
  ): CaseEvidence {
    return new CaseEvidence({
      caseId,
      evidenceType: EvidenceType.DOCUMENT,
      fileUrl,
      description,
      uploadedBy,
    });
  }

  /**
   * Create transaction evidence
   */
  static createTransaction(
    caseId: string,
    fileUrl: string,
    uploadedBy: string,
    description?: string,
  ): CaseEvidence {
    return new CaseEvidence({
      caseId,
      evidenceType: EvidenceType.TRANSACTION,
      fileUrl,
      description,
      uploadedBy,
    });
  }

  /**
   * Create screenshot evidence
   */
  static createScreenshot(
    caseId: string,
    fileUrl: string,
    uploadedBy: string,
    description?: string,
  ): CaseEvidence {
    return new CaseEvidence({
      caseId,
      evidenceType: EvidenceType.SCREENSHOT,
      fileUrl,
      description,
      uploadedBy,
    });
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(props: CaseEvidenceProps): CaseEvidence {
    return new CaseEvidence(props);
  }

  /**
   * Check if evidence is a document
   */
  isDocument(): boolean {
    return this.evidenceType === EvidenceType.DOCUMENT;
  }

  /**
   * Check if evidence is a transaction record
   */
  isTransaction(): boolean {
    return this.evidenceType === EvidenceType.TRANSACTION;
  }

  /**
   * Check if evidence is a screenshot
   */
  isScreenshot(): boolean {
    return this.evidenceType === EvidenceType.SCREENSHOT;
  }
}
