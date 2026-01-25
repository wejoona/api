import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Between, In } from 'typeorm';
import { ComplianceDashboard } from '../../domain/compliance.types';
import {
  ComplianceReportOrmEntity,
  SuspiciousActivityReportOrmEntity,
  ComplianceAlertOrmEntity,
} from '../../infrastructure/orm-entities';
import { BCEAOReportingService } from './bceao-reporting.service';
import { SARGeneratorService } from './sar-generator.service';

/**
 * Compliance Dashboard Service
 *
 * Provides aggregated compliance data for compliance officers and administrators.
 * Centralizes metrics from BCEAO reports, SARs, and alerts.
 */
@Injectable()
export class ComplianceDashboardService {
  private readonly logger = new Logger(ComplianceDashboardService.name);

  constructor(
    @InjectRepository(ComplianceReportOrmEntity)
    private readonly reportRepository: Repository<ComplianceReportOrmEntity>,
    @InjectRepository(SuspiciousActivityReportOrmEntity)
    private readonly sarRepository: Repository<SuspiciousActivityReportOrmEntity>,
    @InjectRepository(ComplianceAlertOrmEntity)
    private readonly alertRepository: Repository<ComplianceAlertOrmEntity>,
    private readonly bceaoReportingService: BCEAOReportingService,
    private readonly sarGeneratorService: SARGeneratorService,
  ) {}

  /**
   * Get comprehensive compliance dashboard
   *
   * @param days - Number of days to analyze (default: 30)
   * @returns Dashboard data with metrics, alerts, and trends
   */
  async getDashboard(days = 30): Promise<ComplianceDashboard> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    this.logger.log(
      `Generating compliance dashboard for last ${days} days`,
    );

    // Fetch data in parallel
    const [
      recentReports,
      openAlerts,
      pendingSARs,
      recentSARs,
      recentAlerts,
    ] = await Promise.all([
      this.reportRepository.find({
        where: {
          createdAt: MoreThan(startDate),
        },
        order: {
          createdAt: 'DESC',
        },
      }),
      this.alertRepository.count({
        where: {
          resolved: false,
        },
      }),
      this.sarRepository.count({
        where: {
          status: In(['draft', 'under_investigation']),
        },
      }),
      this.sarRepository.find({
        where: {
          createdAt: MoreThan(startDate),
        },
        relations: ['user'],
        order: {
          createdAt: 'DESC',
        },
        take: 10,
      }),
      this.alertRepository.find({
        where: {
          createdAt: MoreThan(startDate),
        },
        relations: ['user'],
        order: {
          createdAt: 'DESC',
        },
        take: 10,
      }),
    ]);

    // Calculate aggregate metrics
    const metrics = this.aggregateMetrics(recentReports);

    // Calculate risk trends
    const riskTrends = await this.calculateRiskTrends(startDate, endDate);

    // Count pending reports
    const pendingReports = recentReports.filter((r) =>
      ['draft', 'pending_review', 'approved'].includes(r.status),
    ).length;

    // Map SARs to interface format
    const mappedSARs = recentSARs.map((sar) => this.mapSARToInterface(sar));

    // Map alerts to interface format
    const mappedAlerts = recentAlerts.map((alert) =>
      this.mapAlertToInterface(alert),
    );

    return {
      period: {
        start: startDate,
        end: endDate,
      },
      metrics,
      openAlerts,
      pendingSARs,
      pendingReports,
      recentSARs: mappedSARs,
      recentAlerts: mappedAlerts,
      riskTrends,
    };
  }

  /**
   * Aggregate metrics from multiple reports
   */
  private aggregateMetrics(
    reports: ComplianceReportOrmEntity[],
  ): ComplianceDashboard['metrics'] {
    return reports.reduce(
      (acc, report) => {
        const data = report.reportData as any;

        return {
          totalDeposits: acc.totalDeposits + (data?.metrics?.totalDeposits || 0),
          totalWithdrawals:
            acc.totalWithdrawals + (data?.metrics?.totalWithdrawals || 0),
          totalTransfers:
            acc.totalTransfers + (data?.metrics?.totalTransfers || 0),
          totalInternalTransfers:
            acc.totalInternalTransfers +
            (data?.metrics?.totalInternalTransfers || 0),
          totalExternalTransfers:
            acc.totalExternalTransfers +
            (data?.metrics?.totalExternalTransfers || 0),
          totalCrossBorderTransactions:
            acc.totalCrossBorderTransactions + report.crossBorderCount,
          totalVolume: acc.totalVolume + Number(report.totalVolume),
          totalVolumeXof: acc.totalVolumeXof + Number(report.totalVolumeXof),
          averageTransactionSize:
            acc.totalVolume > 0 && report.totalTransactions > 0
              ? acc.totalVolume / report.totalTransactions
              : 0,
          largeTransactions:
            acc.largeTransactions + report.largeTransactionCount,
          activeUsers: Math.max(acc.activeUsers, report.uniqueUsers),
          newUsers: acc.newUsers + report.newUsers,
          suspiciousActivities:
            acc.suspiciousActivities + report.suspiciousActivityCount,
          blockedTransactions:
            acc.blockedTransactions + (data?.metrics?.blockedTransactions || 0),
        };
      },
      {
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalTransfers: 0,
        totalInternalTransfers: 0,
        totalExternalTransfers: 0,
        totalCrossBorderTransactions: 0,
        totalVolume: 0,
        totalVolumeXof: 0,
        averageTransactionSize: 0,
        largeTransactions: 0,
        activeUsers: 0,
        newUsers: 0,
        suspiciousActivities: 0,
        blockedTransactions: 0,
      },
    );
  }

  /**
   * Calculate daily risk trends
   */
  private async calculateRiskTrends(
    startDate: Date,
    endDate: Date,
  ): Promise<
    Array<{
      date: string;
      riskScore: number;
      alertCount: number;
    }>
  > {
    const trends: Array<{
      date: string;
      riskScore: number;
      alertCount: number;
    }> = [];

    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Get alerts for this day
      const alerts = await this.alertRepository.find({
        where: {
          createdAt: Between(dayStart, dayEnd),
        },
      });

      // Get SARs for this day
      const sars = await this.sarRepository.find({
        where: {
          createdAt: Between(dayStart, dayEnd),
        },
      });

      // Calculate average risk score
      const allRiskScores = [
        ...alerts.map((a) => (a.metadata as any)?.riskScore || 0),
        ...sars.map((s) => Number(s.riskScore)),
      ];

      const avgRiskScore =
        allRiskScores.length > 0
          ? allRiskScores.reduce((a, b) => a + b, 0) / allRiskScores.length
          : 0;

      trends.push({
        date: currentDate.toISOString().split('T')[0],
        riskScore: Math.round(avgRiskScore * 100) / 100,
        alertCount: alerts.length,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return trends;
  }

  /**
   * Map SAR entity to interface
   */
  private mapSARToInterface(
    sar: SuspiciousActivityReportOrmEntity,
  ): ComplianceDashboard['recentSARs'][0] {
    return {
      sarId: sar.id,
      userId: sar.userId,
      userDetails: {
        phone: sar.userPhone,
        firstName: sar.userFirstName || undefined,
        lastName: sar.userLastName || undefined,
        countryCode: sar.userCountryCode,
        kycStatus: sar.userKycStatus,
        accountAge: sar.userAccountAgeDays,
      },
      transactionIds: sar.transactionIds,
      triggerReason: sar.triggerReason,
      riskScore: Number(sar.riskScore),
      riskLevel: sar.riskLevel,
      narrative: sar.narrative,
      detectionMethod: sar.detectionMethod,
      detectedAt: sar.detectedAt,
      status: sar.status,
      investigatedBy: sar.investigatedBy || undefined,
      investigationNotes: sar.investigationNotes || undefined,
      submittedAt: sar.submittedAt || undefined,
      submittedBy: sar.submittedBy || undefined,
      closedAt: sar.closedAt || undefined,
      closedReason: sar.closedReason || undefined,
    };
  }

  /**
   * Map alert entity to interface
   */
  private mapAlertToInterface(
    alert: ComplianceAlertOrmEntity,
  ): ComplianceDashboard['recentAlerts'][0] {
    return {
      alertId: alert.id,
      alertType: alert.alertType,
      severity: alert.severity,
      userId: alert.userId,
      transactionId: alert.transactionId || undefined,
      title: alert.title,
      description: alert.description,
      triggeredAt: alert.createdAt,
      acknowledgedAt: alert.acknowledgedAt || undefined,
      acknowledgedBy: alert.acknowledgedBy || undefined,
      resolved: alert.resolved,
      resolvedAt: alert.resolvedAt || undefined,
      resolution: alert.resolution || undefined,
    };
  }

  /**
   * Get compliance health score
   * Overall health metric (0-100, higher is better)
   */
  async getComplianceHealthScore(): Promise<{
    score: number;
    rating: 'excellent' | 'good' | 'fair' | 'poor';
    factors: Array<{
      name: string;
      score: number;
      weight: number;
    }>;
  }> {
    const factors: Array<{ name: string; score: number; weight: number }> = [];

    // Factor 1: Report submission timeliness (30%)
    const reportStats = await this.bceaoReportingService.getReportStatistics(30);
    const reportTimeliness =
      reportStats.averageProcessingTime < 24
        ? 100
        : Math.max(0, 100 - reportStats.averageProcessingTime * 2);
    factors.push({
      name: 'Report Submission Timeliness',
      score: reportTimeliness,
      weight: 0.3,
    });

    // Factor 2: Open alerts resolution rate (25%)
    const totalAlerts = await this.alertRepository.count();
    const resolvedAlerts = await this.alertRepository.count({
      where: { resolved: true },
    });
    const resolutionRate =
      totalAlerts > 0 ? (resolvedAlerts / totalAlerts) * 100 : 100;
    factors.push({
      name: 'Alert Resolution Rate',
      score: resolutionRate,
      weight: 0.25,
    });

    // Factor 3: SAR filing rate (20%)
    const sarStats = await this.sarGeneratorService.getSARStatistics(30);
    const sarFilingRate =
      sarStats.totalSARs > 0
        ? (sarStats.submittedSARs / sarStats.totalSARs) * 100
        : 100;
    factors.push({
      name: 'SAR Filing Rate',
      score: sarFilingRate,
      weight: 0.2,
    });

    // Factor 4: Low false positive rate (15%)
    const falsePositiveRate =
      sarStats.totalSARs > 0
        ? (sarStats.dismissedSARs / sarStats.totalSARs) * 100
        : 0;
    const fpScore = Math.max(0, 100 - falsePositiveRate * 2);
    factors.push({
      name: 'False Positive Control',
      score: fpScore,
      weight: 0.15,
    });

    // Factor 5: Pending item backlog (10%)
    const backlogScore =
      reportStats.pendingReports > 10 || sarStats.openSARs > 20 ? 50 : 100;
    factors.push({
      name: 'Backlog Management',
      score: backlogScore,
      weight: 0.1,
    });

    // Calculate weighted score
    const totalScore = factors.reduce(
      (sum, factor) => sum + factor.score * factor.weight,
      0,
    );

    let rating: 'excellent' | 'good' | 'fair' | 'poor';
    if (totalScore >= 90) rating = 'excellent';
    else if (totalScore >= 75) rating = 'good';
    else if (totalScore >= 60) rating = 'fair';
    else rating = 'poor';

    return {
      score: Math.round(totalScore * 100) / 100,
      rating,
      factors,
    };
  }

  /**
   * Get recent activity summary
   */
  async getRecentActivity(hours = 24): Promise<{
    newAlerts: number;
    newSARs: number;
    reportsGenerated: number;
    highRiskTransactions: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hours);

    const [newAlerts, newSARs, reportsGenerated] = await Promise.all([
      this.alertRepository.count({
        where: {
          createdAt: MoreThan(cutoffDate),
        },
      }),
      this.sarRepository.count({
        where: {
          createdAt: MoreThan(cutoffDate),
        },
      }),
      this.reportRepository.count({
        where: {
          createdAt: MoreThan(cutoffDate),
        },
      }),
    ]);

    const highRiskAlerts = await this.alertRepository.count({
      where: {
        createdAt: MoreThan(cutoffDate),
        severity: In(['high', 'critical']),
      },
    });

    return {
      newAlerts,
      newSARs,
      reportsGenerated,
      highRiskTransactions: highRiskAlerts,
    };
  }

  /**
   * Get pending items requiring action
   */
  async getPendingItems(): Promise<{
    pendingReports: ComplianceReportOrmEntity[];
    openAlerts: ComplianceAlertOrmEntity[];
    activeSARs: SuspiciousActivityReportOrmEntity[];
  }> {
    const [pendingReports, openAlerts, activeSARs] = await Promise.all([
      this.reportRepository.find({
        where: {
          status: In(['draft', 'pending_review']),
        },
        order: {
          createdAt: 'ASC',
        },
        take: 50,
      }),
      this.alertRepository.find({
        where: {
          resolved: false,
        },
        relations: ['user'],
        order: {
          createdAt: 'DESC',
        },
        take: 50,
      }),
      this.sarRepository.find({
        where: {
          status: In(['draft', 'under_investigation']),
        },
        relations: ['user'],
        order: {
          createdAt: 'ASC',
        },
        take: 50,
      }),
    ]);

    return {
      pendingReports,
      openAlerts,
      activeSARs,
    };
  }

  /**
   * Export compliance summary for management
   */
  async exportComplianceSummary(
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, unknown>> {
    const [reportStats, sarStats, alerts] = await Promise.all([
      this.bceaoReportingService.getReportStatistics(
        Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      ),
      this.sarGeneratorService.getSARStatistics(
        Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      ),
      this.alertRepository.find({
        where: {
          createdAt: Between(startDate, endDate),
        },
      }),
    ]);

    const healthScore = await this.getComplianceHealthScore();

    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      complianceHealth: healthScore,
      reportingMetrics: {
        totalReports: reportStats.totalReports,
        pendingReports: reportStats.pendingReports,
        submittedReports: reportStats.submittedReports,
        averageProcessingTimeHours: reportStats.averageProcessingTime,
        reportsByType: reportStats.reportsByType,
      },
      sarMetrics: {
        totalSARs: sarStats.totalSARs,
        openSARs: sarStats.openSARs,
        submittedSARs: sarStats.submittedSARs,
        dismissedSARs: sarStats.dismissedSARs,
        averageRiskScore: sarStats.averageRiskScore,
        sarsByTrigger: sarStats.sarsByTrigger,
        sarsByRiskLevel: sarStats.sarsByRiskLevel,
      },
      alertMetrics: {
        totalAlerts: alerts.length,
        openAlerts: alerts.filter((a) => !a.resolved).length,
        resolvedAlerts: alerts.filter((a) => a.resolved).length,
        bySeverity: {
          low: alerts.filter((a) => a.severity === 'low').length,
          medium: alerts.filter((a) => a.severity === 'medium').length,
          high: alerts.filter((a) => a.severity === 'high').length,
          critical: alerts.filter((a) => a.severity === 'critical').length,
        },
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
