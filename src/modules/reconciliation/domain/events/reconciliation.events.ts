import {
  ReconciliationReportType,
  TransactionDiscrepancy,
  FeeDiscrepancy,
} from '../entities/reconciliation-report.entity';

/**
 * Base event class for reconciliation events
 */
export abstract class ReconciliationEvent {
  readonly timestamp: Date = new Date();
  abstract readonly eventType: string;
}

/**
 * Emitted when a reconciliation report is started
 */
export class ReconciliationStartedEvent extends ReconciliationEvent {
  readonly eventType = 'reconciliation.started';

  constructor(
    public readonly reportId: string,
    public readonly reportType: ReconciliationReportType,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
  ) {
    super();
  }
}

/**
 * Emitted when a reconciliation report is completed
 */
export class ReconciliationCompletedEvent extends ReconciliationEvent {
  readonly eventType = 'reconciliation.completed';

  constructor(
    public readonly reportId: string,
    public readonly reportType: ReconciliationReportType,
    public readonly totalTransactions: number,
    public readonly matchedTransactions: number,
    public readonly discrepancyCount: number,
    public readonly duration: number, // milliseconds
  ) {
    super();
  }
}

/**
 * Emitted when a reconciliation report fails
 */
export class ReconciliationFailedEvent extends ReconciliationEvent {
  readonly eventType = 'reconciliation.failed';

  constructor(
    public readonly reportId: string,
    public readonly reportType: ReconciliationReportType,
    public readonly error: string,
    public readonly duration: number,
  ) {
    super();
  }
}

/**
 * Emitted when a critical discrepancy is found
 */
export class CriticalDiscrepancyFoundEvent extends ReconciliationEvent {
  readonly eventType = 'reconciliation.critical_discrepancy';

  constructor(
    public readonly reportId: string,
    public readonly discrepancy: TransactionDiscrepancy | FeeDiscrepancy,
    public readonly discrepancyType: 'transaction' | 'fee',
  ) {
    super();
  }
}

/**
 * Emitted when provider balance mismatch is detected
 */
export class ProviderBalanceMismatchEvent extends ReconciliationEvent {
  readonly eventType = 'reconciliation.provider_balance_mismatch';

  constructor(
    public readonly reportId: string,
    public readonly provider: string,
    public readonly currency: string,
    public readonly reportedBalance: string,
    public readonly calculatedBalance: string,
    public readonly difference: string,
  ) {
    super();
  }
}

/**
 * Emitted when settlement report is generated
 */
export class SettlementReportGeneratedEvent extends ReconciliationEvent {
  readonly eventType = 'reconciliation.settlement_generated';

  constructor(
    public readonly reportId: string,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
    public readonly totalGrossVolume: string,
    public readonly totalNetSettlement: string,
    public readonly providerCount: number,
  ) {
    super();
  }
}

/**
 * Emitted when a report requires manual review
 */
export class ReconciliationRequiresReviewEvent extends ReconciliationEvent {
  readonly eventType = 'reconciliation.requires_review';

  constructor(
    public readonly reportId: string,
    public readonly reportType: ReconciliationReportType,
    public readonly criticalCount: number,
    public readonly highCount: number,
    public readonly reason: string,
  ) {
    super();
  }
}

/**
 * Emitted when daily reconciliation completes
 */
export class DailyReconciliationSummaryEvent extends ReconciliationEvent {
  readonly eventType = 'reconciliation.daily_summary';

  constructor(
    public readonly date: Date,
    public readonly transactionReportId: string,
    public readonly feeReportId: string,
    public readonly settlementReportId: string,
    public readonly overallStatus: 'healthy' | 'issues' | 'critical',
    public readonly summary: {
      totalTransactions: number;
      totalVolume: string;
      totalFees: string;
      discrepancyCount: number;
    },
  ) {
    super();
  }
}
