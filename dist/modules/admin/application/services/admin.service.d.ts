import { Repository } from 'typeorm';
import { UserOrmEntity } from '@modules/user/infrastructure/orm-entities';
import { SystemMetricEntity } from '../../infrastructure/persistence/typeorm/entities/system-metric.entity';
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
    totalVolume: number;
    todayVolume: number;
}
export declare class AdminService {
    private readonly userRepository;
    private readonly metricRepository;
    private readonly auditService;
    private readonly logger;
    constructor(userRepository: Repository<UserOrmEntity>, metricRepository: Repository<SystemMetricEntity>, auditService: AuditService);
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
