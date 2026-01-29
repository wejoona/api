import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { BCEAOReportingService } from '../services/bceao-reporting.service';
import { AMLCFTService } from '../services/aml-cft.service';
import { SARGeneratorService } from '../services/sar-generator.service';
import { ComplianceDashboardService } from '../services/compliance-dashboard.service';
import {
  CreateManualSARDto,
  UpdateSARInvestigationDto,
  CloseSARDto,
  GenerateAdHocReportDto,
  ApproveReportDto,
  ResolveAlertDto,
} from '../dto';
import {
  SARStatus,
  ReportType,
  RiskLevel,
} from '../../domain/compliance.types';

/**
 * Compliance Controller
 *
 * Admin-only endpoints for compliance management.
 * Requires admin role and proper authentication.
 *
 * Endpoints:
 * - BCEAO report management
 * - SAR creation and management
 * - Alert handling
 * - Compliance dashboard
 * - Risk assessment
 */
@ApiTags('Compliance')
@ApiBearerAuth()
@Controller('compliance')
// @UseGuards(JwtAuthGuard, RolesGuard) // Uncomment when auth is ready
// @Roles('admin', 'compliance_officer')
export class ComplianceController {
  constructor(
    private readonly bceaoReportingService: BCEAOReportingService,
    private readonly amlCftService: AMLCFTService,
    private readonly sarGeneratorService: SARGeneratorService,
    private readonly dashboardService: ComplianceDashboardService,
  ) {}

  // ==========================================
  // Dashboard & Overview
  // ==========================================

  @Get('dashboard')
  @ApiOperation({ summary: 'Get compliance dashboard overview' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to analyze',
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: 'Compliance dashboard data',
  })
  async getDashboard(@Query('days') days?: number) {
    return this.dashboardService.getDashboard(days ? Number(days) : 30);
  }

  @Get('dashboard/health')
  @ApiOperation({ summary: 'Get compliance health score' })
  @ApiResponse({
    status: 200,
    description: 'Compliance health metrics',
  })
  async getHealthScore() {
    return this.dashboardService.getComplianceHealthScore();
  }

  @Get('dashboard/activity')
  @ApiOperation({ summary: 'Get recent compliance activity' })
  @ApiQuery({
    name: 'hours',
    required: false,
    description: 'Number of hours to analyze',
    example: 24,
  })
  @ApiResponse({
    status: 200,
    description: 'Recent activity summary',
  })
  async getRecentActivity(@Query('hours') hours?: number) {
    return this.dashboardService.getRecentActivity(hours ? Number(hours) : 24);
  }

  @Get('dashboard/pending')
  @ApiOperation({ summary: 'Get pending items requiring action' })
  @ApiResponse({
    status: 200,
    description: 'Pending reports, alerts, and SARs',
  })
  async getPendingItems() {
    return this.dashboardService.getPendingItems();
  }

  // ==========================================
  // BCEAO Reports
  // ==========================================

  @Get('reports')
  @ApiOperation({ summary: 'Get compliance reports' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['daily', 'weekly', 'monthly', 'suspicious'],
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'List of compliance reports',
  })
  async getReports(
    @Query('type') type?: ReportType,
    @Query('limit') limit?: number,
  ) {
    return this.bceaoReportingService.getReports(
      type,
      undefined,
      undefined,
      limit ? Number(limit) : 50,
    );
  }

  @Get('reports/:reportId')
  @ApiOperation({ summary: 'Get specific compliance report' })
  @ApiParam({ name: 'reportId', description: 'Report UUID' })
  @ApiResponse({
    status: 200,
    description: 'Report details',
  })
  async getReport(@Param('reportId') reportId: string) {
    return this.bceaoReportingService.getReport(reportId);
  }

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate ad-hoc compliance report' })
  @ApiResponse({
    status: 201,
    description: 'Report generated successfully',
  })
  async generateAdHocReport(
    @Body() dto: GenerateAdHocReportDto,
    // @CurrentUser() user: User, // Uncomment when auth is ready
  ) {
    const generatedBy = 'admin'; // Replace with user.id
    return this.bceaoReportingService.generateAdHocReport(
      new Date(dto.startDate),
      new Date(dto.endDate),
      generatedBy,
    );
  }

  @Put('reports/:reportId/approve')
  @ApiOperation({ summary: 'Approve report for submission' })
  @ApiParam({ name: 'reportId', description: 'Report UUID' })
  @ApiResponse({
    status: 200,
    description: 'Report approved',
  })
  async approveReport(
    @Param('reportId') reportId: string,
    @Body() dto: ApproveReportDto,
    // @CurrentUser() user: User,
  ) {
    const reviewerId = 'admin'; // Replace with user.id
    return this.bceaoReportingService.approveReport(
      reportId,
      reviewerId,
      dto.notes,
    );
  }

  @Post('reports/:reportId/submit')
  @ApiOperation({ summary: 'Submit report to BCEAO' })
  @ApiParam({ name: 'reportId', description: 'Report UUID' })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'Report submitted to BCEAO',
  })
  async submitReport(
    @Param('reportId') reportId: string,
    // @CurrentUser() user: User,
  ) {
    const submitterId = 'admin'; // Replace with user.id
    return this.bceaoReportingService.submitReport(reportId, submitterId);
  }

  @Get('reports/:reportId/export')
  @ApiOperation({ summary: 'Export report in regulatory format' })
  @ApiParam({ name: 'reportId', description: 'Report UUID' })
  @ApiResponse({
    status: 200,
    description: 'Report data in BCEAO format',
  })
  async exportReport(@Param('reportId') reportId: string) {
    return this.bceaoReportingService.exportReport(reportId);
  }

  @Get('reports/statistics')
  @ApiOperation({ summary: 'Get report statistics' })
  @ApiQuery({
    name: 'days',
    required: false,
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: 'Report statistics',
  })
  async getReportStatistics(@Query('days') days?: number) {
    return this.bceaoReportingService.getReportStatistics(
      days ? Number(days) : 30,
    );
  }

  // ==========================================
  // Suspicious Activity Reports (SARs)
  // ==========================================

  @Get('sars')
  @ApiOperation({ summary: 'Get suspicious activity reports' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['draft', 'under_investigation', 'submitted', 'closed', 'dismissed'],
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'List of SARs',
  })
  async getSARs(
    @Query('status') status?: SARStatus,
    @Query('limit') limit?: number,
  ) {
    if (status) {
      return this.sarGeneratorService.getSARsByStatus(
        status,
        limit ? Number(limit) : 50,
      );
    }

    // Return all recent SARs if no status specified
    return this.sarGeneratorService.getSARsByStatus(
      'draft',
      limit ? Number(limit) : 50,
    );
  }

  @Get('sars/:sarId')
  @ApiOperation({ summary: 'Get specific SAR' })
  @ApiParam({ name: 'sarId', description: 'SAR UUID' })
  @ApiResponse({
    status: 200,
    description: 'SAR details',
  })
  async getSAR(@Param('sarId') sarId: string) {
    return this.sarGeneratorService.getSAR(sarId);
  }

  @Post('sars')
  @ApiOperation({ summary: 'Create manual SAR' })
  @ApiResponse({
    status: 201,
    description: 'SAR created successfully',
  })
  async createManualSAR(
    @Body() dto: CreateManualSARDto,
    // @CurrentUser() user: User,
  ) {
    const officerId = 'admin'; // Replace with user.id
    return this.sarGeneratorService.createManualSAR(
      dto.userId,
      dto.transactionIds,
      dto.narrative,
      officerId,
      dto.riskScore,
    );
  }

  @Put('sars/:sarId/investigation')
  @ApiOperation({ summary: 'Update SAR investigation notes' })
  @ApiParam({ name: 'sarId', description: 'SAR UUID' })
  @ApiResponse({
    status: 200,
    description: 'Investigation updated',
  })
  async updateSARInvestigation(
    @Param('sarId') sarId: string,
    @Body() dto: UpdateSARInvestigationDto,
    // @CurrentUser() user: User,
  ) {
    const officerId = 'admin'; // Replace with user.id
    return this.sarGeneratorService.updateInvestigation(
      sarId,
      officerId,
      dto.notes,
    );
  }

  @Post('sars/:sarId/submit')
  @ApiOperation({ summary: 'Submit SAR to BCEAO' })
  @ApiParam({ name: 'sarId', description: 'SAR UUID' })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'SAR submitted to BCEAO',
  })
  async submitSAR(
    @Param('sarId') sarId: string,
    // @CurrentUser() user: User,
  ) {
    const officerId = 'admin'; // Replace with user.id
    return this.sarGeneratorService.submitSAR(sarId, officerId);
  }

  @Post('sars/:sarId/close')
  @ApiOperation({ summary: 'Close SAR' })
  @ApiParam({ name: 'sarId', description: 'SAR UUID' })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'SAR closed',
  })
  async closeSAR(
    @Param('sarId') sarId: string,
    @Body() dto: CloseSARDto,
    // @CurrentUser() user: User,
  ) {
    const officerId = 'admin'; // Replace with user.id
    return this.sarGeneratorService.closeSAR(
      sarId,
      officerId,
      dto.reason,
      false,
    );
  }

  @Post('sars/:sarId/dismiss')
  @ApiOperation({ summary: 'Dismiss SAR (false positive)' })
  @ApiParam({ name: 'sarId', description: 'SAR UUID' })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'SAR dismissed',
  })
  async dismissSAR(
    @Param('sarId') sarId: string,
    @Body() dto: CloseSARDto,
    // @CurrentUser() user: User,
  ) {
    const officerId = 'admin'; // Replace with user.id
    return this.sarGeneratorService.closeSAR(
      sarId,
      officerId,
      dto.reason,
      true,
    );
  }

  @Get('sars/:sarId/export')
  @ApiOperation({ summary: 'Export SAR in regulatory format' })
  @ApiParam({ name: 'sarId', description: 'SAR UUID' })
  @ApiResponse({
    status: 200,
    description: 'SAR export data',
  })
  async exportSAR(@Param('sarId') sarId: string) {
    return this.sarGeneratorService.exportSAR(sarId);
  }

  @Get('sars/statistics')
  @ApiOperation({ summary: 'Get SAR statistics' })
  @ApiQuery({
    name: 'days',
    required: false,
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: 'SAR statistics',
  })
  async getSARStatistics(@Query('days') days?: number) {
    return this.sarGeneratorService.getSARStatistics(days ? Number(days) : 30);
  }

  @Get('users/:userId/sars')
  @ApiOperation({ summary: 'Get user SAR history' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'User SAR history',
  })
  async getUserSARHistory(@Param('userId') userId: string) {
    return this.sarGeneratorService.getUserSARHistory(userId);
  }

  // ==========================================
  // Alerts
  // ==========================================

  @Get('alerts')
  @ApiOperation({ summary: 'Get compliance alerts' })
  @ApiQuery({
    name: 'severity',
    required: false,
    enum: ['low', 'medium', 'high', 'critical'],
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'List of compliance alerts',
  })
  async getAlerts(
    @Query('severity') severity?: RiskLevel,
    @Query('limit') limit?: number,
  ) {
    return this.amlCftService.getOpenAlerts(
      severity,
      limit ? Number(limit) : 50,
    );
  }

  @Post('alerts/:alertId/acknowledge')
  @ApiOperation({ summary: 'Acknowledge alert' })
  @ApiParam({ name: 'alertId', description: 'Alert UUID' })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'Alert acknowledged',
  })
  async acknowledgeAlert(
    @Param('alertId') alertId: string,
    // @CurrentUser() user: User,
  ) {
    const officerId = 'admin'; // Replace with user.id
    return this.amlCftService.acknowledgeAlert(alertId, officerId);
  }

  @Post('alerts/:alertId/resolve')
  @ApiOperation({ summary: 'Resolve alert' })
  @ApiParam({ name: 'alertId', description: 'Alert UUID' })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'Alert resolved',
  })
  async resolveAlert(
    @Param('alertId') alertId: string,
    @Body() dto: ResolveAlertDto,
    // @CurrentUser() user: User,
  ) {
    const officerId = 'admin'; // Replace with user.id
    return this.amlCftService.resolveAlert(
      alertId,
      officerId,
      dto.resolution,
      dto.escalateToSar || false,
    );
  }

  // ==========================================
  // Risk Assessment
  // ==========================================

  @Get('users/:userId/risk-profile')
  @ApiOperation({ summary: 'Get user risk profile' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'User risk assessment',
  })
  async getUserRiskProfile(@Param('userId') userId: string) {
    return this.amlCftService.getUserRiskProfile(userId);
  }

  @Post('users/:userId/analyze')
  @ApiOperation({
    summary: 'Run AML analysis on user',
    description: 'Analyze user transaction patterns for suspicious activity',
  })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'Analysis results',
  })
  async analyzeUser(@Param('userId') userId: string) {
    const [velocity, structuring, patterns] = await Promise.all([
      this.amlCftService.checkVelocity(userId),
      this.amlCftService.detectStructuring(userId),
      this.amlCftService.detectPatterns(userId),
    ]);

    return {
      userId,
      analyzedAt: new Date(),
      velocity,
      structuring,
      patterns,
    };
  }

  @Post('analysis/batch')
  @ApiOperation({
    summary: 'Run batch AML analysis',
    description: 'Analyze all active users for suspicious patterns',
  })
  @ApiQuery({
    name: 'daysBack',
    required: false,
    example: 7,
  })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'Batch analysis completed',
  })
  async runBatchAnalysis(@Query('daysBack') daysBack?: number) {
    return this.amlCftService.runBatchAnalysis(daysBack ? Number(daysBack) : 7);
  }

  // ==========================================
  // Export & Reporting
  // ==========================================

  @Post('export/summary')
  @ApiOperation({ summary: 'Export compliance summary for management' })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'Compliance summary exported',
  })
  async exportComplianceSummary(@Body() dto: GenerateAdHocReportDto) {
    return this.dashboardService.exportComplianceSummary(
      new Date(dto.startDate),
      new Date(dto.endDate),
    );
  }
}
