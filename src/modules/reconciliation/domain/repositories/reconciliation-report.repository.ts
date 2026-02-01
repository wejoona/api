import {
  ReconciliationReportEntity,
  ReconciliationReportType,
  ReconciliationReportStatus,
} from '../entities/reconciliation-report.entity';

/**
 * Query options for finding reconciliation reports
 */
export interface FindReconciliationReportsOptions {
  type?: ReconciliationReportType;
  status?: ReconciliationReportStatus;
  periodStart?: Date;
  periodEnd?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Reconciliation Report Repository Interface
 */
export abstract class ReconciliationReportRepository {
  /**
   * Find report by ID
   */
  abstract findById(id: string): Promise<ReconciliationReportEntity | null>;

  /**
   * Find reports by criteria
   */
  abstract find(
    options: FindReconciliationReportsOptions,
  ): Promise<ReconciliationReportEntity[]>;

  /**
   * Find the latest report of a specific type
   */
  abstract findLatestByType(
    type: ReconciliationReportType,
  ): Promise<ReconciliationReportEntity | null>;

  /**
   * Find reports requiring review
   */
  abstract findRequiringReview(): Promise<ReconciliationReportEntity[]>;

  /**
   * Save a report
   */
  abstract save(
    report: ReconciliationReportEntity,
  ): Promise<ReconciliationReportEntity>;

  /**
   * Delete a report
   */
  abstract delete(id: string): Promise<void>;

  /**
   * Count reports by criteria
   */
  abstract count(options: FindReconciliationReportsOptions): Promise<number>;

  /**
   * Check if a report exists for a given period and type
   */
  abstract existsForPeriod(
    type: ReconciliationReportType,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<boolean>;
}
