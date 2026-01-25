import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  SARTriggerReason,
  RiskLevel,
  VelocityCheckResult,
  StructuringDetectionResult,
  GeographicRisk,
  PEPScreeningResult,
  TransactionPattern,
} from '../../domain/compliance.types';
import { TransactionOrmEntity } from '../../../transaction/infrastructure/orm-entities/transaction.orm-entity';
import { UserOrmEntity } from '../../../user/infrastructure/orm-entities/user.orm-entity';
import { ComplianceAlertOrmEntity } from '../../infrastructure/orm-entities';

/**
 * AML/CFT Service
 *
 * Anti-Money Laundering / Counter-Financing of Terrorism detection engine.
 * Implements BCEAO compliance rules and FATF recommendations.
 *
 * Detection Capabilities:
 * - Transaction structuring (smurfing)
 * - Velocity anomalies
 * - Geographic risk assessment
 * - PEP screening
 * - Pattern analysis
 *
 * FATF Recommendations Applied:
 * - R.10: Customer due diligence
 * - R.11: Record keeping
 * - R.20: Suspicious transaction reporting
 * - R.21: Tipping-off and confidentiality
 */
@Injectable()
export class AMLCFTService {
  private readonly logger = new Logger(AMLCFTService.name);

  // BCEAO/FATF thresholds
  private readonly STRUCTURING_THRESHOLD_XOF = 1_000_000; // 1M XOF
  private readonly STRUCTURING_TIME_WINDOW_HOURS = 24;
  private readonly VELOCITY_THRESHOLD_PER_HOUR = 5; // Transactions per hour
  private readonly RAPID_MOVEMENT_HOURS = 2; // Funds move out within 2 hours
  private readonly XOF_TO_USDC_RATE = 600; // Should be fetched from exchange service

  // High-risk countries (simplified - should be maintained in database)
  private readonly HIGH_RISK_COUNTRIES = [
    'AF', 'IR', 'KP', 'SY', 'YE', // FATF high-risk
    'MM', 'PK', 'SS', 'VE', // Additional monitoring
  ];

  constructor(
    @InjectRepository(TransactionOrmEntity)
    private readonly transactionRepository: Repository<TransactionOrmEntity>,
    @InjectRepository(UserOrmEntity)
    private readonly userRepository: Repository<UserOrmEntity>,
    @InjectRepository(ComplianceAlertOrmEntity)
    private readonly alertRepository: Repository<ComplianceAlertOrmEntity>,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ==========================================
  // Real-time Transaction Screening
  // ==========================================

  /**
   * Analyze transaction for AML/CFT risks
   * Called before transaction execution
   *
   * @param userId - User initiating transaction
   * @param amount - Transaction amount in USDC
   * @param recipientId - Recipient user ID (if internal transfer)
   * @param metadata - Additional transaction context
   * @returns Risk assessment result
   */
  async analyzeTransaction(
    userId: string,
    amount: number,
    recipientId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<{
    approved: boolean;
    riskLevel: RiskLevel;
    riskScore: number;
    flags: string[];
    requiresManualReview: boolean;
  }> {
    const flags: string[] = [];
    let riskScore = 0;

    // 1. Check velocity
    const velocityResult = await this.checkVelocity(userId);
    if (velocityResult.exceeded) {
      flags.push('velocity_exceeded');
      riskScore += 30;
    }

    // 2. Check for structuring pattern
    const structuringResult = await this.detectStructuring(userId, amount);
    if (structuringResult.confidence > 70) {
      flags.push('potential_structuring');
      riskScore += 40;
    }

    // 3. Check geographic risk
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      const geoRisk = this.assessGeographicRisk(user.countryCode);
      if (geoRisk.riskLevel === 'high' || geoRisk.riskLevel === 'critical') {
        flags.push('high_risk_geography');
        riskScore += geoRisk.riskScore;
      }
    }

    // 4. Check for large transaction
    const amountXof = amount * this.XOF_TO_USDC_RATE;
    if (amountXof > this.STRUCTURING_THRESHOLD_XOF) {
      flags.push('large_transaction');
      riskScore += 15;
    }

    // 5. Check for round amounts (structuring indicator)
    if (this.isRoundAmount(amount)) {
      flags.push('round_amount');
      riskScore += 10;
    }

    // 6. Check PEP status
    const pepResult = await this.screenForPEP(userId);
    if (pepResult.isPEP) {
      flags.push('pep_transaction');
      riskScore += 25;
    }

    // Determine risk level
    const riskLevel = this.calculateRiskLevel(riskScore);

    // Determine if manual review required
    const requiresManualReview =
      riskLevel === 'high' || riskLevel === 'critical';

    // Auto-reject critical risk
    const approved = riskLevel !== 'critical';

    // Create alert if medium or higher
    if (riskLevel !== 'low') {
      await this.createAlert(userId, null, flags, riskScore, riskLevel);
    }

    this.logger.log(
      `Transaction analysis for user ${userId}: Risk=${riskLevel}, Score=${riskScore}, Flags=${flags.join(', ')}`,
    );

    return {
      approved,
      riskLevel,
      riskScore,
      flags,
      requiresManualReview,
    };
  }

  // ==========================================
  // Structuring Detection (Smurfing)
  // ==========================================

  /**
   * Detect transaction structuring patterns
   *
   * Structuring (smurfing) indicators:
   * - Multiple transactions just below reporting threshold
   * - Consistent amounts across transactions
   * - Rapid succession of transactions
   * - Total exceeds threshold when aggregated
   */
  async detectStructuring(
    userId: string,
    currentAmount?: number,
  ): Promise<StructuringDetectionResult> {
    const windowStart = new Date();
    windowStart.setHours(
      windowStart.getHours() - this.STRUCTURING_TIME_WINDOW_HOURS,
    );

    // Get recent transactions
    const transactions = await this.transactionRepository.find({
      where: {
        walletId: userId, // Assuming walletId correlates to userId
        createdAt: MoreThan(windowStart),
        status: 'completed',
      },
      order: {
        createdAt: 'DESC',
      },
    });

    const amounts = transactions.map((t) => Number(t.amount));
    if (currentAmount) {
      amounts.push(currentAmount);
    }

    const totalAmount = amounts.reduce((sum, a) => sum + a, 0);
    const totalAmountXof = totalAmount * this.XOF_TO_USDC_RATE;
    const transactionCount = amounts.length;
    const averageAmount = transactionCount > 0 ? totalAmount / transactionCount : 0;

    // Calculate standard deviation
    const variance =
      amounts.reduce((sum, a) => sum + Math.pow(a - averageAmount, 2), 0) /
      transactionCount;
    const standardDeviation = Math.sqrt(variance);

    // Check if amounts are suspiciously consistent (low std dev)
    const consistentAmounts =
      transactionCount >= 3 && standardDeviation < averageAmount * 0.1;

    // Check if all transactions are below threshold
    const thresholdUsdc = this.STRUCTURING_THRESHOLD_XOF / this.XOF_TO_USDC_RATE;
    const belowThreshold = amounts.every((a) => a < thresholdUsdc * 0.95); // 95% of threshold

    // Calculate confidence score
    let confidence = 0;
    if (consistentAmounts) confidence += 40;
    if (belowThreshold && totalAmountXof > this.STRUCTURING_THRESHOLD_XOF)
      confidence += 40;
    if (transactionCount >= 5) confidence += 20;

    // Calculate risk score
    const riskScore = Math.min(100, confidence + (transactionCount * 5));

    return {
      userId,
      detectionPeriod: {
        start: windowStart,
        end: new Date(),
      },
      totalAmount,
      transactionCount,
      averageAmount,
      standardDeviation,
      consistentAmounts,
      belowThreshold,
      riskScore,
      confidence,
      transactions: transactions.map((t) => t.id),
    };
  }

  // ==========================================
  // Velocity Anomaly Detection
  // ==========================================

  /**
   * Check transaction velocity for anomalies
   *
   * Flags:
   * - Exceeding normal transaction frequency
   * - Burst patterns (many transactions in short time)
   * - Inconsistent with user profile
   */
  async checkVelocity(
    userId: string,
    timeWindowMinutes = 60,
  ): Promise<VelocityCheckResult> {
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - timeWindowMinutes);

    const transactions = await this.transactionRepository.find({
      where: {
        walletId: userId,
        createdAt: MoreThan(windowStart),
      },
      order: {
        createdAt: 'DESC',
      },
    });

    const transactionCount = transactions.length;
    const totalAmount = transactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    );
    const averageAmount = transactionCount > 0 ? totalAmount / transactionCount : 0;

    // Get threshold from config
    const threshold =
      this.configService.get<number>('compliance.autoFlagVelocityThreshold') ||
      this.VELOCITY_THRESHOLD_PER_HOUR;

    const exceeded = transactionCount > threshold;

    // Risk score based on how much threshold was exceeded
    const exceedanceRatio = transactionCount / threshold;
    const riskScore = Math.min(100, exceedanceRatio * 50);

    return {
      userId,
      timeWindow: timeWindowMinutes,
      transactionCount,
      totalAmount,
      averageAmount,
      threshold,
      exceeded,
      riskScore,
      transactions: transactions.map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        timestamp: t.createdAt,
      })),
    };
  }

  // ==========================================
  // Geographic Risk Assessment
  // ==========================================

  /**
   * Assess geographic risk based on country code
   *
   * Risk factors:
   * - FATF blacklist/greylist
   * - BCEAO risk assessment
   * - Sanctions lists (OFAC, UN, EU)
   * - Political instability
   */
  assessGeographicRisk(countryCode: string): GeographicRisk {
    const isSanctioned = this.HIGH_RISK_COUNTRIES.includes(countryCode);
    const reasons: string[] = [];
    let riskScore = 10; // Base risk score
    let riskLevel: RiskLevel = 'low';

    if (isSanctioned) {
      reasons.push('FATF high-risk jurisdiction');
      riskScore = 90;
      riskLevel = 'critical';
    }

    // WAEMU countries (low risk)
    const waCountries = ['CI', 'SN', 'ML', 'BF', 'BJ', 'TG', 'NE', 'GW'];
    if (waCountries.includes(countryCode)) {
      reasons.push('WAEMU member state');
      riskScore = 5;
      riskLevel = 'low';
    }

    // Non-WAEMU African countries (medium risk)
    const africanCountries = [
      'NG', 'GH', 'KE', 'UG', 'TZ', 'RW', 'ZA', 'EG', 'MA', 'TN',
    ];
    if (africanCountries.includes(countryCode)) {
      reasons.push('Non-WAEMU African country');
      riskScore = 30;
      riskLevel = 'medium';
    }

    // Assign risk level based on score
    if (riskScore < 25) riskLevel = 'low';
    else if (riskScore < 50) riskLevel = 'medium';
    else if (riskScore < 75) riskLevel = 'high';
    else riskLevel = 'critical';

    return {
      countryCode,
      riskLevel,
      riskScore,
      reasons,
      isSanctioned,
      lastUpdated: new Date(),
    };
  }

  // ==========================================
  // PEP Screening
  // ==========================================

  /**
   * Screen user for Politically Exposed Person status
   *
   * In production, this would integrate with:
   * - World-Check (Refinitiv)
   * - Dow Jones Risk & Compliance
   * - LexisNexis
   * - ComplyAdvantage
   *
   * Current implementation is a placeholder
   */
  async screenForPEP(userId: string): Promise<PEPScreeningResult> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // TODO: Integrate with PEP screening database
    // For now, return negative screening result
    return {
      userId,
      isPEP: false,
      screenedAt: new Date(),
    };
  }

  // ==========================================
  // Pattern Detection
  // ==========================================

  /**
   * Detect suspicious patterns in user transaction history
   */
  async detectPatterns(userId: string): Promise<TransactionPattern[]> {
    const patterns: TransactionPattern[] = [];

    // Check for rapid fund movement (layering)
    const rapidMovement = await this.detectRapidMovement(userId);
    if (rapidMovement) {
      patterns.push(rapidMovement);
    }

    // Check for round amount patterns
    const roundAmountPattern = await this.detectRoundAmountPattern(userId);
    if (roundAmountPattern) {
      patterns.push(roundAmountPattern);
    }

    return patterns;
  }

  /**
   * Detect rapid movement of funds (layering indicator)
   *
   * Pattern: Deposit → Quick Transfer Out
   * Indicates potential money laundering layering phase
   */
  private async detectRapidMovement(
    userId: string,
  ): Promise<TransactionPattern | null> {
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - this.RAPID_MOVEMENT_HOURS);

    const transactions = await this.transactionRepository.find({
      where: {
        walletId: userId,
        createdAt: MoreThan(windowStart),
        status: 'completed',
      },
      order: {
        createdAt: 'ASC',
      },
    });

    // Look for deposit followed by quick withdrawal/transfer
    const deposits = transactions.filter((t) => t.type === 'deposit');
    const outflows = transactions.filter(
      (t) => t.type === 'withdrawal' || t.type.startsWith('transfer'),
    );

    if (deposits.length > 0 && outflows.length > 0) {
      const totalDeposit = deposits.reduce(
        (sum, t) => sum + Number(t.amount),
        0,
      );
      const totalOutflow = outflows.reduce(
        (sum, t) => sum + Number(t.amount),
        0,
      );

      // If >80% of deposited funds moved out quickly
      if (totalOutflow > totalDeposit * 0.8) {
        return {
          userId,
          patternType: 'rapid_movement',
          detectedAt: new Date(),
          transactionIds: transactions.map((t) => t.id),
          confidence: 75,
          indicators: [
            `${deposits.length} deposits totaling ${totalDeposit} USDC`,
            `${outflows.length} outflows totaling ${totalOutflow} USDC`,
            `${Math.round((totalOutflow / totalDeposit) * 100)}% of funds moved out within ${this.RAPID_MOVEMENT_HOURS} hours`,
          ],
          metadata: {
            totalDeposit,
            totalOutflow,
            timeWindow: this.RAPID_MOVEMENT_HOURS,
          },
        };
      }
    }

    return null;
  }

  /**
   * Detect suspiciously round transaction amounts
   *
   * Criminals often use round numbers (e.g., exactly 1000, 5000)
   * rather than natural amounts (e.g., 1,234.56)
   */
  private async detectRoundAmountPattern(
    userId: string,
  ): Promise<TransactionPattern | null> {
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - 7); // Last 7 days

    const transactions = await this.transactionRepository.find({
      where: {
        walletId: userId,
        createdAt: MoreThan(windowStart),
        status: 'completed',
      },
    });

    const roundTransactions = transactions.filter((t) =>
      this.isRoundAmount(Number(t.amount)),
    );

    // If >70% of transactions are round amounts
    const roundPercentage =
      transactions.length > 0
        ? (roundTransactions.length / transactions.length) * 100
        : 0;

    if (roundPercentage > 70 && transactions.length >= 5) {
      return {
        userId,
        patternType: 'round_amount',
        detectedAt: new Date(),
        transactionIds: roundTransactions.map((t) => t.id),
        confidence: Math.min(95, roundPercentage),
        indicators: [
          `${roundTransactions.length} of ${transactions.length} transactions (${Math.round(roundPercentage)}%) are round amounts`,
          'Consistent use of round numbers may indicate structuring',
        ],
        metadata: {
          roundPercentage,
          totalTransactions: transactions.length,
          roundTransactions: roundTransactions.length,
        },
      };
    }

    return null;
  }

  /**
   * Check if amount is suspiciously round
   */
  private isRoundAmount(amount: number): boolean {
    // Check if amount is exact multiple of 100, 500, or 1000
    return (
      amount % 1000 === 0 ||
      amount % 500 === 0 ||
      (amount % 100 === 0 && amount >= 100)
    );
  }

  // ==========================================
  // Risk Calculation
  // ==========================================

  /**
   * Calculate risk level from numerical risk score
   */
  private calculateRiskLevel(riskScore: number): RiskLevel {
    if (riskScore < 25) return 'low';
    if (riskScore < 50) return 'medium';
    if (riskScore < 75) return 'high';
    return 'critical';
  }

  // ==========================================
  // Alert Management
  // ==========================================

  /**
   * Create compliance alert
   */
  private async createAlert(
    userId: string,
    transactionId: string | null,
    flags: string[],
    riskScore: number,
    riskLevel: RiskLevel,
  ): Promise<ComplianceAlertOrmEntity> {
    const alert = this.alertRepository.create({
      alertType: this.determineAlertType(flags),
      severity: riskLevel,
      userId,
      transactionId,
      title: `${riskLevel.toUpperCase()} risk transaction detected`,
      description: `Risk score: ${riskScore}. Flags: ${flags.join(', ')}`,
      metadata: {
        riskScore,
        flags,
      },
    });

    const savedAlert = await this.alertRepository.save(alert);

    // Emit event for notification
    this.eventEmitter.emit('compliance.alert.created', {
      alertId: savedAlert.id,
      severity: riskLevel,
      userId,
    });

    this.logger.warn(
      `Compliance alert created: ${savedAlert.id} for user ${userId}`,
    );

    return savedAlert;
  }

  /**
   * Determine primary alert type from flags
   */
  private determineAlertType(flags: string[]): SARTriggerReason {
    if (flags.includes('potential_structuring')) return 'structuring';
    if (flags.includes('velocity_exceeded')) return 'velocity_anomaly';
    if (flags.includes('high_risk_geography')) return 'geographic_risk';
    if (flags.includes('pep_transaction')) return 'pep_transaction';
    return 'manual_flag';
  }

  /**
   * Get open alerts
   */
  async getOpenAlerts(
    severity?: RiskLevel,
    limit = 50,
  ): Promise<ComplianceAlertOrmEntity[]> {
    const query = this.alertRepository
      .createQueryBuilder('alert')
      .where('alert.resolved = :resolved', { resolved: false })
      .orderBy('alert.createdAt', 'DESC')
      .take(limit);

    if (severity) {
      query.andWhere('alert.severity = :severity', { severity });
    }

    return query.getMany();
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(
    alertId: string,
    officerId: string,
  ): Promise<ComplianceAlertOrmEntity> {
    const alert = await this.alertRepository.findOne({
      where: { id: alertId },
    });

    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = officerId;

    return this.alertRepository.save(alert);
  }

  /**
   * Resolve alert
   */
  async resolveAlert(
    alertId: string,
    officerId: string,
    resolution: string,
    escalateToSar = false,
  ): Promise<ComplianceAlertOrmEntity> {
    const alert = await this.alertRepository.findOne({
      where: { id: alertId },
    });

    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();
    alert.resolvedBy = officerId;
    alert.resolution = resolution;
    alert.escalatedToSar = escalateToSar;

    const resolvedAlert = await this.alertRepository.save(alert);

    this.logger.log(
      `Alert ${alertId} resolved by ${officerId}. Escalated to SAR: ${escalateToSar}`,
    );

    return resolvedAlert;
  }

  // ==========================================
  // Batch Analysis
  // ==========================================

  /**
   * Run comprehensive AML analysis on all active users
   * Used for periodic risk assessment
   */
  async runBatchAnalysis(
    daysBack = 7,
  ): Promise<{
    usersAnalyzed: number;
    alertsGenerated: number;
    highRiskUsers: number;
  }> {
    this.logger.log(`Starting batch AML analysis for last ${daysBack} days`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    // Get users with recent activity
    const activeTransactions = await this.transactionRepository.find({
      where: {
        createdAt: MoreThan(cutoffDate),
        status: 'completed',
      },
    });

    const uniqueUserIds = [
      ...new Set(activeTransactions.map((t) => t.walletId)),
    ];

    let alertsGenerated = 0;
    let highRiskUsers = 0;

    for (const userId of uniqueUserIds) {
      // Run pattern detection
      const patterns = await this.detectPatterns(userId);

      for (const pattern of patterns) {
        if (pattern.confidence > 60) {
          await this.createAlert(
            userId,
            null,
            [pattern.patternType],
            pattern.confidence,
            this.calculateRiskLevel(pattern.confidence),
          );
          alertsGenerated++;

          if (pattern.confidence > 70) {
            highRiskUsers++;
          }
        }
      }
    }

    this.logger.log(
      `Batch analysis complete: ${uniqueUserIds.length} users, ${alertsGenerated} alerts, ${highRiskUsers} high-risk`,
    );

    return {
      usersAnalyzed: uniqueUserIds.length,
      alertsGenerated,
      highRiskUsers,
    };
  }

  /**
   * Get user risk profile summary
   */
  async getUserRiskProfile(userId: string): Promise<{
    overallRiskScore: number;
    riskLevel: RiskLevel;
    flags: string[];
    recentAlerts: ComplianceAlertOrmEntity[];
    transactionVelocity: VelocityCheckResult;
    structuringRisk: StructuringDetectionResult;
  }> {
    const [alerts, velocity, structuring] = await Promise.all([
      this.alertRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 10,
      }),
      this.checkVelocity(userId, 60),
      this.detectStructuring(userId),
    ]);

    const flags: string[] = [];
    let riskScore = 0;

    // Factor in recent alerts
    if (alerts.length > 0) {
      flags.push(`${alerts.length}_recent_alerts`);
      riskScore += Math.min(30, alerts.length * 5);
    }

    // Factor in velocity
    if (velocity.exceeded) {
      flags.push('high_velocity');
      riskScore += velocity.riskScore;
    }

    // Factor in structuring
    if (structuring.confidence > 50) {
      flags.push('structuring_pattern');
      riskScore += structuring.riskScore;
    }

    return {
      overallRiskScore: Math.min(100, riskScore),
      riskLevel: this.calculateRiskLevel(riskScore),
      flags,
      recentAlerts: alerts,
      transactionVelocity: velocity,
      structuringRisk: structuring,
    };
  }
}
