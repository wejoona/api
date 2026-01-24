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
var AuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const audit_log_entity_1 = require("../../infrastructure/persistence/typeorm/entities/audit-log.entity");
let AuditService = AuditService_1 = class AuditService {
    constructor(auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
        this.logger = new common_1.Logger(AuditService_1.name);
    }
    async log(data) {
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
        this.logger.debug(`Audit log: ${data.action} on ${data.resourceType}${data.resourceId ? `/${data.resourceId}` : ''}`);
        return saved;
    }
    async query(params) {
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
        }
        else if (params.startDate) {
            queryBuilder.andWhere('audit.createdAt >= :startDate', {
                startDate: params.startDate,
            });
        }
        else if (params.endDate) {
            queryBuilder.andWhere('audit.createdAt <= :endDate', {
                endDate: params.endDate,
            });
        }
        const [logs, total] = await queryBuilder.getManyAndCount();
        return { logs, total };
    }
    async getResourceHistory(resourceType, resourceId, limit = 50) {
        return this.auditLogRepository.find({
            where: { resourceType, resourceId },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
    async getActorHistory(actorId, limit = 50) {
        return this.auditLogRepository.find({
            where: { actorId },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
    async getRecentLogs(limit = 100) {
        return this.auditLogRepository.find({
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
    async cleanupOldLogs(daysToRetain = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToRetain);
        const result = await this.auditLogRepository.delete({
            createdAt: (0, typeorm_2.LessThan)(cutoffDate),
        });
        this.logger.log(`Cleaned up ${result.affected} audit logs older than ${daysToRetain} days`);
        return result.affected || 0;
    }
    async logUserAction(actorId, action, resourceType, resourceId, details, request) {
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
    async logAdminAction(adminId, action, resourceType, resourceId, details, request) {
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
    async logSystemAction(action, resourceType, resourceId, details) {
        await this.log({
            actorType: 'system',
            action,
            resourceType,
            resourceId,
            details,
        });
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = AuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(audit_log_entity_1.AuditLogEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AuditService);
//# sourceMappingURL=audit.service.js.map