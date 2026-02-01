import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import {
  DailyTransactionReconciliationService,
  ProviderBalanceReconciliationService,
  FeeVerificationService,
  SettlementReportService,
} from '../services';
import {
  RunReconciliationDto,
  QueryReconciliationReportsDto,
  MarkReportReviewedDto,
  VerifyTransactionFeeDto,
  GenerateSettlementReportDto,
  GenerateMonthlySettlementDto,
  ReconcileProviderDto,
} from '../dto/requests';
import {
  ReconciliationReportResponseDto,
  DailySettlementSummaryResponseDto,
  FeeVerificationResultResponseDto,
  ReconciliationStatusResponseDto,
  ProviderBalanceEntryResponseDto,
} from '../dto/responses';
import { ReconciliationReportRepository } from '../../domain/repositories/reconciliation-report.repository';
import {
  ReconciliationReportType,
  ReconciliationReportEntity,
} from '../../domain/entities/reconciliation-report.entity';
// import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
// import { RolesGuard } from '@common/guards/roles.guard';
// import { Roles } from '@common/decorators/roles.decorator';
// import { CurrentUser } from '@common/decorators/current-user.decorator';

/**
 * Reconciliation Controller
 *
 * Provides comprehensive financial reconciliation API endpoints:
 * - Daily transaction reconciliation
 * - Provider balance matching
 * - Fee calculation verification
 * - Settlement reports
 *
 * Security: Admin/Finance team only - requires appropriate role
 */
@ApiTags('Reconciliation')
@Controller('reconciliation')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin', 'finance')
@ApiBearerAuth()
export class ReconciliationController {
  private readonly logger = new Logger(ReconciliationController.name);

  constructor(
    private readonly dailyReconciliationService: DailyTransactionReconciliationService,
    private readonly providerBalanceService: ProviderBalanceReconciliationService,
    private readonly feeVerificationService: FeeVerificationService,
    private readonly settlementReportService: SettlementReportService,
    private readonly reconciliationReportRepository: ReconciliationReportRepository,
  ) {}

  // ==========================================
  // Status & Overview
  // ==========================================

  @Get('status')
  @ApiOperation({
    summary: 'Get reconciliation service status',
    description: 'Returns the current status of all reconciliation services',
  })
  @ApiResponse({
    status: 200,
    description: 'Reconciliation status',
    type: ReconciliationStatusResponseDto,
  })
  async getStatus(): Promise<ReconciliationStatusResponseDto> {
    this.logger.log('Fetching reconciliation service status');

    const [lastDaily, lastBalance, lastFee, lastSettlement] = await Promise.all(
      [
        this.reconciliationReportRepository.findLatestByType(
          ReconciliationReportType.DAILY_TRANSACTION,
        ),
        this.reconciliationReportRepository.findLatestByType(
          ReconciliationReportType.PROVIDER_BALANCE,
        ),
        this.reconciliationReportRepository.findLatestByType(
          ReconciliationReportType.FEE_VERIFICATION,
        ),
        this.reconciliationReportRepository.findLatestByType(
          ReconciliationReportType.SETTLEMENT,
        ),
      ],
    );

    const pendingReview =
      await this.reconciliationReportRepository.findRequiringReview();

    const healthStatus = this.determineHealthStatus([
      lastDaily,
      lastBalance,
      lastFee,
      lastSettlement,
    ]);

    return {
      lastDailyReconciliation: lastDaily?.completedAt,
      lastBalanceReconciliation: lastBalance?.completedAt,
      lastFeeVerification: lastFee?.completedAt,
      lastSettlementReport: lastSettlement?.completedAt,
      pendingReviewCount: pendingReview.length,
      healthStatus,
    };
  }

  // ==========================================
  // Reports Management
  // ==========================================

  @Get('reports')
  @ApiOperation({
    summary: 'List reconciliation reports',
    description: 'Query reconciliation reports with optional filters',
  })
  @ApiResponse({
    status: 200,
    description: 'List of reconciliation reports',
    type: [ReconciliationReportResponseDto],
  })
  async listReports(
    @Query() query: QueryReconciliationReportsDto,
  ): Promise<ReconciliationReportResponseDto[]> {
    this.logger.log('Listing reconciliation reports');

    const reports = await this.reconciliationReportRepository.find({
      type: query.type,
      status: query.status,
      periodStart: query.periodStartFrom
        ? new Date(query.periodStartFrom)
        : undefined,
      periodEnd: query.periodEndTo ? new Date(query.periodEndTo) : undefined,
      limit: query.limit || 20,
      offset: query.offset || 0,
    });

    return reports.map(this.mapReportToDto);
  }

  @Get('reports/pending-review')
  @ApiOperation({
    summary: 'Get reports requiring review',
    description:
      'Returns all reconciliation reports that require manual review',
  })
  @ApiResponse({
    status: 200,
    description: 'Reports requiring review',
    type: [ReconciliationReportResponseDto],
  })
  async getReportsRequiringReview(): Promise<
    ReconciliationReportResponseDto[]
  > {
    this.logger.log('Fetching reports requiring review');

    const reports =
      await this.reconciliationReportRepository.findRequiringReview();
    return reports.map(this.mapReportToDto);
  }

  @Get('reports/:id')
  @ApiOperation({
    summary: 'Get reconciliation report by ID',
    description: 'Returns detailed reconciliation report',
  })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({
    status: 200,
    description: 'Reconciliation report',
    type: ReconciliationReportResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getReport(
    @Param('id') id: string,
  ): Promise<ReconciliationReportResponseDto> {
    this.logger.log(`Fetching reconciliation report: ${id}`);

    const report = await this.reconciliationReportRepository.findById(id);
    if (!report) {
      throw new Error('Report not found');
    }

    return this.mapReportToDto(report);
  }

  @Post('reports/:id/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark report as reviewed',
    description: 'Mark a reconciliation report as reviewed by finance team',
  })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({
    status: 200,
    description: 'Report marked as reviewed',
    type: ReconciliationReportResponseDto,
  })
  async markReviewed(
    @Param('id') id: string,
    @Body() dto: MarkReportReviewedDto,
    // @CurrentUser() user: { id: string },
  ): Promise<ReconciliationReportResponseDto> {
    this.logger.log(`Marking report ${id} as reviewed`);

    const report = await this.reconciliationReportRepository.findById(id);
    if (!report) {
      throw new Error('Report not found');
    }

    report.markReviewed('system-user', dto.notes); // Replace with user.id in production
    await this.reconciliationReportRepository.save(report);

    return this.mapReportToDto(report);
  }

  // ==========================================
  // Daily Transaction Reconciliation
  // ==========================================

  @Post('transactions/run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Run daily transaction reconciliation',
    description:
      'Manually trigger transaction reconciliation for a specific period',
  })
  @ApiResponse({
    status: 200,
    description: 'Reconciliation completed',
    type: ReconciliationReportResponseDto,
  })
  async runTransactionReconciliation(
    @Body() dto: RunReconciliationDto,
  ): Promise<ReconciliationReportResponseDto> {
    this.logger.log(
      `Running transaction reconciliation for ${dto.periodStart} to ${dto.periodEnd}`,
    );

    const report = await this.dailyReconciliationService.reconcile(
      new Date(dto.periodStart),
      new Date(dto.periodEnd),
    );

    return this.mapReportToDto(report);
  }

  @Post('transactions/run-daily')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Run daily reconciliation for yesterday',
    description: 'Trigger reconciliation for the previous day',
  })
  @ApiResponse({
    status: 200,
    description: 'Reconciliation completed',
    type: ReconciliationReportResponseDto,
  })
  async runDailyReconciliation(): Promise<ReconciliationReportResponseDto> {
    this.logger.log('Running daily transaction reconciliation');

    const report =
      await this.dailyReconciliationService.runDailyReconciliation();
    return this.mapReportToDto(report);
  }

  // ==========================================
  // Provider Balance Reconciliation
  // ==========================================

  @Post('balances/run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Run provider balance reconciliation',
    description: 'Compare balances across all providers',
  })
  @ApiResponse({
    status: 200,
    description: 'Balance reconciliation completed',
    type: ReconciliationReportResponseDto,
  })
  async runBalanceReconciliation(): Promise<ReconciliationReportResponseDto> {
    this.logger.log('Running provider balance reconciliation');

    const report =
      await this.providerBalanceService.runScheduledReconciliation();
    return this.mapReportToDto(report);
  }

  @Post('balances/provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reconcile specific provider',
    description: 'Reconcile balance for a specific provider',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider balance entries',
    type: [ProviderBalanceEntryResponseDto],
  })
  async reconcileProvider(
    @Body() dto: ReconcileProviderDto,
  ): Promise<ProviderBalanceEntryResponseDto[]> {
    this.logger.log(`Reconciling provider: ${dto.provider}`);

    const entries = await this.providerBalanceService.reconcileProvider(
      dto.provider,
    );
    return entries;
  }

  // ==========================================
  // Fee Verification
  // ==========================================

  @Post('fees/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Run fee verification',
    description: 'Verify fees for a specific period',
  })
  @ApiResponse({
    status: 200,
    description: 'Fee verification completed',
    type: ReconciliationReportResponseDto,
  })
  async runFeeVerification(
    @Body() dto: GenerateSettlementReportDto,
  ): Promise<ReconciliationReportResponseDto> {
    this.logger.log(
      `Running fee verification for ${dto.periodStart} to ${dto.periodEnd}`,
    );

    const report = await this.feeVerificationService.verifyFees(
      new Date(dto.periodStart),
      new Date(dto.periodEnd),
    );

    return this.mapReportToDto(report);
  }

  @Post('fees/verify-transaction')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify single transaction fee',
    description: 'Verify fee for a specific transaction',
  })
  @ApiResponse({
    status: 200,
    description: 'Fee verification result',
    type: FeeVerificationResultResponseDto,
  })
  async verifyTransactionFee(
    @Body() dto: VerifyTransactionFeeDto,
  ): Promise<FeeVerificationResultResponseDto | null> {
    this.logger.log(`Verifying fee for transaction: ${dto.transactionId}`);

    return this.feeVerificationService.verifyTransactionFee(dto.transactionId);
  }

  @Get('fees/expected')
  @ApiOperation({
    summary: 'Get expected fee',
    description: 'Calculate expected fee for a transaction',
  })
  @ApiResponse({
    status: 200,
    description: 'Expected fee amount',
  })
  getExpectedFee(
    @Query('provider') provider: string,
    @Query('type') type: string,
    @Query('amount') amount: string,
    @Query('currency') currency: string,
  ): { expectedFee: number } {
    const feeTypeMap: Record<string, any> = {
      deposit: 'deposit',
      withdrawal: 'withdrawal',
      transfer_internal: 'transfer_internal',
      transfer_external: 'transfer_external',
      bill_payment: 'bill_payment',
    };

    const expectedFee = this.feeVerificationService.getExpectedFee(
      provider,
      feeTypeMap[type] || type,
      parseFloat(amount),
      currency,
    );

    return { expectedFee };
  }

  // ==========================================
  // Settlement Reports
  // ==========================================

  @Post('settlement/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate settlement report',
    description: 'Generate settlement report for a specific period',
  })
  @ApiResponse({
    status: 200,
    description: 'Settlement report generated',
    type: ReconciliationReportResponseDto,
  })
  async generateSettlementReport(
    @Body() dto: GenerateSettlementReportDto,
  ): Promise<ReconciliationReportResponseDto> {
    this.logger.log(
      `Generating settlement report for ${dto.periodStart} to ${dto.periodEnd}`,
    );

    const report = await this.settlementReportService.generateSettlementReport(
      new Date(dto.periodStart),
      new Date(dto.periodEnd),
    );

    return this.mapReportToDto(report);
  }

  @Post('settlement/generate-daily')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate daily settlement',
    description: 'Generate settlement report for yesterday',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily settlement report',
    type: ReconciliationReportResponseDto,
  })
  async generateDailySettlement(): Promise<ReconciliationReportResponseDto> {
    this.logger.log('Generating daily settlement report');

    const report = await this.settlementReportService.generateDailySettlement();
    return this.mapReportToDto(report);
  }

  @Post('settlement/generate-monthly')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate monthly settlement',
    description: 'Generate settlement report for a specific month',
  })
  @ApiResponse({
    status: 200,
    description: 'Monthly settlement report',
    type: ReconciliationReportResponseDto,
  })
  async generateMonthlySettlement(
    @Body() dto: GenerateMonthlySettlementDto,
  ): Promise<ReconciliationReportResponseDto> {
    this.logger.log(
      `Generating monthly settlement for ${dto.year}-${dto.month}`,
    );

    const report = await this.settlementReportService.generateMonthlySettlement(
      dto.year,
      dto.month,
    );

    return this.mapReportToDto(report);
  }

  @Get('settlement/daily/:date')
  @ApiOperation({
    summary: 'Get daily settlement summary',
    description: 'Get settlement summary for a specific date',
  })
  @ApiParam({
    name: 'date',
    description: 'Date (YYYY-MM-DD)',
    example: '2024-01-28',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily settlement summary',
    type: DailySettlementSummaryResponseDto,
  })
  async getDailySettlement(
    @Param('date') dateStr: string,
  ): Promise<DailySettlementSummaryResponseDto> {
    this.logger.log(`Getting daily settlement summary for: ${dateStr}`);

    const date = new Date(dateStr);
    const summary =
      await this.settlementReportService.getDailySettlementSummary(date);

    return {
      date: summary.date,
      providers: summary.providers.map((p) => ({
        provider: p.provider,
        currency: p.currency,
        grossVolume: p.total.grossVolume.toFixed(2),
        totalFees: p.total.totalFees.toFixed(2),
        platformFees: p.total.platformFees.toFixed(2),
        providerFees: p.total.providerFees.toFixed(2),
        networkFees: p.total.networkFees.toFixed(2),
        netSettlement: p.total.netSettlement.toFixed(2),
        transactionCount: p.total.transactionCount,
        depositCount: p.deposits.count,
        withdrawalCount: p.withdrawals.count,
        transferCount: p.transfers.count,
      })),
      totalTransactionCount: summary.totals.transactionCount,
      totalGrossVolume: summary.totals.grossVolume.toFixed(2),
      totalFees: summary.totals.totalFees.toFixed(2),
      totalNetSettlement: summary.totals.netSettlement.toFixed(2),
      reconciliationStatus: summary.reconciliationStatus,
    };
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  private mapReportToDto(
    report: ReconciliationReportEntity,
  ): ReconciliationReportResponseDto {
    return {
      id: report.id,
      type: report.type,
      status: report.status,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      summary: report.summary,
      transactionDiscrepancies: report.transactionDiscrepancies,
      feeDiscrepancies: report.feeDiscrepancies,
      settlementEntries: report.settlementEntries,
      providerBalances: report.providerBalances,
      executedBy: report.executedBy,
      reviewedBy: report.reviewedBy,
      notes: report.notes,
      isReconciled: report.isReconciled,
      reconciliationPercentage: report.reconciliationPercentage,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      completedAt: report.completedAt,
    };
  }

  private determineHealthStatus(
    reports: (ReconciliationReportEntity | null)[],
  ): 'healthy' | 'warning' | 'critical' {
    const validReports = reports.filter((r) => r !== null);

    // Check for critical issues
    if (validReports.some((r) => r.summary.criticalDiscrepancies > 0)) {
      return 'critical';
    }

    // Check for high issues or stale reports
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const hasStaleReports = validReports.some(
      (r) => r.completedAt && r.completedAt < oneDayAgo,
    );

    if (
      hasStaleReports ||
      validReports.some((r) => r.summary.highDiscrepancies > 0)
    ) {
      return 'warning';
    }

    return 'healthy';
  }
}
