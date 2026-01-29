import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { TransactionOrmEntity } from '@modules/transaction/infrastructure/orm-entities';
import { ScheduledJobEntity } from '@modules/admin/infrastructure/persistence/typeorm/entities/scheduled-job.entity';
import { AuditLogEntity } from '@modules/admin/infrastructure/persistence/typeorm/entities/audit-log.entity';
import { FcmTokenOrmEntity } from '@modules/notification/infrastructure/fcm';
import { NotificationOrmEntity } from '@modules/notification/infrastructure/orm-entities';
import { SessionService } from '@modules/session/application/services/session.service';

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
    const _jobName = 'expire_stale_transactions';
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
    const _jobName = 'cleanup_transaction_metadata';
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
    const _jobName = 'cleanup_audit_logs';
    const job = await this.startJob(jobName);

    try {
      this.logger.log('Starting audit log cleanup job');

      // Delete audit logs older than 90 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const result = await this.auditLogRepository.delete({
        createdAt: LessThan(cutoffDate),
      });

      await this.completeJob(job.id, result.affected || 0);
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
    const _jobName = 'daily_reconciliation';
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
      const _transfers = completedTransactions.filter(
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

      // TODO: Compare with Blnk ledger balances for full reconciliation
      // TODO: Alert if discrepancies found

      await this.completeJob(job.id, completedTransactions.length);
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
    const _jobName = 'check_stuck_transactions';

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
        // TODO: Send alert notification
        // TODO: Attempt to retry or resolve stuck transactions
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
    const _jobName = 'cleanup_expired_sessions';
    const job = await this.startJob(jobName);

    try {
      this.logger.log('Starting expired session cleanup job');

      const count = await this.sessionService.cleanupExpiredSessions();

      await this.completeJob(job.id, count);
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
    const _jobName = 'cleanup_fcm_tokens';
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
    const _jobName = 'cleanup_notifications';
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
    // TODO: Implement health checks for:
    // - Circle API
    // - Yellow Card API
    // - Blnk API
    // - Database connectivity
    // This is a placeholder for actual health check implementation
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
