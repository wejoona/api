import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  RECONCILIATION_PROVIDER,
  IReconciliationProvider,
} from '@modules/providers/interfaces';

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
 * Handles reconciliation of JoonaPay's ledger with external providers:
 * - Yellow Card: XOF on-ramp/off-ramp transactions
 * - Circle: USDC transfers and deposits
 *
 * Features:
 * - Batch reconciliation (daily/weekly)
 * - Instant reconciliation for real-time verification
 * - Matching rules for amount, reference, date
 * - Discrepancy alerts
 */
@Injectable()
export class ReconciliationService implements OnModuleInit {
  private readonly logger = new Logger(ReconciliationService.name);

  // Matching rule IDs (created during initialization)
  private yellowCardRuleId?: string;
  private circleRuleId?: string;

  constructor(
    @Inject(RECONCILIATION_PROVIDER)
    private readonly reconciliationProvider: IReconciliationProvider,
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
}
