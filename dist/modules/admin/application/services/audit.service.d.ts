import { Repository } from 'typeorm';
import { AuditLogEntity, ActorType } from '../../infrastructure/persistence/typeorm/entities/audit-log.entity';
export interface AuditLogData {
    actorId?: string;
    actorType?: ActorType;
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
}
export interface AuditLogQuery {
    actorId?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
}
export declare class AuditService {
    private readonly auditLogRepository;
    private readonly logger;
    constructor(auditLogRepository: Repository<AuditLogEntity>);
    log(data: AuditLogData): Promise<AuditLogEntity>;
    query(params: AuditLogQuery): Promise<{
        logs: AuditLogEntity[];
        total: number;
    }>;
    getResourceHistory(resourceType: string, resourceId: string, limit?: number): Promise<AuditLogEntity[]>;
    getActorHistory(actorId: string, limit?: number): Promise<AuditLogEntity[]>;
    getRecentLogs(limit?: number): Promise<AuditLogEntity[]>;
    cleanupOldLogs(daysToRetain?: number): Promise<number>;
    logUserAction(actorId: string, action: string, resourceType: string, resourceId?: string, details?: Record<string, unknown>, request?: {
        ip?: string;
        headers?: {
            'user-agent'?: string;
        };
    }): Promise<void>;
    logAdminAction(adminId: string, action: string, resourceType: string, resourceId?: string, details?: Record<string, unknown>, request?: {
        ip?: string;
        headers?: {
            'user-agent'?: string;
        };
    }): Promise<void>;
    logSystemAction(action: string, resourceType: string, resourceId?: string, details?: Record<string, unknown>): Promise<void>;
}
