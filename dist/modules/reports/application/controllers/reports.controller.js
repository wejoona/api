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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const guards_1 = require("../../../../common/guards");
const roles_guard_1 = require("../../../../common/guards/roles.guard");
const roles_decorator_1 = require("../../../../common/decorators/roles.decorator");
const reports_service_1 = require("../services/reports.service");
class DateRangeQueryDto {
}
class ExportQueryDto {
}
let ReportsController = class ReportsController {
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    parseDateRange(query) {
        if (!query.startDate && !query.endDate) {
            return undefined;
        }
        const startDate = query.startDate
            ? new Date(query.startDate)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = query.endDate ? new Date(query.endDate) : new Date();
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new common_1.BadRequestException('Invalid date format');
        }
        return { startDate, endDate };
    }
    parseRequiredDateRange(query) {
        const startDate = new Date(query.startDate);
        const endDate = new Date(query.endDate);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new common_1.BadRequestException('Invalid date format. Use ISO 8601 format.');
        }
        if (startDate > endDate) {
            throw new common_1.BadRequestException('Start date must be before end date');
        }
        return { startDate, endDate };
    }
    async getTransactionSummary(query) {
        const dateRange = this.parseDateRange(query);
        return this.reportsService.getTransactionSummary(dateRange);
    }
    async getDailyTransactionReport(startDate, endDate) {
        const dateRange = this.parseRequiredDateRange({ startDate, endDate });
        const data = await this.reportsService.getDailyTransactionReport(dateRange);
        return { data };
    }
    async getTopUsersByVolume(query, limit) {
        const dateRange = this.parseDateRange(query);
        const data = await this.reportsService.getTopUsersByVolume(dateRange, limit || 20);
        return { data };
    }
    async getUserActivitySummary(userId, query) {
        const dateRange = this.parseDateRange(query);
        return this.reportsService.getUserActivitySummary(userId, dateRange);
    }
    async getReconciliationReport(startDate, endDate) {
        const dateRange = this.parseRequiredDateRange({ startDate, endDate });
        return this.reportsService.getReconciliationReport(dateRange);
    }
    async exportTransactions(query, res) {
        const dateRange = this.parseRequiredDateRange({
            startDate: query.startDate,
            endDate: query.endDate,
        });
        const format = query.format || 'json';
        const { data, filename } = await this.reportsService.exportTransactions(dateRange, format);
        const contentType = format === 'csv' ? 'text/csv' : 'application/json';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(data);
    }
    async getQuickStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);
        const [todayStats, weekStats, monthStats] = await Promise.all([
            this.reportsService.getTransactionSummary({
                startDate: today,
                endDate: endOfToday,
            }),
            this.reportsService.getTransactionSummary({
                startDate: lastWeek,
                endDate: endOfToday,
            }),
            this.reportsService.getTransactionSummary({
                startDate: lastMonth,
                endDate: endOfToday,
            }),
        ]);
        return {
            today: {
                transactions: todayStats.totalCount,
                volume: todayStats.totalVolume,
            },
            week: {
                transactions: weekStats.totalCount,
                volume: weekStats.totalVolume,
            },
            month: {
                transactions: monthStats.totalCount,
                volume: monthStats.totalVolume,
            },
        };
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('transactions/summary'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Get transaction summary statistics' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Transaction summary retrieved' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [DateRangeQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getTransactionSummary", null);
__decorate([
    (0, common_1.Get)('transactions/daily'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Get daily transaction report' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Daily transaction report retrieved',
    }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getDailyTransactionReport", null);
__decorate([
    (0, common_1.Get)('users/top'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Get top users by transaction volume' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Top users report retrieved' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [DateRangeQueryDto, Number]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getTopUsersByVolume", null);
__decorate([
    (0, common_1.Get)('users/:userId/activity'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Get activity summary for a specific user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User activity summary retrieved' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, DateRangeQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getUserActivitySummary", null);
__decorate([
    (0, common_1.Get)('reconciliation'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Get reconciliation report for a date range' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Reconciliation report retrieved' }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getReconciliationReport", null);
__decorate([
    (0, common_1.Get)('export/transactions'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Export transactions as JSON or CSV' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Transactions exported' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ExportQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportTransactions", null);
__decorate([
    (0, common_1.Get)('dashboard/quick-stats'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Get quick stats for dashboard' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Quick stats retrieved' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getQuickStats", null);
exports.ReportsController = ReportsController = __decorate([
    (0, swagger_1.ApiTags)('Reports'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('reports'),
    (0, common_1.UseGuards)(guards_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map