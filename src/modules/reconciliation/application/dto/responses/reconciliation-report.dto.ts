import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ReconciliationReportType,
  ReconciliationReportStatus,
  DiscrepancySeverity,
} from '../../../domain/entities/reconciliation-report.entity';

/**
 * Transaction Discrepancy Response DTO
 */
export class TransactionDiscrepancyResponseDto {
  @ApiProperty({ description: 'Internal transaction ID', example: 'tx-123' })
  transactionId: string;

  @ApiPropertyOptional({
    description: 'External/Provider transaction ID',
    example: 'ext-456',
  })
  externalId?: string;

  @ApiProperty({ description: 'Provider name', example: 'blnk' })
  provider: string;

  @ApiProperty({
    description: 'Type of discrepancy',
    enum: [
      'missing_internal',
      'missing_external',
      'amount_mismatch',
      'status_mismatch',
      'fee_mismatch',
    ],
    example: 'amount_mismatch',
  })
  type: string;

  @ApiPropertyOptional({
    description: 'Internal amount',
    example: '100.500000',
  })
  internalAmount?: string;

  @ApiPropertyOptional({
    description: 'External amount',
    example: '100.000000',
  })
  externalAmount?: string;

  @ApiPropertyOptional({ description: 'Internal status', example: 'completed' })
  internalStatus?: string;

  @ApiPropertyOptional({ description: 'External status', example: 'pending' })
  externalStatus?: string;

  @ApiPropertyOptional({
    description: 'Difference amount',
    example: '0.500000',
  })
  difference?: string;

  @ApiProperty({
    description: 'Severity level',
    enum: DiscrepancySeverity,
    example: DiscrepancySeverity.MEDIUM,
  })
  severity: DiscrepancySeverity;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Amount mismatch detected',
  })
  notes?: string;

  @ApiProperty({ description: 'When discrepancy was detected' })
  createdAt: Date;
}

/**
 * Fee Discrepancy Response DTO
 */
export class FeeDiscrepancyResponseDto {
  @ApiProperty({ description: 'Transaction ID', example: 'tx-123' })
  transactionId: string;

  @ApiProperty({ description: 'Transaction type', example: 'deposit' })
  transactionType: string;

  @ApiProperty({ description: 'Expected fee', example: '1.500000' })
  expectedFee: string;

  @ApiProperty({ description: 'Actual fee charged', example: '2.000000' })
  actualFee: string;

  @ApiProperty({ description: 'Fee difference', example: '0.500000' })
  difference: string;

  @ApiProperty({
    description: 'Fee type causing discrepancy',
    enum: ['platform', 'provider', 'network'],
    example: 'provider',
  })
  feeType: string;

  @ApiProperty({
    description: 'Severity level',
    enum: DiscrepancySeverity,
    example: DiscrepancySeverity.LOW,
  })
  severity: DiscrepancySeverity;

  @ApiPropertyOptional({ description: 'Additional notes' })
  notes?: string;
}

/**
 * Settlement Entry Response DTO
 */
export class SettlementEntryResponseDto {
  @ApiProperty({ description: 'Provider name', example: 'yellowcard' })
  provider: string;

  @ApiProperty({ description: 'Currency', example: 'USDC' })
  currency: string;

  @ApiProperty({ description: 'Gross transaction volume', example: '10000.00' })
  grossVolume: string;

  @ApiProperty({ description: 'Total fees collected', example: '150.00' })
  totalFees: string;

  @ApiProperty({ description: 'Platform fees', example: '75.00' })
  platformFees: string;

  @ApiProperty({ description: 'Provider fees', example: '50.00' })
  providerFees: string;

  @ApiProperty({ description: 'Network fees', example: '25.00' })
  networkFees: string;

  @ApiProperty({ description: 'Net settlement amount', example: '9850.00' })
  netSettlement: string;

  @ApiProperty({ description: 'Total transaction count', example: 150 })
  transactionCount: number;

  @ApiProperty({ description: 'Deposit count', example: 50 })
  depositCount: number;

  @ApiProperty({ description: 'Withdrawal count', example: 30 })
  withdrawalCount: number;

  @ApiProperty({ description: 'Transfer count', example: 70 })
  transferCount: number;
}

/**
 * Provider Balance Entry Response DTO
 */
export class ProviderBalanceEntryResponseDto {
  @ApiProperty({ description: 'Provider name', example: 'blnk' })
  provider: string;

  @ApiProperty({ description: 'Currency', example: 'USDC' })
  currency: string;

  @ApiProperty({
    description: 'Balance reported by provider',
    example: '50000.000000',
  })
  reportedBalance: string;

  @ApiProperty({
    description: 'Balance calculated from transactions',
    example: '50000.000000',
  })
  calculatedBalance: string;

  @ApiProperty({
    description: 'Difference between reported and calculated',
    example: '0.000000',
  })
  difference: string;

  @ApiProperty({
    description: 'Whether balances are reconciled',
    example: true,
  })
  isReconciled: boolean;

  @ApiPropertyOptional({
    description: 'Last transaction ID',
    example: 'tx-789',
  })
  lastTransactionId?: string;

  @ApiPropertyOptional({ description: 'Last transaction date' })
  lastTransactionDate?: Date;
}

/**
 * Reconciliation Summary Response DTO
 */
export class ReconciliationSummaryResponseDto {
  @ApiProperty({ description: 'Total transactions processed', example: 1000 })
  totalTransactions: number;

  @ApiProperty({
    description: 'Transactions successfully matched',
    example: 995,
  })
  matchedTransactions: number;

  @ApiProperty({ description: 'Unmatched transactions', example: 5 })
  unmatchedTransactions: number;

  @ApiProperty({ description: 'Total discrepancies found', example: 5 })
  totalDiscrepancies: number;

  @ApiProperty({ description: 'Critical severity discrepancies', example: 0 })
  criticalDiscrepancies: number;

  @ApiProperty({ description: 'High severity discrepancies', example: 1 })
  highDiscrepancies: number;

  @ApiProperty({ description: 'Medium severity discrepancies', example: 2 })
  mediumDiscrepancies: number;

  @ApiProperty({ description: 'Low severity discrepancies', example: 2 })
  lowDiscrepancies: number;

  @ApiProperty({ description: 'Total amount reconciled', example: '100000.00' })
  totalAmountReconciled: string;

  @ApiProperty({ description: 'Total discrepancy amount', example: '5.50' })
  totalDiscrepancyAmount: string;
}

/**
 * Reconciliation Report Response DTO
 */
export class ReconciliationReportResponseDto {
  @ApiProperty({ description: 'Report ID', example: 'report-123' })
  id: string;

  @ApiProperty({
    description: 'Report type',
    enum: ReconciliationReportType,
    example: ReconciliationReportType.DAILY_TRANSACTION,
  })
  type: ReconciliationReportType;

  @ApiProperty({
    description: 'Report status',
    enum: ReconciliationReportStatus,
    example: ReconciliationReportStatus.COMPLETED,
  })
  status: ReconciliationReportStatus;

  @ApiProperty({ description: 'Period start date' })
  periodStart: Date;

  @ApiProperty({ description: 'Period end date' })
  periodEnd: Date;

  @ApiProperty({
    description: 'Reconciliation summary',
    type: ReconciliationSummaryResponseDto,
  })
  summary: ReconciliationSummaryResponseDto;

  @ApiProperty({
    description: 'Transaction discrepancies',
    type: [TransactionDiscrepancyResponseDto],
  })
  transactionDiscrepancies: TransactionDiscrepancyResponseDto[];

  @ApiProperty({
    description: 'Fee discrepancies',
    type: [FeeDiscrepancyResponseDto],
  })
  feeDiscrepancies: FeeDiscrepancyResponseDto[];

  @ApiProperty({
    description: 'Settlement entries',
    type: [SettlementEntryResponseDto],
  })
  settlementEntries: SettlementEntryResponseDto[];

  @ApiProperty({
    description: 'Provider balance entries',
    type: [ProviderBalanceEntryResponseDto],
  })
  providerBalances: ProviderBalanceEntryResponseDto[];

  @ApiPropertyOptional({ description: 'User who executed the report' })
  executedBy?: string;

  @ApiPropertyOptional({ description: 'User who reviewed the report' })
  reviewedBy?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  notes?: string;

  @ApiProperty({
    description: 'Whether report is fully reconciled',
    example: true,
  })
  isReconciled: boolean;

  @ApiProperty({ description: 'Reconciliation percentage', example: 99.5 })
  reconciliationPercentage: number;

  @ApiProperty({ description: 'Report creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Report last update date' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Report completion date' })
  completedAt?: Date;
}

/**
 * Daily Settlement Summary Response DTO
 */
export class DailySettlementSummaryResponseDto {
  @ApiProperty({ description: 'Settlement date' })
  date: Date;

  @ApiProperty({
    description: 'Settlements by provider',
    type: [SettlementEntryResponseDto],
  })
  providers: SettlementEntryResponseDto[];

  @ApiProperty({ description: 'Total transaction count', example: 1000 })
  totalTransactionCount: number;

  @ApiProperty({ description: 'Total gross volume', example: '100000.00' })
  totalGrossVolume: string;

  @ApiProperty({ description: 'Total fees', example: '1500.00' })
  totalFees: string;

  @ApiProperty({ description: 'Total net settlement', example: '98500.00' })
  totalNetSettlement: string;

  @ApiProperty({
    description: 'Reconciliation status',
    enum: ['reconciled', 'pending', 'discrepancy'],
    example: 'reconciled',
  })
  reconciliationStatus: string;
}

/**
 * Fee Verification Result Response DTO
 */
export class FeeVerificationResultResponseDto {
  @ApiProperty({ description: 'Transaction ID' })
  transactionId: string;

  @ApiProperty({ description: 'Transaction type' })
  transactionType: string;

  @ApiProperty({ description: 'Provider' })
  provider: string;

  @ApiProperty({ description: 'Transaction amount' })
  amount: number;

  @ApiProperty({ description: 'Expected fee' })
  expectedFee: number;

  @ApiProperty({ description: 'Actual fee charged' })
  actualFee: number;

  @ApiProperty({ description: 'Fee difference' })
  difference: number;

  @ApiProperty({ description: 'Whether fee is valid' })
  isValid: boolean;

  @ApiProperty({ description: 'Fee breakdown' })
  feeBreakdown: {
    platform: number;
    provider: number;
    network: number;
  };
}

/**
 * Reconciliation Status Response DTO
 */
export class ReconciliationStatusResponseDto {
  @ApiProperty({ description: 'Last daily transaction reconciliation' })
  lastDailyReconciliation?: Date;

  @ApiProperty({ description: 'Last provider balance reconciliation' })
  lastBalanceReconciliation?: Date;

  @ApiProperty({ description: 'Last fee verification' })
  lastFeeVerification?: Date;

  @ApiProperty({ description: 'Last settlement report' })
  lastSettlementReport?: Date;

  @ApiProperty({ description: 'Reports requiring review count' })
  pendingReviewCount: number;

  @ApiProperty({
    description: 'Overall health status',
    enum: ['healthy', 'warning', 'critical'],
  })
  healthStatus: string;
}
