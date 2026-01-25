import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, In } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import {
  TransactionReport,
  ReportType,
  BCEAOReportMetrics,
} from '../../domain/compliance.types';
import { ComplianceReportOrmEntity } from '../../infrastructure/orm-entities';
import { TransactionOrmEntity } from '../../../transaction/infrastructure/orm-entities/transaction.orm-entity';
import { UserOrmEntity } from '../../../user/infrastructure/orm-entities/user.orm-entity';

/**
 * BCEAO Reporting Service
 *
 * Generates periodic compliance reports per BCEAO (Central Bank of West African States) requirements.
 *
 * Report Schedule:
 * - Daily: 00:00 WAT (West Africa Time = UTC+0)
 * - Weekly: Sunday 00:00 WAT
 * - Monthly: 1st of month 00:00 WAT
 *
 * Key Metrics:
 * - Transaction volumes and counts
 * - Cross-border transactions
 * - Large transactions (>1M XOF / ~$1,600 USD)
 * - User activity statistics
 * - Suspicious activity summary
 */
@Injectable()
export class BCEAOReportingService {
  private readonly logger = new Logger(BCEAOReportingService.name);
  private readonly LARGE_TRANSACTION_THRESHOLD_XOF = 1_000_000; // 1M XOF
  private readonly XOF_TO_USDC_RATE = 600; // Approximate rate, should be fetched from exchange service

  constructor(
    @InjectRepository(ComplianceReportOrmEntity)
    private readonly reportRepository: Repository<ComplianceReportOrmEntity>,
    @InjectRepository(TransactionOrmEntity)
    private readonly transactionRepository: Repository<TransactionOrmEntity>,
    @InjectRepository(UserOrmEntity)
    private readonly userRepository: Repository<UserOrmEntity>,
    private readonly configService: ConfigService,
  ) {}

  // ==========================================
  // Scheduled Report Generation
  // ==========================================

  /**
   * Generate daily transaction report
   * Runs daily at midnight WAT (UTC+0)
   */
  @Cron('0 0 * * *', {
    name: 'daily_bceao_report',
    timeZone: 'Africa/Abidjan', // WAT timezone
  })
  async generateDailyReport(): Promise<ComplianceReportOrmEntity> {
    this.logger.log('Generating daily BCEAO report');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    return this.generateReport('daily', yesterday, endOfYesterday);
  }

  /**
   * Generate weekly transaction report
   * Runs every Sunday at midnight WAT
   */
  @Cron('0 0 * * 0', {
    name: 'weekly_bceao_report',
    timeZone: 'Africa/Abidjan',
  })
  async generateWeeklyReport(): Promise<ComplianceReportOrmEntity> {
    this.logger.log('Generating weekly BCEAO report');

    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    return this.generateReport('weekly', startDate, endDate);
  }

  /**
   * Generate monthly transaction report
   * Runs on 1st of each month at midnight WAT
   */
  @Cron('0 0 1 * *', {
    name: 'monthly_bceao_report',
    timeZone: 'Africa/Abidjan',
  })
  async generateMonthlyReport(): Promise<ComplianceReportOrmEntity> {
    this.logger.log('Generating monthly BCEAO report');

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    return this.generateReport('monthly', startDate, endDate);
  }

  // ==========================================
  // Core Report Generation
  // ==========================================

  /**
   * Generate a comprehensive BCEAO compliance report
   *
   * @param reportType - Type of report (daily, weekly, monthly)
   * @param periodStart - Start of reporting period
   * @param periodEnd - End of reporting period
   * @returns Generated compliance report
   */
  async generateReport(
    reportType: ReportType,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<ComplianceReportOrmEntity> {
    try {
      this.logger.log(
        `Generating ${reportType} report for period ${periodStart.toISOString()} to ${periodEnd.toISOString()}`,
      );

      // Fetch all transactions in period
      const transactions = await this.transactionRepository.find({
        where: {
          createdAt: Between(periodStart, periodEnd),
          status: In(['completed', 'pending', 'processing']),
        },
        relations: ['wallet'],
      });

      // Calculate metrics
      const metrics = await this.calculateMetrics(
        transactions,
        periodStart,
        periodEnd,
      );

      // Identify flagged transactions
      const flaggedTransactions = this.identifyFlaggedTransactions(transactions);

      // Identify large transactions (>1M XOF)
      const largeTransactions = this.identifyLargeTransactions(transactions);

      // Create report entity
      const report = this.reportRepository.create({
        reportType,
        periodStart,
        periodEnd,
        totalTransactions: transactions.length,
        totalVolume: metrics.totalVolume,
        totalVolumeXof: metrics.totalVolumeXof,
        crossBorderCount: metrics.totalCrossBorderTransactions,
        crossBorderVolume: this.calculateCrossBorderVolume(transactions),
        largeTransactionCount: largeTransactions.length,
        flaggedTransactions: flaggedTransactions.map((t) => t.id),
        uniqueUsers: metrics.activeUsers,
        newUsers: metrics.newUsers,
        suspiciousActivityCount: metrics.suspiciousActivities,
        status: 'draft',
        reportData: {
          metrics,
          largeTransactions: largeTransactions.map((t) => ({
            id: t.id,
            amount: t.amount,
            amountXof: Number(t.amount) * this.XOF_TO_USDC_RATE,
            type: t.type,
            timestamp: t.createdAt,
          })),
          crossBorderTransactions: this.getCrossBorderTransactions(transactions),
        },
        generatedBy: 'system',
      });

      const savedReport = await this.reportRepository.save(report);

      this.logger.log(
        `${reportType} report generated successfully: ${savedReport.id}`,
      );

      return savedReport;
    } catch (error) {
      this.logger.error(
        `Failed to generate ${reportType} report: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Calculate comprehensive report metrics
   */
  private async calculateMetrics(
    transactions: TransactionOrmEntity[],
    periodStart: Date,
    periodEnd: Date,
  ): Promise<BCEAOReportMetrics> {
    const deposits = transactions.filter((t) => t.type === 'deposit');
    const withdrawals = transactions.filter((t) => t.type === 'withdrawal');
    const transfers = transactions.filter(
      (t) => t.type === 'transfer_internal' || t.type === 'transfer_external',
    );
    const internalTransfers = transactions.filter(
      (t) => t.type === 'transfer_internal',
    );
    const externalTransfers = transactions.filter(
      (t) => t.type === 'transfer_external',
    );
    const crossBorder = this.getCrossBorderTransactions(transactions);

    const totalVolume = transactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    );
    const totalVolumeXof = totalVolume * this.XOF_TO_USDC_RATE;

    // Get unique users from transactions
    const uniqueWalletIds = new Set(transactions.map((t) => t.walletId));
    const activeUsers = uniqueWalletIds.size;

    // Get new users in period
    const newUsers = await this.userRepository.count({
      where: {
        createdAt: Between(periodStart, periodEnd),
      },
    });

    return {
      totalDeposits: deposits.reduce((sum, t) => sum + Number(t.amount), 0),
      totalWithdrawals: withdrawals.reduce(
        (sum, t) => sum + Number(t.amount),
        0,
      ),
      totalTransfers: transfers.reduce((sum, t) => sum + Number(t.amount), 0),
      totalInternalTransfers: internalTransfers.reduce(
        (sum, t) => sum + Number(t.amount),
        0,
      ),
      totalExternalTransfers: externalTransfers.reduce(
        (sum, t) => sum + Number(t.amount),
        0,
      ),
      totalCrossBorderTransactions: crossBorder.length,
      totalVolume,
      totalVolumeXof,
      averageTransactionSize:
        transactions.length > 0 ? totalVolume / transactions.length : 0,
      largeTransactions: this.identifyLargeTransactions(transactions).length,
      activeUsers,
      newUsers,
      suspiciousActivities: 0, // Will be populated by AML service
      blockedTransactions: transactions.filter((t) => t.status === 'blocked')
        .length,
    };
  }

  /**
   * Identify transactions that should be flagged for review
   */
  private identifyFlaggedTransactions(
    transactions: TransactionOrmEntity[],
  ): TransactionOrmEntity[] {
    return transactions.filter((t) => {
      // Flag large transactions
      const amountXof = Number(t.amount) * this.XOF_TO_USDC_RATE;
      if (amountXof > this.LARGE_TRANSACTION_THRESHOLD_XOF) {
        return true;
      }

      // Flag failed/blocked transactions
      if (t.status === 'failed' || t.status === 'blocked') {
        return true;
      }

      // Flag cross-border transactions
      if (this.isCrossBorderTransaction(t)) {
        return true;
      }

      return false;
    });
  }

  /**
   * Identify large transactions exceeding BCEAO threshold
   */
  private identifyLargeTransactions(
    transactions: TransactionOrmEntity[],
  ): TransactionOrmEntity[] {
    return transactions.filter((t) => {
      const amountXof = Number(t.amount) * this.XOF_TO_USDC_RATE;
      return amountXof > this.LARGE_TRANSACTION_THRESHOLD_XOF;
    });
  }

  /**
   * Get cross-border transactions
   */
  private getCrossBorderTransactions(
    transactions: TransactionOrmEntity[],
  ): TransactionOrmEntity[] {
    return transactions.filter((t) => this.isCrossBorderTransaction(t));
  }

  /**
   * Check if transaction is cross-border
   * Based on recipient address, phone country code, or metadata
   */
  private isCrossBorderTransaction(transaction: TransactionOrmEntity): boolean {
    // Check metadata for cross-border indicators
    if (transaction.metadata?.crossBorder === true) {
      return true;
    }

    // Check recipient phone country code
    if (transaction.recipientPhone) {
      const recipientCountry = this.extractCountryFromPhone(
        transaction.recipientPhone,
      );
      const waCountries = ['CI', 'SN', 'ML', 'BF', 'BJ', 'TG', 'NE', 'GW'];
      return !waCountries.includes(recipientCountry);
    }

    return false;
  }

  /**
   * Extract country code from phone number
   */
  private extractCountryFromPhone(phone: string): string {
    // Simple extraction based on common West African codes
    if (phone.startsWith('+225')) return 'CI'; // Ivory Coast
    if (phone.startsWith('+221')) return 'SN'; // Senegal
    if (phone.startsWith('+223')) return 'ML'; // Mali
    if (phone.startsWith('+226')) return 'BF'; // Burkina Faso
    if (phone.startsWith('+229')) return 'BJ'; // Benin
    if (phone.startsWith('+228')) return 'TG'; // Togo
    if (phone.startsWith('+227')) return 'NE'; // Niger
    if (phone.startsWith('+245')) return 'GW'; // Guinea-Bissau
    return 'UNKNOWN';
  }

  /**
   * Calculate total volume of cross-border transactions
   */
  private calculateCrossBorderVolume(
    transactions: TransactionOrmEntity[],
  ): number {
    return this.getCrossBorderTransactions(transactions).reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    );
  }

  // ==========================================
  // Report Management
  // ==========================================

  /**
   * Get report by ID
   */
  async getReport(reportId: string): Promise<ComplianceReportOrmEntity> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
    });

    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    return report;
  }

  /**
   * Get reports by type and date range
   */
  async getReports(
    reportType?: ReportType,
    startDate?: Date,
    endDate?: Date,
    limit = 50,
  ): Promise<ComplianceReportOrmEntity[]> {
    const query = this.reportRepository.createQueryBuilder('report');

    if (reportType) {
      query.andWhere('report.reportType = :reportType', { reportType });
    }

    if (startDate && endDate) {
      query.andWhere('report.periodStart >= :startDate', { startDate });
      query.andWhere('report.periodEnd <= :endDate', { endDate });
    }

    query.orderBy('report.createdAt', 'DESC').take(limit);

    return query.getMany();
  }

  /**
   * Approve report for submission
   */
  async approveReport(
    reportId: string,
    reviewerId: string,
    notes?: string,
  ): Promise<ComplianceReportOrmEntity> {
    const report = await this.getReport(reportId);

    if (report.status !== 'draft' && report.status !== 'pending_review') {
      throw new Error(
        `Report ${reportId} cannot be approved (current status: ${report.status})`,
      );
    }

    report.status = 'approved';
    report.reviewedBy = reviewerId;
    if (notes) {
      report.notes = notes;
    }

    return this.reportRepository.save(report);
  }

  /**
   * Submit report to BCEAO
   * In production, this would integrate with BCEAO API
   */
  async submitReport(
    reportId: string,
    submitterId: string,
  ): Promise<ComplianceReportOrmEntity> {
    const report = await this.getReport(reportId);

    if (report.status !== 'approved') {
      throw new Error(
        `Report ${reportId} must be approved before submission (current status: ${report.status})`,
      );
    }

    // TODO: Integrate with BCEAO submission API
    // For now, mark as submitted with mock reference
    report.status = 'submitted';
    report.submittedBy = submitterId;
    report.submittedAt = new Date();
    report.bceaoReference = this.generateBCEAOReference(report);

    const submittedReport = await this.reportRepository.save(report);

    this.logger.log(
      `Report ${reportId} submitted to BCEAO with reference ${report.bceaoReference}`,
    );

    return submittedReport;
  }

  /**
   * Generate BCEAO reference number
   * Format: BCEAO-{YEAR}-{MONTH}-{REPORT_TYPE}-{SEQUENCE}
   */
  private generateBCEAOReference(report: ComplianceReportOrmEntity): string {
    const year = report.periodStart.getFullYear();
    const month = String(report.periodStart.getMonth() + 1).padStart(2, '0');
    const type = report.reportType.toUpperCase().substring(0, 1);
    const sequence = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');

    return `BCEAO-${year}-${month}-${type}-${sequence}`;
  }

  /**
   * Export report in regulatory format
   * Returns structured data for BCEAO submission
   */
  async exportReport(reportId: string): Promise<Record<string, unknown>> {
    const report = await this.getReport(reportId);

    return {
      reportMetadata: {
        reportId: report.id,
        reportType: report.reportType,
        periodStart: report.periodStart.toISOString(),
        periodEnd: report.periodEnd.toISOString(),
        generatedAt: report.createdAt.toISOString(),
        submittedAt: report.submittedAt?.toISOString(),
        bceaoReference: report.bceaoReference,
      },
      summary: {
        totalTransactions: report.totalTransactions,
        totalVolumeUsdc: report.totalVolume,
        totalVolumeXof: report.totalVolumeXof,
        crossBorderTransactions: report.crossBorderCount,
        crossBorderVolume: report.crossBorderVolume,
        largeTransactions: report.largeTransactionCount,
        uniqueUsers: report.uniqueUsers,
        newUsers: report.newUsers,
        suspiciousActivities: report.suspiciousActivityCount,
      },
      detailedMetrics: report.reportData,
      flaggedTransactions: report.flaggedTransactions,
      complianceOfficer: {
        generatedBy: report.generatedBy,
        reviewedBy: report.reviewedBy,
        submittedBy: report.submittedBy,
      },
      notes: report.notes,
    };
  }

  /**
   * Get pending reports requiring review
   */
  async getPendingReports(): Promise<ComplianceReportOrmEntity[]> {
    return this.reportRepository.find({
      where: {
        status: In(['draft', 'pending_review']),
      },
      order: {
        createdAt: 'DESC',
      },
      take: 100,
    });
  }

  /**
   * Archive old reports (soft delete)
   * Reports are retained for 7 years per BCEAO requirements
   */
  async archiveOldReports(): Promise<number> {
    const retentionDays =
      this.configService.get<number>('compliance.reportRetentionDays') ||
      2555; // 7 years

    const archiveDate = new Date();
    archiveDate.setDate(archiveDate.getDate() - retentionDays);

    const result = await this.reportRepository
      .createQueryBuilder()
      .update()
      .set({ archivedAt: new Date() })
      .where('createdAt < :archiveDate', { archiveDate })
      .andWhere('archivedAt IS NULL')
      .execute();

    this.logger.log(`Archived ${result.affected} old compliance reports`);
    return result.affected || 0;
  }

  /**
   * Manual report generation (for ad-hoc requests)
   */
  async generateAdHocReport(
    startDate: Date,
    endDate: Date,
    generatedBy: string,
  ): Promise<ComplianceReportOrmEntity> {
    this.logger.log(
      `Generating ad-hoc report by user ${generatedBy} for ${startDate} to ${endDate}`,
    );

    const report = await this.generateReport('monthly', startDate, endDate);
    report.generatedBy = generatedBy;
    report.status = 'pending_review';

    return this.reportRepository.save(report);
  }

  /**
   * Get report statistics
   */
  async getReportStatistics(days = 30): Promise<{
    totalReports: number;
    pendingReports: number;
    submittedReports: number;
    averageProcessingTime: number; // Hours
    reportsByType: Record<ReportType, number>;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const reports = await this.reportRepository.find({
      where: {
        createdAt: MoreThan(cutoffDate),
      },
    });

    const reportsByType = reports.reduce(
      (acc, r) => {
        acc[r.reportType] = (acc[r.reportType] || 0) + 1;
        return acc;
      },
      {} as Record<ReportType, number>,
    );

    // Calculate average processing time
    const submittedReports = reports.filter((r) => r.submittedAt);
    const totalProcessingTime = submittedReports.reduce((sum, r) => {
      const processingTime =
        r.submittedAt!.getTime() - r.createdAt.getTime();
      return sum + processingTime;
    }, 0);

    const averageProcessingTime =
      submittedReports.length > 0
        ? totalProcessingTime / submittedReports.length / (1000 * 60 * 60) // Convert to hours
        : 0;

    return {
      totalReports: reports.length,
      pendingReports: reports.filter((r) =>
        ['draft', 'pending_review', 'approved'].includes(r.status),
      ).length,
      submittedReports: submittedReports.length,
      averageProcessingTime: Math.round(averageProcessingTime * 100) / 100,
      reportsByType,
    };
  }
}
