import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import {
  AdminService,
  UserListQuery,
  DashboardStats,
  EnhancedDashboardStats,
} from '../services/admin.service';
import { AuditService, AuditLogQuery } from '../services/audit.service';
import {
  SuspendUserDto,
  UpdateRoleDto,
  ListUsersQueryDto,
  RejectKycDto,
  DashboardStatsDto,
  EnhancedDashboardStatsDto,
} from '../dto';

interface AuthenticatedRequest {
  user: { id: string; role: string };
}

class AuditLogQueryDto {
  page?: number;
  limit?: number;
  actorId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: string;
  endDate?: string;
}

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditService: AuditService,
  ) {}

  // ==========================================
  // Dashboard
  // ==========================================

  @Get('dashboard')
  @Roles('admin')
  @ApiOperation({ summary: 'Get basic dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard stats retrieved',
    type: DashboardStatsDto,
  })
  async getDashboard(): Promise<DashboardStats> {
    return this.adminService.getDashboardStats();
  }

  @Get('dashboard/enhanced')
  @Roles('admin')
  @ApiOperation({ summary: 'Get enhanced dashboard with time-series data' })
  @ApiResponse({
    status: 200,
    description: 'Enhanced dashboard stats with charts data retrieved',
    type: EnhancedDashboardStatsDto,
  })
  async getEnhancedDashboard(
    @Query('days') days?: number,
  ): Promise<EnhancedDashboardStats> {
    const daysToFetch = days && days > 0 ? Math.min(days, 365) : 30;
    return this.adminService.getEnhancedDashboardStats(daysToFetch);
  }

  @Post('dashboard/cache/invalidate')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate dashboard cache' })
  @ApiResponse({ status: 200, description: 'Cache invalidated' })
  async invalidateDashboardCache() {
    await this.adminService.invalidateDashboardCache();
    return { message: 'Dashboard cache invalidated' };
  }

  // ==========================================
  // User Management
  // ==========================================

  @Get('users')
  @Roles('admin')
  @ApiOperation({ summary: 'List all users with filters' })
  @ApiResponse({ status: 200, description: 'Users list retrieved' })
  async listUsers(@Query() query: ListUsersQueryDto) {
    const result = await this.adminService.listUsers(query as UserListQuery);
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

  @Get('users/:userId')
  @Roles('admin')
  @ApiOperation({ summary: 'Get user details' })
  @ApiResponse({ status: 200, description: 'User details retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(@Param('userId') userId: string) {
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

  @Post('users/:userId/suspend')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a user' })
  @ApiResponse({ status: 200, description: 'User suspended' })
  @ApiResponse({ status: 400, description: 'User already suspended' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async suspendUser(
    @Param('userId') userId: string,
    @Body() body: SuspendUserDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = await this.adminService.suspendUser(
      userId,
      body.reason,
      req.user.id,
    );
    return { message: 'User suspended', userId: user.id, status: user.status };
  }

  @Post('users/:userId/unsuspend')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unsuspend (reactivate) a user' })
  @ApiResponse({ status: 200, description: 'User unsuspended' })
  @ApiResponse({ status: 400, description: 'User not suspended' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async unsuspendUser(
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = await this.adminService.unsuspendUser(userId, req.user.id);
    return {
      message: 'User unsuspended',
      userId: user.id,
      status: user.status,
    };
  }

  @Put('users/:userId/role')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update user role (super admin only)' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 400, description: 'Invalid role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserRole(
    @Param('userId') userId: string,
    @Body() body: UpdateRoleDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = await this.adminService.updateUserRole(
      userId,
      body.role,
      req.user.id,
    );
    return { message: 'Role updated', userId: user.id, role: user.role };
  }

  // ==========================================
  // KYC Management
  // ==========================================

  @Get('kyc/pending')
  @Roles('admin')
  @ApiOperation({ summary: 'List users with pending KYC' })
  @ApiResponse({ status: 200, description: 'Pending KYC users retrieved' })
  async listPendingKyc(@Query() query: { page?: number; limit?: number }) {
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

  @Post('users/:userId/kyc/approve')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve user KYC' })
  @ApiResponse({ status: 200, description: 'KYC approved' })
  @ApiResponse({ status: 400, description: 'KYC already approved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async approveKyc(
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = await this.adminService.approveKyc(userId, req.user.id);
    return {
      message: 'KYC approved',
      userId: user.id,
      kycStatus: user.kycStatus,
    };
  }

  @Post('users/:userId/kyc/reject')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject user KYC' })
  @ApiResponse({ status: 200, description: 'KYC rejected' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async rejectKyc(
    @Param('userId') userId: string,
    @Body() body: RejectKycDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = await this.adminService.rejectKyc(
      userId,
      body.reason,
      req.user.id,
    );
    return {
      message: 'KYC rejected',
      userId: user.id,
      kycStatus: user.kycStatus,
    };
  }

  // ==========================================
  // Audit Logs
  // ==========================================

  @Get('audit-logs')
  @Roles('admin')
  @ApiOperation({ summary: 'Query audit logs' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved' })
  async getAuditLogs(@Query() query: AuditLogQueryDto) {
    const auditQuery: AuditLogQuery = {
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

  @Get('audit-logs/user/:userId')
  @Roles('admin')
  @ApiOperation({ summary: 'Get audit logs for a specific user' })
  @ApiResponse({ status: 200, description: 'User audit logs retrieved' })
  async getUserAuditLogs(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    const logs = await this.auditService.getActorHistory(userId, limit || 50);
    return { logs };
  }

  @Get('audit-logs/resource/:resourceType/:resourceId')
  @Roles('admin')
  @ApiOperation({ summary: 'Get audit logs for a specific resource' })
  @ApiResponse({ status: 200, description: 'Resource audit logs retrieved' })
  async getResourceAuditLogs(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Query('limit') limit?: number,
  ) {
    const logs = await this.auditService.getResourceHistory(
      resourceType,
      resourceId,
      limit || 50,
    );
    return { logs };
  }

  // ==========================================
  // Reports
  // ==========================================

  @Get('reports/user-growth')
  @Roles('admin')
  @ApiOperation({ summary: 'Get user growth report (legacy)' })
  @ApiResponse({ status: 200, description: 'User growth report retrieved' })
  async getUserGrowthReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const data = await this.adminService.getUserGrowthReport(start, end);
    return { data };
  }

  @Get('reports/user-growth-timeseries')
  @Roles('admin')
  @ApiOperation({ summary: 'Get user growth time-series with running totals' })
  @ApiResponse({ status: 200, description: 'User growth time-series retrieved' })
  async getUserGrowthTimeSeries(@Query('days') days?: number) {
    const daysToFetch = days && days > 0 ? Math.min(days, 365) : 30;
    const data = await this.adminService.getUserGrowthTimeSeries(daysToFetch);
    return { data };
  }

  @Get('reports/kyc-status')
  @Roles('admin')
  @ApiOperation({ summary: 'Get KYC status distribution report' })
  @ApiResponse({ status: 200, description: 'KYC status report retrieved' })
  async getKycStatusReport() {
    const data = await this.adminService.getKycStatusReport();
    return { data };
  }
}
