import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@/modules/user/domain/entities/user.entity';
import { RegulatoryReportRepository } from '../../domain/repositories/regulatory-report.repository';
import { BCEAOTransactionReportService } from '../services/bceao-transaction-report.service';
import { SuspiciousActivityReportService } from '../services/suspicious-activity-report.service';
import { MonthlyComplianceSummaryService } from '../services/monthly-compliance-summary.service';
import { AuditTrailExportService } from '../services/audit-trail-export.service';
import {
  GenerateReportDto,
  GenerateSARDto,
  GenerateAuditExportDto,
} from '../dto/generate-report.dto';
import {
  ReportSummaryDto,
  ReportDetailDto,
  ReportListResponseDto,
  ReportStatisticsDto,
} from '../dto/report-response.dto';
import {
  RegulatoryReportType,
  ReportStatus,
  ReportPeriod,
} from '../../domain/types';

/**
 * Regulatory Reports Controller
 *
 * Provides API endpoints for regulatory reporting per BCEAO requirements.
 *
 * Access Control:
 * - All endpoints require authentication
 * - Report generation requires COMPLIANCE_OFFICER or ADMIN role
 * - Approval/submission requires COMPLIANCE_MANAGER or ADMIN role
 */
import { ApiTags } from '@nestjs/swagger';
@ApiTags('Regulatory Reports')
@Controller('regulatory-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RegulatoryReportsController {
  constructor(
    private readonly reportRepository: RegulatoryReportRepository,
    private readonly bceaoReportService: BCEAOTransactionReportService,
    private readonly sarService: SuspiciousActivityReportService,
    private readonly complianceSummaryService: MonthlyComplianceSummaryService,
    private readonly auditExportService: AuditTrailExportService,
  ) {}

  // ==========================================
  // Report Listing & Retrieval
  // ==========================================

  /**
   * List all regulatory reports
   */
  @Get()
  @Roles('compliance_officer', 'compliance_manager', 'admin')
  async listReports(
    @Query('type') type?: RegulatoryReportType,
    @Query('status') status?: ReportStatus,
    @Query('period') period?: ReportPeriod,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
  ): Promise<ReportListResponseDto> {
    const offset = (page - 1) * pageSize;

    const [reports, total] = await Promise.all([
      this.reportRepository.findAll({
        reportType: type,
        status,
        period,
        limit: pageSize,
        offset,
        orderBy: 'createdAt',
        orderDirection: 'DESC',
      }),
      this.reportRepository.count({ reportType: type, status }),
    ]);

    return {
      reports: reports.map((r) => this.toSummaryDto(r)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get report by ID
   */
  @Get(':id')
  @Roles('compliance_officer', 'compliance_manager', 'admin')
  async getReport(@Param('id') id: string): Promise<ReportDetailDto> {
    const report = await this.reportRepository.findById(id);

    if (!report) {
      throw new NotFoundException(`Report ${id} not found`);
    }

    return this.toDetailDto(report);
  }

  /**
   * Get pending reports requiring action
   */
  @Get('pending/all')
  @Roles('compliance_officer', 'compliance_manager', 'admin')
  async getPendingReports(): Promise<ReportSummaryDto[]> {
    const reports = await this.reportRepository.findPendingSubmission();
    return reports.map((r) => this.toSummaryDto(r));
  }

  /**
   * Get overdue reports
   */
  @Get('overdue/all')
  @Roles('compliance_officer', 'compliance_manager', 'admin')
  async getOverdueReports(): Promise<ReportSummaryDto[]> {
    const reports = await this.reportRepository.findOverdue();
    return reports.map((r) => this.toSummaryDto(r));
  }

  /**
   * Get report statistics
   */
  @Get('statistics/summary')
  @Roles('compliance_officer', 'compliance_manager', 'admin')
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<ReportStatisticsDto> {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await this.reportRepository.getStatistics(start, end);

    return {
      totalReports: stats.totalReports,
      byStatus: stats.byStatus as Record<string, number>,
      byType: stats.byType as Record<string, number>,
      submittedCount: stats.submittedCount,
      pendingCount: stats.pendingCount,
      overdueCount: stats.overdueCount,
      averageProcessingTimeHours: stats.averageProcessingTimeHours,
    };
  }

  // ==========================================
  // BCEAO Transaction Reports
  // ==========================================

  /**
   * Generate BCEAO transaction report
   */
  @Post('bceao/generate')
  @Roles('compliance_officer', 'compliance_manager', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async generateBCEAOReport(
    @Body() dto: GenerateReportDto,
    @CurrentUser() user: User,
  ): Promise<ReportDetailDto> {
    if (dto.reportType !== RegulatoryReportType.BCEAO_TRANSACTION) {
      throw new BadRequestException(
        'Use this endpoint only for BCEAO transaction reports',
      );
    }

    const report = await this.bceaoReportService.generateReport(
      dto.period,
      dto.periodStart,
      dto.periodEnd,
      user.id,
    );

    return this.toDetailDto(report);
  }

  /**
   * Trigger daily BCEAO report generation (manual trigger)
   */
  @Post('bceao/daily')
  @Roles('compliance_manager', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async triggerDailyBCEAOReport(
    @CurrentUser() _user: User,
  ): Promise<ReportDetailDto> {
    const report = await this.bceaoReportService.generateDailyReport();
    return this.toDetailDto(report);
  }

  // ==========================================
  // Suspicious Activity Reports (SAR)
  // ==========================================

  /**
   * Generate Suspicious Activity Report
   */
  @Post('sar/generate')
  @Roles('compliance_officer', 'compliance_manager', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async generateSAR(
    @Body() dto: GenerateSARDto,
    @CurrentUser() user: User,
  ): Promise<ReportDetailDto> {
    const report = await this.sarService.generateSAR(dto, user.id);
    return this.toDetailDto(report);
  }

  /**
   * Get pending SARs
   */
  @Get('sar/pending')
  @Roles('compliance_officer', 'compliance_manager', 'admin')
  async getPendingSARs(): Promise<ReportSummaryDto[]> {
    const reports = await this.sarService.getPendingSARs();
    return reports.map((r) => this.toSummaryDto(r));
  }

  /**
   * Get overdue SARs
   */
  @Get('sar/overdue')
  @Roles('compliance_officer', 'compliance_manager', 'admin')
  async getOverdueSARs(): Promise<ReportSummaryDto[]> {
    const reports = await this.sarService.getOverdueSARs();
    return reports.map((r) => this.toSummaryDto(r));
  }

  /**
   * Get common SAR indicators
   */
  @Get('sar/indicators')
  @Roles('compliance_officer', 'compliance_manager', 'admin')
  async getSARIndicators(): Promise<string[]> {
    return SuspiciousActivityReportService.COMMON_INDICATORS;
  }

  // ==========================================
  // Monthly Compliance Summaries
  // ==========================================

  /**
   * Generate monthly compliance summary
   */
  @Post('compliance-summary/generate')
  @Roles('compliance_officer', 'compliance_manager', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async generateComplianceSummary(
    @Body() dto: GenerateReportDto,
    @CurrentUser() user: User,
  ): Promise<ReportDetailDto> {
    const report = await this.complianceSummaryService.generateSummary(
      dto.periodStart,
      dto.periodEnd,
      user.id,
    );

    return this.toDetailDto(report);
  }

  /**
   * Generate quarterly compliance summary
   */
  @Post('compliance-summary/quarterly')
  @Roles('compliance_manager', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async generateQuarterlySummary(
    @Body() body: { quarter: 1 | 2 | 3 | 4; year: number },
    @CurrentUser() user: User,
  ): Promise<ReportDetailDto> {
    const report = await this.complianceSummaryService.generateQuarterlySummary(
      body.quarter,
      body.year,
      user.id,
    );

    return this.toDetailDto(report);
  }

  // ==========================================
  // Audit Trail Exports
  // ==========================================

  /**
   * Generate audit trail export
   */
  @Post('audit/export')
  @Roles('compliance_officer', 'compliance_manager', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async generateAuditExport(
    @Body() dto: GenerateAuditExportDto,
    @CurrentUser() user: User,
  ): Promise<ReportDetailDto> {
    const report = await this.auditExportService.generateAuditExport(
      dto,
      user.id,
    );

    return this.toDetailDto(report);
  }

  /**
   * Get audit history for an entity
   */
  @Get('audit/entity/:entityType/:entityId')
  @Roles('compliance_officer', 'compliance_manager', 'admin')
  async getEntityAuditHistory(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('limit') limit = 100,
  ) {
    return this.auditExportService.getEntityAuditHistory(
      entityType,
      entityId,
      limit,
    );
  }

  /**
   * Get audit history for a user
   */
  @Get('audit/user/:userId')
  @Roles('compliance_officer', 'compliance_manager', 'admin')
  async getUserAuditHistory(
    @Param('userId') userId: string,
    @Query('limit') limit = 100,
  ) {
    return this.auditExportService.getUserAuditHistory(userId, limit);
  }

  // ==========================================
  // Report Workflow (Review, Approve, Submit)
  // ==========================================

  /**
   * Submit report for review
   */
  @Put(':id/review')
  @Roles('compliance_officer', 'compliance_manager', 'admin')
  async submitForReview(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @CurrentUser() user: User,
  ): Promise<ReportDetailDto> {
    const report = await this.reportRepository.findById(id);

    if (!report) {
      throw new NotFoundException(`Report ${id} not found`);
    }

    report.markForReview(user.id, body.notes);
    const saved = await this.reportRepository.save(report);

    return this.toDetailDto(saved);
  }

  /**
   * Approve report
   */
  @Put(':id/approve')
  @Roles('compliance_manager', 'admin')
  async approveReport(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @CurrentUser() user: User,
  ): Promise<ReportDetailDto> {
    const report = await this.reportRepository.findById(id);

    if (!report) {
      throw new NotFoundException(`Report ${id} not found`);
    }

    report.approve(user.id, body.notes);
    const saved = await this.reportRepository.save(report);

    return this.toDetailDto(saved);
  }

  /**
   * Reject report
   */
  @Put(':id/reject')
  @Roles('compliance_manager', 'admin')
  async rejectReport(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @CurrentUser() _user: User,
  ): Promise<ReportDetailDto> {
    const report = await this.reportRepository.findById(id);

    if (!report) {
      throw new NotFoundException(`Report ${id} not found`);
    }

    if (!body.reason) {
      throw new BadRequestException('Rejection reason is required');
    }

    report.reject(body.reason);
    const saved = await this.reportRepository.save(report);

    return this.toDetailDto(saved);
  }

  /**
   * Submit report to BCEAO
   */
  @Put(':id/submit')
  @Roles('compliance_manager', 'admin')
  async submitReport(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<ReportDetailDto> {
    const report = await this.reportRepository.findById(id);

    if (!report) {
      throw new NotFoundException(`Report ${id} not found`);
    }

    if (!report.canBeSubmitted()) {
      throw new BadRequestException(
        `Report cannot be submitted in status: ${report.status}`,
      );
    }

    // Generate BCEAO reference
    const bceaoReference = this.generateBCEAOReference(report);
    report.submit(user.id, bceaoReference);

    const saved = await this.reportRepository.save(report);

    return this.toDetailDto(saved);
  }

  /**
   * Acknowledge report receipt (usually from BCEAO callback)
   */
  @Put(':id/acknowledge')
  @Roles('admin')
  async acknowledgeReport(@Param('id') id: string): Promise<ReportDetailDto> {
    const report = await this.reportRepository.findById(id);

    if (!report) {
      throw new NotFoundException(`Report ${id} not found`);
    }

    report.acknowledge();
    const saved = await this.reportRepository.save(report);

    return this.toDetailDto(saved);
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  private toSummaryDto(report: any): ReportSummaryDto {
    return {
      id: report.id,
      reportType: report.reportType,
      reportPeriod: report.reportPeriod,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      status: report.status,
      title: report.title,
      bceaoReference: report.bceaoReference,
      submissionDeadline: report.submissionDeadline,
      generatedBy: report.generatedBy,
      createdAt: report.createdAt,
      isOverdue: report.isOverdue?.() ?? false,
    };
  }

  private toDetailDto(report: any): ReportDetailDto {
    return {
      ...this.toSummaryDto(report),
      description: report.description,
      reportData: report.reportData,
      exportFormat: report.exportFormat,
      fileUrl: report.fileUrl,
      fileSize: report.fileSize,
      checksum: report.checksum,
      reviewedBy: report.reviewedBy,
      approvedBy: report.approvedBy,
      submittedBy: report.submittedBy,
      submittedAt: report.submittedAt,
      acknowledgedAt: report.acknowledgedAt,
      rejectionReason: report.rejectionReason,
      notes: report.notes,
      metadata: report.metadata,
      updatedAt: report.updatedAt,
    };
  }

  private generateBCEAOReference(report: any): string {
    const year = report.periodStart.getFullYear();
    const month = String(report.periodStart.getMonth() + 1).padStart(2, '0');
    const typeCode = this.getReportTypeCode(report.reportType);
    const sequence = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');

    return `BCEAO-JP-${year}${month}-${typeCode}-${sequence}`;
  }

  private getReportTypeCode(type: RegulatoryReportType): string {
    const codes: Record<RegulatoryReportType, string> = {
      [RegulatoryReportType.BCEAO_TRANSACTION]: 'TXN',
      [RegulatoryReportType.SUSPICIOUS_ACTIVITY]: 'SAR',
      [RegulatoryReportType.MONTHLY_COMPLIANCE]: 'CMP',
      [RegulatoryReportType.AUDIT_TRAIL]: 'AUD',
      [RegulatoryReportType.LARGE_TRANSACTION]: 'LTR',
      [RegulatoryReportType.CROSS_BORDER]: 'CBR',
      [RegulatoryReportType.KYC_SUMMARY]: 'KYC',
      [RegulatoryReportType.AML_CFT]: 'AML',
    };
    return codes[type] || 'GEN';
  }
}
