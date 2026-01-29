import { v4 as uuidv4 } from 'uuid';

/**
 * Case types for compliance investigations
 */
export enum CaseType {
  FRAUD = 'fraud',
  AML = 'aml',
  KYC_REVIEW = 'kyc_review',
  COMPLAINT = 'complaint',
}

/**
 * Case status workflow
 */
export enum CaseStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  ESCALATED = 'escalated',
  CLOSED = 'closed',
}

/**
 * Case priority levels
 */
export enum CasePriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export interface ComplianceCaseProps {
  id?: string;
  caseNumber: string;
  caseType: CaseType;
  subjectUserId: string;
  status: CaseStatus;
  priority: CasePriority;
  assignedTo?: string | null;
  escalatedTo?: string | null;
  createdBy: string;
  summary: string;
  findings?: string | null;
  resolution?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  closedAt?: Date | null;
}

/**
 * Compliance Case Domain Entity
 *
 * Represents a compliance investigation case for fraud, AML, KYC review, or complaints.
 * Cases follow a workflow: open -> investigating -> escalated (optional) -> closed
 */
export class ComplianceCase {
  readonly id: string;
  readonly caseNumber: string;
  readonly caseType: CaseType;
  readonly subjectUserId: string;
  private _status: CaseStatus;
  private _priority: CasePriority;
  private _assignedTo: string | null;
  private _escalatedTo: string | null;
  readonly createdBy: string;
  readonly summary: string;
  private _findings: string | null;
  private _resolution: string | null;
  readonly createdAt: Date;
  private _updatedAt: Date;
  private _closedAt: Date | null;

  private constructor(props: ComplianceCaseProps) {
    this.id = props.id || uuidv4();
    this.caseNumber = props.caseNumber;
    this.caseType = props.caseType;
    this.subjectUserId = props.subjectUserId;
    this._status = props.status;
    this._priority = props.priority;
    this._assignedTo = props.assignedTo || null;
    this._escalatedTo = props.escalatedTo || null;
    this.createdBy = props.createdBy;
    this.summary = props.summary;
    this._findings = props.findings || null;
    this._resolution = props.resolution || null;
    this.createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
    this._closedAt = props.closedAt || null;
  }

  // Getters
  get status(): CaseStatus {
    return this._status;
  }
  get priority(): CasePriority {
    return this._priority;
  }
  get assignedTo(): string | null {
    return this._assignedTo;
  }
  get escalatedTo(): string | null {
    return this._escalatedTo;
  }
  get findings(): string | null {
    return this._findings;
  }
  get resolution(): string | null {
    return this._resolution;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get closedAt(): Date | null {
    return this._closedAt;
  }

  /**
   * Create a new compliance case
   */
  static create(
    props: Omit<
      ComplianceCaseProps,
      'id' | 'status' | 'createdAt' | 'updatedAt' | 'closedAt'
    >,
  ): ComplianceCase {
    return new ComplianceCase({
      ...props,
      status: CaseStatus.OPEN,
    });
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(props: ComplianceCaseProps): ComplianceCase {
    return new ComplianceCase(props);
  }

  /**
   * Assign case to an agent
   */
  assignTo(agentId: string): void {
    this._assignedTo = agentId;
    this._updatedAt = new Date();
  }

  /**
   * Start investigation
   */
  startInvestigation(): void {
    if (this._status !== CaseStatus.OPEN) {
      throw new Error('Can only start investigation on open cases');
    }
    this._status = CaseStatus.INVESTIGATING;
    this._updatedAt = new Date();
  }

  /**
   * Escalate to higher authority
   */
  escalateTo(escalatedToId: string): void {
    if (this._status === CaseStatus.CLOSED) {
      throw new Error('Cannot escalate closed cases');
    }
    this._status = CaseStatus.ESCALATED;
    this._escalatedTo = escalatedToId;
    this._updatedAt = new Date();
  }

  /**
   * Update case priority
   */
  updatePriority(priority: CasePriority): void {
    if (this._status === CaseStatus.CLOSED) {
      throw new Error('Cannot update priority of closed cases');
    }
    this._priority = priority;
    this._updatedAt = new Date();
  }

  /**
   * Add findings to the case
   */
  addFindings(findings: string): void {
    this._findings = findings;
    this._updatedAt = new Date();
  }

  /**
   * Close the case with resolution
   */
  close(resolution: string): void {
    if (this._status === CaseStatus.CLOSED) {
      throw new Error('Case is already closed');
    }
    this._status = CaseStatus.CLOSED;
    this._resolution = resolution;
    this._closedAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * Reopen a closed case
   */
  reopen(): void {
    if (this._status !== CaseStatus.CLOSED) {
      throw new Error('Can only reopen closed cases');
    }
    this._status = CaseStatus.OPEN;
    this._closedAt = null;
    this._updatedAt = new Date();
  }

  /**
   * Check if case is active
   */
  isActive(): boolean {
    return this._status !== CaseStatus.CLOSED;
  }

  /**
   * Check if case is critical
   */
  isCritical(): boolean {
    return this._priority === CasePriority.CRITICAL;
  }
}
