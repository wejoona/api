import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { RegulatoryReportRepository } from '../../domain/repositories/regulatory-report.repository';
import { RegulatoryReport } from '../../domain/entities/regulatory-report.entity';
import {
  RegulatoryReportType,
  ReportPeriod,
  SuspiciousActivityReportData,
} from '../../domain/types';
import { GenerateSARDto } from '../dto/generate-report.dto';
import { TransactionOrmEntity } from '../../../transaction/infrastructure/orm-entities/transaction.orm-entity';
import { UserOrmEntity } from '../../../user/infrastructure/orm-entities/user.orm-entity';
import { WalletOrmEntity } from '../../../wallet/infrastructure/orm-entities/wallet.orm-entity';

/**
 * Suspicious Activity Report (SAR) Service
 *
 * Generates and manages SARs per BCEAO AML/CFT requirements.
 *
 * Filing Requirements:
 * - Must be filed within 24 hours of detection
 * - Includes full subject details and transaction history
 * - Requires narrative explanation of suspicious indicators
 */
@Injectable()
export class SuspiciousActivityReportService {
  private readonly logger = new Logger(SuspiciousActivityReportService.name);

  constructor(
    private readonly reportRepository: RegulatoryReportRepository,
    @InjectRepository(TransactionOrmEntity)
    private readonly transactionRepo: Repository<TransactionOrmEntity>,
    @InjectRepository(UserOrmEntity)
    private readonly userRepo: Repository<UserOrmEntity>,
    @InjectRepository(WalletOrmEntity)
    private readonly walletRepo: Repository<WalletOrmEntity>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate a Suspicious Activity Report
   */
  async generateSAR(
    dto: GenerateSARDto,
    generatedBy: string,
  ): Promise<RegulatoryReport> {
    try {
      this.logger.log(`Generating SAR for user ${dto.userId}`);

      // Fetch user details
      const user = await this.userRepo.findOne({
        where: { id: dto.userId },
      });

      if (!user) {
        throw new NotFoundException(`User ${dto.userId} not found`);
      }

      // Fetch user's wallet
      const wallet = await this.walletRepo.findOne({
        where: { userId: user.id },
      });

      if (!wallet) {
        throw new NotFoundException(`Wallet not found for user ${dto.userId}`);
      }

      // Fetch related transactions
      const transactions = await this.transactionRepo.find({
        where: {
          walletId: wallet.id,
          createdAt: Between(dto.activityDateFrom, dto.activityDateTo),
        },
        order: { createdAt: 'ASC' },
      });

      // Build SAR data
      const sarData = this.buildSARData(user, dto, transactions);

      // SAR must be submitted within 24 hours
      const submissionDeadline = new Date();
      submissionDeadline.setHours(submissionDeadline.getHours() + 24);

      // Create report
      const report = RegulatoryReport.create({
        reportType: RegulatoryReportType.SUSPICIOUS_ACTIVITY,
        reportPeriod: ReportPeriod.CUSTOM,
        periodStart: dto.activityDateFrom,
        periodEnd: dto.activityDateTo,
        title: `SAR - ${user.firstName} ${user.lastName} - ${new Date().toISOString().split('T')[0]}`,
        description: `Suspicious Activity Report for suspected ${dto.activityType}`,
        reportData: sarData as unknown as Record<string, unknown>,
        submissionDeadline,
        generatedBy,
        metadata: {
          subjectId: dto.userId,
          transactionCount: transactions.length,
          urgency: 'high',
        },
      });

      const savedReport = await this.reportRepository.save(report);

      this.logger.log(`SAR generated: ${savedReport.id}`);
      this.logger.warn(
        `SAR ${savedReport.id} must be submitted by ${submissionDeadline.toISOString()}`,
      );

      return savedReport;
    } catch (error) {
      this.logger.error(
        `Failed to generate SAR: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Build SAR data structure per BCEAO requirements
   */
  private buildSARData(
    user: UserOrmEntity,
    dto: GenerateSARDto,
    transactions: TransactionOrmEntity[],
  ): SuspiciousActivityReportData {
    const totalAmount = transactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    );

    return {
      caseId: `SAR-${Date.now()}-${user.id.substring(0, 8)}`,
      reportDate: new Date(),
      filingInstitution: {
        name: this.configService.get<string>('company.name', 'JoonaPay SAS'),
        code: this.configService.get<string>('company.bceaoCode', 'JP-CI-001'),
        address: this.configService.get<string>(
          'company.address',
          "Abidjan, Cote d'Ivoire",
        ),
        contactPerson: this.configService.get<string>(
          'compliance.officer',
          'Compliance Officer',
        ),
        phone: this.configService.get<string>(
          'compliance.phone',
          '+225 XX XX XX XX',
        ),
        email: this.configService.get<string>(
          'compliance.email',
          'compliance@joonapay.com',
        ),
      },
      subject: {
        type: 'individual',
        name: `${user.firstName} ${user.lastName}`,
        dateOfBirth: undefined,
        nationality: user.countryCode || undefined,
        idType: undefined,
        idNumber: undefined,
        address: undefined,
        phone: user.phone,
        email: user.email || undefined,
        occupation: undefined,
        accountNumber: user.id,
        accountOpenDate: user.createdAt,
      },
      suspiciousActivity: {
        dateFrom: dto.activityDateFrom,
        dateTo: dto.activityDateTo,
        totalAmount,
        currency: 'USDC',
        activityType: dto.activityType,
        description: dto.description,
        indicators: dto.indicators,
        relatedTransactions:
          dto.relatedTransactionIds || transactions.map((t) => t.id),
      },
      actionTaken: {
        internalInvestigation: true,
        accountRestricted: false,
        accountClosed: false,
        lawEnforcementNotified: false,
        otherActions: 'Filed SAR as per BCEAO requirements',
      },
      narrative: dto.narrative,
      attachments: [],
    };
  }

  /**
   * Get all pending SARs that need to be submitted
   */
  async getPendingSARs(): Promise<RegulatoryReport[]> {
    const reports = await this.reportRepository.findAll({
      reportType: RegulatoryReportType.SUSPICIOUS_ACTIVITY,
      status: undefined, // Will filter manually
    });

    return reports.filter(
      (r) =>
        (r.status as string) === 'draft' ||
        (r.status as string) === 'pending_review' ||
        (r.status as string) === 'approved',
    );
  }

  /**
   * Get overdue SARs (past 24-hour deadline)
   */
  async getOverdueSARs(): Promise<RegulatoryReport[]> {
    const allReports = await this.reportRepository.findOverdue();
    return allReports.filter(
      (r) => r.reportType === RegulatoryReportType.SUSPICIOUS_ACTIVITY,
    );
  }

  /**
   * Auto-generate SAR from AML alert
   */
  async generateSARFromAlert(
    alertId: string,
    userId: string,
    indicators: string[],
    transactionIds: string[],
    generatedBy: string,
  ): Promise<RegulatoryReport> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.generateSAR(
      {
        userId,
        activityDateFrom: thirtyDaysAgo,
        activityDateTo: now,
        activityType: 'Suspicious Transaction Pattern',
        description: `Automated SAR generated from AML alert ${alertId}`,
        indicators,
        relatedTransactionIds: transactionIds,
        narrative: `This SAR was automatically generated following detection of suspicious activity patterns by the JoonaPay AML monitoring system. Alert ID: ${alertId}. The following suspicious indicators were detected: ${indicators.join('; ')}. A review of the subject's transaction history revealed patterns consistent with potential money laundering or terrorist financing activity. Further investigation is recommended.`,
      },
      generatedBy,
    );
  }

  /**
   * Add attachment to SAR
   */
  async addAttachment(
    reportId: string,
    attachmentUrl: string,
  ): Promise<RegulatoryReport> {
    const report = await this.reportRepository.findById(reportId);

    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    if (report.reportType !== RegulatoryReportType.SUSPICIOUS_ACTIVITY) {
      throw new Error('Can only add attachments to SAR reports');
    }

    const sarData =
      report.reportData as unknown as SuspiciousActivityReportData;
    sarData.attachments = sarData.attachments || [];
    sarData.attachments.push(attachmentUrl);

    report.updateReportData(sarData as unknown as Record<string, unknown>);

    return this.reportRepository.save(report);
  }

  /**
   * Update action taken in SAR
   */
  async updateActionTaken(
    reportId: string,
    actionTaken: Partial<SuspiciousActivityReportData['actionTaken']>,
  ): Promise<RegulatoryReport> {
    const report = await this.reportRepository.findById(reportId);

    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    if (!report.canBeEdited()) {
      throw new Error(`Cannot update SAR in status: ${report.status}`);
    }

    const sarData =
      report.reportData as unknown as SuspiciousActivityReportData;
    sarData.actionTaken = {
      ...sarData.actionTaken,
      ...actionTaken,
    };

    report.updateReportData(sarData as unknown as Record<string, unknown>);

    return this.reportRepository.save(report);
  }

  /**
   * Common suspicious activity indicators per BCEAO guidelines
   */
  static readonly COMMON_INDICATORS = [
    'Structuring transactions to avoid reporting thresholds',
    'Rapid movement of funds (layering)',
    'Transactions inconsistent with customer profile',
    'High-risk country involvement',
    'Round-dollar transactions with no apparent business purpose',
    'Multiple accounts used for similar purposes',
    'Cash-intensive patterns in digital wallet',
    'Third-party involvement in transactions',
    'Dormant account sudden activity',
    'Frequent small deposits followed by large withdrawal',
    'Use of anonymizing services',
    'Mismatch between stated occupation and transaction patterns',
    'Politically Exposed Person (PEP) involvement',
    'Sanctions list match',
    'Adverse media mention',
  ];
}
