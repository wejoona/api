import { RegulatoryReport } from '../entities/regulatory-report.entity';
import { RegulatoryReportType, ReportStatus, ReportPeriod } from '../types';

export interface ReportQueryOptions {
  reportType?: RegulatoryReportType;
  status?: ReportStatus;
  period?: ReportPeriod;
  periodStart?: Date;
  periodEnd?: Date;
  generatedBy?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'periodStart' | 'submittedAt';
  orderDirection?: 'ASC' | 'DESC';
}

export abstract class RegulatoryReportRepository {
  abstract findById(id: string): Promise<RegulatoryReport | null>;

  abstract findByBceaoReference(
    reference: string,
  ): Promise<RegulatoryReport | null>;

  abstract findAll(options?: ReportQueryOptions): Promise<RegulatoryReport[]>;

  abstract findPendingSubmission(): Promise<RegulatoryReport[]>;

  abstract findOverdue(): Promise<RegulatoryReport[]>;

  abstract findByTypeAndPeriod(
    reportType: RegulatoryReportType,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<RegulatoryReport | null>;

  abstract count(options?: ReportQueryOptions): Promise<number>;

  abstract save(report: RegulatoryReport): Promise<RegulatoryReport>;

  abstract delete(id: string): Promise<void>;

  abstract getStatistics(
    startDate: Date,
    endDate: Date,
  ): Promise<ReportStatistics>;
}

export interface ReportStatistics {
  totalReports: number;
  byStatus: Record<ReportStatus, number>;
  byType: Record<RegulatoryReportType, number>;
  submittedCount: number;
  pendingCount: number;
  overdueCount: number;
  averageProcessingTimeHours: number;
}
