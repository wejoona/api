import {
  RegulatoryReportType,
  ReportStatus,
  ReportPeriod,
  ExportFormat,
} from '../../domain/types';

export class ReportSummaryDto {
  id: string;
  reportType: RegulatoryReportType;
  reportPeriod: ReportPeriod;
  periodStart: Date;
  periodEnd: Date;
  status: ReportStatus;
  title: string;
  bceaoReference?: string;
  submissionDeadline?: Date;
  generatedBy: string;
  createdAt: Date;
  isOverdue: boolean;
}

export class ReportDetailDto extends ReportSummaryDto {
  description?: string;
  reportData: Record<string, unknown>;
  exportFormat?: ExportFormat;
  fileUrl?: string;
  fileSize?: number;
  checksum?: string;
  reviewedBy?: string;
  approvedBy?: string;
  submittedBy?: string;
  submittedAt?: Date;
  acknowledgedAt?: Date;
  rejectionReason?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  updatedAt: Date;
}

export class ReportStatisticsDto {
  totalReports: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  submittedCount: number;
  pendingCount: number;
  overdueCount: number;
  averageProcessingTimeHours: number;
}

export class ReportListResponseDto {
  reports: ReportSummaryDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class ExportResponseDto {
  reportId: string;
  format: ExportFormat;
  filename: string;
  mimeType: string;
  size: number;
  downloadUrl: string;
  expiresAt: Date;
}

export class ApprovalResponseDto {
  reportId: string;
  status: ReportStatus;
  approvedBy: string;
  approvedAt: Date;
  message: string;
}

export class SubmissionResponseDto {
  reportId: string;
  status: ReportStatus;
  bceaoReference: string;
  submittedBy: string;
  submittedAt: Date;
  message: string;
}
