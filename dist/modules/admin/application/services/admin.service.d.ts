import { Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import { UserOrmEntity } from '@modules/user/infrastructure/orm-entities';
import { SystemMetricEntity } from '../../infrastructure/persistence/typeorm/entities/system-metric.entity';
import { TransactionRepository } from '@modules/transaction/infrastructure/repositories/transaction.repository';
import { AuditService } from './audit.service';
export interface UserListQuery {
    page?: number;
    limit?: number;
    status?: string;
    kycStatus?: string;
    role?: string;
    search?: string;
}
export interface TransactionListQuery {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
}
export interface DashboardStats {
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    kycPendingUsers: number;
    kycApprovedUsers: number;
    totalTransactions: number;
    pendingTransactions: number;
    completedTransactions: number;
    failedTransactions: number;
    totalVolume: number;
    todayVolume: number;
}
export interface EnhancedDashboardStats extends DashboardStats {
    transactionTimeSeries: {
        date: string;
        count: number;
        volume: number;
    }[];
    userGrowthTimeSeries: {
        date: string;
        newUsers: number;
        totalUsers: number;
    }[];
    transactionsByType: Record<string, number>;
    transactionsByStatus: Record<string, number>;
}
export declare class AdminService {
    private readonly userRepository;
    private readonly metricRepository;
    private readonly transactionRepository;
    private readonly auditService;
    private readonly cacheManager;
    private readonly logger;
    private readonly CACHE_TTL;
    private readonly DASHBOARD_CACHE_KEY;
    private readonly ENHANCED_DASHBOARD_CACHE_KEY;
    constructor(userRepository: Repository<UserOrmEntity>, metricRepository: Repository<SystemMetricEntity>, transactionRepository: TransactionRepository, auditService: AuditService, cacheManager: Cache);
    private sanitizeSearchInput;
    listUsers(query: UserListQuery): Promise<{
        users: UserOrmEntity[];
        total: number;
    }>;
    getUser(userId: string): Promise<UserOrmEntity>;
    suspendUser(userId: string, reason: string, adminId: string): Promise<UserOrmEntity>;
    unsuspendUser(userId: string, adminId: string): Promise<UserOrmEntity>;
    updateUserRole(userId: string, role: string, adminId: string): Promise<UserOrmEntity>;
    approveKyc(userId: string, adminId: string): Promise<UserOrmEntity>;
    rejectKyc(userId: string, reason: string, adminId: string): Promise<UserOrmEntity>;
    getDashboardStats(): Promise<DashboardStats>;
    getEnhancedDashboardStats(days?: number): Promise<EnhancedDashboardStats>;
    private getUserStats;
    getUserGrowthTimeSeries(days: number): Promise<{
        date: string;
        newUsers: number;
        totalUsers: number;
    }[]>;
    invalidateDashboardCache(): Promise<void>;
    recordMetric(name: string, value: number, type?: 'counter' | 'gauge' | 'histogram', dimensions?: Record<string, unknown>): Promise<void>;
    getMetrics(name: string, startDate?: Date, endDate?: Date, limit?: number): Promise<SystemMetricEntity[]>;
    getUserGrowthReport(startDate: Date, endDate: Date): Promise<{
        date: string;
        count: number;
    }[]>;
    getKycStatusReport(): Promise<{
        status: string;
        count: number;
    }[]>;
}
