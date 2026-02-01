import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ReconciliationReportEntity,
  ReconciliationReportType,
  ReconciliationSummary,
  SettlementEntry,
} from '../../domain/entities/reconciliation-report.entity';
import { ReconciliationReportRepository } from '../../domain/repositories/reconciliation-report.repository';
import {
  ReconciliationStartedEvent,
  ReconciliationCompletedEvent,
  ReconciliationFailedEvent,
  SettlementReportGeneratedEvent,
} from '../../domain/events/reconciliation.events';
import { TransactionRepository } from '@modules/transaction/infrastructure/repositories/transaction.repository';

/**
 * Transaction data for settlement calculation
 */
interface SettlementTransaction {
  id: string;
  walletId: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  createdAt: Date;
  metadata?: {
    fee?: number;
    platformFee?: number;
    providerFee?: number;
    networkFee?: number;
    [key: string]: unknown;
  };
}

/**
 * Provider settlement summary
 */
interface ProviderSettlement {
  provider: string;
  currency: string;
  deposits: {
    count: number;
    grossVolume: number;
    fees: number;
    netVolume: number;
  };
  withdrawals: {
    count: number;
    grossVolume: number;
    fees: number;
    netVolume: number;
  };
  transfers: {
    count: number;
    grossVolume: number;
    fees: number;
    netVolume: number;
  };
  total: {
    transactionCount: number;
    grossVolume: number;
    platformFees: number;
    providerFees: number;
    networkFees: number;
    totalFees: number;
    netSettlement: number;
  };
}

/**
 * Daily settlement summary
 */
export interface DailySettlementSummary {
  date: Date;
  providers: ProviderSettlement[];
  totals: {
    transactionCount: number;
    grossVolume: number;
    platformFees: number;
    providerFees: number;
    networkFees: number;
    totalFees: number;
    netSettlement: number;
  };
  reconciliationStatus: 'reconciled' | 'pending' | 'discrepancy';
}

/**
 * Settlement Report Service
 *
 * Generates comprehensive settlement reports including:
 * - Transaction volume by provider
 * - Fee breakdown (platform, provider, network)
 * - Net settlement amounts
 * - Daily/weekly/monthly summaries
 *
 * Runs daily at 3:00 AM and can be triggered manually.
 */
@Injectable()
export class SettlementReportService {
  private readonly logger = new Logger(SettlementReportService.name);
  private readonly _USDC_PRECISION = 1_000_000;

  // Known providers
  private readonly PROVIDERS = ['yellowcard', 'circle', 'internal'];

  constructor(
    private readonly reconciliationReportRepository: ReconciliationReportRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Generate daily settlement report at 3:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'daily-settlement-report' })
  async generateDailySettlement(): Promise<ReconciliationReportEntity> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    return this.generateSettlementReport(yesterday, endOfYesterday);
  }

  /**
   * Generate settlement report for a specific period
   */
  async generateSettlementReport(
    periodStart: Date,
    periodEnd: Date,
    executedBy?: string,
  ): Promise<ReconciliationReportEntity> {
    const startTime = Date.now();
    this.logger.log(
      `Generating settlement report for ${periodStart.toISOString()} to ${periodEnd.toISOString()}`,
    );

    // Create report
    const report = ReconciliationReportEntity.create({
      type: ReconciliationReportType.SETTLEMENT,
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
      // 1. Fetch transactions for the period
      const transactions = await this.fetchTransactions(periodStart, periodEnd);
      this.logger.log(`Found ${transactions.length} completed transactions`);

      // 2. Calculate settlements by provider
      const providerSettlements =
        this.calculateProviderSettlements(transactions);

      // 3. Convert to settlement entries
      const settlementEntries =
        this.convertToSettlementEntries(providerSettlements);
      report.setSettlementEntries(settlementEntries);

      // 4. Calculate summary
      const summary = this.calculateSummary(transactions, providerSettlements);

      // 5. Calculate totals for event
      const totals = this.calculateTotals(providerSettlements);

      // 6. Complete report
      report.complete(summary);
      await this.reconciliationReportRepository.save(report);

      const duration = Date.now() - startTime;

      // Emit completion events
      this.eventEmitter.emit(
        'reconciliation.completed',
        new ReconciliationCompletedEvent(
          report.id,
          report.type,
          transactions.length,
          transactions.length, // All matched in settlement
          0,
          duration,
        ),
      );

      this.eventEmitter.emit(
        'reconciliation.settlement_generated',
        new SettlementReportGeneratedEvent(
          report.id,
          periodStart,
          periodEnd,
          totals.grossVolume.toFixed(2),
          totals.netSettlement.toFixed(2),
          providerSettlements.length,
        ),
      );

      this.logger.log(
        `Settlement report generated in ${duration}ms: ` +
          `${transactions.length} transactions, ` +
          `$${totals.grossVolume.toFixed(2)} gross volume, ` +
          `$${totals.netSettlement.toFixed(2)} net settlement`,
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

      this.logger.error(`Settlement report generation failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get settlement summary for a specific provider
   */
  async getProviderSettlement(
    provider: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<ProviderSettlement | null> {
    const transactions = await this.fetchTransactions(periodStart, periodEnd);
    const providerTransactions = transactions.filter(
      (tx) => tx.provider === provider,
    );

    if (providerTransactions.length === 0) {
      return null;
    }

    const settlements = this.calculateProviderSettlements(providerTransactions);
    return settlements.find((s) => s.provider === provider) || null;
  }

  /**
   * Get daily settlement summary
   */
  async getDailySettlementSummary(date: Date): Promise<DailySettlementSummary> {
    const periodStart = new Date(date);
    periodStart.setHours(0, 0, 0, 0);

    const periodEnd = new Date(date);
    periodEnd.setHours(23, 59, 59, 999);

    const transactions = await this.fetchTransactions(periodStart, periodEnd);
    const providerSettlements = this.calculateProviderSettlements(transactions);
    const totals = this.calculateTotals(providerSettlements);

    // Check if report exists and its status
    const existingReport = await this.reconciliationReportRepository.find({
      type: ReconciliationReportType.SETTLEMENT,
      periodStart,
      periodEnd,
      limit: 1,
    });

    let reconciliationStatus: 'reconciled' | 'pending' | 'discrepancy' =
      'pending';
    if (existingReport.length > 0) {
      reconciliationStatus = existingReport[0].hasIssues()
        ? 'discrepancy'
        : 'reconciled';
    }

    return {
      date: periodStart,
      providers: providerSettlements,
      totals,
      reconciliationStatus,
    };
  }

  /**
   * Generate weekly settlement report
   */
  async generateWeeklySettlement(
    weekStartDate: Date,
  ): Promise<ReconciliationReportEntity> {
    const periodStart = new Date(weekStartDate);
    periodStart.setHours(0, 0, 0, 0);

    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 6);
    periodEnd.setHours(23, 59, 59, 999);

    return this.generateSettlementReport(periodStart, periodEnd);
  }

  /**
   * Generate monthly settlement report
   */
  async generateMonthlySettlement(
    year: number,
    month: number,
  ): Promise<ReconciliationReportEntity> {
    const periodStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);

    return this.generateSettlementReport(periodStart, periodEnd);
  }

  /**
   * Fetch completed transactions for a period
   */
  private async fetchTransactions(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<SettlementTransaction[]> {
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
        provider: this.determineProvider(tx),
        createdAt: tx.createdAt,
        metadata: tx.metadata as SettlementTransaction['metadata'],
      }));
  }

  /**
   * Determine provider from transaction
   */
  private determineProvider(tx: {
    type: string;
    yellowCardRef: string | null;
    metadata?: Record<string, unknown> | null;
  }): string {
    if (
      tx.metadata &&
      typeof tx.metadata === 'object' &&
      'provider' in tx.metadata
    ) {
      return tx.metadata.provider as string;
    }

    if (tx.yellowCardRef) {
      return 'yellowcard';
    }

    if (tx.type === 'transfer_external') {
      return 'circle';
    }

    return 'internal';
  }

  /**
   * Calculate settlements grouped by provider
   */
  private calculateProviderSettlements(
    transactions: SettlementTransaction[],
  ): ProviderSettlement[] {
    const settlementMap = new Map<string, ProviderSettlement>();

    // Initialize settlements for known providers
    for (const provider of this.PROVIDERS) {
      settlementMap.set(provider, this.createEmptySettlement(provider, 'USDC'));
    }

    // Aggregate transactions
    for (const tx of transactions) {
      let settlement = settlementMap.get(tx.provider);
      if (!settlement) {
        settlement = this.createEmptySettlement(tx.provider, tx.currency);
        settlementMap.set(tx.provider, settlement);
      }

      const platformFee = tx.metadata?.platformFee || 0;
      const providerFee = tx.metadata?.providerFee || 0;
      const networkFee = tx.metadata?.networkFee || 0;
      const totalFee =
        tx.metadata?.fee || platformFee + providerFee + networkFee;

      // Update based on transaction type
      if (tx.type === 'deposit') {
        settlement.deposits.count++;
        settlement.deposits.grossVolume += tx.amount;
        settlement.deposits.fees += totalFee;
        settlement.deposits.netVolume += tx.amount - totalFee;
      } else if (tx.type === 'withdrawal') {
        settlement.withdrawals.count++;
        settlement.withdrawals.grossVolume += tx.amount;
        settlement.withdrawals.fees += totalFee;
        settlement.withdrawals.netVolume += tx.amount - totalFee;
      } else if (
        tx.type === 'transfer_internal' ||
        tx.type === 'transfer_external'
      ) {
        settlement.transfers.count++;
        settlement.transfers.grossVolume += tx.amount;
        settlement.transfers.fees += totalFee;
        settlement.transfers.netVolume += tx.amount - totalFee;
      }

      // Update totals
      settlement.total.transactionCount++;
      settlement.total.grossVolume += tx.amount;
      settlement.total.platformFees += platformFee;
      settlement.total.providerFees += providerFee;
      settlement.total.networkFees += networkFee;
      settlement.total.totalFees += totalFee;
      settlement.total.netSettlement += tx.amount - totalFee;
    }

    // Filter out empty settlements
    return Array.from(settlementMap.values()).filter(
      (s) => s.total.transactionCount > 0,
    );
  }

  /**
   * Create empty settlement structure
   */
  private createEmptySettlement(
    provider: string,
    currency: string,
  ): ProviderSettlement {
    return {
      provider,
      currency,
      deposits: { count: 0, grossVolume: 0, fees: 0, netVolume: 0 },
      withdrawals: { count: 0, grossVolume: 0, fees: 0, netVolume: 0 },
      transfers: { count: 0, grossVolume: 0, fees: 0, netVolume: 0 },
      total: {
        transactionCount: 0,
        grossVolume: 0,
        platformFees: 0,
        providerFees: 0,
        networkFees: 0,
        totalFees: 0,
        netSettlement: 0,
      },
    };
  }

  /**
   * Convert provider settlements to settlement entries
   */
  private convertToSettlementEntries(
    settlements: ProviderSettlement[],
  ): SettlementEntry[] {
    return settlements.map((s) => ({
      provider: s.provider,
      currency: s.currency,
      grossVolume: s.total.grossVolume.toFixed(2),
      totalFees: s.total.totalFees.toFixed(2),
      platformFees: s.total.platformFees.toFixed(2),
      providerFees: s.total.providerFees.toFixed(2),
      networkFees: s.total.networkFees.toFixed(2),
      netSettlement: s.total.netSettlement.toFixed(2),
      transactionCount: s.total.transactionCount,
      depositCount: s.deposits.count,
      withdrawalCount: s.withdrawals.count,
      transferCount: s.transfers.count,
    }));
  }

  /**
   * Calculate totals across all providers
   */
  private calculateTotals(
    settlements: ProviderSettlement[],
  ): ProviderSettlement['total'] {
    const totals = {
      transactionCount: 0,
      grossVolume: 0,
      platformFees: 0,
      providerFees: 0,
      networkFees: 0,
      totalFees: 0,
      netSettlement: 0,
    };

    for (const settlement of settlements) {
      totals.transactionCount += settlement.total.transactionCount;
      totals.grossVolume += settlement.total.grossVolume;
      totals.platformFees += settlement.total.platformFees;
      totals.providerFees += settlement.total.providerFees;
      totals.networkFees += settlement.total.networkFees;
      totals.totalFees += settlement.total.totalFees;
      totals.netSettlement += settlement.total.netSettlement;
    }

    return totals;
  }

  /**
   * Calculate summary for the report
   */
  private calculateSummary(
    transactions: SettlementTransaction[],
    settlements: ProviderSettlement[],
  ): ReconciliationSummary {
    const totals = this.calculateTotals(settlements);

    return {
      totalTransactions: transactions.length,
      matchedTransactions: transactions.length,
      unmatchedTransactions: 0,
      totalDiscrepancies: 0,
      criticalDiscrepancies: 0,
      highDiscrepancies: 0,
      mediumDiscrepancies: 0,
      lowDiscrepancies: 0,
      totalAmountReconciled: totals.grossVolume.toFixed(2),
      totalDiscrepancyAmount: '0.00',
    };
  }
}
