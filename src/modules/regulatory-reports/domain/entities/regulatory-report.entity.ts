import { v4 as uuidv4 } from 'uuid';
import {
  RegulatoryReportType,
  ReportStatus,
  ReportPeriod,
  ExportFormat,
} from '../types';

export interface RegulatoryReportProps {
  id?: string;
  reportType: RegulatoryReportType;
  reportPeriod: ReportPeriod;
  periodStart: Date;
  periodEnd: Date;
  status: ReportStatus;
  title: string;
  description?: string;
  reportData: Record<string, unknown>;
  exportFormat?: ExportFormat;
  fileUrl?: string;
  fileSize?: number;
  checksum?: string;
  bceaoReference?: string;
  submissionDeadline?: Date;
  generatedBy: string;
  reviewedBy?: string;
  approvedBy?: string;
  submittedBy?: string;
  submittedAt?: Date;
  acknowledgedAt?: Date;
  rejectionReason?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
  archivedAt?: Date;
}

export class RegulatoryReport {
  readonly id: string;
  readonly reportType: RegulatoryReportType;
  readonly reportPeriod: ReportPeriod;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  private _status: ReportStatus;
  readonly title: string;
  readonly description?: string;
  private _reportData: Record<string, unknown>;
  readonly exportFormat?: ExportFormat;
  private _fileUrl?: string;
  private _fileSize?: number;
  private _checksum?: string;
  private _bceaoReference?: string;
  readonly submissionDeadline?: Date;
  readonly generatedBy: string;
  private _reviewedBy?: string;
  private _approvedBy?: string;
  private _submittedBy?: string;
  private _submittedAt?: Date;
  private _acknowledgedAt?: Date;
  private _rejectionReason?: string;
  private _notes?: string;
  private _metadata?: Record<string, unknown>;
  readonly createdAt: Date;
  private _updatedAt: Date;
  private _archivedAt?: Date;

  private constructor(props: RegulatoryReportProps) {
    this.id = props.id || uuidv4();
    this.reportType = props.reportType;
    this.reportPeriod = props.reportPeriod;
    this.periodStart = props.periodStart;
    this.periodEnd = props.periodEnd;
    this._status = props.status;
    this.title = props.title;
    this.description = props.description;
    this._reportData = props.reportData;
    this.exportFormat = props.exportFormat;
    this._fileUrl = props.fileUrl;
    this._fileSize = props.fileSize;
    this._checksum = props.checksum;
    this._bceaoReference = props.bceaoReference;
    this.submissionDeadline = props.submissionDeadline;
    this.generatedBy = props.generatedBy;
    this._reviewedBy = props.reviewedBy;
    this._approvedBy = props.approvedBy;
    this._submittedBy = props.submittedBy;
    this._submittedAt = props.submittedAt;
    this._acknowledgedAt = props.acknowledgedAt;
    this._rejectionReason = props.rejectionReason;
    this._notes = props.notes;
    this._metadata = props.metadata;
    this.createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
    this._archivedAt = props.archivedAt;
  }

  // Getters
  get status(): ReportStatus {
    return this._status;
  }

  get reportData(): Record<string, unknown> {
    return this._reportData;
  }

  get fileUrl(): string | undefined {
    return this._fileUrl;
  }

  get fileSize(): number | undefined {
    return this._fileSize;
  }

  get checksum(): string | undefined {
    return this._checksum;
  }

  get bceaoReference(): string | undefined {
    return this._bceaoReference;
  }

  get reviewedBy(): string | undefined {
    return this._reviewedBy;
  }

  get approvedBy(): string | undefined {
    return this._approvedBy;
  }

  get submittedBy(): string | undefined {
    return this._submittedBy;
  }

  get submittedAt(): Date | undefined {
    return this._submittedAt;
  }

  get acknowledgedAt(): Date | undefined {
    return this._acknowledgedAt;
  }

  get rejectionReason(): string | undefined {
    return this._rejectionReason;
  }

  get notes(): string | undefined {
    return this._notes;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this._metadata;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get archivedAt(): Date | undefined {
    return this._archivedAt;
  }

  // Factory methods
  static create(
    props: Omit<
      RegulatoryReportProps,
      'id' | 'status' | 'createdAt' | 'updatedAt'
    >,
  ): RegulatoryReport {
    return new RegulatoryReport({
      ...props,
      status: ReportStatus.DRAFT,
    });
  }

  static fromPersistence(props: RegulatoryReportProps): RegulatoryReport {
    return new RegulatoryReport(props);
  }

  // Business methods
  markForReview(reviewerId: string, notes?: string): void {
    if (this._status !== ReportStatus.DRAFT) {
      throw new Error(
        `Cannot mark report for review from status: ${this._status}`,
      );
    }
    this._status = ReportStatus.PENDING_REVIEW;
    this._reviewedBy = reviewerId;
    if (notes) {
      this._notes = notes;
    }
    this._updatedAt = new Date();
  }

  approve(approverId: string, notes?: string): void {
    if (this._status !== ReportStatus.PENDING_REVIEW) {
      throw new Error(`Cannot approve report from status: ${this._status}`);
    }
    this._status = ReportStatus.APPROVED;
    this._approvedBy = approverId;
    if (notes) {
      this._notes = notes;
    }
    this._updatedAt = new Date();
  }

  submit(submitterId: string, bceaoReference: string): void {
    if (this._status !== ReportStatus.APPROVED) {
      throw new Error(`Cannot submit report from status: ${this._status}`);
    }
    this._status = ReportStatus.SUBMITTED;
    this._submittedBy = submitterId;
    this._submittedAt = new Date();
    this._bceaoReference = bceaoReference;
    this._updatedAt = new Date();
  }

  acknowledge(acknowledgedAt?: Date): void {
    if (this._status !== ReportStatus.SUBMITTED) {
      throw new Error(`Cannot acknowledge report from status: ${this._status}`);
    }
    this._status = ReportStatus.ACKNOWLEDGED;
    this._acknowledgedAt = acknowledgedAt || new Date();
    this._updatedAt = new Date();
  }

  reject(reason: string): void {
    if (
      this._status !== ReportStatus.PENDING_REVIEW &&
      this._status !== ReportStatus.SUBMITTED
    ) {
      throw new Error(`Cannot reject report from status: ${this._status}`);
    }
    this._status = ReportStatus.REJECTED;
    this._rejectionReason = reason;
    this._updatedAt = new Date();
  }

  archive(): void {
    this._status = ReportStatus.ARCHIVED;
    this._archivedAt = new Date();
    this._updatedAt = new Date();
  }

  setFileInfo(fileUrl: string, fileSize: number, checksum: string): void {
    this._fileUrl = fileUrl;
    this._fileSize = fileSize;
    this._checksum = checksum;
    this._updatedAt = new Date();
  }

  updateReportData(data: Record<string, unknown>): void {
    if (
      this._status !== ReportStatus.DRAFT &&
      this._status !== ReportStatus.REJECTED
    ) {
      throw new Error(
        `Cannot update report data when status is: ${this._status}`,
      );
    }
    this._reportData = data;
    this._updatedAt = new Date();
  }

  addMetadata(key: string, value: unknown): void {
    if (!this._metadata) {
      this._metadata = {};
    }
    this._metadata[key] = value;
    this._updatedAt = new Date();
  }

  isOverdue(): boolean {
    if (!this.submissionDeadline) {
      return false;
    }
    return (
      new Date() > this.submissionDeadline &&
      this._status !== ReportStatus.SUBMITTED &&
      this._status !== ReportStatus.ACKNOWLEDGED &&
      this._status !== ReportStatus.ARCHIVED
    );
  }

  canBeEdited(): boolean {
    return (
      this._status === ReportStatus.DRAFT ||
      this._status === ReportStatus.REJECTED
    );
  }

  canBeSubmitted(): boolean {
    return this._status === ReportStatus.APPROVED;
  }
}
