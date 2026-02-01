import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { RegulatoryReportRepository } from '../../domain/repositories/regulatory-report.repository';
import { RegulatoryReport } from '../../domain/entities/regulatory-report.entity';
import {
  RegulatoryReportType,
  ReportPeriod,
  BCEAOTransactionReportData,
  LargeTransactionDetail,
  BCEAO_THRESHOLDS,
  WAEMU_PHONE_CODES,
} from '../../domain/types';
import { TransactionOrmEntity } from '../../../transaction/infrastructure/orm-entities/transaction.orm-entity';
import { UserOrmEntity } from '../../../user/infrastructure/orm-entities/user.orm-entity';

/**
 * BCEAO Transaction Report Service
 *
 * Generates comprehensive transaction reports per BCEAO requirements
 * for the West African Economic and Monetary Union (WAEMU) region.
 *
 * Report Schedule:
 * - Daily: 00:30 WAT (West Africa Time = UTC+0)
 * - Weekly: Sunday 01:00 WAT
 * - Monthly: 1st of month 02:00 WAT
 */
@Injectable()
export class BCEAOTransactionReportService {
  private readonly logger = new Logger(BCEAOTransactionReportService.name);

  constructor(
    private readonly reportRepository: RegulatoryReportRepository,
    @InjectRepository(TransactionOrmEntity)
    private readonly transactionRepo: Repository<TransactionOrmEntity>,
    @InjectRepository(UserOrmEntity)
    private readonly userRepo: Repository<UserOrmEntity>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate daily BCEAO transaction report
   * Runs daily at 00:30 WAT
   */
  @Cron('30 0 * * *', {
    name: 'daily_bceao_transaction_report',
    timeZone: 'Africa/Abidjan',
  })
  async generateDailyReport(): Promise<RegulatoryReport> {
    this.logger.log('Generating daily BCEAO transaction report');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    return this.generateReport(
      ReportPeriod.DAILY,
      yesterday,
      endOfYesterday,
      'system',
    );
  }

  /**
   * Generate weekly BCEAO transaction report
   * Runs every Sunday at 01:00 WAT
   */
  @Cron('0 1 * * 0', {
    name: 'weekly_bceao_transaction_report',
    timeZone: 'Africa/Abidjan',
  })
  async generateWeeklyReport(): Promise<RegulatoryReport> {
    this.logger.log('Generating weekly BCEAO transaction report');

    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    return this.generateReport(
      ReportPeriod.WEEKLY,
      startDate,
      endDate,
      'system',
    );
  }

  /**
   * Generate monthly BCEAO transaction report
   * Runs on 1st of each month at 02:00 WAT
   */
  @Cron('0 2 1 * *', {
    name: 'monthly_bceao_transaction_report',
    timeZone: 'Africa/Abidjan',
  })
  async generateMonthlyReport(): Promise<RegulatoryReport> {
    this.logger.log('Generating monthly BCEAO transaction report');

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    return this.generateReport(
      ReportPeriod.MONTHLY,
      startDate,
      endDate,
      'system',
    );
  }

  /**
   * Generate BCEAO transaction report for a specific period
   */
  async generateReport(
    period: ReportPeriod,
    periodStart: Date,
    periodEnd: Date,
    generatedBy: string,
  ): Promise<RegulatoryReport> {
    try {
      this.logger.log(
        `Generating ${period} BCEAO transaction report for ${periodStart.toISOString()} to ${periodEnd.toISOString()}`,
      );

      // Check if report already exists for this period
      const existingReport = await this.reportRepository.findByTypeAndPeriod(
        RegulatoryReportType.BCEAO_TRANSACTION,
        periodStart,
        periodEnd,
      );

      if (existingReport) {
        this.logger.warn(
          `Report already exists for period ${periodStart.toISOString()} to ${periodEnd.toISOString()}`,
        );
        return existingReport;
      }

      // Fetch transactions
      const transactions = await this.transactionRepo.find({
        where: {
          createdAt: Between(periodStart, periodEnd),
          status: In(['completed', 'pending', 'processing']),
        },
        relations: ['wallet'],
      });

      // Calculate report data
      const reportData = await this.calculateReportData(
        transactions,
        periodStart,
        periodEnd,
      );

      // Calculate submission deadline (5 business days after period end)
      const submissionDeadline = this.calculateSubmissionDeadline(periodEnd);

      // Create report
      const report = RegulatoryReport.create({
        reportType: RegulatoryReportType.BCEAO_TRANSACTION,
        reportPeriod: period,
        periodStart,
        periodEnd,
        title: this.generateReportTitle(period, periodStart),
        description: `BCEAO ${period} transaction report for JoonaPay operations`,
        reportData: reportData as unknown as Record<string, unknown>,
        submissionDeadline,
        generatedBy,
        metadata: {
          transactionCount: transactions.length,
          generatedAt: new Date().toISOString(),
        },
      });

      const savedReport = await this.reportRepository.save(report);

      this.logger.log(
        `BCEAO ${period} transaction report generated: ${savedReport.id}`,
      );

      return savedReport;
    } catch (error) {
      this.logger.error(
        `Failed to generate BCEAO transaction report: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Calculate comprehensive report data
   */
  private async calculateReportData(
    transactions: TransactionOrmEntity[],
    periodStart: Date,
    periodEnd: Date,
  ): Promise<BCEAOTransactionReportData> {
    const deposits = transactions.filter((t) => t.type === 'deposit');
    const withdrawals = transactions.filter((t) => t.type === 'withdrawal');
    const transfers = transactions.filter(
      (t) => t.type === 'transfer_internal' || t.type === 'transfer_external',
    );

    const totalVolume = transactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    );

    // Identify cross-border transactions
    const crossBorderTxns = this.identifyCrossBorderTransactions(transactions);
    const crossBorderByCountry =
      this.groupCrossBorderByCountry(crossBorderTxns);

    // Identify large transactions
    const largeTxns = this.identifyLargeTransactions(transactions);

    // Calculate user metrics
    const uniqueWalletIds = new Set(transactions.map((t) => t.walletId));
    const newUsers = await this.userRepo.count({
      where: {
        createdAt: Between(periodStart, periodEnd),
      },
    });

    const verifiedUsers = await this.userRepo.count({
      where: {
        kycStatus: 'verified',
        createdAt: Between(periodStart, periodEnd),
      },
    });

    return {
      summary: {
        totalTransactions: transactions.length,
        totalVolumeUsdc: totalVolume,
        totalVolumeXof: totalVolume * BCEAO_THRESHOLDS.XOF_TO_USD_RATE,
        depositCount: deposits.length,
        depositVolume: deposits.reduce((sum, t) => sum + Number(t.amount), 0),
        withdrawalCount: withdrawals.length,
        withdrawalVolume: withdrawals.reduce(
          (sum, t) => sum + Number(t.amount),
          0,
        ),
        transferCount: transfers.length,
        transferVolume: transfers.reduce((sum, t) => sum + Number(t.amount), 0),
      },
      crossBorder: {
        count: crossBorderTxns.length,
        volume: crossBorderTxns.reduce((sum, t) => sum + Number(t.amount), 0),
        byCountry: crossBorderByCountry,
      },
      largeTransactions: {
        count: largeTxns.length,
        totalVolume: largeTxns.reduce((sum, t) => sum + Number(t.amount), 0),
        transactions: largeTxns.map((t) => this.mapToLargeTransactionDetail(t)),
      },
      userMetrics: {
        activeUsers: uniqueWalletIds.size,
        newUsers,
        kycVerifiedUsers: verifiedUsers,
        averageTransactionPerUser:
          uniqueWalletIds.size > 0
            ? transactions.length / uniqueWalletIds.size
            : 0,
      },
    };
  }

  /**
   * Identify cross-border transactions (outside WAEMU)
   */
  private identifyCrossBorderTransactions(
    transactions: TransactionOrmEntity[],
  ): TransactionOrmEntity[] {
    return transactions.filter((t) => {
      if (t.metadata?.crossBorder === true) {
        return true;
      }

      if (t.recipientPhone) {
        const countryCode = this.extractCountryFromPhone(t.recipientPhone);
        return !Object.values(WAEMU_PHONE_CODES).includes(countryCode);
      }

      return false;
    });
  }

  /**
   * Group cross-border transactions by destination country
   */
  private groupCrossBorderByCountry(
    transactions: TransactionOrmEntity[],
  ): Record<string, { count: number; volume: number }> {
    const byCountry: Record<string, { count: number; volume: number }> = {};

    for (const txn of transactions) {
      let country = 'UNKNOWN';

      if (txn.recipientPhone) {
        country = this.extractCountryFromPhone(txn.recipientPhone);
      } else if (txn.metadata?.destinationCountry) {
        country = txn.metadata.destinationCountry as string;
      }

      if (!byCountry[country]) {
        byCountry[country] = { count: 0, volume: 0 };
      }

      byCountry[country].count++;
      byCountry[country].volume += Number(txn.amount);
    }

    return byCountry;
  }

  /**
   * Identify large transactions exceeding BCEAO threshold
   */
  private identifyLargeTransactions(
    transactions: TransactionOrmEntity[],
  ): TransactionOrmEntity[] {
    return transactions.filter((t) => {
      const amountXof = Number(t.amount) * BCEAO_THRESHOLDS.XOF_TO_USD_RATE;
      return amountXof >= BCEAO_THRESHOLDS.LARGE_TRANSACTION_XOF;
    });
  }

  /**
   * Map transaction to large transaction detail
   */
  private mapToLargeTransactionDetail(
    txn: TransactionOrmEntity,
  ): LargeTransactionDetail {
    const amountXof = Number(txn.amount) * BCEAO_THRESHOLDS.XOF_TO_USD_RATE;

    let flagReason = 'Large transaction exceeding 1M XOF threshold';
    if (amountXof >= BCEAO_THRESHOLDS.DAILY_AGGREGATE_XOF) {
      flagReason =
        'Very large transaction exceeding 5M XOF daily aggregate threshold';
    }

    return {
      transactionId: txn.id,
      amount: Number(txn.amount),
      amountXof,
      type: txn.type,
      senderWalletId: txn.walletId,
      recipientInfo: txn.recipientPhone || txn.recipientAddress || 'N/A',
      timestamp: txn.createdAt,
      flagReason,
    };
  }

  /**
   * Extract country code from phone number
   */
  private extractCountryFromPhone(phone: string): string {
    for (const [prefix, country] of Object.entries(WAEMU_PHONE_CODES)) {
      if (phone.startsWith(prefix)) {
        return country;
      }
    }
    return 'EXTERNAL';
  }

  /**
   * Generate report title
   */
  private generateReportTitle(period: ReportPeriod, periodStart: Date): string {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    switch (period) {
      case ReportPeriod.DAILY:
        return `BCEAO Daily Transaction Report - ${periodStart.toISOString().split('T')[0]}`;
      case ReportPeriod.WEEKLY:
        return `BCEAO Weekly Transaction Report - Week of ${periodStart.toISOString().split('T')[0]}`;
      case ReportPeriod.MONTHLY:
        return `BCEAO Monthly Transaction Report - ${monthNames[periodStart.getMonth()]} ${periodStart.getFullYear()}`;
      default:
        return `BCEAO Transaction Report - ${periodStart.toISOString().split('T')[0]}`;
    }
  }

  /**
   * Calculate submission deadline (5 business days after period end)
   */
  private calculateSubmissionDeadline(periodEnd: Date): Date {
    const deadline = new Date(periodEnd);
    let businessDays = 0;

    while (businessDays < 5) {
      deadline.setDate(deadline.getDate() + 1);
      const dayOfWeek = deadline.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDays++;
      }
    }

    deadline.setHours(17, 0, 0, 0); // 5 PM deadline
    return deadline;
  }

  /**
   * Generate ad-hoc report for a custom period
   */
  async generateAdHocReport(
    periodStart: Date,
    periodEnd: Date,
    generatedBy: string,
  ): Promise<RegulatoryReport> {
    return this.generateReport(
      ReportPeriod.CUSTOM,
      periodStart,
      periodEnd,
      generatedBy,
    );
  }
}
