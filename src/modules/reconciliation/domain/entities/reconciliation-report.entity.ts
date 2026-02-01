import { v4 as uuidv4 } from 'uuid';

/**
 * Reconciliation Report Types
 */
export enum ReconciliationReportType {
  DAILY_TRANSACTION = 'daily_transaction',
  PROVIDER_BALANCE = 'provider_balance',
  FEE_VERIFICATION = 'fee_verification',
  SETTLEMENT = 'settlement',
}

export enum ReconciliationReportStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REQUIRES_REVIEW = 'requires_review',
}

export enum DiscrepancySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Transaction Discrepancy
 */
export interface TransactionDiscrepancy {
  transactionId: string;
  externalId?: string;
  provider: string;
  type:
    | 'missing_internal'
    | 'missing_external'
    | 'amount_mismatch'
    | 'status_mismatch'
    | 'fee_mismatch';
  internalAmount?: string;
  externalAmount?: string;
  internalStatus?: string;
  externalStatus?: string;
  internalFee?: string;
  externalFee?: string;
  difference?: string;
  severity: DiscrepancySeverity;
  notes?: string;
  createdAt: Date;
}

/**
 * Fee Discrepancy
 */
export interface FeeDiscrepancy {
  transactionId: string;
  transactionType: string;
  expectedFee: string;
  actualFee: string;
  difference: string;
  feeType: 'platform' | 'provider' | 'network';
  severity: DiscrepancySeverity;
  notes?: string;
}

/**
 * Settlement Entry
 */
export interface SettlementEntry {
  provider: string;
  currency: string;
  grossVolume: string;
  totalFees: string;
  platformFees: string;
  providerFees: string;
  networkFees: string;
  netSettlement: string;
  transactionCount: number;
  depositCount: number;
  withdrawalCount: number;
  transferCount: number;
}

/**
 * Provider Balance Entry
 */
export interface ProviderBalanceEntry {
  provider: string;
  currency: string;
  reportedBalance: string;
  calculatedBalance: string;
  difference: string;
  isReconciled: boolean;
  lastTransactionId?: string;
  lastTransactionDate?: Date;
}

/**
 * Reconciliation Report Summary
 */
export interface ReconciliationSummary {
  totalTransactions: number;
  matchedTransactions: number;
  unmatchedTransactions: number;
  totalDiscrepancies: number;
  criticalDiscrepancies: number;
  highDiscrepancies: number;
  mediumDiscrepancies: number;
  lowDiscrepancies: number;
  totalAmountReconciled: string;
  totalDiscrepancyAmount: string;
}

export interface ReconciliationReportProps {
  id?: string;
  type: ReconciliationReportType;
  status: ReconciliationReportStatus;
  periodStart: Date;
  periodEnd: Date;
  summary: ReconciliationSummary;
  transactionDiscrepancies: TransactionDiscrepancy[];
  feeDiscrepancies: FeeDiscrepancy[];
  settlementEntries: SettlementEntry[];
  providerBalances: ProviderBalanceEntry[];
  executedBy?: string;
  reviewedBy?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
  completedAt?: Date;
}

/**
 * Reconciliation Report Entity
 *
 * Represents a comprehensive financial reconciliation report that includes:
 * - Daily transaction reconciliation results
 * - Provider balance matching
 * - Fee calculation verification
 * - Settlement summaries
 */
export class ReconciliationReportEntity {
  readonly id: string;
  readonly type: ReconciliationReportType;
  status: ReconciliationReportStatus;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  summary: ReconciliationSummary;
  transactionDiscrepancies: TransactionDiscrepancy[];
  feeDiscrepancies: FeeDiscrepancy[];
  settlementEntries: SettlementEntry[];
  providerBalances: ProviderBalanceEntry[];
  executedBy?: string;
  reviewedBy?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  readonly createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;

  private constructor(props: ReconciliationReportProps) {
    this.id = props.id || uuidv4();
    this.type = props.type;
    this.status = props.status;
    this.periodStart = props.periodStart;
    this.periodEnd = props.periodEnd;
    this.summary = props.summary;
    this.transactionDiscrepancies = props.transactionDiscrepancies;
    this.feeDiscrepancies = props.feeDiscrepancies;
    this.settlementEntries = props.settlementEntries;
    this.providerBalances = props.providerBalances;
    this.executedBy = props.executedBy;
    this.reviewedBy = props.reviewedBy;
    this.notes = props.notes;
    this.metadata = props.metadata;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
    this.completedAt = props.completedAt;
  }

  /**
   * Create a new reconciliation report
   */
  static create(props: {
    type: ReconciliationReportType;
    periodStart: Date;
    periodEnd: Date;
    executedBy?: string;
  }): ReconciliationReportEntity {
    return new ReconciliationReportEntity({
      type: props.type,
      status: ReconciliationReportStatus.PENDING,
      periodStart: props.periodStart,
      periodEnd: props.periodEnd,
      executedBy: props.executedBy,
      summary: {
        totalTransactions: 0,
        matchedTransactions: 0,
        unmatchedTransactions: 0,
        totalDiscrepancies: 0,
        criticalDiscrepancies: 0,
        highDiscrepancies: 0,
        mediumDiscrepancies: 0,
        lowDiscrepancies: 0,
        totalAmountReconciled: '0.00',
        totalDiscrepancyAmount: '0.00',
      },
      transactionDiscrepancies: [],
      feeDiscrepancies: [],
      settlementEntries: [],
      providerBalances: [],
    });
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(
    props: ReconciliationReportProps,
  ): ReconciliationReportEntity {
    return new ReconciliationReportEntity(props);
  }

  /**
   * Mark report as in progress
   */
  startProcessing(): void {
    this.status = ReconciliationReportStatus.IN_PROGRESS;
    this.updatedAt = new Date();
  }

  /**
   * Add a transaction discrepancy
   */
  addTransactionDiscrepancy(discrepancy: TransactionDiscrepancy): void {
    this.transactionDiscrepancies.push(discrepancy);
    this.updateSummary();
    this.updatedAt = new Date();
  }

  /**
   * Add a fee discrepancy
   */
  addFeeDiscrepancy(discrepancy: FeeDiscrepancy): void {
    this.feeDiscrepancies.push(discrepancy);
    this.updateSummary();
    this.updatedAt = new Date();
  }

  /**
   * Set settlement entries
   */
  setSettlementEntries(entries: SettlementEntry[]): void {
    this.settlementEntries = entries;
    this.updatedAt = new Date();
  }

  /**
   * Set provider balances
   */
  setProviderBalances(balances: ProviderBalanceEntry[]): void {
    this.providerBalances = balances;
    this.updatedAt = new Date();
  }

  /**
   * Update summary statistics
   */
  updateSummary(): void {
    const allDiscrepancies = [
      ...this.transactionDiscrepancies,
      ...this.feeDiscrepancies,
    ];

    this.summary.totalDiscrepancies = allDiscrepancies.length;
    this.summary.criticalDiscrepancies = allDiscrepancies.filter(
      (d) => d.severity === DiscrepancySeverity.CRITICAL,
    ).length;
    this.summary.highDiscrepancies = allDiscrepancies.filter(
      (d) => d.severity === DiscrepancySeverity.HIGH,
    ).length;
    this.summary.mediumDiscrepancies = allDiscrepancies.filter(
      (d) => d.severity === DiscrepancySeverity.MEDIUM,
    ).length;
    this.summary.lowDiscrepancies = allDiscrepancies.filter(
      (d) => d.severity === DiscrepancySeverity.LOW,
    ).length;

    this.summary.unmatchedTransactions = this.transactionDiscrepancies.filter(
      (d) => d.type === 'missing_internal' || d.type === 'missing_external',
    ).length;
  }

  /**
   * Complete the report
   */
  complete(summary: ReconciliationSummary): void {
    this.summary = summary;
    this.status = this.hasIssues()
      ? ReconciliationReportStatus.REQUIRES_REVIEW
      : ReconciliationReportStatus.COMPLETED;
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Mark as failed
   */
  fail(reason: string): void {
    this.status = ReconciliationReportStatus.FAILED;
    this.notes = reason;
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Mark as reviewed
   */
  markReviewed(reviewedBy: string, notes?: string): void {
    this.reviewedBy = reviewedBy;
    if (notes) {
      this.notes = notes;
    }
    if (this.status === ReconciliationReportStatus.REQUIRES_REVIEW) {
      this.status = ReconciliationReportStatus.COMPLETED;
    }
    this.updatedAt = new Date();
  }

  /**
   * Check if report has issues requiring attention
   */
  hasIssues(): boolean {
    return (
      this.summary.criticalDiscrepancies > 0 ||
      this.summary.highDiscrepancies > 0 ||
      this.providerBalances.some((b) => !b.isReconciled)
    );
  }

  /**
   * Check if report is reconciled (no critical/high issues)
   */
  get isReconciled(): boolean {
    return (
      this.status === ReconciliationReportStatus.COMPLETED &&
      this.summary.criticalDiscrepancies === 0 &&
      this.summary.highDiscrepancies === 0
    );
  }

  /**
   * Get reconciliation percentage
   */
  get reconciliationPercentage(): number {
    if (this.summary.totalTransactions === 0) return 100;
    return (
      (this.summary.matchedTransactions / this.summary.totalTransactions) * 100
    );
  }
}
