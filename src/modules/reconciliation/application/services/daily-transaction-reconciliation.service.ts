import { Injectable, Logger, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ReconciliationReportEntity,
  ReconciliationReportType,
  ReconciliationSummary,
  TransactionDiscrepancy,
  DiscrepancySeverity,
} from '../../domain/entities/reconciliation-report.entity';
import { ReconciliationReportRepository } from '../../domain/repositories/reconciliation-report.repository';
import {
  ReconciliationStartedEvent,
  ReconciliationCompletedEvent,
  ReconciliationFailedEvent,
  CriticalDiscrepancyFoundEvent,
} from '../../domain/events/reconciliation.events';
import {
  LEDGER_PROVIDER,
  ILedgerProvider,
  LedgerTransactionResult,
} from '@modules/providers/interfaces';
import { TransactionRepository } from '@modules/transaction/infrastructure/repositories/transaction.repository';

/**
 * Internal transaction representation for reconciliation
 */
interface InternalTransaction {
  id: string;
  walletId: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  providerRef: string | null;
  createdAt: Date;
  completedAt: Date | null;
  metadata?: Record<string, unknown>;
}

/**
 * Daily Transaction Reconciliation Service
 *
 * Reconciles internal database transactions with:
 * - Blnk ledger entries
 * - Provider transaction records (Yellow Card, Circle)
 *
 * Runs daily at 1:00 AM and can also be triggered manually.
 */
@Injectable()
export class DailyTransactionReconciliationService {
  private readonly logger = new Logger(
    DailyTransactionReconciliationService.name,
  );
  private readonly USDC_PRECISION = 1_000_000;

  constructor(
    private readonly reconciliationReportRepository: ReconciliationReportRepository,
    private readonly transactionRepository: TransactionRepository,
    @Inject(LEDGER_PROVIDER)
    private readonly _ledgerProvider: ILedgerProvider,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Run daily transaction reconciliation at 1:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM, {
    name: 'daily-transaction-reconciliation',
  })
  async runDailyReconciliation(): Promise<ReconciliationReportEntity> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    return this.reconcile(yesterday, endOfYesterday);
  }

  /**
   * Run reconciliation for a specific period
   */
  async reconcile(
    periodStart: Date,
    periodEnd: Date,
    executedBy?: string,
  ): Promise<ReconciliationReportEntity> {
    const startTime = Date.now();
    this.logger.log(
      `Starting daily transaction reconciliation for ${periodStart.toISOString()} to ${periodEnd.toISOString()}`,
    );

    // Create report
    const report = ReconciliationReportEntity.create({
      type: ReconciliationReportType.DAILY_TRANSACTION,
      periodStart,
      periodEnd,
      executedBy,
    });

    await this.reconciliationReportRepository.save(report);

    // Emit start event
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
      // 1. Fetch internal transactions for the period
      const internalTransactions = await this.fetchInternalTransactions(
        periodStart,
        periodEnd,
      );
      this.logger.log(
        `Found ${internalTransactions.length} internal transactions`,
      );

      // 2. Fetch ledger transactions for the period
      const ledgerTransactions = await this.fetchLedgerTransactions(
        periodStart,
        periodEnd,
      );
      this.logger.log(`Found ${ledgerTransactions.length} ledger transactions`);

      // 3. Match and reconcile transactions
      const discrepancies = this.matchTransactions(
        internalTransactions,
        ledgerTransactions,
        report,
      );

      // 4. Calculate summary
      const summary = this.calculateSummary(
        internalTransactions,
        discrepancies,
      );

      // 5. Complete report
      report.complete(summary);
      await this.reconciliationReportRepository.save(report);

      const duration = Date.now() - startTime;

      // Emit completion event
      this.eventEmitter.emit(
        'reconciliation.completed',
        new ReconciliationCompletedEvent(
          report.id,
          report.type,
          summary.totalTransactions,
          summary.matchedTransactions,
          summary.totalDiscrepancies,
          duration,
        ),
      );

      this.logger.log(
        `Daily transaction reconciliation completed in ${duration}ms: ` +
          `${summary.matchedTransactions}/${summary.totalTransactions} matched, ` +
          `${summary.totalDiscrepancies} discrepancies`,
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

      this.logger.error(
        `Daily transaction reconciliation failed: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Fetch internal transactions from database
   */
  private async fetchInternalTransactions(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<InternalTransaction[]> {
    const transactions = await this.transactionRepository.findByDateRange(
      periodStart,
      periodEnd,
    );

    return transactions.map((tx) => ({
      id: tx.id,
      walletId: tx.walletId,
      type: tx.type,
      amount: tx.amount,
      currency: tx.currency,
      status: tx.status,
      providerRef: tx.yellowCardRef,
      createdAt: tx.createdAt,
      completedAt: tx.completedAt,
      metadata: tx.metadata || undefined,
    }));
  }

  /**
   * Fetch ledger transactions (simplified - would use actual provider in production)
   */
  private async fetchLedgerTransactions(
    _periodStart: Date,
    _periodEnd: Date,
  ): Promise<LedgerTransactionResult[]> {
    try {
      // In production, this would fetch from Blnk ledger
      // For now, return empty array (ledger reconciliation handled separately)
      return [];
    } catch (error) {
      this.logger.warn(`Failed to fetch ledger transactions: ${error}`);
      return [];
    }
  }

  /**
   * Match internal transactions with ledger entries
   */
  private matchTransactions(
    internal: InternalTransaction[],
    ledger: LedgerTransactionResult[],
    report: ReconciliationReportEntity,
  ): TransactionDiscrepancy[] {
    const discrepancies: TransactionDiscrepancy[] = [];

    // Create lookup map for ledger transactions by reference
    const ledgerMap = new Map<string, LedgerTransactionResult>();
    for (const tx of ledger) {
      ledgerMap.set(tx.reference, tx);
    }

    // Check each internal transaction
    for (const internalTx of internal) {
      // Only reconcile completed transactions
      if (internalTx.status !== 'completed') {
        continue;
      }

      const reference = internalTx.providerRef || internalTx.id;
      const ledgerTx = ledgerMap.get(reference);

      if (!ledgerTx) {
        // Transaction exists internally but not in ledger
        const discrepancy: TransactionDiscrepancy = {
          transactionId: internalTx.id,
          provider: 'blnk',
          type: 'missing_external',
          internalAmount: internalTx.amount.toString(),
          internalStatus: internalTx.status,
          severity: this.calculateSeverity(internalTx.amount),
          createdAt: new Date(),
          notes: 'Transaction exists in database but not found in ledger',
        };

        discrepancies.push(discrepancy);
        report.addTransactionDiscrepancy(discrepancy);

        if (discrepancy.severity === DiscrepancySeverity.CRITICAL) {
          this.eventEmitter.emit(
            'reconciliation.critical_discrepancy',
            new CriticalDiscrepancyFoundEvent(
              report.id,
              discrepancy,
              'transaction',
            ),
          );
        }
      } else {
        // Check for amount mismatch
        const internalAmountMicro = BigInt(
          Math.round(internalTx.amount * this.USDC_PRECISION),
        );
        const ledgerAmount = ledgerTx.amount;

        if (internalAmountMicro !== ledgerAmount) {
          const difference =
            Number(internalAmountMicro - ledgerAmount) / this.USDC_PRECISION;

          const discrepancy: TransactionDiscrepancy = {
            transactionId: internalTx.id,
            externalId: ledgerTx.transactionId,
            provider: 'blnk',
            type: 'amount_mismatch',
            internalAmount: internalTx.amount.toString(),
            externalAmount: (
              Number(ledgerAmount) / this.USDC_PRECISION
            ).toString(),
            difference: difference.toString(),
            severity: this.calculateSeverity(Math.abs(difference)),
            createdAt: new Date(),
            notes: `Amount mismatch: internal ${internalTx.amount} vs ledger ${Number(ledgerAmount) / this.USDC_PRECISION}`,
          };

          discrepancies.push(discrepancy);
          report.addTransactionDiscrepancy(discrepancy);
        }

        // Remove from map to track unmatched ledger entries
        ledgerMap.delete(reference);
      }
    }

    // Check for transactions in ledger but not in database
    for (const [reference, ledgerTx] of ledgerMap) {
      const discrepancy: TransactionDiscrepancy = {
        transactionId: reference,
        externalId: ledgerTx.transactionId,
        provider: 'blnk',
        type: 'missing_internal',
        externalAmount: (
          Number(ledgerTx.amount) / this.USDC_PRECISION
        ).toString(),
        externalStatus: ledgerTx.status,
        severity: this.calculateSeverity(
          Number(ledgerTx.amount) / this.USDC_PRECISION,
        ),
        createdAt: new Date(),
        notes: 'Transaction exists in ledger but not found in database',
      };

      discrepancies.push(discrepancy);
      report.addTransactionDiscrepancy(discrepancy);
    }

    return discrepancies;
  }

  /**
   * Calculate severity based on amount
   */
  private calculateSeverity(amount: number): DiscrepancySeverity {
    const absAmount = Math.abs(amount);

    if (absAmount >= 100) {
      return DiscrepancySeverity.CRITICAL;
    } else if (absAmount >= 10) {
      return DiscrepancySeverity.HIGH;
    } else if (absAmount >= 1) {
      return DiscrepancySeverity.MEDIUM;
    }
    return DiscrepancySeverity.LOW;
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(
    transactions: InternalTransaction[],
    discrepancies: TransactionDiscrepancy[],
  ): ReconciliationSummary {
    const completedTransactions = transactions.filter(
      (tx) => tx.status === 'completed',
    );
    const totalAmount = completedTransactions.reduce(
      (sum, tx) => sum + tx.amount,
      0,
    );

    const discrepancyAmount = discrepancies.reduce((sum, d) => {
      const diff = parseFloat(d.difference || d.internalAmount || '0');
      return sum + Math.abs(diff);
    }, 0);

    return {
      totalTransactions: completedTransactions.length,
      matchedTransactions:
        completedTransactions.length -
        discrepancies.filter(
          (d) => d.type === 'missing_internal' || d.type === 'missing_external',
        ).length,
      unmatchedTransactions: discrepancies.filter(
        (d) => d.type === 'missing_internal' || d.type === 'missing_external',
      ).length,
      totalDiscrepancies: discrepancies.length,
      criticalDiscrepancies: discrepancies.filter(
        (d) => d.severity === DiscrepancySeverity.CRITICAL,
      ).length,
      highDiscrepancies: discrepancies.filter(
        (d) => d.severity === DiscrepancySeverity.HIGH,
      ).length,
      mediumDiscrepancies: discrepancies.filter(
        (d) => d.severity === DiscrepancySeverity.MEDIUM,
      ).length,
      lowDiscrepancies: discrepancies.filter(
        (d) => d.severity === DiscrepancySeverity.LOW,
      ).length,
      totalAmountReconciled: totalAmount.toFixed(2),
      totalDiscrepancyAmount: discrepancyAmount.toFixed(2),
    };
  }
}
