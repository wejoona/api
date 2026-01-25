import { AdminService, DashboardStats, EnhancedDashboardStats } from '../services/admin.service';
import { AuditService } from '../services/audit.service';
import { SuspendUserDto, UpdateRoleDto, ListUsersQueryDto, RejectKycDto } from '../dto';
interface AuthenticatedRequest {
    user: {
        id: string;
        role: string;
    };
}
declare class AuditLogQueryDto {
    page?: number;
    limit?: number;
    actorId?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    startDate?: string;
    endDate?: string;
}
export declare class AdminController {
    private readonly adminService;
    private readonly auditService;
    constructor(adminService: AdminService, auditService: AuditService);
    getDashboard(): Promise<DashboardStats>;
    getEnhancedDashboard(days?: number): Promise<EnhancedDashboardStats>;
    invalidateDashboardCache(): Promise<{
        message: string;
    }>;
    listUsers(query: ListUsersQueryDto): Promise<{
        users: {
            id: string;
            phone: string;
            phoneVerified: boolean;
            firstName: string;
            lastName: string;
            email: string;
            countryCode: string;
            kycStatus: string;
            role: string;
            status: string;
            suspendedAt: Date;
            suspendedReason: string;
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    getUser(userId: string): Promise<{
        id: string;
        phone: string;
        phoneVerified: boolean;
        firstName: string;
        lastName: string;
        email: string;
        countryCode: string;
        kycStatus: string;
        kycProviderId: string;
        circleUserId: string;
        role: string;
        status: string;
        suspendedAt: Date;
        suspendedReason: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    suspendUser(userId: string, body: SuspendUserDto, req: AuthenticatedRequest): Promise<{
        message: string;
        userId: string;
        status: string;
    }>;
    unsuspendUser(userId: string, req: AuthenticatedRequest): Promise<{
        message: string;
        userId: string;
        status: string;
    }>;
    updateUserRole(userId: string, body: UpdateRoleDto, req: AuthenticatedRequest): Promise<{
        message: string;
        userId: string;
        role: string;
    }>;
    listPendingKyc(query: {
        page?: number;
        limit?: number;
    }): Promise<{
        users: {
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
            email: string;
            kycStatus: string;
            kycProviderId: string;
            createdAt: Date;
        }[];
        total: number;
    }>;
    approveKyc(userId: string, req: AuthenticatedRequest): Promise<{
        message: string;
        userId: string;
        kycStatus: string;
    }>;
    rejectKyc(userId: string, body: RejectKycDto, req: AuthenticatedRequest): Promise<{
        message: string;
        userId: string;
        kycStatus: string;
    }>;
    getAuditLogs(query: AuditLogQueryDto): Promise<{
        logs: import("../..").AuditLogEntity[];
        total: number;
        page: number;
        limit: number;
    }>;
    getUserAuditLogs(userId: string, limit?: number): Promise<{
        logs: import("../..").AuditLogEntity[];
    }>;
    getResourceAuditLogs(resourceType: string, resourceId: string, limit?: number): Promise<{
        logs: import("../..").AuditLogEntity[];
    }>;
    getUserGrowthReport(startDate: string, endDate: string): Promise<{
        data: {
            date: string;
            count: number;
        }[];
    }>;
    getUserGrowthTimeSeries(days?: number): Promise<{
        data: {
            date: string;
            newUsers: number;
            totalUsers: number;
        }[];
    }>;
    getKycStatusReport(): Promise<{
        data: {
            status: string;
            count: number;
        }[];
    }>;
}
export {};
