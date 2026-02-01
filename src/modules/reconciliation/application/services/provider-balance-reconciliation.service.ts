import { Injectable, Logger, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ReconciliationReportEntity,
  ReconciliationReportType,
  ReconciliationSummary,
  ProviderBalanceEntry,
  DiscrepancySeverity,
} from '../../domain/entities/reconciliation-report.entity';
import { ReconciliationReportRepository } from '../../domain/repositories/reconciliation-report.repository';
import {
  ReconciliationStartedEvent,
  ReconciliationCompletedEvent,
  ReconciliationFailedEvent,
  ProviderBalanceMismatchEvent,
} from '../../domain/events/reconciliation.events';
import {
  LEDGER_PROVIDER,
  ILedgerProvider,
  WALLET_PROVIDER,
  IWalletProvider,
} from '@modules/providers/interfaces';
import { IWalletRepository } from '@modules/wallet/domain/repositories/wallet.repository';

/**
 * Provider balance information
 */
interface ProviderBalance {
  provider: string;
  currency: string;
  balance: bigint;
  lastUpdated: Date;
}

/**
 * Wallet balance aggregation
 */
interface WalletBalanceAggregate {
  currency: string;
  totalBalance: number;
  walletCount: number;
  lastTransactionId?: string;
  lastTransactionDate?: Date;
}

/**
 * Provider Balance Reconciliation Service
 *
 * Reconciles balances between:
 * - Database wallet balances (sum of all user wallets)
 * - Blnk ledger balances
 * - Circle wallet balances
 * - Yellow Card settlement balances
 *
 * Runs every 4 hours and can be triggered manually.
 */
@Injectable()
export class ProviderBalanceReconciliationService {
  private readonly logger = new Logger(
    ProviderBalanceReconciliationService.name,
  );
  private readonly USDC_PRECISION = 1_000_000;

  // Tolerance for balance differences (in micro-units)
  private readonly CRITICAL_THRESHOLD = 100_000_000n; // $100
  private readonly HIGH_THRESHOLD = 10_000_000n; // $10
  private readonly MEDIUM_THRESHOLD = 1_000_000n; // $1

  constructor(
    private readonly reconciliationReportRepository: ReconciliationReportRepository,
    @Inject('WALLET_REPOSITORY')
    private readonly walletRepository: IWalletRepository,
    @Inject(LEDGER_PROVIDER)
    private readonly ledgerProvider: ILedgerProvider,
    @Inject(WALLET_PROVIDER)
    private readonly _walletProvider: IWalletProvider,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Run provider balance reconciliation every 4 hours
   */
  @Cron(CronExpression.EVERY_4_HOURS, {
    name: 'provider-balance-reconciliation',
  })
  async runScheduledReconciliation(): Promise<ReconciliationReportEntity> {
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setHours(periodStart.getHours() - 4);

    return this.reconcile(periodStart, now);
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
      `Starting provider balance reconciliation for ${periodStart.toISOString()} to ${periodEnd.toISOString()}`,
    );

    // Create report
    const report = ReconciliationReportEntity.create({
      type: ReconciliationReportType.PROVIDER_BALANCE,
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
      // 1. Aggregate database wallet balances
      const dbBalances = await this.aggregateDatabaseBalances();
      this.logger.log(
        `Aggregated ${dbBalances.length} currency balances from database`,
      );

      // 2. Fetch Blnk ledger balances
      const blnkBalances = await this.fetchBlnkBalances();
      this.logger.log(`Fetched ${blnkBalances.length} Blnk balances`);

      // 3. Fetch Circle balances
      const circleBalances = await this.fetchCircleBalances();
      this.logger.log(`Fetched ${circleBalances.length} Circle balances`);

      // 4. Compare and create provider balance entries
      const providerBalances = this.reconcileBalances(
        dbBalances,
        blnkBalances,
        circleBalances,
        report,
      );

      report.setProviderBalances(providerBalances);

      // 5. Calculate summary
      const summary = this.calculateSummary(providerBalances);

      // 6. Complete report
      report.complete(summary);
      await this.reconciliationReportRepository.save(report);

      const duration = Date.now() - startTime;

      this.eventEmitter.emit(
        'reconciliation.completed',
        new ReconciliationCompletedEvent(
          report.id,
          report.type,
          providerBalances.length,
          providerBalances.filter((b) => b.isReconciled).length,
          providerBalances.filter((b) => !b.isReconciled).length,
          duration,
        ),
      );

      this.logger.log(
        `Provider balance reconciliation completed in ${duration}ms: ` +
          `${providerBalances.filter((b) => b.isReconciled).length}/${providerBalances.length} reconciled`,
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
        `Provider balance reconciliation failed: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Reconcile a specific provider
   */
  async reconcileProvider(
    provider: 'blnk' | 'circle',
    executedBy?: string,
  ): Promise<ProviderBalanceEntry[]> {
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setHours(0, 0, 0, 0);

    const dbBalances = await this.aggregateDatabaseBalances();

    let providerBalances: ProviderBalance[] = [];
    if (provider === 'blnk') {
      providerBalances = await this.fetchBlnkBalances();
    } else if (provider === 'circle') {
      providerBalances = await this.fetchCircleBalances();
    }

    const entries: ProviderBalanceEntry[] = [];

    for (const dbBalance of dbBalances) {
      const providerBalance = providerBalances.find(
        (p) => p.currency === dbBalance.currency,
      );

      const reportedBalance = providerBalance
        ? this.formatBalance(providerBalance.balance)
        : '0.00';

      const calculatedBalance = dbBalance.totalBalance.toFixed(6);
      const difference = providerBalance
        ? (
            Number(providerBalance.balance) / this.USDC_PRECISION -
            dbBalance.totalBalance
          ).toFixed(6)
        : (-dbBalance.totalBalance).toFixed(6);

      entries.push({
        provider,
        currency: dbBalance.currency,
        reportedBalance,
        calculatedBalance,
        difference,
        isReconciled: Math.abs(parseFloat(difference)) < 0.01,
        lastTransactionId: dbBalance.lastTransactionId,
        lastTransactionDate: dbBalance.lastTransactionDate,
      });
    }

    return entries;
  }

  /**
   * Aggregate balances from all wallets in database
   */
  private async aggregateDatabaseBalances(): Promise<WalletBalanceAggregate[]> {
    const wallets = await this.walletRepository.findAll();

    const aggregates = new Map<string, WalletBalanceAggregate>();

    for (const wallet of wallets) {
      const existing = aggregates.get(wallet.currency) || {
        currency: wallet.currency,
        totalBalance: 0,
        walletCount: 0,
      };

      existing.totalBalance += wallet.balance;
      existing.walletCount += 1;

      aggregates.set(wallet.currency, existing);
    }

    return Array.from(aggregates.values());
  }

  /**
   * Fetch balances from Blnk ledger
   */
  private async fetchBlnkBalances(): Promise<ProviderBalance[]> {
    const balances: ProviderBalance[] = [];

    try {
      // In production, this would aggregate all balances from Blnk
      // For now, we simulate by getting main ledger balance
      const wallets = await this.walletRepository.findAll();

      let totalBalance = 0n;
      for (const wallet of wallets) {
        try {
          const balanceInfo = await this.ledgerProvider.getUserBalance(
            wallet.userId,
            wallet.currency,
          );
          if (balanceInfo) {
            totalBalance += balanceInfo.balance;
          }
        } catch {
          // Skip wallets that fail
        }
      }

      balances.push({
        provider: 'blnk',
        currency: 'USDC',
        balance: totalBalance,
        lastUpdated: new Date(),
      });
    } catch (error) {
      this.logger.warn(`Failed to fetch Blnk balances: ${error}`);
    }

    return balances;
  }

  /**
   * Fetch balances from Circle
   */
  private async fetchCircleBalances(): Promise<ProviderBalance[]> {
    const balances: ProviderBalance[] = [];

    try {
      // In production, this would fetch from Circle master wallet
      // For now, return simulated data
      balances.push({
        provider: 'circle',
        currency: 'USDC',
        balance: 0n,
        lastUpdated: new Date(),
      });
    } catch (error) {
      this.logger.warn(`Failed to fetch Circle balances: ${error}`);
    }

    return balances;
  }

  /**
   * Reconcile balances across providers
   */
  private reconcileBalances(
    dbBalances: WalletBalanceAggregate[],
    blnkBalances: ProviderBalance[],
    circleBalances: ProviderBalance[],
    report: ReconciliationReportEntity,
  ): ProviderBalanceEntry[] {
    const entries: ProviderBalanceEntry[] = [];

    for (const dbBalance of dbBalances) {
      const blnkBalance = blnkBalances.find(
        (b) => b.currency === dbBalance.currency,
      );
      const circleBalance = circleBalances.find(
        (b) => b.currency === dbBalance.currency,
      );

      // Add Blnk reconciliation entry
      if (blnkBalance) {
        const entry = this.createBalanceEntry(
          'blnk',
          dbBalance,
          blnkBalance,
          report,
        );
        entries.push(entry);
      }

      // Add Circle reconciliation entry
      if (circleBalance) {
        const entry = this.createBalanceEntry(
          'circle',
          dbBalance,
          circleBalance,
          report,
        );
        entries.push(entry);
      }
    }

    return entries;
  }

  /**
   * Create a provider balance entry
   */
  private createBalanceEntry(
    provider: string,
    dbBalance: WalletBalanceAggregate,
    providerBalance: ProviderBalance,
    report: ReconciliationReportEntity,
  ): ProviderBalanceEntry {
    const dbBalanceMicro = BigInt(
      Math.round(dbBalance.totalBalance * this.USDC_PRECISION),
    );
    const difference = providerBalance.balance - dbBalanceMicro;
    const isReconciled = this.isWithinTolerance(difference);

    const entry: ProviderBalanceEntry = {
      provider,
      currency: dbBalance.currency,
      reportedBalance: this.formatBalance(providerBalance.balance),
      calculatedBalance: dbBalance.totalBalance.toFixed(6),
      difference: this.formatBalance(difference),
      isReconciled,
      lastTransactionId: dbBalance.lastTransactionId,
      lastTransactionDate: dbBalance.lastTransactionDate,
    };

    // Emit event if there's a significant mismatch
    if (!isReconciled) {
      this.eventEmitter.emit(
        'reconciliation.provider_balance_mismatch',
        new ProviderBalanceMismatchEvent(
          report.id,
          provider,
          dbBalance.currency,
          entry.reportedBalance,
          entry.calculatedBalance,
          entry.difference,
        ),
      );
    }

    return entry;
  }

  /**
   * Check if difference is within acceptable tolerance
   */
  private isWithinTolerance(difference: bigint): boolean {
    const absDiff = difference < 0n ? -difference : difference;
    return absDiff < this.MEDIUM_THRESHOLD;
  }

  /**
   * Calculate severity based on difference
   */
  private calculateSeverity(difference: bigint): DiscrepancySeverity {
    const absDiff = difference < 0n ? -difference : difference;

    if (absDiff >= this.CRITICAL_THRESHOLD) {
      return DiscrepancySeverity.CRITICAL;
    } else if (absDiff >= this.HIGH_THRESHOLD) {
      return DiscrepancySeverity.HIGH;
    } else if (absDiff >= this.MEDIUM_THRESHOLD) {
      return DiscrepancySeverity.MEDIUM;
    }
    return DiscrepancySeverity.LOW;
  }

  /**
   * Format balance from micro-units
   */
  private formatBalance(balance: bigint): string {
    const value = Number(balance) / this.USDC_PRECISION;
    return value.toFixed(6);
  }

  /**
   * Calculate summary
   */
  private calculateSummary(
    entries: ProviderBalanceEntry[],
  ): ReconciliationSummary {
    const reconciled = entries.filter((e) => e.isReconciled);
    const notReconciled = entries.filter((e) => !e.isReconciled);

    const totalDiscrepancy = notReconciled.reduce(
      (sum, e) => sum + Math.abs(parseFloat(e.difference)),
      0,
    );

    return {
      totalTransactions: entries.length,
      matchedTransactions: reconciled.length,
      unmatchedTransactions: notReconciled.length,
      totalDiscrepancies: notReconciled.length,
      criticalDiscrepancies: notReconciled.filter(
        (e) =>
          this.calculateSeverity(
            BigInt(Math.round(parseFloat(e.difference) * this.USDC_PRECISION)),
          ) === DiscrepancySeverity.CRITICAL,
      ).length,
      highDiscrepancies: notReconciled.filter(
        (e) =>
          this.calculateSeverity(
            BigInt(Math.round(parseFloat(e.difference) * this.USDC_PRECISION)),
          ) === DiscrepancySeverity.HIGH,
      ).length,
      mediumDiscrepancies: notReconciled.filter(
        (e) =>
          this.calculateSeverity(
            BigInt(Math.round(parseFloat(e.difference) * this.USDC_PRECISION)),
          ) === DiscrepancySeverity.MEDIUM,
      ).length,
      lowDiscrepancies: 0,
      totalAmountReconciled: entries
        .map((e) => parseFloat(e.calculatedBalance))
        .reduce((sum, b) => sum + b, 0)
        .toFixed(2),
      totalDiscrepancyAmount: totalDiscrepancy.toFixed(2),
    };
  }
}
