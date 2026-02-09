import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  SARTriggerReason,
  SARStatus,
  RiskLevel,
} from '../../domain/compliance.types';
import { SuspiciousActivityReportOrmEntity } from '../../infrastructure/orm-entities';
import { TransactionOrmEntity } from '../../../transaction/infrastructure/orm-entities/transaction.orm-entity';
import { UserOrmEntity } from '../../../user/infrastructure/orm-entities/user.orm-entity';

/**
 * SAR Generator Service
 *
 * Suspicious Activity Report generation and management.
 *
 * BCEAO SAR Requirements:
 * - File within 48 hours of detection
 * - Comprehensive narrative
 * - Complete transaction history
 * - Customer due diligence information
 * - Risk assessment justification
 *
 * SAR Lifecycle:
 * 1. Auto-detection or manual flag
 * 2. Draft creation with initial analysis
 * 3. Investigation by compliance officer
 * 4. Submission to BCEAO (if warranted)
 * 5. Closure with disposition
 */
@Injectable()
export class SARGeneratorService {
  private readonly logger = new Logger(SARGeneratorService.name);
  private readonly XOF_TO_USDC_RATE = 600;

  constructor(
    @InjectRepository(SuspiciousActivityReportOrmEntity)
    private readonly sarRepository: Repository<SuspiciousActivityReportOrmEntity>,
    @InjectRepository(TransactionOrmEntity)
    private readonly transactionRepository: Repository<TransactionOrmEntity>,
    @InjectRepository(UserOrmEntity)
    private readonly userRepository: Repository<UserOrmEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ==========================================
  // SAR Creation
  // ==========================================

  /**
   * Create SAR from automated detection
   *
   * @param userId - Subject user ID
   * @param transactionIds - Related transaction IDs
   * @param triggerReason - Reason for SAR
   * @param riskScore - Calculated risk score (0-100)
   * @param indicators - Detection indicators
   * @returns Created SAR
   */
  async createAutomatedSAR(
    userId: string,
    transactionIds: string[],
    triggerReason: SARTriggerReason,
    riskScore: number,
    indicators: string[],
  ): Promise<SuspiciousActivityReportOrmEntity> {
    this.logger.log(
      `Creating automated SAR for user ${userId}, reason: ${triggerReason}`,
    );

    // Fetch user details
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Fetch transaction details
    const transactions = await this.transactionRepository.find({
      where: {
        id: In(transactionIds),
      },
    });

    // Calculate totals
    const totalAmount = transactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    );
    const totalAmountXof = totalAmount * this.XOF_TO_USDC_RATE;

    // Calculate account age
    const accountAgeDays = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Generate narrative
    const narrative = this.generateNarrative(
      user,
      transactions,
      triggerReason,
      indicators,
    );

    // Determine risk level
    const riskLevel = this.calculateRiskLevel(riskScore);

    // Create SAR
    const sar = this.sarRepository.create({
      userId,
      transactionIds,
      triggerReason,
      riskScore,
      riskLevel,
      narrative,
      detectionMethod: 'automated',
      detectedAt: new Date(),
      status: 'draft',
      userPhone: user.phone,
      userFirstName: user.firstName,
      userLastName: user.lastName,
      userCountryCode: user.countryCode,
      userKycStatus: user.kycStatus,
      userAccountAgeDays: accountAgeDays,
      totalAmount,
      totalAmountXof,
      transactionCount: transactions.length,
    });

    const savedSar = await this.sarRepository.save(sar);

    // Emit event
    this.eventEmitter.emit('compliance.sar.created', {
      sarId: savedSar.id,
      userId,
      riskLevel,
      triggerReason,
    });

    this.logger.log(`SAR created: ${savedSar.id} (Risk: ${riskLevel})`);

    return savedSar;
  }

  /**
   * Create SAR from manual compliance officer flag
   */
  async createManualSAR(
    userId: string,
    transactionIds: string[],
    narrative: string,
    officerId: string,
    riskScore?: number,
  ): Promise<SuspiciousActivityReportOrmEntity> {
    this.logger.log(
      `Creating manual SAR for user ${userId} by officer ${officerId}`,
    );

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const transactions = await this.transactionRepository.find({
      where: {
        id: In(transactionIds),
      },
    });

    const totalAmount = transactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    );

    const accountAgeDays = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    const calculatedRiskScore = riskScore || 70; // Default to high risk for manual flags

    const sar = this.sarRepository.create({
      userId,
      transactionIds,
      triggerReason: 'manual_flag',
      riskScore: calculatedRiskScore,
      riskLevel: this.calculateRiskLevel(calculatedRiskScore),
      narrative,
      detectionMethod: 'manual',
      detectedAt: new Date(),
      status: 'under_investigation',
      userPhone: user.phone,
      userFirstName: user.firstName,
      userLastName: user.lastName,
      userCountryCode: user.countryCode,
      userKycStatus: user.kycStatus,
      userAccountAgeDays: accountAgeDays,
      totalAmount,
      totalAmountXof: totalAmount * this.XOF_TO_USDC_RATE,
      transactionCount: transactions.length,
      investigatedBy: officerId,
      investigationStartedAt: new Date(),
    });

    return this.sarRepository.save(sar);
  }

  // ==========================================
  // SAR Management
  // ==========================================

  /**
   * Get SAR by ID
   */
  async getSAR(sarId: string): Promise<SuspiciousActivityReportOrmEntity> {
    const sar = await this.sarRepository.findOne({
      where: { id: sarId },
      relations: ['user'],
    });

    if (!sar) {
      throw new Error(`SAR ${sarId} not found`);
    }

    return sar;
  }

  /**
   * Get SARs by status
   */
  async getSARsByStatus(
    status: SARStatus,
    limit = 50,
  ): Promise<SuspiciousActivityReportOrmEntity[]> {
    return this.sarRepository.find({
      where: { status },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get user's SAR history
   */
  async getUserSARHistory(
    userId: string,
  ): Promise<SuspiciousActivityReportOrmEntity[]> {
    return this.sarRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update SAR investigation notes
   */
  async updateInvestigation(
    sarId: string,
    officerId: string,
    notes: string,
  ): Promise<SuspiciousActivityReportOrmEntity> {
    const sar = await this.getSAR(sarId);

    if (!sar.investigationStartedAt) {
      sar.investigationStartedAt = new Date();
    }

    sar.investigatedBy = officerId;
    sar.investigationNotes = notes;
    sar.status = 'under_investigation';

    return this.sarRepository.save(sar);
  }

  /**
   * Submit SAR to BCEAO
   */
  async submitSAR(
    sarId: string,
    officerId: string,
  ): Promise<SuspiciousActivityReportOrmEntity> {
    const sar = await this.getSAR(sarId);

    if (sar.status !== 'under_investigation') {
      throw new Error(
        `SAR ${sarId} must be under investigation before submission (current status: ${sar.status})`,
      );
    }

    // PROVIDER_INTEGRATION: Wire to BCEAO regulatory reporting API
    sar.status = 'submitted';
    sar.submittedBy = officerId;
    sar.submittedAt = new Date();
    sar.bceaoReference = this.generateBCEAOReference(sar);

    const submittedSar = await this.sarRepository.save(sar);

    this.eventEmitter.emit('compliance.sar.submitted', {
      sarId: submittedSar.id,
      userId: sar.userId,
      bceaoReference: sar.bceaoReference,
    });

    this.logger.log(
      `SAR ${sarId} submitted to BCEAO with reference ${sar.bceaoReference}`,
    );

    return submittedSar;
  }

  /**
   * Close SAR (with or without filing)
   */
  async closeSAR(
    sarId: string,
    officerId: string,
    reason: string,
    dismiss = false,
  ): Promise<SuspiciousActivityReportOrmEntity> {
    const sar = await this.getSAR(sarId);

    sar.status = dismiss ? 'dismissed' : 'closed';
    sar.closedAt = new Date();
    sar.closedBy = officerId;
    sar.closedReason = reason;

    const closedSar = await this.sarRepository.save(sar);

    this.logger.log(
      `SAR ${sarId} ${dismiss ? 'dismissed' : 'closed'} by ${officerId}`,
    );

    return closedSar;
  }

  /**
   * Export SAR in regulatory format
   */
  async exportSAR(sarId: string): Promise<Record<string, unknown>> {
    const sar = await this.getSAR(sarId);

    // Fetch full transaction details
    const transactions = await this.transactionRepository.find({
      where: {
        id: In(sar.transactionIds),
      },
    });

    return {
      sarMetadata: {
        sarId: sar.id,
        bceaoReference: sar.bceaoReference,
        status: sar.status,
        detectedAt: sar.detectedAt.toISOString(),
        submittedAt: sar.submittedAt?.toISOString(),
      },
      subject: {
        userId: sar.userId,
        phone: sar.userPhone,
        firstName: sar.userFirstName,
        lastName: sar.userLastName,
        countryCode: sar.userCountryCode,
        kycStatus: sar.userKycStatus,
        accountAgeDays: sar.userAccountAgeDays,
      },
      suspiciousActivity: {
        triggerReason: sar.triggerReason,
        riskScore: sar.riskScore,
        riskLevel: sar.riskLevel,
        detectionMethod: sar.detectionMethod,
        narrative: sar.narrative,
      },
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        timestamp: t.createdAt.toISOString(),
        recipientAddress: t.recipientAddress,
        recipientPhone: t.recipientPhone,
      })),
      investigation: {
        investigatedBy: sar.investigatedBy,
        investigationStartedAt: sar.investigationStartedAt?.toISOString(),
        investigationNotes: sar.investigationNotes,
        submittedBy: sar.submittedBy,
        closedBy: sar.closedBy,
        closedReason: sar.closedReason,
      },
      financialSummary: {
        transactionCount: sar.transactionCount,
        totalAmountUsdc: sar.totalAmount,
        totalAmountXof: sar.totalAmountXof,
      },
    };
  }

  // ==========================================
  // Narrative Generation
  // ==========================================

  /**
   * Generate SAR narrative describing suspicious activity
   */
  private generateNarrative(
    user: UserOrmEntity,
    transactions: TransactionOrmEntity[],
    triggerReason: SARTriggerReason,
    indicators: string[],
  ): string {
    const accountAgeDays = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    const totalAmount = transactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    );

    let narrative = `SUSPICIOUS ACTIVITY DETECTED\n\n`;
    narrative += `Subject: User ${user.phone} (${user.firstName || 'N/A'} ${user.lastName || 'N/A'})\n`;
    narrative += `Country: ${user.countryCode}\n`;
    narrative += `Account Age: ${accountAgeDays} days\n`;
    narrative += `KYC Status: ${user.kycStatus}\n\n`;

    narrative += `TRIGGER REASON: ${this.formatTriggerReason(triggerReason)}\n\n`;

    narrative += `TRANSACTION SUMMARY:\n`;
    narrative += `- Number of transactions: ${transactions.length}\n`;
    narrative += `- Total amount: ${totalAmount.toFixed(2)} USDC (~${(totalAmount * this.XOF_TO_USDC_RATE).toFixed(2)} XOF)\n`;
    narrative += `- Time period: ${this.formatDateRange(transactions)}\n\n`;

    narrative += `INDICATORS:\n`;
    indicators.forEach((indicator, idx) => {
      narrative += `${idx + 1}. ${indicator}\n`;
    });

    narrative += `\n`;
    narrative += this.generateReasonSpecificNarrative(
      triggerReason,
      transactions,
      indicators,
    );

    narrative += `\nRECOMMENDATION: Further investigation recommended. Transaction pattern warrants enhanced due diligence and potential filing with BCEAO.`;

    return narrative;
  }

  /**
   * Generate trigger reason specific narrative
   */
  private generateReasonSpecificNarrative(
    triggerReason: SARTriggerReason,
    transactions: TransactionOrmEntity[],
    _indicators: string[],
  ): string {
    switch (triggerReason) {
      case 'structuring':
        return this.generateStructuringNarrative(transactions);
      case 'velocity_anomaly':
        return this.generateVelocityNarrative(transactions);
      case 'geographic_risk':
        return this.generateGeographicNarrative(transactions);
      case 'rapid_movement':
        return this.generateRapidMovementNarrative(transactions);
      default:
        return 'ANALYSIS:\nPattern detected through automated monitoring. Manual review required for complete assessment.';
    }
  }

  /**
   * Generate structuring-specific narrative
   */
  private generateStructuringNarrative(
    transactions: TransactionOrmEntity[],
  ): string {
    const amounts = transactions.map((t) => Number(t.amount));
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const maxAmount = Math.max(...amounts);
    const minAmount = Math.min(...amounts);

    let narrative = `STRUCTURING ANALYSIS:\n`;
    narrative += `The subject conducted ${transactions.length} transactions within a 24-hour period.\n`;
    narrative += `Transaction amounts ranged from ${minAmount.toFixed(2)} to ${maxAmount.toFixed(2)} USDC.\n`;
    narrative += `Average transaction size: ${avgAmount.toFixed(2)} USDC.\n`;
    narrative += `All transactions were below the 1M XOF reporting threshold.\n`;
    narrative += `Pattern suggests deliberate structuring to evade reporting requirements.\n`;

    return narrative;
  }

  /**
   * Generate velocity-specific narrative
   */
  private generateVelocityNarrative(
    transactions: TransactionOrmEntity[],
  ): string {
    const timeSpan = this.calculateTimeSpan(transactions);

    let narrative = `VELOCITY ANALYSIS:\n`;
    narrative += `The subject executed ${transactions.length} transactions within ${timeSpan}.\n`;
    narrative += `This frequency significantly exceeds normal user behavior patterns.\n`;
    narrative += `Rapid transaction succession may indicate automated activity or account compromise.\n`;

    return narrative;
  }

  /**
   * Generate geographic risk narrative
   */
  private generateGeographicNarrative(
    _transactions: TransactionOrmEntity[],
  ): string {
    let narrative = `GEOGRAPHIC RISK ANALYSIS:\n`;
    narrative += `Transaction involves high-risk jurisdiction flagged by FATF.\n`;
    narrative += `Enhanced due diligence required for cross-border transactions.\n`;
    narrative += `Source/destination country poses elevated AML/CFT risk.\n`;

    return narrative;
  }

  /**
   * Generate rapid movement narrative
   */
  private generateRapidMovementNarrative(
    transactions: TransactionOrmEntity[],
  ): string {
    const deposits = transactions.filter((t) => t.type === 'deposit');
    const outflows = transactions.filter(
      (t) => t.type === 'withdrawal' || t.type.startsWith('transfer'),
    );

    let narrative = `RAPID MOVEMENT ANALYSIS:\n`;
    narrative += `Funds deposited and quickly moved out, indicating potential layering.\n`;
    narrative += `${deposits.length} deposit(s) followed by ${outflows.length} outbound transaction(s).\n`;
    narrative += `Pattern consistent with money laundering layering phase.\n`;
    narrative += `Limited economic rationale for rapid fund movement.\n`;

    return narrative;
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  /**
   * Format trigger reason for human readability
   */
  private formatTriggerReason(reason: SARTriggerReason): string {
    const mapping: Record<SARTriggerReason, string> = {
      structuring: 'Transaction Structuring (Smurfing)',
      velocity_anomaly: 'Abnormal Transaction Velocity',
      geographic_risk: 'High-Risk Geographic Location',
      pep_transaction: 'Politically Exposed Person Transaction',
      sanctions_proximity: 'Sanctions List Proximity',
      manual_flag: 'Manual Compliance Flag',
      round_amount: 'Suspicious Round Amounts',
      rapid_movement: 'Rapid Fund Movement (Layering)',
      inconsistent_profile: 'Inconsistent with User Profile',
    };

    return mapping[reason] || reason;
  }

  /**
   * Format date range from transactions
   */
  private formatDateRange(transactions: TransactionOrmEntity[]): string {
    if (transactions.length === 0) return 'N/A';

    const dates = transactions.map((t) => t.createdAt.getTime());
    const earliest = new Date(Math.min(...dates));
    const latest = new Date(Math.max(...dates));

    return `${earliest.toISOString()} to ${latest.toISOString()}`;
  }

  /**
   * Calculate time span of transactions
   */
  private calculateTimeSpan(transactions: TransactionOrmEntity[]): string {
    if (transactions.length === 0) return 'N/A';

    const dates = transactions.map((t) => t.createdAt.getTime());
    const earliest = Math.min(...dates);
    const latest = Math.max(...dates);

    const diffMs = latest - earliest;
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) {
      const diffMinutes = diffMs / (1000 * 60);
      return `${Math.round(diffMinutes)} minutes`;
    }

    return `${diffHours.toFixed(1)} hours`;
  }

  /**
   * Calculate risk level from score
   */
  private calculateRiskLevel(riskScore: number): RiskLevel {
    if (riskScore < 25) return 'low';
    if (riskScore < 50) return 'medium';
    if (riskScore < 75) return 'high';
    return 'critical';
  }

  /**
   * Generate BCEAO reference for SAR
   */
  private generateBCEAOReference(
    _sar: SuspiciousActivityReportOrmEntity,
  ): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const sequence = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0');

    return `SAR-BCEAO-${year}-${month}-${sequence}`;
  }

  /**
   * Get SAR statistics
   */
  async getSARStatistics(days = 30): Promise<{
    totalSARs: number;
    openSARs: number;
    submittedSARs: number;
    dismissedSARs: number;
    averageRiskScore: number;
    sarsByTrigger: Record<SARTriggerReason, number>;
    sarsByRiskLevel: Record<RiskLevel, number>;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const sars = await this.sarRepository.find({
      where: {
        createdAt: In([cutoffDate]),
      },
    });

    const sarsByTrigger = sars.reduce(
      (acc, sar) => {
        acc[sar.triggerReason] = (acc[sar.triggerReason] || 0) + 1;
        return acc;
      },
      {} as Record<SARTriggerReason, number>,
    );

    const sarsByRiskLevel = sars.reduce(
      (acc, sar) => {
        acc[sar.riskLevel] = (acc[sar.riskLevel] || 0) + 1;
        return acc;
      },
      {} as Record<RiskLevel, number>,
    );

    const totalRiskScore = sars.reduce(
      (sum, sar) => sum + Number(sar.riskScore),
      0,
    );
    const averageRiskScore = sars.length > 0 ? totalRiskScore / sars.length : 0;

    return {
      totalSARs: sars.length,
      openSARs: sars.filter((s) =>
        ['draft', 'under_investigation'].includes(s.status),
      ).length,
      submittedSARs: sars.filter((s) => s.status === 'submitted').length,
      dismissedSARs: sars.filter((s) => s.status === 'dismissed').length,
      averageRiskScore: Math.round(averageRiskScore * 100) / 100,
      sarsByTrigger,
      sarsByRiskLevel,
    };
  }
}
