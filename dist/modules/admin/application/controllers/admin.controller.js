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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const guards_1 = require("../../../../common/guards");
const roles_guard_1 = require("../../../../common/guards/roles.guard");
const roles_decorator_1 = require("../../../../common/decorators/roles.decorator");
const admin_service_1 = require("../services/admin.service");
const audit_service_1 = require("../services/audit.service");
class SuspendUserDto {
}
class UpdateRoleDto {
}
class RejectKycDto {
}
class ListUsersQueryDto {
}
class AuditLogQueryDto {
}
let AdminController = class AdminController {
    constructor(adminService, auditService) {
        this.adminService = adminService;
        this.auditService = auditService;
    }
    async getDashboard() {
        return this.adminService.getDashboardStats();
    }
    async listUsers(query) {
        const result = await this.adminService.listUsers(query);
        return {
            users: result.users.map((u) => ({
                id: u.id,
                phone: u.phone,
                phoneVerified: u.phoneVerified,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                countryCode: u.countryCode,
                kycStatus: u.kycStatus,
                role: u.role,
                status: u.status,
                suspendedAt: u.suspendedAt,
                suspendedReason: u.suspendedReason,
                createdAt: u.createdAt,
                updatedAt: u.updatedAt,
            })),
            total: result.total,
            page: query.page || 1,
            limit: query.limit || 50,
        };
    }
    async getUser(userId) {
        const user = await this.adminService.getUser(userId);
        return {
            id: user.id,
            phone: user.phone,
            phoneVerified: user.phoneVerified,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            countryCode: user.countryCode,
            kycStatus: user.kycStatus,
            kycProviderId: user.kycProviderId,
            circleUserId: user.circleUserId,
            role: user.role,
            status: user.status,
            suspendedAt: user.suspendedAt,
            suspendedReason: user.suspendedReason,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
    async suspendUser(userId, body, req) {
        const user = await this.adminService.suspendUser(userId, body.reason, req.user.id);
        return { message: 'User suspended', userId: user.id, status: user.status };
    }
    async unsuspendUser(userId, req) {
        const user = await this.adminService.unsuspendUser(userId, req.user.id);
        return {
            message: 'User unsuspended',
            userId: user.id,
            status: user.status,
        };
    }
    async updateUserRole(userId, body, req) {
        const user = await this.adminService.updateUserRole(userId, body.role, req.user.id);
        return { message: 'Role updated', userId: user.id, role: user.role };
    }
    async listPendingKyc(query) {
        const result = await this.adminService.listUsers({
            ...query,
            kycStatus: 'submitted',
        });
        return {
            users: result.users.map((u) => ({
                id: u.id,
                phone: u.phone,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                kycStatus: u.kycStatus,
                kycProviderId: u.kycProviderId,
                createdAt: u.createdAt,
            })),
            total: result.total,
        };
    }
    async approveKyc(userId, req) {
        const user = await this.adminService.approveKyc(userId, req.user.id);
        return {
            message: 'KYC approved',
            userId: user.id,
            kycStatus: user.kycStatus,
        };
    }
    async rejectKyc(userId, body, req) {
        const user = await this.adminService.rejectKyc(userId, body.reason, req.user.id);
        return {
            message: 'KYC rejected',
            userId: user.id,
            kycStatus: user.kycStatus,
        };
    }
    async getAuditLogs(query) {
        const auditQuery = {
            ...query,
            startDate: query.startDate ? new Date(query.startDate) : undefined,
            endDate: query.endDate ? new Date(query.endDate) : undefined,
        };
        const result = await this.auditService.query(auditQuery);
        return {
            logs: result.logs,
            total: result.total,
            page: query.page || 1,
            limit: query.limit || 50,
        };
    }
    async getUserAuditLogs(userId, limit) {
        const logs = await this.auditService.getActorHistory(userId, limit || 50);
        return { logs };
    }
    async getResourceAuditLogs(resourceType, resourceId, limit) {
        const logs = await this.auditService.getResourceHistory(resourceType, resourceId, limit || 50);
        return { logs };
    }
    async getUserGrowthReport(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const data = await this.adminService.getUserGrowthReport(start, end);
        return { data };
    }
    async getKycStatusReport() {
        const data = await this.adminService.getKycStatusReport();
        return { data };
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Get dashboard statistics' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Dashboard stats retrieved' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('users'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOperation)({ summary: 'List all users with filters' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Users list retrieved' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ListUsersQueryDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listUsers", null);
__decorate([
    (0, common_1.Get)('users/:userId'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user details' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User details retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUser", null);
__decorate([
    (0, common_1.Post)('users/:userId/suspend'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Suspend a user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User suspended' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'User already suspended' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, SuspendUserDto, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "suspendUser", null);
__decorate([
    (0, common_1.Post)('users/:userId/unsuspend'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Unsuspend (reactivate) a user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User unsuspended' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'User not suspended' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "unsuspendUser", null);
__decorate([
    (0, common_1.Put)('users/:userId/role'),
    (0, roles_decorator_1.Roles)('super_admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Update user role (super admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Role updated' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid role' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateRoleDto, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateUserRole", null);
__decorate([
    (0, common_1.Get)('kyc/pending'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOperation)({ summary: 'List users with pending KYC' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Pending KYC users retrieved' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listPendingKyc", null);
__decorate([
    (0, common_1.Post)('users/:userId/kyc/approve'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Approve user KYC' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'KYC approved' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'KYC already approved' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "approveKyc", null);
__decorate([
    (0, common_1.Post)('users/:userId/kyc/reject'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Reject user KYC' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'KYC rejected' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, RejectKycDto, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "rejectKyc", null);
__decorate([
    (0, common_1.Get)('audit-logs'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Query audit logs' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Audit logs retrieved' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AuditLogQueryDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAuditLogs", null);
__decorate([
    (0, common_1.Get)('audit-logs/user/:userId'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Get audit logs for a specific user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User audit logs retrieved' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUserAuditLogs", null);
__decorate([
    (0, common_1.Get)('audit-logs/resource/:resourceType/:resourceId'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Get audit logs for a specific resource' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Resource audit logs retrieved' }),
    __param(0, (0, common_1.Param)('resourceType')),
    __param(1, (0, common_1.Param)('resourceId')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getResourceAuditLogs", null);
__decorate([
    (0, common_1.Get)('reports/user-growth'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user growth report' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User growth report retrieved' }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUserGrowthReport", null);
__decorate([
    (0, common_1.Get)('reports/kyc-status'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Get KYC status distribution report' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'KYC status report retrieved' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getKycStatusReport", null);
exports.AdminController = AdminController = __decorate([
    (0, swagger_1.ApiTags)('Admin'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(guards_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [admin_service_1.AdminService,
        audit_service_1.AuditService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map