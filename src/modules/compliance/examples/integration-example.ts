/**
 * Compliance Module Integration Examples
 *
 * Demonstrates how to integrate BCEAO Compliance Engine into various parts of the application.
 */

import { Injectable, ForbiddenException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  AMLCFTService,
  SARGeneratorService,
  BCEAOReportingService,
} from '../application/services';

/**
 * Example 1: Transaction Service Integration
 *
 * Screen transactions before execution
 */
@Injectable()
export class TransactionServiceWithCompliance {
  constructor(private readonly amlCftService: AMLCFTService) {}

  async createTransaction(
    userId: string,
    amount: number,
    recipientId?: string,
    metadata?: Record<string, unknown>,
  ) {
    // Step 1: AML/CFT screening
    const assessment = await this.amlCftService.analyzeTransaction(
      userId,
      amount,
      recipientId,
      metadata,
    );

    // Step 2: Handle assessment result
    if (!assessment.approved) {
      throw new ForbiddenException({
        message: 'Transaction blocked due to compliance risk',
        riskLevel: assessment.riskLevel,
        riskScore: assessment.riskScore,
        flags: assessment.flags,
      });
    }

    // Step 3: Create transaction with risk metadata
    const transaction = {
      userId,
      amount,
      recipientId,
      status: assessment.requiresManualReview ? 'pending_review' : 'pending',
      metadata: {
        ...metadata,
        complianceRiskLevel: assessment.riskLevel,
        complianceRiskScore: assessment.riskScore,
        complianceFlags: assessment.flags,
      },
    };

    // Step 4: If manual review required, notify compliance team
    if (assessment.requiresManualReview) {
      // Emit event for notification service
      // this.eventEmitter.emit('compliance.manual_review_required', { transaction });
    }

    return transaction;
  }
}

/**
 * Example 2: Compliance Event Listeners
 *
 * React to compliance events throughout the application
 */
@Injectable()
export class ComplianceEventListener {
  @OnEvent('compliance.alert.created')
  async handleAlertCreated(payload: {
    alertId: string;
    severity: string;
    userId: string;
  }) {
    console.log(`Compliance alert created: ${payload.alertId}`);

    // Send notification to compliance officers
    if (payload.severity === 'critical' || payload.severity === 'high') {
      // Send immediate notification (email, SMS, push)
      // await this.notificationService.notifyComplianceOfficers(payload);
    }
  }

  @OnEvent('compliance.sar.created')
  async handleSARCreated(payload: {
    sarId: string;
    userId: string;
    riskLevel: string;
    triggerReason: string;
  }) {
    console.log(`SAR created: ${payload.sarId} for user ${payload.userId}`);

    // Alert senior compliance officer
    // await this.notificationService.notifySeniorOfficer(payload);

    // Create audit log entry
    // await this.auditService.log('SAR_CREATED', payload);
  }

  @OnEvent('compliance.sar.submitted')
  async handleSARSubmitted(payload: {
    sarId: string;
    userId: string;
    bceaoReference: string;
  }) {
    console.log(`SAR submitted to BCEAO: ${payload.bceaoReference}`);

    // Log submission in audit trail
    // await this.auditService.log('SAR_SUBMITTED', payload);

    // Update user risk profile
    // await this.riskService.updateUserRiskProfile(payload.userId);
  }
}

/**
 * Example 3: Admin Dashboard Integration
 *
 * Display compliance metrics in admin dashboard
 */
@Injectable()
export class AdminDashboardWithCompliance {
  constructor(
    private readonly bceaoReportingService: BCEAOReportingService,
    private readonly amlCftService: AMLCFTService,
  ) {}

  async getAdminDashboard() {
    // Get compliance metrics alongside other admin metrics
    const [reportStats, openAlerts] = await Promise.all([
      this.bceaoReportingService.getReportStatistics(30),
      this.amlCftService.getOpenAlerts(undefined, 10),
    ]);

    return {
      // ... other dashboard data
      compliance: {
        pendingReports: reportStats.pendingReports,
        openAlerts: openAlerts.length,
        criticalAlerts: openAlerts.filter((a) => a.severity === 'critical')
          .length,
      },
    };
  }
}

/**
 * Example 4: User Onboarding with Risk Assessment
 *
 * Assess user risk during KYC process
 */
@Injectable()
export class UserOnboardingWithCompliance {
  constructor(private readonly amlCftService: AMLCFTService) {}

  async completeKYC(userId: string, kycData: any) {
    // Complete KYC verification
    // await this.kycService.verify(userId, kycData);

    // Assess geographic risk
    const geoRisk = this.amlCftService.assessGeographicRisk(
      kycData.countryCode,
    );

    if (geoRisk.riskLevel === 'critical') {
      // Block or require enhanced due diligence
      throw new ForbiddenException(
        'Enhanced due diligence required for high-risk jurisdiction',
      );
    }

    // Screen for PEP status
    const pepResult = await this.amlCftService.screenForPEP(userId);

    if (pepResult.isPEP) {
      // Flag for enhanced monitoring
      // await this.userService.flagForEnhancedMonitoring(userId);
    }

    return {
      kycApproved: true,
      riskLevel: geoRisk.riskLevel,
      isPEP: pepResult.isPEP,
    };
  }
}

/**
 * Example 5: Scheduled Job Integration
 *
 * Add compliance checks to existing scheduled jobs
 */
@Injectable()
export class ScheduledJobsWithCompliance {
  constructor(private readonly amlCftService: AMLCFTService) {}

  // Run nightly batch analysis
  async runNightlyComplianceCheck() {
    console.log('Running nightly compliance batch analysis');

    const results = await this.amlCftService.runBatchAnalysis(7);

    console.log(
      `Analyzed ${results.usersAnalyzed} users, generated ${results.alertsGenerated} alerts`,
    );

    if (results.highRiskUsers > 0) {
      // Alert compliance team of high-risk users
      // await this.notificationService.notifyComplianceTeam({
      //   highRiskCount: results.highRiskUsers,
      //   message: 'Batch analysis identified high-risk users requiring review',
      // });
    }
  }
}

/**
 * Example 6: Risk-Based Transaction Limits
 *
 * Dynamically adjust limits based on user risk profile
 */
@Injectable()
export class RiskBasedLimitsService {
  constructor(private readonly amlCftService: AMLCFTService) {}

  async getTransactionLimit(userId: string): Promise<number> {
    const riskProfile = await this.amlCftService.getUserRiskProfile(userId);

    // Base limit
    let limit = 10000; // USDC

    // Reduce limit based on risk level
    switch (riskProfile.riskLevel) {
      case 'low':
        limit = 10000;
        break;
      case 'medium':
        limit = 5000;
        break;
      case 'high':
        limit = 2000;
        break;
      case 'critical':
        limit = 500; // Very restricted
        break;
    }

    // Further reduce if recent alerts
    if (riskProfile.recentAlerts.length > 3) {
      limit = limit * 0.5;
    }

    return limit;
  }
}

/**
 * Example 7: Webhook Integration
 *
 * Process external webhook events with compliance checks
 */
@Injectable()
export class WebhookWithCompliance {
  constructor(private readonly amlCftService: AMLCFTService) {}

  async processYellowCardDeposit(webhookData: any) {
    const { userId, amount, countryCode } = webhookData;

    // Check geographic risk for deposits from external sources
    const geoRisk = this.amlCftService.assessGeographicRisk(countryCode);

    if (geoRisk.riskLevel === 'high' || geoRisk.riskLevel === 'critical') {
      // Flag for manual review before crediting
      return {
        status: 'pending_review',
        reason: 'High-risk geography',
        riskLevel: geoRisk.riskLevel,
      };
    }

    // Check velocity
    const velocity = await this.amlCftService.checkVelocity(userId, 60);

    if (velocity.exceeded) {
      return {
        status: 'pending_review',
        reason: 'Velocity threshold exceeded',
        riskScore: velocity.riskScore,
      };
    }

    // Proceed with deposit
    return {
      status: 'approved',
      riskLevel: geoRisk.riskLevel,
    };
  }
}

/**
 * Example 8: Export Reports for Audit
 *
 * Generate compliance reports for external auditors
 */
@Injectable()
export class AuditExportService {
  constructor(
    private readonly bceaoReportingService: BCEAOReportingService,
    private readonly sarGenerator: SARGeneratorService,
  ) {}

  async exportQuarterlyAuditPackage(quarter: number, year: number) {
    // Calculate quarter date range
    const startMonth = (quarter - 1) * 3;
    const startDate = new Date(year, startMonth, 1);
    const endDate = new Date(year, startMonth + 3, 0, 23, 59, 59);

    // Get all reports for quarter
    const reports = await this.bceaoReportingService.getReports(
      undefined,
      startDate,
      endDate,
    );

    // Export each report
    const exportedReports = await Promise.all(
      reports.map((r) => this.bceaoReportingService.exportReport(r.id)),
    );

    // Get SAR statistics
    const sarStats = await this.sarGenerator.getSARStatistics(90);

    return {
      period: {
        quarter,
        year,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      reports: exportedReports,
      sarSummary: sarStats,
      exportedAt: new Date().toISOString(),
    };
  }
}
