import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { DataRetentionService } from '../services/data-retention.service';
import { RetentionPolicyRepository } from '../../domain/repositories/retention-policy.repository';
import { CreateDeletionRequestDto, UpdateRetentionPolicyDto } from '../dto';
import {
  DeletionStatus,
  DeletionType,
} from '../../infrastructure/orm-entities/data-deletion-request.orm-entity';

// Note: Add JwtAuthGuard and AdminGuard when implementing auth
// import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
// import { AdminGuard } from '@common/guards/admin.guard';

@Controller('data-retention')
// @UseGuards(JwtAuthGuard, AdminGuard) // Enable when auth is ready
export class DataRetentionController {
  constructor(
    private readonly retentionService: DataRetentionService,
    private readonly policyRepository: RetentionPolicyRepository,
  ) {}

  // ==========================================
  // Retention Policies
  // ==========================================

  @Get('policies')
  async getPolicies() {
    const policies = await this.policyRepository.findAll();
    return {
      policies: policies.map((p) => ({
        id: p.id,
        dataType: p.dataType,
        retentionDays: p.retentionDays,
        action: p.action,
        gracePeriodDays: p.gracePeriodDays,
        isEnabled: p.isEnabled,
        description: p.description,
        complianceRequirement: p.complianceRequirement,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    };
  }

  @Get('policies/:dataType')
  async getPolicy(@Param('dataType') dataType: string) {
    const policy = await this.policyRepository.findByDataType(dataType);
    if (!policy) {
      return { error: 'Policy not found' };
    }
    return { policy };
  }

  @Put('policies/:dataType')
  async updatePolicy(
    @Param('dataType') dataType: string,
    @Body() dto: UpdateRetentionPolicyDto,
  ) {
    await this.policyRepository.update(dataType, dto);
    return { message: 'Policy updated successfully' };
  }

  // ==========================================
  // Manual Triggers
  // ==========================================

  @Post('cleanup/:dataType')
  async triggerCleanup(@Param('dataType') dataType: string) {
    return this.retentionService.triggerRetentionCleanup(dataType);
  }

  @Post('cleanup/all')
  async triggerAllCleanup() {
    await this.retentionService.dailyRetentionCleanup();
    return { message: 'Full retention cleanup triggered' };
  }

  // ==========================================
  // Deletion Requests (GDPR)
  // ==========================================

  @Post('deletion-requests')
  async createDeletionRequest(
    @Body() dto: CreateDeletionRequestDto,
    // @CurrentUser() currentUser: User, // Enable when auth is ready
  ) {
    // Map string to enum
    const deletionTypeMap: Record<string, DeletionType> = {
      gdpr: DeletionType.GDPR,
      account_closure: DeletionType.ACCOUNT_CLOSURE,
      admin: DeletionType.ADMIN,
    };

    const request = await this.retentionService.createDeletionRequest(
      dto.userId,
      null, // currentUser.id when auth is enabled
      deletionTypeMap[dto.deletionType],
      dto.reason,
      dto.daysDelay,
    );

    return {
      message: 'Deletion request created',
      request: {
        id: request.id,
        userId: request.userId,
        status: request.status,
        deletionType: request.deletionType,
        scheduledFor: request.scheduledFor,
      },
    };
  }

  @Get('deletion-requests')
  async getDeletionRequests(
    @Query('status') status?: DeletionStatus,
    @Query('limit') limit?: string,
  ) {
    const requests = await this.retentionService.getDeletionRequests(
      status,
      limit ? parseInt(limit, 10) : 50,
    );

    return {
      requests: requests.map((r) => ({
        id: r.id,
        userId: r.userId,
        status: r.status,
        deletionType: r.deletionType,
        reason: r.reason,
        scheduledFor: r.scheduledFor,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        failedAt: r.failedAt,
        errorMessage: r.errorMessage,
        auditTrail: r.auditTrail,
        createdAt: r.createdAt,
      })),
    };
  }

  @Get('deletion-requests/:id')
  async getDeletionRequest(@Param('id') id: string) {
    const requests = await this.retentionService.getDeletionRequests();
    const request = requests.find((r) => r.id === id);

    if (!request) {
      return { error: 'Deletion request not found' };
    }

    return { request };
  }

  // ==========================================
  // Logs
  // ==========================================

  @Get('logs')
  async getLogs(
    @Query('dataType') dataType?: string,
    @Query('limit') limit?: string,
  ) {
    const logs = await this.retentionService.getRetentionLogs(
      dataType,
      limit ? parseInt(limit, 10) : 50,
    );

    return {
      logs: logs.map((l) => ({
        id: l.id,
        jobName: l.jobName,
        dataType: l.dataType,
        action: l.action,
        recordsProcessed: l.recordsProcessed,
        recordsDeleted: l.recordsDeleted,
        recordsAnonymized: l.recordsAnonymized,
        recordsArchived: l.recordsArchived,
        status: l.status,
        startedAt: l.startedAt,
        completedAt: l.completedAt,
        errorMessage: l.errorMessage,
        createdAt: l.createdAt,
      })),
    };
  }
}
