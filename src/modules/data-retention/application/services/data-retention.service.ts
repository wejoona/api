import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RetentionPolicyRepository } from '../../domain/repositories/retention-policy.repository';
import {
  DataRetentionLogOrmEntity,
  RetentionLogStatus,
} from '../../infrastructure/orm-entities/data-retention-log.orm-entity';
import {
  DataDeletionRequestOrmEntity,
  DeletionStatus,
  DeletionType,
} from '../../infrastructure/orm-entities/data-deletion-request.orm-entity';
import { SessionOrmEntity } from '@modules/session/infrastructure/orm-entities/session.orm-entity';
import { VerificationOrmEntity } from '@modules/verification/infrastructure/orm-entities/verification.orm-entity';
import { WebhookDeadletterOrmEntity } from '@modules/webhook/infrastructure/orm-entities/webhook-deadletter.orm-entity';
import { TransactionOrmEntity } from '@modules/transaction/infrastructure/orm-entities';
import { NotificationOrmEntity } from '@modules/notification/infrastructure/orm-entities';
import { FcmTokenOrmEntity } from '@modules/notification/infrastructure/fcm';
import { UserOrmEntity } from '@modules/user/infrastructure/orm-entities/user.orm-entity';

@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  constructor(
    private readonly policyRepository: RetentionPolicyRepository,
    @InjectRepository(DataRetentionLogOrmEntity)
    private readonly logRepository: Repository<DataRetentionLogOrmEntity>,
    @InjectRepository(DataDeletionRequestOrmEntity)
    private readonly deletionRequestRepository: Repository<DataDeletionRequestOrmEntity>,
    @InjectRepository(SessionOrmEntity)
    private readonly sessionRepository: Repository<SessionOrmEntity>,
    @InjectRepository(VerificationOrmEntity)
    private readonly verificationRepository: Repository<VerificationOrmEntity>,
    @InjectRepository(WebhookDeadletterOrmEntity)
    private readonly webhookRepository: Repository<WebhookDeadletterOrmEntity>,
    @InjectRepository(TransactionOrmEntity)
    private readonly transactionRepository: Repository<TransactionOrmEntity>,
    @InjectRepository(NotificationOrmEntity)
    private readonly notificationRepository: Repository<NotificationOrmEntity>,
    @InjectRepository(FcmTokenOrmEntity)
    private readonly fcmTokenRepository: Repository<FcmTokenOrmEntity>,
    @InjectRepository(UserOrmEntity)
    private readonly userRepository: Repository<UserOrmEntity>,
  ) {}

  // ==========================================
  // Daily Cleanup Job
  // ==========================================

  @Cron('0 2 * * *') // Daily at 2 AM
  async dailyRetentionCleanup(): Promise<void> {
    this.logger.log('Starting daily retention cleanup job');

    const policies = await this.policyRepository.findEnabled();

    for (const policy of policies) {
      try {
        await this.processRetentionPolicy(policy.dataType);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to process retention policy for ${policy.dataType}: ${message}`,
        );
      }
    }

    this.logger.log('Daily retention cleanup completed');
  }

  // ==========================================
  // Data-specific Retention Handlers
  // ==========================================

  async processRetentionPolicy(dataType: string): Promise<void> {
    const policy = await this.policyRepository.findByDataType(dataType);
    if (!policy || !policy.isEnabled) {
      this.logger.warn(`No enabled policy found for data type: ${dataType}`);
      return;
    }

    const log = await this.startLog(dataType, policy.action);

    try {
      let result: {
        deleted?: number;
        anonymized?: number;
        archived?: number;
      } = {};

      switch (dataType) {
        case 'sessions':
          result = await this.cleanupSessions(policy.getCutoffDate());
          break;
        case 'verification_codes':
          result = await this.cleanupVerificationCodes(policy.getCutoffDate());
          break;
        case 'webhook_logs':
          result = await this.cleanupWebhookLogs(
            policy.getCutoffDate(),
            policy.getGracePeriodCutoff(),
          );
          break;
        case 'notifications':
          result = await this.cleanupNotifications(policy.getCutoffDate());
          break;
        case 'fcm_tokens':
          result = await this.cleanupFcmTokens(policy.getCutoffDate());
          break;
        default:
          this.logger.warn(`No handler for data type: ${dataType}`);
      }

      await this.completeLog(log.id, result);
      this.logger.log(
        `Processed retention policy for ${dataType}: ${JSON.stringify(result)}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.failLog(log.id, message);
      throw error;
    }
  }

  private async cleanupSessions(
    cutoffDate: Date,
  ): Promise<{ deleted: number }> {
    // Soft delete expired sessions
    const result = await this.sessionRepository
      .createQueryBuilder()
      .update()
      .set({ deletedAt: () => 'NOW()' })
      .where('expires_at < :cutoffDate', { cutoffDate })
      .andWhere('deleted_at IS NULL')
      .execute();

    // Hard delete soft-deleted sessions after grace period (30 days)
    const graceCutoff = new Date();
    graceCutoff.setDate(graceCutoff.getDate() - 30);

    const hardDelete = await this.sessionRepository
      .createQueryBuilder()
      .delete()
      .where('deleted_at < :graceCutoff', { graceCutoff })
      .execute();

    return { deleted: (result.affected || 0) + (hardDelete.affected || 0) };
  }

  private async cleanupVerificationCodes(
    cutoffDate: Date,
  ): Promise<{ deleted: number }> {
    // Soft delete expired verification codes
    const result = await this.verificationRepository
      .createQueryBuilder()
      .update()
      .set({ deletedAt: () => 'NOW()' })
      .where('expires_at < :cutoffDate', { cutoffDate })
      .andWhere('deleted_at IS NULL')
      .execute();

    // Hard delete after 7 days
    const graceCutoff = new Date();
    graceCutoff.setDate(graceCutoff.getDate() - 7);

    const hardDelete = await this.verificationRepository
      .createQueryBuilder()
      .delete()
      .where('deleted_at < :graceCutoff', { graceCutoff })
      .execute();

    return { deleted: (result.affected || 0) + (hardDelete.affected || 0) };
  }

  private async cleanupWebhookLogs(
    softDeleteCutoff: Date,
    hardDeleteCutoff: Date,
  ): Promise<{ deleted: number; archived: number }> {
    // Soft delete resolved webhook logs older than retention period
    const softDelete = await this.webhookRepository
      .createQueryBuilder()
      .update()
      .set({ deletedAt: () => 'NOW()' })
      .where('created_at < :cutoffDate', { cutoffDate: softDeleteCutoff })
      .andWhere('status = :status', { status: 'resolved' })
      .andWhere('deleted_at IS NULL')
      .execute();

    // Hard delete after grace period
    const hardDelete = await this.webhookRepository
      .createQueryBuilder()
      .delete()
      .where('deleted_at < :graceCutoff', { graceCutoff: hardDeleteCutoff })
      .execute();

    // Archive count (for now, archiving is just the soft delete)
    return {
      deleted: hardDelete.affected || 0,
      archived: softDelete.affected || 0,
    };
  }

  private async cleanupNotifications(
    cutoffDate: Date,
  ): Promise<{ deleted: number }> {
    // Delete read notifications older than retention period
    const result = await this.notificationRepository
      .createQueryBuilder()
      .delete()
      .where('created_at < :cutoffDate', { cutoffDate })
      .andWhere('read_at IS NOT NULL')
      .execute();

    return { deleted: result.affected || 0 };
  }

  private async cleanupFcmTokens(
    cutoffDate: Date,
  ): Promise<{ deleted: number }> {
    // Delete inactive FCM tokens
    const result = await this.fcmTokenRepository
      .createQueryBuilder()
      .delete()
      .where('is_active = :isActive', { isActive: false })
      .andWhere('updated_at < :cutoffDate', { cutoffDate })
      .execute();

    return { deleted: result.affected || 0 };
  }

  // ==========================================
  // GDPR Data Deletion (Right to Erasure)
  // ==========================================

  @Cron(CronExpression.EVERY_HOUR)
  async processPendingDeletionRequests(): Promise<void> {
    const now = new Date();
    const pendingRequests = await this.deletionRequestRepository.find({
      where: {
        status: DeletionStatus.PENDING,
        scheduledFor: LessThan(now),
      },
      relations: ['user'],
    });

    for (const request of pendingRequests) {
      try {
        await this.processUserDeletion(request);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to process deletion request ${request.id}: ${message}`,
        );

        await this.deletionRequestRepository.update(request.id, {
          status: DeletionStatus.FAILED,
          failedAt: new Date(),
          errorMessage: message,
        });
      }
    }
  }

  async createDeletionRequest(
    userId: string,
    requestedByUserId: string | null,
    deletionType: DeletionType,
    reason?: string,
    daysDelay = 0,
  ): Promise<DataDeletionRequestOrmEntity> {
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + daysDelay);

    const request = this.deletionRequestRepository.create({
      userId,
      requestedByUserId,
      deletionType,
      reason: reason ?? null,
      scheduledFor,
      status: DeletionStatus.PENDING,
      auditTrail: [
        {
          action: 'created',
          timestamp: new Date(),
          details: { deletionType, reason },
        },
      ],
    });

    const savedRequest = await this.deletionRequestRepository.save(request);
    return savedRequest;
  }

  private async processUserDeletion(
    request: DataDeletionRequestOrmEntity,
  ): Promise<void> {
    this.logger.log(
      `Processing deletion request ${request.id} for user ${request.userId}`,
    );

    // Update status to processing
    await this.deletionRequestRepository.update(request.id, {
      status: DeletionStatus.PROCESSING,
      startedAt: new Date(),
    });

    const auditTrail = [...request.auditTrail];

    try {
      // 1. Anonymize user data
      await this.anonymizeUserData(request.userId);
      auditTrail.push({
        action: 'anonymized_user_data',
        timestamp: new Date(),
        details: {},
      });

      // 2. Delete sessions
      await this.sessionRepository.delete({ userId: request.userId });
      auditTrail.push({
        action: 'deleted_sessions',
        timestamp: new Date(),
        details: {},
      });

      // 3. Delete verification codes
      await this.verificationRepository.delete({ userId: request.userId });
      auditTrail.push({
        action: 'deleted_verifications',
        timestamp: new Date(),
        details: {},
      });

      // 4. Delete FCM tokens
      await this.fcmTokenRepository.delete({ userId: request.userId });
      auditTrail.push({
        action: 'deleted_fcm_tokens',
        timestamp: new Date(),
        details: {},
      });

      // 5. Anonymize transactions (preserve for compliance but remove PII)
      await this.anonymizeUserTransactions(request.userId);
      auditTrail.push({
        action: 'anonymized_transactions',
        timestamp: new Date(),
        details: {},
      });

      // 6. Mark user account as deleted
      await this.userRepository.update(request.userId, {
        status: 'deleted',
        firstName: null,
        lastName: null,
        email: null,
        phone: `DELETED_${request.userId.slice(0, 8)}`,
        username: null,
      });
      auditTrail.push({
        action: 'marked_user_deleted',
        timestamp: new Date(),
        details: {},
      });

      // Update request status
      await this.deletionRequestRepository.update(request.id, {
        status: DeletionStatus.COMPLETED,
        completedAt: new Date(),
        auditTrail,
      });

      this.logger.log(`Completed deletion request ${request.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      auditTrail.push({
        action: 'failed',
        timestamp: new Date(),
        details: { error: message },
      });

      await this.deletionRequestRepository.update(request.id, {
        status: DeletionStatus.FAILED,
        failedAt: new Date(),
        errorMessage: message,
        auditTrail,
      });

      throw error;
    }
  }

  private async anonymizeUserData(userId: string): Promise<void> {
    // User data is anonymized by the deletion process above
    // This is a placeholder for any additional anonymization
    this.logger.log(`Anonymizing user data for ${userId}`);
  }

  private async anonymizeUserTransactions(userId: string): Promise<void> {
    // Preserve transaction data for compliance (7 years) but remove PII
    await this.transactionRepository
      .createQueryBuilder()
      .update()
      .set({
        metadata: null, // Remove sensitive metadata
      })
      .where('user_id = :userId', { userId })
      .execute();

    this.logger.log(`Anonymized transactions for user ${userId}`);
  }

  // ==========================================
  // Logging Helpers
  // ==========================================

  private async startLog(
    dataType: string,
    action: string,
  ): Promise<DataRetentionLogOrmEntity> {
    const log = this.logRepository.create({
      jobName: 'data_retention_cleanup',
      dataType,
      action,
      status: RetentionLogStatus.RUNNING,
      startedAt: new Date(),
    });
    return this.logRepository.save(log);
  }

  private async completeLog(
    logId: string,
    result: { deleted?: number; anonymized?: number; archived?: number },
  ): Promise<void> {
    await this.logRepository.update(logId, {
      status: RetentionLogStatus.COMPLETED,
      completedAt: new Date(),
      recordsDeleted: result.deleted || 0,
      recordsAnonymized: result.anonymized || 0,
      recordsArchived: result.archived || 0,
      recordsProcessed:
        (result.deleted || 0) +
        (result.anonymized || 0) +
        (result.archived || 0),
    });
  }

  private async failLog(logId: string, errorMessage: string): Promise<void> {
    await this.logRepository.update(logId, {
      status: RetentionLogStatus.FAILED,
      completedAt: new Date(),
      errorMessage,
    });
  }

  // ==========================================
  // Manual Triggers (for admin/testing)
  // ==========================================

  async triggerRetentionCleanup(
    dataType: string,
  ): Promise<{ message: string }> {
    await this.processRetentionPolicy(dataType);
    return { message: `Retention cleanup for ${dataType} completed` };
  }

  async getRetentionLogs(
    dataType?: string,
    limit = 50,
  ): Promise<DataRetentionLogOrmEntity[]> {
    const query = this.logRepository
      .createQueryBuilder('log')
      .orderBy('log.created_at', 'DESC')
      .take(limit);

    if (dataType) {
      query.where('log.data_type = :dataType', { dataType });
    }

    return query.getMany();
  }

  async getDeletionRequests(
    status?: DeletionStatus,
    limit = 50,
  ): Promise<DataDeletionRequestOrmEntity[]> {
    const query = this.deletionRequestRepository
      .createQueryBuilder('req')
      .leftJoinAndSelect('req.user', 'user')
      .orderBy('req.created_at', 'DESC')
      .take(limit);

    if (status) {
      query.where('req.status = :status', { status });
    }

    return query.getMany();
  }
}
