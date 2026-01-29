import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import {
  AuditLogEntity,
  ActorType,
} from '../../infrastructure/persistence/typeorm/entities/audit-log.entity';

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

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
  ) {}

  /**
   * Log an audit event
   */
  async log(data: AuditLogData): Promise<AuditLogEntity> {
    const auditLog = this.auditLogRepository.create({
      actorId: data.actorId || null,
      actorType: data.actorType || 'user',
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId || null,
      details: data.details || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
    });

    const saved = await this.auditLogRepository.save(auditLog);
    this.logger.debug(
      `Audit log: ${data.action} on ${data.resourceType}${data.resourceId ? `/${data.resourceId}` : ''}`,
    );
    return saved;
  }

  /**
   * Query audit logs with filters
   */
  async query(
    params: AuditLogQuery,
  ): Promise<{ logs: AuditLogEntity[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('audit')
      .orderBy('audit.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (params.actorId) {
      queryBuilder.andWhere('audit.actorId = :actorId', {
        actorId: params.actorId,
      });
    }

    if (params.action) {
      queryBuilder.andWhere('audit.action LIKE :action', {
        action: `%${params.action}%`,
      });
    }

    if (params.resourceType) {
      queryBuilder.andWhere('audit.resourceType = :resourceType', {
        resourceType: params.resourceType,
      });
    }

    if (params.resourceId) {
      queryBuilder.andWhere('audit.resourceId = :resourceId', {
        resourceId: params.resourceId,
      });
    }

    if (params.startDate && params.endDate) {
      queryBuilder.andWhere('audit.createdAt BETWEEN :startDate AND :endDate', {
        startDate: params.startDate,
        endDate: params.endDate,
      });
    } else if (params.startDate) {
      queryBuilder.andWhere('audit.createdAt >= :startDate', {
        startDate: params.startDate,
      });
    } else if (params.endDate) {
      queryBuilder.andWhere('audit.createdAt <= :endDate', {
        endDate: params.endDate,
      });
    }

    const [logs, total] = await queryBuilder.getManyAndCount();
    return { logs, total };
  }

  /**
   * Get audit logs for a specific resource
   */
  async getResourceHistory(
    resourceType: string,
    resourceId: string,
    limit = 50,
  ): Promise<AuditLogEntity[]> {
    return this.auditLogRepository.find({
      where: { resourceType, resourceId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get audit logs for a specific actor
   */
  async getActorHistory(
    actorId: string,
    limit = 50,
  ): Promise<AuditLogEntity[]> {
    return this.auditLogRepository.find({
      where: { actorId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get recent audit logs
   */
  async getRecentLogs(limit = 100): Promise<AuditLogEntity[]> {
    return this.auditLogRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Cleanup old audit logs (retention policy)
   */
  async cleanupOldLogs(daysToRetain = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToRetain);

    const result = await this.auditLogRepository.delete({
      createdAt: LessThan(cutoffDate),
    });

    this.logger.log(
      `Cleaned up ${result.affected} audit logs older than ${daysToRetain} days`,
    );
    return result.affected || 0;
  }

  // ==========================================
  // Convenience methods for common actions
  // ==========================================

  async logUserAction(
    actorId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: Record<string, unknown>,
    request?: { ip?: string; headers?: { 'user-agent'?: string } },
  ): Promise<void> {
    await this.log({
      actorId,
      actorType: 'user',
      action,
      resourceType,
      resourceId,
      details,
      ipAddress: request?.ip,
      userAgent: request?.headers?.['user-agent'],
    });
  }

  async logAdminAction(
    adminId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: Record<string, unknown>,
    request?: { ip?: string; headers?: { 'user-agent'?: string } },
  ): Promise<void> {
    await this.log({
      actorId: adminId,
      actorType: 'admin',
      action,
      resourceType,
      resourceId,
      details,
      ipAddress: request?.ip,
      userAgent: request?.headers?.['user-agent'],
    });
  }

  async logSystemAction(
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      actorType: 'system',
      action,
      resourceType,
      resourceId,
      details,
    });
  }
}
