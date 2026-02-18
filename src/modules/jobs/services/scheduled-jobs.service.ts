import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { TransactionOrmEntity } from '@modules/transaction/infrastructure/orm-entities';
import { ScheduledJobEntity } from '@modules/admin/infrastructure/persistence/typeorm/entities/scheduled-job.entity';
import { AuditLogEntity } from '@modules/admin/infrastructure/persistence/typeorm/entities/audit-log.entity';
import { FcmTokenOrmEntity } from '@modules/notification/infrastructure/fcm';
import { NotificationOrmEntity } from '@modules/notification/infrastructure/orm-entities';
import { SessionService } from '@modules/session/application/services/session.service';
import { CronHubReporterService } from '@common/services/cronhub-reporter.service';

@Injectable()
export class ScheduledJobsService {
  private readonly logger = new Logger(ScheduledJobsService.name);

  constructor(
    @InjectRepository(TransactionOrmEntity)
    private readonly transactionRepository: Repository<TransactionOrmEntity>,
    @InjectRepository(ScheduledJobEntity)
    private readonly jobRepository: Repository<ScheduledJobEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
    @InjectRepository(FcmTokenOrmEntity)
    private readonly fcmTokenRepository: Repository<FcmTokenOrmEntity>,
    @InjectRepository(NotificationOrmEntity)
    private readonly notificationRepository: Repository<NotificationOrmEntity>,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly cronHub: CronHubReporterService,
  ) {}

  // ==========================================
  // Transaction Cleanup Jobs
  // ==========================================

  /**
   * Mark stale pending transactions as expired
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expireStaleTransactions(): Promise<void> {
    const jobName = 'expire_stale_transactions';
    await this.cronHub.pingStart(jobName);
    const job = await this.startJob(jobName);

    try {
      this.logger.log('Starting stale transaction expiration job');

      // Transactions pending for more than 24 hours
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 24);

      const staleTransactions = await this.transactionRepository.find({
        where: {
          status: 'pending',
          createdAt: LessThan(cutoffDate),
        },
      });

      let processed = 0;
      for (const tx of staleTransactions) {
        tx.status = 'cancelled';
        tx.failureReason =
          'Transaction expired - no action taken within 24 hours';
        tx.completedAt = new Date();
        await this.transactionRepository.save(tx);
        processed++;
      }

      await this.completeJob(job.id, processed);
      await this.cronHub.pingComplete(jobName);
      this.logger.log(`Expired ${processed} stale transactions`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.failJob(job.id, message);
      this.logger.error(`Stale transaction expiration failed: ${message}`);
    }
  }

  /**
   * Cleanup old completed/failed transactions metadata
   * Runs daily at 3 AM
   */
  @Cron('0 3 * * *')
  async cleanupTransactionMetadata(): Promise<void> {
    const jobName = 'cleanup_transaction_metadata';
    await this.cronHub.pingStart(jobName);
    const job = await this.startJob(jobName);

    try {
      this.logger.log('Starting transaction metadata cleanup job');

      // Remove sensitive metadata from transactions older than 90 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const result = await this.transactionRepository
        .createQueryBuilder()
        .update()
        .set({ metadata: null })
        .where('completedAt < :cutoffDate', { cutoffDate })
        .andWhere('metadata IS NOT NULL')
        .execute();

      await this.completeJob(job.id, result.affected || 0);
      await this.cronHub.pingComplete(jobName);
      this.logger.log(
        `Cleaned up metadata for ${result.affected} old transactions`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.failJob(job.id, message);
      this.logger.error(`Transaction metadata cleanup failed: ${message}`);
    }
  }

  // ==========================================
  // Audit Log Cleanup Jobs
  // ==========================================

  /**
   * Archive old audit logs
   * Runs weekly on Sunday at 2 AM
   */
  @Cron('0 2 * * 0')
  async cleanupAuditLogs(): Promise<void> {
    const jobName = 'cleanup_audit_logs';
    await this.cronHub.pingStart(jobName);
    const job = await this.startJob(jobName);

    try {
      this.logger.log('Starting audit log cleanup job');

      // Archive audit logs older than 7 years (BCEAO regulatory compliance)
      // Financial transaction audit logs must be retained for minimum 5-10 years
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 7);

      const result = await this.auditLogRepository.delete({
        createdAt: LessThan(cutoffDate),
      });

      await this.completeJob(job.id, result.affected || 0);
      await this.cronHub.pingComplete(jobName);
      this.logger.log(`Cleaned up ${result.affected} old audit logs`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.failJob(job.id, message);
      this.logger.error(`Audit log cleanup failed: ${message}`);
    }
  }

  // ==========================================
  // Reconciliation Jobs
  // ==========================================

  /**
   * Daily reconciliation check
   * Runs daily at 1 AM
   */
  @Cron('0 1 * * *')
  async dailyReconciliation(): Promise<void> {
    const jobName = 'daily_reconciliation';
    await this.cronHub.pingStart(jobName);
    const job = await this.startJob(jobName);

    try {
      this.logger.log('Starting daily reconciliation job');

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);

      // Get transaction summaries
      const completedTransactions = await this.transactionRepository.find({
        where: {
          status: 'completed',
          completedAt: LessThan(endOfYesterday),
        },
      });

      const deposits = completedTransactions.filter(
        (t) => t.type === 'deposit',
      );
      const withdrawals = completedTransactions.filter(
        (t) => t.type === 'withdrawal',
      );
      const __transfers = completedTransactions.filter(
        (t) => t.type === 'transfer_internal' || t.type === 'transfer_external',
      );

      const totalDeposits = deposits.reduce(
        (sum, t) => sum + Number(t.amount),
        0,
      );
      const totalWithdrawals = withdrawals.reduce(
        (sum, t) => sum + Number(t.amount),
        0,
      );
      const netFlow = totalDeposits - totalWithdrawals;

      this.logger.log(
        `Reconciliation: Deposits=${totalDeposits}, Withdrawals=${totalWithdrawals}, Net=${netFlow}`,
      );

      // Emit reconciliation summary for monitoring/alerting
      this.eventEmitter.emit('reconciliation.daily.completed', {
        totalDeposits,
        totalWithdrawals,
        netFlow,
        transactionCount: completedTransactions.length,
        date: new Date().toISOString().split('T')[0],
      });

      await this.completeJob(job.id, completedTransactions.length);
      await this.cronHub.pingComplete(jobName);
      this.logger.log('Daily reconciliation completed');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.failJob(job.id, message);
      this.logger.error(`Daily reconciliation failed: ${message}`);
    }
  }

  /**
   * Check for stuck transactions
   * Runs every 15 minutes
   */
  @Cron('*/15 * * * *')
  async checkStuckTransactions(): Promise<void> {
    const jobName = 'check_stuck_transactions';

    try {
      // Transactions in processing state for more than 30 minutes
      const cutoffDate = new Date();
      cutoffDate.setMinutes(cutoffDate.getMinutes() - 30);

      const stuckTransactions = await this.transactionRepository.find({
        where: {
          status: 'processing',
          createdAt: LessThan(cutoffDate),
        },
      });

      if (stuckTransactions.length > 0) {
        this.logger.warn(
          `Found ${stuckTransactions.length} stuck transactions in processing state`,
        );

        // Mark as failed after 30 min stuck — prevents infinite processing state
        for (const tx of stuckTransactions) {
          tx.status = 'failed';
          await this.transactionRepository.save(tx);
          this.logger.warn(`Marked stuck transaction ${tx.id} as failed (stuck >30min)`);
        }

        // Emit alert for monitoring
        this.eventEmitter.emit('alert.stuck_transactions', {
          count: stuckTransactions.length,
          transactionIds: stuckTransactions.map(tx => tx.id),
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Stuck transaction check failed: ${message}`);
    }
  }

  // ==========================================
  // Session Cleanup Jobs
  // ==========================================

  /**
   * Cleanup expired sessions
   * Runs every hour
   *
   * Marks expired sessions as inactive for security and housekeeping.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredSessions(): Promise<void> {
    const jobName = 'cleanup_expired_sessions';
    await this.cronHub.pingStart(jobName);
    const job = await this.startJob(jobName);

    try {
      this.logger.log('Starting expired session cleanup job');

      const count = await this.sessionService.cleanupExpiredSessions();

      await this.completeJob(job.id, count);
      await this.cronHub.pingComplete(jobName);
      if (count > 0) {
        this.logger.log(`Cleaned up ${count} expired sessions`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.failJob(job.id, message);
      this.logger.error(`Session cleanup failed: ${message}`);
    }
  }

  // ==========================================
  // Notification Cleanup Jobs
  // ==========================================

  /**
   * Cleanup inactive FCM tokens
   * Runs daily at 4 AM
   *
   * Removes FCM tokens that have been inactive for more than 30 days.
   * These are tokens that:
   * - Have been marked inactive
   * - Haven't been used in 30+ days
   */
  @Cron('0 4 * * *')
  async cleanupInactiveFcmTokens(): Promise<void> {
    const jobName = 'cleanup_fcm_tokens';
    await this.cronHub.pingStart(jobName);
    const job = await this.startJob(jobName);

    try {
      this.logger.log('Starting FCM token cleanup job');

      // Delete inactive tokens older than 30 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      const result = await this.fcmTokenRepository
        .createQueryBuilder()
        .delete()
        .where('is_active = :isActive', { isActive: false })
        .andWhere('updated_at < :cutoffDate', { cutoffDate })
        .execute();

      await this.completeJob(job.id, result.affected || 0);
      await this.cronHub.pingComplete(jobName);
      this.logger.log(`Cleaned up ${result.affected} inactive FCM tokens`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.failJob(job.id, message);
      this.logger.error(`FCM token cleanup failed: ${message}`);
    }
  }

  /**
   * Cleanup old notifications
   * Runs weekly on Saturday at 3 AM
   *
   * Removes read notifications older than 90 days.
   */
  @Cron('0 3 * * 6')
  async cleanupOldNotifications(): Promise<void> {
    const jobName = 'cleanup_notifications';
    await this.cronHub.pingStart(jobName);
    const job = await this.startJob(jobName);

    try {
      this.logger.log('Starting notification cleanup job');

      // Delete read notifications older than 90 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const result = await this.notificationRepository
        .createQueryBuilder()
        .delete()
        .where('read_at IS NOT NULL')
        .andWhere('created_at < :cutoffDate', { cutoffDate })
        .execute();

      await this.completeJob(job.id, result.affected || 0);
      await this.cronHub.pingComplete(jobName);
      this.logger.log(`Cleaned up ${result.affected} old notifications`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.failJob(job.id, message);
      this.logger.error(`Notification cleanup failed: ${message}`);
    }
  }

  // ==========================================
  // Health Check Jobs
  // ==========================================

  /**
   * Provider health check
   * Runs every 5 minutes
   */
  @Cron('*/5 * * * *')
  async providerHealthCheck(): Promise<void> {
    const checks: Record<string, 'ok' | 'down' | 'degraded'> = {};

    // Database check
    try {
      await this.jobRepository.query('SELECT 1');
      checks['database'] = 'ok';
    } catch {
      checks['database'] = 'down';
    }

    // Blnk API check
    try {
      const blnkUrl = this.configService.get<string>('BLNK_API_URL', 'http://localhost:5001');
      const response = await fetch(`${blnkUrl}/health`, { signal: AbortSignal.timeout(5000) });
      checks['blnk'] = response.ok ? 'ok' : 'degraded';
    } catch {
      checks['blnk'] = 'down';
    }

    const downServices = Object.entries(checks)
      .filter(([, status]) => status !== 'ok')
      .map(([name, status]) => `${name}=${status}`);

    if (downServices.length > 0) {
      this.logger.warn(`Provider health issues: ${downServices.join(', ')}`);
      this.eventEmitter.emit('health.degraded', { checks, downServices });
    } else {
      this.logger.debug('All providers healthy');
    }
  }

  // ==========================================
  // Payment Link Expiry Job
  // ==========================================

  /**
   * Expire payment links past their expiresAt date
   * Runs every 15 minutes
   */
  @Cron('*/15 * * * *')
  async expirePaymentLinks(): Promise<void> {
    const jobName = 'expire_payment_links';

    try {
      this.logger.log('Checking for expired payment links');
      this.eventEmitter.emit('payment-links.expire-check', {
        timestamp: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Payment link expiry check failed: ${message}`);
    }
  }

  // ==========================================
  // Recurring Transfer Execution Job
  // ==========================================

  /**
   * Execute recurring transfers that are due
   * Runs every 5 minutes
   */
  @Cron('*/5 * * * *')
  async executeRecurringTransfers(): Promise<void> {
    const jobName = 'execute_recurring_transfers';

    try {
      this.logger.debug('Checking for due recurring transfers');
      this.eventEmitter.emit('recurring-transfers.execute-due', {
        timestamp: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Recurring transfer execution failed: ${message}`);
    }
  }

  // ==========================================
  // Savings Pot Interest Accrual Job
  // ==========================================

  /**
   * Accrue interest on savings pots daily
   * Runs daily at 00:05 UTC
   */
  @Cron('5 0 * * *')
  async accrueSavingsInterest(): Promise<void> {
    const jobName = 'accrue_savings_interest';

    try {
      this.logger.log('Starting savings pot interest accrual');
      this.eventEmitter.emit('savings-pots.accrue-interest', {
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Savings interest accrual failed: ${message}`);
    }
  }

  // ==========================================
  // Blnk-Local Balance Reconciliation Job
  // ==========================================

  /**
   * Compare Blnk ledger balances with local DB balances
   * Runs daily at 2:30 AM
   */
  @Cron('30 2 * * *')
  async reconcileBlnkBalances(): Promise<void> {
    const jobName = 'reconcile_blnk_balances';
    await this.cronHub.pingStart(jobName);
    const job = await this.startJob(jobName);

    try {
      this.logger.log('Starting Blnk-local balance reconciliation');

      // Emit event for reconciliation module to handle
      this.eventEmitter.emit('reconciliation.blnk-local', {
        timestamp: new Date(),
      });

      await this.completeJob(job.id, 0);
      await this.cronHub.pingComplete(jobName);
      this.logger.log('Blnk-local balance reconciliation check initiated');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.failJob(job.id, message);
      this.logger.error(`Blnk-local balance reconciliation failed: ${message}`);
    }
  }

  // ==========================================
  // Job Management Helpers
  // ==========================================

  private async startJob(jobName: string): Promise<ScheduledJobEntity> {
    const job = this.jobRepository.create({
      jobName,
      status: 'running',
      startedAt: new Date(),
    });
    return this.jobRepository.save(job);
  }

  private async completeJob(
    jobId: string,
    recordsProcessed: number,
  ): Promise<void> {
    await this.jobRepository.update(jobId, {
      status: 'completed',
      completedAt: new Date(),
      recordsProcessed,
    });
  }

  private async failJob(jobId: string, errorMessage: string): Promise<void> {
    await this.jobRepository.update(jobId, {
      status: 'failed',
      completedAt: new Date(),
      errorMessage,
    });
  }

  /**
   * Get recent job history
   */
  async getJobHistory(
    jobName?: string,
    limit = 50,
  ): Promise<ScheduledJobEntity[]> {
    const query = this.jobRepository
      .createQueryBuilder('job')
      .orderBy('job.createdAt', 'DESC')
      .take(limit);

    if (jobName) {
      query.where('job.jobName = :jobName', { jobName });
    }

    return query.getMany();
  }

  /**
   * Manual job trigger (for admin use)
   */
  async triggerJob(
    jobName:
      | 'expire_stale_transactions'
      | 'cleanup_transaction_metadata'
      | 'cleanup_audit_logs'
      | 'cleanup_fcm_tokens'
      | 'cleanup_notifications'
      | 'cleanup_expired_sessions'
      | 'daily_reconciliation',
  ): Promise<{ message: string }> {
    switch (jobName) {
      case 'expire_stale_transactions':
        await this.expireStaleTransactions();
        break;
      case 'cleanup_transaction_metadata':
        await this.cleanupTransactionMetadata();
        break;
      case 'cleanup_audit_logs':
        await this.cleanupAuditLogs();
        break;
      case 'cleanup_fcm_tokens':
        await this.cleanupInactiveFcmTokens();
        break;
      case 'cleanup_notifications':
        await this.cleanupOldNotifications();
        break;
      case 'cleanup_expired_sessions':
        await this.cleanupExpiredSessions();
        break;
      case 'daily_reconciliation':
        await this.dailyReconciliation();
        break;
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }

    return { message: `Job ${jobName} triggered successfully` };
  }
}
