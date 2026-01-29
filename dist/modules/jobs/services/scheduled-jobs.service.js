"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ScheduledJobsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduledJobsService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const orm_entities_1 = require("../../transaction/infrastructure/orm-entities");
const scheduled_job_entity_1 = require("../../admin/infrastructure/persistence/typeorm/entities/scheduled-job.entity");
const audit_log_entity_1 = require("../../admin/infrastructure/persistence/typeorm/entities/audit-log.entity");
const fcm_1 = require("../../notification/infrastructure/fcm");
const orm_entities_2 = require("../../notification/infrastructure/orm-entities");
const session_service_1 = require("../../session/application/services/session.service");
let ScheduledJobsService = ScheduledJobsService_1 = class ScheduledJobsService {
    constructor(transactionRepository, jobRepository, auditLogRepository, fcmTokenRepository, notificationRepository, sessionService) {
        this.transactionRepository = transactionRepository;
        this.jobRepository = jobRepository;
        this.auditLogRepository = auditLogRepository;
        this.fcmTokenRepository = fcmTokenRepository;
        this.notificationRepository = notificationRepository;
        this.sessionService = sessionService;
        this.logger = new common_1.Logger(ScheduledJobsService_1.name);
    }
    async expireStaleTransactions() {
        const jobName = 'expire_stale_transactions';
        const job = await this.startJob(jobName);
        try {
            this.logger.log('Starting stale transaction expiration job');
            const cutoffDate = new Date();
            cutoffDate.setHours(cutoffDate.getHours() - 24);
            const staleTransactions = await this.transactionRepository.find({
                where: {
                    status: 'pending',
                    createdAt: (0, typeorm_2.LessThan)(cutoffDate),
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            await this.failJob(job.id, message);
            this.logger.error(`Stale transaction expiration failed: ${message}`);
        }
    }
    async cleanupTransactionMetadata() {
        const jobName = 'cleanup_transaction_metadata';
        const job = await this.startJob(jobName);
        try {
            this.logger.log('Starting transaction metadata cleanup job');
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
            this.logger.log(`Cleaned up metadata for ${result.affected} old transactions`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            await this.failJob(job.id, message);
            this.logger.error(`Transaction metadata cleanup failed: ${message}`);
        }
    }
    async cleanupAuditLogs() {
        const jobName = 'cleanup_audit_logs';
        const job = await this.startJob(jobName);
        try {
            this.logger.log('Starting audit log cleanup job');
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 90);
            const result = await this.auditLogRepository.delete({
                createdAt: (0, typeorm_2.LessThan)(cutoffDate),
            });
            await this.completeJob(job.id, result.affected || 0);
            this.logger.log(`Cleaned up ${result.affected} old audit logs`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            await this.failJob(job.id, message);
            this.logger.error(`Audit log cleanup failed: ${message}`);
        }
    }
    async dailyReconciliation() {
        const jobName = 'daily_reconciliation';
        const job = await this.startJob(jobName);
        try {
            this.logger.log('Starting daily reconciliation job');
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            const endOfYesterday = new Date(yesterday);
            endOfYesterday.setHours(23, 59, 59, 999);
            const completedTransactions = await this.transactionRepository.find({
                where: {
                    status: 'completed',
                    completedAt: (0, typeorm_2.LessThan)(endOfYesterday),
                },
            });
            const deposits = completedTransactions.filter((t) => t.type === 'deposit');
            const withdrawals = completedTransactions.filter((t) => t.type === 'withdrawal');
            const transfers = completedTransactions.filter((t) => t.type === 'transfer_internal' || t.type === 'transfer_external');
            const totalDeposits = deposits.reduce((sum, t) => sum + Number(t.amount), 0);
            const totalWithdrawals = withdrawals.reduce((sum, t) => sum + Number(t.amount), 0);
            const netFlow = totalDeposits - totalWithdrawals;
            this.logger.log(`Reconciliation: Deposits=${totalDeposits}, Withdrawals=${totalWithdrawals}, Net=${netFlow}`);
            await this.completeJob(job.id, completedTransactions.length);
            this.logger.log('Daily reconciliation completed');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            await this.failJob(job.id, message);
            this.logger.error(`Daily reconciliation failed: ${message}`);
        }
    }
    async checkStuckTransactions() {
        const jobName = 'check_stuck_transactions';
        try {
            const cutoffDate = new Date();
            cutoffDate.setMinutes(cutoffDate.getMinutes() - 30);
            const stuckTransactions = await this.transactionRepository.find({
                where: {
                    status: 'processing',
                    createdAt: (0, typeorm_2.LessThan)(cutoffDate),
                },
            });
            if (stuckTransactions.length > 0) {
                this.logger.warn(`Found ${stuckTransactions.length} stuck transactions in processing state`);
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Stuck transaction check failed: ${message}`);
        }
    }
    async cleanupExpiredSessions() {
        const jobName = 'cleanup_expired_sessions';
        const job = await this.startJob(jobName);
        try {
            this.logger.log('Starting expired session cleanup job');
            const count = await this.sessionService.cleanupExpiredSessions();
            await this.completeJob(job.id, count);
            if (count > 0) {
                this.logger.log(`Cleaned up ${count} expired sessions`);
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            await this.failJob(job.id, message);
            this.logger.error(`Session cleanup failed: ${message}`);
        }
    }
    async cleanupInactiveFcmTokens() {
        const jobName = 'cleanup_fcm_tokens';
        const job = await this.startJob(jobName);
        try {
            this.logger.log('Starting FCM token cleanup job');
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            await this.failJob(job.id, message);
            this.logger.error(`FCM token cleanup failed: ${message}`);
        }
    }
    async cleanupOldNotifications() {
        const jobName = 'cleanup_notifications';
        const job = await this.startJob(jobName);
        try {
            this.logger.log('Starting notification cleanup job');
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            await this.failJob(job.id, message);
            this.logger.error(`Notification cleanup failed: ${message}`);
        }
    }
    async providerHealthCheck() {
    }
    async startJob(jobName) {
        const job = this.jobRepository.create({
            jobName,
            status: 'running',
            startedAt: new Date(),
        });
        return this.jobRepository.save(job);
    }
    async completeJob(jobId, recordsProcessed) {
        await this.jobRepository.update(jobId, {
            status: 'completed',
            completedAt: new Date(),
            recordsProcessed,
        });
    }
    async failJob(jobId, errorMessage) {
        await this.jobRepository.update(jobId, {
            status: 'failed',
            completedAt: new Date(),
            errorMessage,
        });
    }
    async getJobHistory(jobName, limit = 50) {
        const query = this.jobRepository
            .createQueryBuilder('job')
            .orderBy('job.createdAt', 'DESC')
            .take(limit);
        if (jobName) {
            query.where('job.jobName = :jobName', { jobName });
        }
        return query.getMany();
    }
    async triggerJob(jobName) {
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
};
exports.ScheduledJobsService = ScheduledJobsService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScheduledJobsService.prototype, "expireStaleTransactions", null);
__decorate([
    (0, schedule_1.Cron)('0 3 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScheduledJobsService.prototype, "cleanupTransactionMetadata", null);
__decorate([
    (0, schedule_1.Cron)('0 2 * * 0'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScheduledJobsService.prototype, "cleanupAuditLogs", null);
__decorate([
    (0, schedule_1.Cron)('0 1 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScheduledJobsService.prototype, "dailyReconciliation", null);
__decorate([
    (0, schedule_1.Cron)('*/15 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScheduledJobsService.prototype, "checkStuckTransactions", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScheduledJobsService.prototype, "cleanupExpiredSessions", null);
__decorate([
    (0, schedule_1.Cron)('0 4 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScheduledJobsService.prototype, "cleanupInactiveFcmTokens", null);
__decorate([
    (0, schedule_1.Cron)('0 3 * * 6'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScheduledJobsService.prototype, "cleanupOldNotifications", null);
__decorate([
    (0, schedule_1.Cron)('*/5 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScheduledJobsService.prototype, "providerHealthCheck", null);
exports.ScheduledJobsService = ScheduledJobsService = ScheduledJobsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(orm_entities_1.TransactionOrmEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(scheduled_job_entity_1.ScheduledJobEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(audit_log_entity_1.AuditLogEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(fcm_1.FcmTokenOrmEntity)),
    __param(4, (0, typeorm_1.InjectRepository)(orm_entities_2.NotificationOrmEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        session_service_1.SessionService])
], ScheduledJobsService);
//# sourceMappingURL=scheduled-jobs.service.js.map