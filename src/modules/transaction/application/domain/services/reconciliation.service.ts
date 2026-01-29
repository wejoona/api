import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  RECONCILIATION_PROVIDER,
  IReconciliationProvider,
  LEDGER_PROVIDER,
  ILedgerProvider,
  WALLET_PROVIDER,
  IWalletProvider,
} from '@modules/providers/interfaces';
import { IWalletRepository } from '@modules/wallet/domain/repositories/wallet.repository';

/**
 * Balance discrepancy between different systems
 */
export interface BalanceDiscrepancy {
  userId: string;
  walletId: string;
  currency: string;
  blnkBalance: string;
  databaseBalance: string;
  circleBalance: string;
  blnkDiff: string; // Difference between Blnk and Database
  circleDiff: string; // Difference between Circle and Database
  totalDiff: string; // Max difference across all systems
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Reconciliation report for a single user
 */
export interface UserReconciliationReport {
  userId: string;
  walletId: string;
  currency: string;
  blnkBalance: string;
  databaseBalance: string;
  circleBalance: string;
  isReconciled: boolean;
  discrepancy?: BalanceDiscrepancy;
  timestamp: Date;
  error?: string;
}

/**
 * Reconciliation report for all users
 */
export interface FullReconciliationReport {
  totalWallets: number;
  reconciledWallets: number;
  discrepancies: BalanceDiscrepancy[];
  errors: Array<{ userId: string; walletId: string; error: string }>;
  timestamp: Date;
  duration: number; // milliseconds
}

/**
 * Legacy reconciliation report (for external provider reconciliation)
 */
export interface ReconciliationReport {
  source: 'yellowcard' | 'circle';
  reconciliationId: string;
  status: string;
  matchedCount: number;
  unmatchedCount: number;
  timestamp: Date;
}

/**
 * Reconciliation Service
 *
 * Handles two types of reconciliation:
 * 1. Balance Reconciliation: Ensures Blnk ledger, database, and Circle balances match
 * 2. Transaction Reconciliation: Matches JoonaPay ledger with external providers (Yellow Card, Circle)
 *
 * Features:
 * - Real-time balance comparison across three systems
 * - Automated daily reconciliation
 * - Discrepancy alerts for balances > $1
 * - Batch reconciliation with external providers
 * - Instant reconciliation for real-time verification
 */
@Injectable()
export class ReconciliationService implements OnModuleInit {
  private readonly logger = new Logger(ReconciliationService.name);

  // Matching rule IDs (created during initialization)
  private yellowCardRuleId?: string;
  private circleRuleId?: string;

  // Discrepancy threshold in USDC (micro-units: 1 USDC = 1,000,000)
  private readonly CRITICAL_THRESHOLD = 1_000_000n; // $1.00
  private readonly HIGH_THRESHOLD = 100_000n; // $0.10
  private readonly MEDIUM_THRESHOLD = 10_000n; // $0.01
  private readonly USDC_PRECISION = 1_000_000;

  constructor(
    @Inject(RECONCILIATION_PROVIDER)
    private readonly reconciliationProvider: IReconciliationProvider,
    @Inject(LEDGER_PROVIDER)
    private readonly ledgerProvider: ILedgerProvider,
    @Inject(WALLET_PROVIDER)
    private readonly walletProvider: IWalletProvider,
    @Inject('WALLET_REPOSITORY')
    private readonly walletRepository: IWalletRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Initialize matching rules on startup
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.setupMatchingRules();
    } catch (error) {
      this.logger.error(`Failed to setup matching rules: ${error}`);
    }
  }

  // ==========================================
  // Balance Reconciliation
  // ==========================================

  /**
   * Reconcile balance for a single user
   * Compares Blnk ledger, database, and Circle balances
   */
  async reconcileUserBalance(
    userId: string,
  ): Promise<UserReconciliationReport> {
    this.logger.log(`Reconciling balance for user ${userId}`);

    const startTime = Date.now();
    const timestamp = new Date();

    try {
      // 1. Get wallet from database
      const wallet = await this.walletRepository.findByUserId(userId);
      if (!wallet) {
        throw new Error(`Wallet not found for user ${userId}`);
      }

      const walletId = wallet.id;
      const currency = wallet.currency;
      const circleWalletId = wallet.circleWalletId;

      // 2. Get balance from Blnk ledger
      let blnkBalance = 0n;
      try {
        const blnkBalanceInfo = await this.ledgerProvider.getUserBalance(
          userId,
          currency,
        );
        blnkBalance = blnkBalanceInfo?.balance ?? 0n;
      } catch (error) {
        this.logger.error(
          `Failed to get Blnk balance for user ${userId}: ${error}`,
        );
      }

      // 3. Get balance from database (stored in cents/micro-units)
      const databaseBalance = BigInt(
        Math.round(wallet.balance * this.USDC_PRECISION),
      );

      // 4. Get balance from Circle (if wallet is linked)
      let circleBalance = 0n;
      if (circleWalletId) {
        try {
          const circleBalances =
            await this.walletProvider.getBalance(circleWalletId);
          const usdcBalance = circleBalances.find((b) => b.currency === 'USDC');
          if (usdcBalance) {
            // Circle returns balance as string, convert to micro-units
            circleBalance = BigInt(
              Math.round(
                parseFloat(usdcBalance.available) * this.USDC_PRECISION,
              ),
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to get Circle balance for user ${userId}: ${error}`,
          );
        }
      }

      // 5. Compare balances
      const blnkDiff = blnkBalance - databaseBalance;
      const circleDiff = circleBalance - databaseBalance;
      const totalDiff = this.calculateMaxDifference(
        blnkBalance,
        databaseBalance,
        circleBalance,
      );

      const isReconciled = totalDiff === 0n;

      // 6. Build report
      const report: UserReconciliationReport = {
        userId,
        walletId,
        currency,
        blnkBalance: this.formatBalance(blnkBalance),
        databaseBalance: this.formatBalance(databaseBalance),
        circleBalance: this.formatBalance(circleBalance),
        isReconciled,
        timestamp,
      };

      // 7. Create discrepancy if balances don't match
      if (!isReconciled) {
        const severity = this.calculateSeverity(totalDiff);
        const discrepancy: BalanceDiscrepancy = {
          userId,
          walletId,
          currency,
          blnkBalance: this.formatBalance(blnkBalance),
          databaseBalance: this.formatBalance(databaseBalance),
          circleBalance: this.formatBalance(circleBalance),
          blnkDiff: this.formatBalance(blnkDiff),
          circleDiff: this.formatBalance(circleDiff),
          totalDiff: this.formatBalance(totalDiff),
          timestamp,
          severity,
        };

        report.discrepancy = discrepancy;

        // 8. Emit event for discrepancy
        this.eventEmitter.emit('reconciliation.balance.discrepancy', {
          discrepancy,
          userId,
          walletId,
        });

        // 9. Emit critical alert if difference is >= $1
        if (severity === 'critical' || severity === 'high') {
          this.eventEmitter.emit('reconciliation.balance.critical', {
            discrepancy,
            userId,
            walletId,
          });
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Reconciliation for user ${userId} completed in ${duration}ms - ${isReconciled ? 'RECONCILED' : 'DISCREPANCY FOUND'}`,
      );

      return report;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to reconcile user ${userId}: ${errorMessage}`);

      return {
        userId,
        walletId: 'unknown',
        currency: 'USDC',
        blnkBalance: '0.00',
        databaseBalance: '0.00',
        circleBalance: '0.00',
        isReconciled: false,
        timestamp,
        error: errorMessage,
      };
    }
  }

  /**
   * Reconcile all active wallets
   * Runs daily at 1 AM or on-demand
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async reconcileAllBalances(): Promise<FullReconciliationReport> {
    this.logger.log('Starting full balance reconciliation...');

    const startTime = Date.now();
    const timestamp = new Date();

    try {
      // Get all active wallets
      const wallets = await this.walletRepository.findAll();
      const activeWallets = wallets.filter((w) => w.status === 'active');

      this.logger.log(`Reconciling ${activeWallets.length} active wallets...`);

      const discrepancies: BalanceDiscrepancy[] = [];
      const errors: Array<{ userId: string; walletId: string; error: string }> =
        [];
      let reconciledCount = 0;

      // Process each wallet
      for (const wallet of activeWallets) {
        try {
          const report = await this.reconcileUserBalance(wallet.userId);

          if (report.isReconciled) {
            reconciledCount++;
          } else if (report.discrepancy) {
            discrepancies.push(report.discrepancy);
          }

          if (report.error) {
            errors.push({
              userId: wallet.userId,
              walletId: wallet.id,
              error: report.error,
            });
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Failed to reconcile wallet ${wallet.id}: ${errorMessage}`,
          );
          errors.push({
            userId: wallet.userId,
            walletId: wallet.id,
            error: errorMessage,
          });
        }
      }

      const duration = Date.now() - startTime;

      const report: FullReconciliationReport = {
        totalWallets: activeWallets.length,
        reconciledWallets: reconciledCount,
        discrepancies,
        errors,
        timestamp,
        duration,
      };

      // Emit event with full report
      this.eventEmitter.emit('reconciliation.balance.completed', report);

      // Log summary
      this.logger.log(
        `Balance reconciliation completed in ${duration}ms: ${reconciledCount}/${activeWallets.length} reconciled, ${discrepancies.length} discrepancies, ${errors.length} errors`,
      );

      // Alert if there are critical discrepancies
      const criticalDiscrepancies = discrepancies.filter(
        (d) => d.severity === 'critical',
      );
      if (criticalDiscrepancies.length > 0) {
        this.logger.warn(
          `CRITICAL: ${criticalDiscrepancies.length} wallets have discrepancies >= $1`,
        );
        this.eventEmitter.emit('reconciliation.balance.critical.summary', {
          count: criticalDiscrepancies.length,
          discrepancies: criticalDiscrepancies,
          timestamp,
        });
      }

      return report;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Full balance reconciliation failed: ${errorMessage}`);

      const duration = Date.now() - startTime;
      return {
        totalWallets: 0,
        reconciledWallets: 0,
        discrepancies: [],
        errors: [{ userId: 'system', walletId: 'system', error: errorMessage }],
        timestamp,
        duration,
      };
    }
  }

  // ==========================================
  // Transaction Reconciliation (Legacy)
  // ==========================================

  /**
   * Setup matching rules for Yellow Card and Circle
   */
  private async setupMatchingRules(): Promise<void> {
    // Yellow Card matching rule
    try {
      this.yellowCardRuleId =
        await this.reconciliationProvider.createMatchingRule({
          name: 'YellowCard Transaction Match',
          description: 'Match Yellow Card transactions by reference and amount',
          criteria: [
            { field: 'reference', operator: 'equals' },
            { field: 'amount', operator: 'equals', allowableDrift: 0.01 }, // 1% drift allowed for FX
            { field: 'currency', operator: 'equals' },
          ],
        });
      this.logger.log(
        `Created Yellow Card matching rule: ${this.yellowCardRuleId}`,
      );
    } catch (error) {
      this.logger.warn(`Yellow Card matching rule may already exist: ${error}`);
    }

    // Circle matching rule
    try {
      this.circleRuleId = await this.reconciliationProvider.createMatchingRule({
        name: 'Circle Transaction Match',
        description:
          'Match Circle USDC transactions by reference and exact amount',
        criteria: [
          { field: 'reference', operator: 'equals' },
          { field: 'amount', operator: 'equals', allowableDrift: 0 }, // Exact match for USDC
          { field: 'currency', operator: 'equals' },
        ],
      });
      this.logger.log(`Created Circle matching rule: ${this.circleRuleId}`);
    } catch (error) {
      this.logger.warn(`Circle matching rule may already exist: ${error}`);
    }
  }

  /**
   * Reconcile Yellow Card transactions
   * Runs daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  reconcileYellowCard(): Promise<ReconciliationReport | null> {
    this.logger.log('Starting Yellow Card reconciliation...');

    if (!this.yellowCardRuleId) {
      this.logger.error('Yellow Card matching rule not initialized');
      return Promise.resolve(null);
    }

    try {
      // In production, this would:
      // 1. Download Yellow Card settlement report via API
      // 2. Convert to required format
      // 3. Save to temp file
      // 4. Upload for reconciliation

      // For now, emit event for manual upload
      this.eventEmitter.emit('reconciliation.yellowcard.pending', {
        source: 'yellowcard',
        timestamp: new Date().toISOString(),
        message:
          'Yellow Card reconciliation pending - upload settlement report',
      });

      return Promise.resolve(null);
    } catch (error) {
      this.logger.error(`Yellow Card reconciliation failed: ${error}`);
      this.eventEmitter.emit('reconciliation.failed', {
        source: 'yellowcard',
        error: String(error),
        timestamp: new Date().toISOString(),
      });
      return Promise.resolve(null);
    }
  }

  /**
   * Reconcile Circle transactions
   * Runs daily at 3 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  reconcileCircle(): Promise<ReconciliationReport | null> {
    this.logger.log('Starting Circle reconciliation...');

    if (!this.circleRuleId) {
      this.logger.error('Circle matching rule not initialized');
      return Promise.resolve(null);
    }

    try {
      // In production, this would:
      // 1. Fetch Circle transaction history via API
      // 2. Convert to required format
      // 3. Save to temp file
      // 4. Upload for reconciliation

      this.eventEmitter.emit('reconciliation.circle.pending', {
        source: 'circle',
        timestamp: new Date().toISOString(),
        message: 'Circle reconciliation pending - fetch transaction history',
      });

      return Promise.resolve(null);
    } catch (error) {
      this.logger.error(`Circle reconciliation failed: ${error}`);
      this.eventEmitter.emit('reconciliation.failed', {
        source: 'circle',
        error: String(error),
        timestamp: new Date().toISOString(),
      });
      return Promise.resolve(null);
    }
  }

  /**
   * Run reconciliation with uploaded file
   */
  async runReconciliation(
    source: 'yellowcard' | 'circle',
    filePath: string,
  ): Promise<ReconciliationReport> {
    this.logger.log(`Running ${source} reconciliation with file: ${filePath}`);

    const ruleId =
      source === 'yellowcard' ? this.yellowCardRuleId : this.circleRuleId;

    if (!ruleId) {
      throw new Error(`Matching rule not initialized for ${source}`);
    }

    // 1. Upload the external data
    const uploadId = await this.reconciliationProvider.uploadExternalData(
      filePath,
      source,
    );

    this.logger.log(`Uploaded reconciliation data: ${uploadId}`);

    // 2. Run reconciliation
    const result = await this.reconciliationProvider.runReconciliation({
      uploadId,
      strategy: 'one_to_one',
      dryRun: false,
      matchingRuleIds: [ruleId],
    });

    const report: ReconciliationReport = {
      source,
      reconciliationId: result.reconciliationId,
      status: result.status,
      matchedCount: result.matchedCount,
      unmatchedCount: result.unmatchedCount,
      timestamp: result.createdAt,
    };

    // 3. Emit events based on results
    if (result.unmatchedCount > 0) {
      this.eventEmitter.emit('reconciliation.discrepancy', {
        ...report,
        message: `${result.unmatchedCount} unmatched transactions found`,
      });
    }

    this.eventEmitter.emit('reconciliation.completed', report);

    this.logger.log(
      `Reconciliation completed: ${result.matchedCount} matched, ${result.unmatchedCount} unmatched`,
    );

    return report;
  }

  /**
   * Get reconciliation status
   */
  getStatus(): {
    yellowCardRuleId?: string;
    circleRuleId?: string;
    initialized: boolean;
  } {
    return {
      yellowCardRuleId: this.yellowCardRuleId,
      circleRuleId: this.circleRuleId,
      initialized: !!(this.yellowCardRuleId && this.circleRuleId),
    };
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  /**
   * Calculate the maximum absolute difference across all balances
   */
  private calculateMaxDifference(
    blnk: bigint,
    db: bigint,
    circle: bigint,
  ): bigint {
    const blnkDiff = blnk > db ? blnk - db : db - blnk;
    const circleDiff = circle > db ? circle - db : db - circle;
    const blnkCircleDiff = blnk > circle ? blnk - circle : circle - blnk;

    return blnkDiff > circleDiff
      ? blnkDiff > blnkCircleDiff
        ? blnkDiff
        : blnkCircleDiff
      : circleDiff > blnkCircleDiff
        ? circleDiff
        : blnkCircleDiff;
  }

  /**
   * Calculate severity based on discrepancy amount
   */
  private calculateSeverity(
    difference: bigint,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const absDiff = difference < 0n ? -difference : difference;

    if (absDiff >= this.CRITICAL_THRESHOLD) {
      return 'critical'; // >= $1.00
    } else if (absDiff >= this.HIGH_THRESHOLD) {
      return 'high'; // >= $0.10
    } else if (absDiff >= this.MEDIUM_THRESHOLD) {
      return 'medium'; // >= $0.01
    }
    return 'low'; // < $0.01
  }

  /**
   * Format balance from micro-units to human-readable string
   */
  private formatBalance(balance: bigint): string {
    const value = Number(balance) / this.USDC_PRECISION;
    return value.toFixed(6);
  }
}
