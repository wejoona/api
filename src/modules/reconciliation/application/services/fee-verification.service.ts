import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ReconciliationReportEntity,
  ReconciliationReportType,
  ReconciliationSummary,
  FeeDiscrepancy,
  DiscrepancySeverity,
} from '../../domain/entities/reconciliation-report.entity';
import { ReconciliationReportRepository } from '../../domain/repositories/reconciliation-report.repository';
import {
  FeeSchedule,
  FeeTransactionType,
} from '../../domain/value-objects/fee-schedule.value-object';
import {
  ReconciliationStartedEvent,
  ReconciliationCompletedEvent,
  ReconciliationFailedEvent,
  CriticalDiscrepancyFoundEvent,
} from '../../domain/events/reconciliation.events';
import { TransactionRepository } from '@modules/transaction/infrastructure/repositories/transaction.repository';

/**
 * Transaction with fee information
 */
interface TransactionWithFee {
  id: string;
  walletId: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  providerRef: string | null;
  createdAt: Date;
  metadata?: {
    fee?: number;
    platformFee?: number;
    providerFee?: number;
    networkFee?: number;
    provider?: string;
    [key: string]: unknown;
  };
}

/**
 * Fee verification result
 */
interface FeeVerificationResult {
  transactionId: string;
  transactionType: string;
  provider: string;
  amount: number;
  expectedFee: number;
  actualFee: number;
  difference: number;
  isValid: boolean;
  feeBreakdown: {
    platform: number;
    provider: number;
    network: number;
  };
}

/**
 * Fee Verification Service
 *
 * Verifies that fees charged on transactions match expected fee schedules.
 * This ensures:
 * - Platform fees are calculated correctly
 * - Provider fees (Yellow Card, Circle) are within expected ranges
 * - No fee leakage or overcharging
 *
 * Runs daily at 2:00 AM and can be triggered manually.
 */
@Injectable()
export class FeeVerificationService {
  private readonly logger = new Logger(FeeVerificationService.name);
  private readonly USDC_PRECISION = 1_000_000;

  // Default fee schedule (can be loaded from config/database)
  private feeSchedule: FeeSchedule;

  // Tolerance for fee differences (as percentage)
  private readonly FEE_TOLERANCE_PERCENT = 0.05; // 5% tolerance

  constructor(
    private readonly reconciliationReportRepository: ReconciliationReportRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.feeSchedule = FeeSchedule.createDefault();
  }

  /**
   * Update fee schedule (for configuration changes)
   */
  updateFeeSchedule(schedule: FeeSchedule): void {
    this.feeSchedule = schedule;
    this.logger.log('Fee schedule updated');
  }

  /**
   * Run daily fee verification at 2:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, { name: 'daily-fee-verification' })
  async runDailyVerification(): Promise<ReconciliationReportEntity> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    return this.verifyFees(yesterday, endOfYesterday);
  }

  /**
   * Verify fees for a specific period
   */
  async verifyFees(
    periodStart: Date,
    periodEnd: Date,
    executedBy?: string,
  ): Promise<ReconciliationReportEntity> {
    const startTime = Date.now();
    this.logger.log(
      `Starting fee verification for ${periodStart.toISOString()} to ${periodEnd.toISOString()}`,
    );

    // Create report
    const report = ReconciliationReportEntity.create({
      type: ReconciliationReportType.FEE_VERIFICATION,
      periodStart,
      periodEnd,
      executedBy,
    });

    await this.reconciliationReportRepository.save(report);

    this.eventEmitter.emit(
      'reconciliation.started',
      new ReconciliationStartedEvent(
        report.id,
        report.type,
        periodStart,
        periodEnd,
      ),
    );

    report.startProcessing();

    try {
      // 1. Fetch transactions with fees
      const transactions = await this.fetchTransactionsWithFees(
        periodStart,
        periodEnd,
      );
      this.logger.log(`Found ${transactions.length} transactions to verify`);

      // 2. Verify each transaction's fees
      const verificationResults = this.verifyTransactionFees(
        transactions,
        report,
      );

      // 3. Calculate summary
      const summary = this.calculateSummary(transactions, verificationResults);

      // 4. Complete report
      report.complete(summary);
      await this.reconciliationReportRepository.save(report);

      const duration = Date.now() - startTime;

      this.eventEmitter.emit(
        'reconciliation.completed',
        new ReconciliationCompletedEvent(
          report.id,
          report.type,
          transactions.length,
          verificationResults.filter((r) => r.isValid).length,
          verificationResults.filter((r) => !r.isValid).length,
          duration,
        ),
      );

      this.logger.log(
        `Fee verification completed in ${duration}ms: ` +
          `${verificationResults.filter((r) => r.isValid).length}/${transactions.length} valid, ` +
          `${verificationResults.filter((r) => !r.isValid).length} discrepancies`,
      );

      return report;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const duration = Date.now() - startTime;

      report.fail(errorMessage);
      await this.reconciliationReportRepository.save(report);

      this.eventEmitter.emit(
        'reconciliation.failed',
        new ReconciliationFailedEvent(
          report.id,
          report.type,
          errorMessage,
          duration,
        ),
      );

      this.logger.error(`Fee verification failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Verify fees for a single transaction
   */
  async verifyTransactionFee(
    transactionId: string,
  ): Promise<FeeVerificationResult | null> {
    const transactions = await this.transactionRepository.findByIds([
      transactionId,
    ]);
    if (transactions.length === 0) {
      return null;
    }

    const tx = transactions[0];
    const txWithFee: TransactionWithFee = {
      id: tx.id,
      walletId: tx.walletId,
      type: tx.type,
      amount: tx.amount,
      currency: tx.currency,
      status: tx.status,
      providerRef: tx.yellowCardRef,
      createdAt: tx.createdAt,
      metadata: tx.metadata as TransactionWithFee['metadata'],
    };

    return this.verifySingleTransaction(txWithFee);
  }

  /**
   * Get expected fee for a transaction
   */
  getExpectedFee(
    provider: string,
    transactionType: FeeTransactionType,
    amount: number,
    currency: string,
    date?: Date,
  ): number {
    const amountMicro = BigInt(Math.round(amount * this.USDC_PRECISION));
    const feeMicro = this.feeSchedule.calculateFee(
      provider,
      transactionType,
      amountMicro,
      currency,
      date,
    );
    return Number(feeMicro) / this.USDC_PRECISION;
  }

  /**
   * Fetch transactions with fee information
   */
  private async fetchTransactionsWithFees(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<TransactionWithFee[]> {
    const transactions = await this.transactionRepository.findByDateRange(
      periodStart,
      periodEnd,
    );

    return transactions
      .filter((tx) => tx.status === 'completed')
      .map((tx) => ({
        id: tx.id,
        walletId: tx.walletId,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        providerRef: tx.yellowCardRef,
        createdAt: tx.createdAt,
        metadata: tx.metadata as TransactionWithFee['metadata'],
      }));
  }

  /**
   * Verify fees for all transactions
   */
  private verifyTransactionFees(
    transactions: TransactionWithFee[],
    report: ReconciliationReportEntity,
  ): FeeVerificationResult[] {
    const results: FeeVerificationResult[] = [];

    for (const tx of transactions) {
      const result = this.verifySingleTransaction(tx);
      if (result) {
        results.push(result);

        if (!result.isValid) {
          const severity = this.calculateSeverity(result.difference);

          const discrepancy: FeeDiscrepancy = {
            transactionId: tx.id,
            transactionType: tx.type,
            expectedFee: result.expectedFee.toFixed(6),
            actualFee: result.actualFee.toFixed(6),
            difference: result.difference.toFixed(6),
            feeType: this.determineFeeType(result),
            severity,
            notes: `Expected ${result.expectedFee.toFixed(6)}, got ${result.actualFee.toFixed(6)} (${result.provider})`,
          };

          report.addFeeDiscrepancy(discrepancy);

          if (severity === DiscrepancySeverity.CRITICAL) {
            this.eventEmitter.emit(
              'reconciliation.critical_discrepancy',
              new CriticalDiscrepancyFoundEvent(report.id, discrepancy, 'fee'),
            );
          }
        }
      }
    }

    return results;
  }

  /**
   * Verify a single transaction's fee
   */
  private verifySingleTransaction(
    tx: TransactionWithFee,
  ): FeeVerificationResult | null {
    const provider = this.determineProvider(tx);
    const feeType = this.mapTransactionType(tx.type);

    if (!feeType) {
      return null;
    }

    // Get expected fee
    const expectedFee = this.getExpectedFee(
      provider,
      feeType,
      tx.amount,
      tx.currency,
      tx.createdAt,
    );

    // Get actual fee from metadata
    const actualFee = this.extractActualFee(tx);

    // Calculate difference
    const difference = actualFee - expectedFee;

    // Determine if within tolerance
    const toleranceAmount = expectedFee * this.FEE_TOLERANCE_PERCENT;
    const isValid =
      Math.abs(difference) <= toleranceAmount || Math.abs(difference) < 0.01;

    return {
      transactionId: tx.id,
      transactionType: tx.type,
      provider,
      amount: tx.amount,
      expectedFee,
      actualFee,
      difference,
      isValid,
      feeBreakdown: {
        platform: tx.metadata?.platformFee || 0,
        provider: tx.metadata?.providerFee || 0,
        network: tx.metadata?.networkFee || 0,
      },
    };
  }

  /**
   * Determine provider from transaction
   */
  private determineProvider(tx: TransactionWithFee): string {
    if (tx.metadata?.provider) {
      return tx.metadata.provider;
    }

    // Infer from transaction type and presence of providerRef
    if (tx.type === 'deposit' || tx.type === 'withdrawal') {
      return tx.providerRef ? 'yellowcard' : 'internal';
    }

    if (tx.type === 'transfer_external') {
      return 'circle';
    }

    return 'internal';
  }

  /**
   * Map transaction type to fee type
   */
  private mapTransactionType(type: string): FeeTransactionType | null {
    const mapping: Record<string, FeeTransactionType> = {
      deposit: FeeTransactionType.DEPOSIT,
      withdrawal: FeeTransactionType.WITHDRAWAL,
      transfer_internal: FeeTransactionType.TRANSFER_INTERNAL,
      transfer_external: FeeTransactionType.TRANSFER_EXTERNAL,
      bill_payment: FeeTransactionType.BILL_PAYMENT,
    };

    return mapping[type] || null;
  }

  /**
   * Extract actual fee from transaction metadata
   */
  private extractActualFee(tx: TransactionWithFee): number {
    if (tx.metadata?.fee !== undefined) {
      return tx.metadata.fee;
    }

    // Sum component fees if available
    const platformFee = tx.metadata?.platformFee || 0;
    const providerFee = tx.metadata?.providerFee || 0;
    const networkFee = tx.metadata?.networkFee || 0;

    return platformFee + providerFee + networkFee;
  }

  /**
   * Determine primary fee type causing discrepancy
   */
  private determineFeeType(
    result: FeeVerificationResult,
  ): 'platform' | 'provider' | 'network' {
    const { feeBreakdown } = result;

    // If one component is significantly larger, blame that
    if (
      feeBreakdown.platform > feeBreakdown.provider &&
      feeBreakdown.platform > feeBreakdown.network
    ) {
      return 'platform';
    }
    if (
      feeBreakdown.provider > feeBreakdown.platform &&
      feeBreakdown.provider > feeBreakdown.network
    ) {
      return 'provider';
    }
    if (
      feeBreakdown.network > feeBreakdown.platform &&
      feeBreakdown.network > feeBreakdown.provider
    ) {
      return 'network';
    }

    return 'platform'; // Default
  }

  /**
   * Calculate severity based on fee difference
   */
  private calculateSeverity(difference: number): DiscrepancySeverity {
    const absDiff = Math.abs(difference);

    if (absDiff >= 10) {
      return DiscrepancySeverity.CRITICAL;
    } else if (absDiff >= 1) {
      return DiscrepancySeverity.HIGH;
    } else if (absDiff >= 0.1) {
      return DiscrepancySeverity.MEDIUM;
    }
    return DiscrepancySeverity.LOW;
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(
    transactions: TransactionWithFee[],
    results: FeeVerificationResult[],
  ): ReconciliationSummary {
    const validResults = results.filter((r) => r.isValid);
    const invalidResults = results.filter((r) => !r.isValid);

    const totalFees = results.reduce((sum, r) => sum + r.actualFee, 0);
    const totalDiscrepancy = invalidResults.reduce(
      (sum, r) => sum + Math.abs(r.difference),
      0,
    );

    return {
      totalTransactions: transactions.length,
      matchedTransactions: validResults.length,
      unmatchedTransactions: invalidResults.length,
      totalDiscrepancies: invalidResults.length,
      criticalDiscrepancies: invalidResults.filter(
        (r) =>
          this.calculateSeverity(r.difference) === DiscrepancySeverity.CRITICAL,
      ).length,
      highDiscrepancies: invalidResults.filter(
        (r) =>
          this.calculateSeverity(r.difference) === DiscrepancySeverity.HIGH,
      ).length,
      mediumDiscrepancies: invalidResults.filter(
        (r) =>
          this.calculateSeverity(r.difference) === DiscrepancySeverity.MEDIUM,
      ).length,
      lowDiscrepancies: invalidResults.filter(
        (r) => this.calculateSeverity(r.difference) === DiscrepancySeverity.LOW,
      ).length,
      totalAmountReconciled: totalFees.toFixed(2),
      totalDiscrepancyAmount: totalDiscrepancy.toFixed(2),
    };
  }
}
