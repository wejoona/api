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
var AdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const cache_manager_1 = require("@nestjs/cache-manager");
const orm_entities_1 = require("../../../user/infrastructure/orm-entities");
const system_metric_entity_1 = require("../../infrastructure/persistence/typeorm/entities/system-metric.entity");
const transaction_repository_1 = require("../../../transaction/infrastructure/repositories/transaction.repository");
const audit_service_1 = require("./audit.service");
let AdminService = AdminService_1 = class AdminService {
    constructor(userRepository, metricRepository, transactionRepository, auditService, cacheManager) {
        this.userRepository = userRepository;
        this.metricRepository = metricRepository;
        this.transactionRepository = transactionRepository;
        this.auditService = auditService;
        this.cacheManager = cacheManager;
        this.logger = new common_1.Logger(AdminService_1.name);
        this.CACHE_TTL = 60;
        this.DASHBOARD_CACHE_KEY = 'admin:dashboard:stats';
        this.ENHANCED_DASHBOARD_CACHE_KEY = 'admin:dashboard:enhanced';
    }
    sanitizeSearchInput(search) {
        let sanitized = search.replace(/[^a-zA-Z0-9\s@.+\-]/g, '');
        sanitized = sanitized.trim().substring(0, 100);
        sanitized = sanitized.replace(/%/g, '\\%').replace(/_/g, '\\_');
        return sanitized;
    }
    async listUsers(query) {
        const page = query.page || 1;
        const limit = Math.min(query.limit || 50, 100);
        const skip = (page - 1) * limit;
        const queryBuilder = this.userRepository
            .createQueryBuilder('user')
            .orderBy('user.createdAt', 'DESC')
            .skip(skip)
            .take(limit);
        if (query.status) {
            queryBuilder.andWhere('user.status = :status', { status: query.status });
        }
        if (query.kycStatus) {
            queryBuilder.andWhere('user.kycStatus = :kycStatus', {
                kycStatus: query.kycStatus,
            });
        }
        if (query.role) {
            queryBuilder.andWhere('user.role = :role', { role: query.role });
        }
        if (query.search) {
            if (query.search.length < 3) {
                throw new common_1.BadRequestException('Search query must be at least 3 characters long');
            }
            const sanitizedSearch = this.sanitizeSearchInput(query.search);
            if (!sanitizedSearch) {
                throw new common_1.BadRequestException('Search query contains only invalid characters');
            }
            queryBuilder.andWhere('(user.phone LIKE :search OR user.email LIKE :search OR user.firstName LIKE :search OR user.lastName LIKE :search)', { search: `%${sanitizedSearch}%` });
        }
        const [users, total] = await queryBuilder.getManyAndCount();
        return { users, total };
    }
    async getUser(userId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException(`User ${userId} not found`);
        }
        return user;
    }
    async suspendUser(userId, reason, adminId) {
        const user = await this.getUser(userId);
        if (user.status === 'suspended') {
            throw new common_1.BadRequestException('User is already suspended');
        }
        if (user.role === 'super_admin') {
            throw new common_1.BadRequestException('Cannot suspend a super admin');
        }
        const sanitizedReason = reason.trim().substring(0, 500);
        user.status = 'suspended';
        user.suspendedAt = new Date();
        user.suspendedReason = sanitizedReason;
        user.updatedAt = new Date();
        const saved = await this.userRepository.save(user);
        await this.auditService.logAdminAction(adminId, 'user.suspend', 'user', userId, { reason: sanitizedReason });
        this.logger.log(`User ${userId} suspended by admin ${adminId}: ${sanitizedReason}`);
        return saved;
    }
    async unsuspendUser(userId, adminId) {
        const user = await this.getUser(userId);
        if (user.status !== 'suspended') {
            throw new common_1.BadRequestException('User is not suspended');
        }
        user.status = 'active';
        user.suspendedAt = null;
        user.suspendedReason = null;
        user.updatedAt = new Date();
        const saved = await this.userRepository.save(user);
        await this.auditService.logAdminAction(adminId, 'user.unsuspend', 'user', userId);
        this.logger.log(`User ${userId} unsuspended by admin ${adminId}`);
        return saved;
    }
    async updateUserRole(userId, role, adminId) {
        const user = await this.getUser(userId);
        const previousRole = user.role;
        if (!['user', 'admin', 'super_admin'].includes(role)) {
            throw new common_1.BadRequestException('Invalid role');
        }
        user.role = role;
        user.updatedAt = new Date();
        const saved = await this.userRepository.save(user);
        await this.auditService.logAdminAction(adminId, 'user.role_change', 'user', userId, { previousRole, newRole: role });
        this.logger.log(`User ${userId} role changed from ${previousRole} to ${role} by admin ${adminId}`);
        return saved;
    }
    async approveKyc(userId, adminId) {
        const user = await this.getUser(userId);
        if (user.kycStatus === 'approved') {
            throw new common_1.BadRequestException('KYC is already approved');
        }
        const previousStatus = user.kycStatus;
        user.kycStatus = 'approved';
        user.updatedAt = new Date();
        const saved = await this.userRepository.save(user);
        await this.auditService.logAdminAction(adminId, 'user.kyc_approve', 'user', userId, { previousStatus });
        this.logger.log(`KYC approved for user ${userId} by admin ${adminId}`);
        return saved;
    }
    async rejectKyc(userId, reason, adminId) {
        const user = await this.getUser(userId);
        const sanitizedReason = reason.trim().substring(0, 500);
        const previousStatus = user.kycStatus;
        user.kycStatus = 'rejected';
        user.updatedAt = new Date();
        const saved = await this.userRepository.save(user);
        await this.auditService.logAdminAction(adminId, 'user.kyc_reject', 'user', userId, { previousStatus, reason: sanitizedReason });
        this.logger.log(`KYC rejected for user ${userId} by admin ${adminId}: ${sanitizedReason}`);
        return saved;
    }
    async getDashboardStats() {
        const cached = await this.cacheManager.get(this.DASHBOARD_CACHE_KEY);
        if (cached) {
            this.logger.debug('Returning cached dashboard stats');
            return cached;
        }
        const [userStats, transactionStats] = await Promise.all([
            this.getUserStats(),
            this.transactionRepository.getTransactionStats(),
        ]);
        const stats = {
            ...userStats,
            totalTransactions: transactionStats.total,
            pendingTransactions: transactionStats.pending,
            completedTransactions: transactionStats.completed,
            failedTransactions: transactionStats.failed,
            totalVolume: transactionStats.totalVolume,
            todayVolume: transactionStats.todayVolume,
        };
        await this.cacheManager.set(this.DASHBOARD_CACHE_KEY, stats, this.CACHE_TTL * 1000);
        return stats;
    }
    async getEnhancedDashboardStats(days = 30) {
        const cacheKey = `${this.ENHANCED_DASHBOARD_CACHE_KEY}:${days}`;
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
            this.logger.debug('Returning cached enhanced dashboard stats');
            return cached;
        }
        const [basicStats, transactionTimeSeries, userGrowthTimeSeries, transactionsByType, transactionsByStatus,] = await Promise.all([
            this.getDashboardStats(),
            this.transactionRepository.getTransactionTimeSeries(days),
            this.getUserGrowthTimeSeries(days),
            this.transactionRepository.getTransactionCountByType(),
            this.transactionRepository.getTransactionCountByStatus(),
        ]);
        const enhancedStats = {
            ...basicStats,
            transactionTimeSeries,
            userGrowthTimeSeries,
            transactionsByType,
            transactionsByStatus,
        };
        await this.cacheManager.set(cacheKey, enhancedStats, this.CACHE_TTL * 1000);
        return enhancedStats;
    }
    async getUserStats() {
        const [totalUsers, activeUsers, suspendedUsers, kycPendingUsers, kycApprovedUsers,] = await Promise.all([
            this.userRepository.count(),
            this.userRepository.count({ where: { status: 'active' } }),
            this.userRepository.count({ where: { status: 'suspended' } }),
            this.userRepository.count({ where: { kycStatus: 'pending' } }),
            this.userRepository.count({ where: { kycStatus: 'approved' } }),
        ]);
        return {
            totalUsers,
            activeUsers,
            suspendedUsers,
            kycPendingUsers,
            kycApprovedUsers,
        };
    }
    async getUserGrowthTimeSeries(days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const result = await this.userRepository
            .createQueryBuilder('user')
            .select('DATE(user.createdAt)', 'date')
            .addSelect('COUNT(*)', 'newUsers')
            .where('user.createdAt >= :startDate', { startDate })
            .groupBy('DATE(user.createdAt)')
            .orderBy('date', 'ASC')
            .getRawMany();
        let runningTotal = 0;
        const usersBeforeStartDate = await this.userRepository
            .createQueryBuilder('user')
            .where('user.createdAt < :startDate', { startDate })
            .getCount();
        runningTotal = usersBeforeStartDate;
        return result.map((row) => {
            const newUsers = parseInt(row.newUsers, 10);
            runningTotal += newUsers;
            return {
                date: row.date,
                newUsers,
                totalUsers: runningTotal,
            };
        });
    }
    async invalidateDashboardCache() {
        await Promise.all([
            this.cacheManager.del(this.DASHBOARD_CACHE_KEY),
            this.cacheManager.del(`${this.ENHANCED_DASHBOARD_CACHE_KEY}:7`),
            this.cacheManager.del(`${this.ENHANCED_DASHBOARD_CACHE_KEY}:30`),
            this.cacheManager.del(`${this.ENHANCED_DASHBOARD_CACHE_KEY}:90`),
        ]);
        this.logger.log('Dashboard cache invalidated');
    }
    async recordMetric(name, value, type = 'gauge', dimensions) {
        const metric = this.metricRepository.create({
            metricName: name,
            metricValue: value,
            metricType: type,
            dimensions,
        });
        await this.metricRepository.save(metric);
    }
    async getMetrics(name, startDate, endDate, limit = 100) {
        const queryBuilder = this.metricRepository
            .createQueryBuilder('metric')
            .where('metric.metricName = :name', { name })
            .orderBy('metric.recordedAt', 'DESC')
            .take(limit);
        if (startDate && endDate) {
            queryBuilder.andWhere('metric.recordedAt BETWEEN :startDate AND :endDate', { startDate, endDate });
        }
        return queryBuilder.getMany();
    }
    async getUserGrowthReport(startDate, endDate) {
        const result = await this.userRepository
            .createQueryBuilder('user')
            .select('DATE(user.createdAt) as date')
            .addSelect('COUNT(*) as count')
            .where('user.createdAt BETWEEN :startDate AND :endDate', {
            startDate,
            endDate,
        })
            .groupBy('DATE(user.createdAt)')
            .orderBy('date', 'ASC')
            .getRawMany();
        return result.map((row) => ({
            date: row.date,
            count: parseInt(row.count, 10),
        }));
    }
    async getKycStatusReport() {
        const result = await this.userRepository
            .createQueryBuilder('user')
            .select('user.kycStatus as status')
            .addSelect('COUNT(*) as count')
            .groupBy('user.kycStatus')
            .getRawMany();
        return result.map((row) => ({
            status: row.status,
            count: parseInt(row.count, 10),
        }));
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = AdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(orm_entities_1.UserOrmEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(system_metric_entity_1.SystemMetricEntity)),
    __param(4, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        transaction_repository_1.TransactionRepository,
        audit_service_1.AuditService, Object])
], AdminService);
//# sourceMappingURL=admin.service.js.map