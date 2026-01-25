import { Repository } from 'typeorm';
import { TransactionOrmEntity } from '@modules/transaction/infrastructure/orm-entities';
import { ScheduledJobEntity } from '@modules/admin/infrastructure/persistence/typeorm/entities/scheduled-job.entity';
import { AuditLogEntity } from '@modules/admin/infrastructure/persistence/typeorm/entities/audit-log.entity';
import { FcmTokenOrmEntity } from '@modules/notification/infrastructure/fcm';
import { NotificationOrmEntity } from '@modules/notification/infrastructure/orm-entities';
export declare class ScheduledJobsService {
    private readonly transactionRepository;
    private readonly jobRepository;
    private readonly auditLogRepository;
    private readonly fcmTokenRepository;
    private readonly notificationRepository;
    private readonly logger;
    constructor(transactionRepository: Repository<TransactionOrmEntity>, jobRepository: Repository<ScheduledJobEntity>, auditLogRepository: Repository<AuditLogEntity>, fcmTokenRepository: Repository<FcmTokenOrmEntity>, notificationRepository: Repository<NotificationOrmEntity>);
    expireStaleTransactions(): Promise<void>;
    cleanupTransactionMetadata(): Promise<void>;
    cleanupAuditLogs(): Promise<void>;
    dailyReconciliation(): Promise<void>;
    checkStuckTransactions(): Promise<void>;
    cleanupInactiveFcmTokens(): Promise<void>;
    cleanupOldNotifications(): Promise<void>;
    providerHealthCheck(): Promise<void>;
    private startJob;
    private completeJob;
    private failJob;
    getJobHistory(jobName?: string, limit?: number): Promise<ScheduledJobEntity[]>;
    triggerJob(jobName: 'expire_stale_transactions' | 'cleanup_transaction_metadata' | 'cleanup_audit_logs' | 'cleanup_fcm_tokens' | 'cleanup_notifications' | 'daily_reconciliation'): Promise<{
        message: string;
    }>;
}
