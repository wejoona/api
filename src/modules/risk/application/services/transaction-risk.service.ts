/**
 * Transaction Risk Service
 * Orchestrates risk checks for transactions
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RiskClientFactory } from '../../infrastructure/risk-client.factory';
import {
  TransactionAnalysisRequest,
  TransactionAnalysisResult,
  IndividualScreeningRequest,
  ScreeningResult,
  VelocityCheckResult,
  DeviceFingerprint,
  DeviceFingerprintResult,
  FullRiskAssessment,
  RiskDecision,
  UserRiskProfile,
  AddressScreeningAssessment,
} from '../../domain/interfaces/risk-assessment.types';
import {
  CircleComplianceAdapter,
  CircleBlockchain,
} from '../../../providers/circle/adapters/circle-compliance.adapter';

export interface PreTransactionCheckInput {
  transactionId: string;
  userId: string;
  userFirstName: string;
  userLastName: string;
  userDateOfBirth?: string;
  userNationality?: string;
  type: 'transfer' | 'deposit' | 'withdrawal' | 'exchange';
  amount: number;
  currency: string;
  sourceCountry?: string;
  destinationCountry?: string;
  recipientId?: string;
  recipientType?: 'internal' | 'external' | 'merchant';
  channel: 'mobile' | 'web' | 'api';
  deviceFingerprint?: DeviceFingerprint;
  skipSanctionsCheck?: boolean;
  // For external transfers - blockchain address screening
  destinationAddress?: string;
  sourceAddress?: string;
  blockchain?: string;
}

export interface PreTransactionCheckResult {
  allowed: boolean;
  requiresStepUp: boolean;
  stepUpType?: 'biometric' | 'otp' | 'pin' | 'manual_review';
  riskScore: number;
  riskLevel: string;
  blockedReasons?: string[];
  assessment: FullRiskAssessment;
}

@Injectable()
export class TransactionRiskService {
  private readonly logger = new Logger(TransactionRiskService.name);

  constructor(
    private readonly riskClientFactory: RiskClientFactory,
    private readonly eventEmitter: EventEmitter2,
    private readonly circleCompliance: CircleComplianceAdapter,
  ) {}

  private get client() {
    return this.riskClientFactory.getClient();
  }

  /**
   * Perform comprehensive pre-transaction risk check
   */
  async checkTransaction(
    input: PreTransactionCheckInput,
  ): Promise<PreTransactionCheckResult> {
    this.logger.log(`Checking transaction risk: ${input.transactionId}`);

    const startTime = Date.now();

    try {
      // Run checks in parallel where possible
      const [transactionAnalysis, velocityCheck, deviceAnalysis] =
        await Promise.all([
          this.analyzeTransaction(input),
          this.checkVelocity(input.userId),
          input.deviceFingerprint
            ? this.analyzeDevice(input.deviceFingerprint)
            : Promise.resolve(undefined),
        ]);

      // Sanctions screening (may be skipped for internal transfers)
      let screeningResult: ScreeningResult | undefined;
      if (!input.skipSanctionsCheck && input.type === 'withdrawal') {
        screeningResult = await this.screenUser({
          referenceId: input.userId,
          firstName: input.userFirstName,
          lastName: input.userLastName,
          dateOfBirth: input.userDateOfBirth,
          nationality: input.userNationality,
        });
      }

      // Circle Compliance Engine - Address screening for external transfers
      // This is an ADDITIONAL layer on top of our internal risk assessment
      let addressScreening: AddressScreeningAssessment | undefined;
      if (input.destinationAddress && input.recipientType === 'external') {
        addressScreening = await this.screenBlockchainAddress(
          input.destinationAddress,
          (input.blockchain as CircleBlockchain) || 'MATIC',
        );

        this.logger.log(
          `Circle Compliance screening completed for ${input.transactionId}`,
          {
            address: input.destinationAddress,
            decision: addressScreening.decision,
            riskSignals: addressScreening.riskSignals.length,
          },
        );
      }

      // Determine final decision
      const assessment = this.buildAssessment(
        transactionAnalysis,
        screeningResult,
        velocityCheck,
        deviceAnalysis,
        addressScreening,
      );

      const result: PreTransactionCheckResult = {
        allowed: assessment.finalDecision === 'allow',
        requiresStepUp: assessment.finalDecision === 'review',
        stepUpType: transactionAnalysis.stepUpType,
        riskScore: transactionAnalysis.riskScore,
        riskLevel: transactionAnalysis.riskLevel,
        blockedReasons: assessment.blockedReasons,
        assessment,
      };

      // Emit event for logging/monitoring
      this.eventEmitter.emit('risk.transaction.checked', {
        transactionId: input.transactionId,
        userId: input.userId,
        result,
        latencyMs: Date.now() - startTime,
      });

      this.logger.log(
        `Transaction risk check completed: ${input.transactionId}`,
        {
          decision: assessment.finalDecision,
          score: transactionAnalysis.riskScore,
          latencyMs: Date.now() - startTime,
        },
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Transaction risk check failed: ${input.transactionId}`,
        error,
      );

      // Emit failure event
      this.eventEmitter.emit('risk.transaction.check_failed', {
        transactionId: input.transactionId,
        userId: input.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Default to blocking on error for safety
      throw error;
    }
  }

  /**
   * Analyze transaction for risk
   */
  async analyzeTransaction(
    input: PreTransactionCheckInput,
  ): Promise<TransactionAnalysisResult> {
    const request: TransactionAnalysisRequest = {
      transactionId: input.transactionId,
      userId: input.userId,
      type: input.type,
      amount: input.amount,
      currency: input.currency,
      sourceCountry: input.sourceCountry,
      destinationCountry: input.destinationCountry,
      recipientId: input.recipientId,
      recipientType: input.recipientType,
      channel: input.channel,
      deviceFingerprint: input.deviceFingerprint,
    };

    return this.client.analyzeTransaction(request);
  }

  /**
   * Screen user against sanction lists
   */
  async screenUser(
    input: IndividualScreeningRequest,
  ): Promise<ScreeningResult> {
    return this.client.screenIndividual(input);
  }

  /**
   * Check velocity limits
   */
  async checkVelocity(userId: string): Promise<VelocityCheckResult> {
    return this.client.checkVelocity({
      userId,
      checkType: 'transaction_count',
      timeWindowMinutes: 60,
    });
  }

  /**
   * Analyze device fingerprint
   */
  async analyzeDevice(
    fingerprint: DeviceFingerprint,
  ): Promise<DeviceFingerprintResult> {
    return this.client.analyzeDevice(fingerprint);
  }

  /**
   * Register device for user
   */
  async registerDevice(
    userId: string,
    fingerprint: DeviceFingerprint,
  ): Promise<DeviceFingerprintResult> {
    return this.client.registerDevice(userId, fingerprint);
  }

  /**
   * Get user risk profile
   */
  async getUserRiskProfile(userId: string): Promise<UserRiskProfile | null> {
    return this.client.getUserRiskProfile(userId);
  }

  /**
   * Update user risk profile (e.g., after KYC approval)
   */
  async updateUserRiskProfile(
    userId: string,
    updates: Partial<UserRiskProfile>,
  ): Promise<UserRiskProfile> {
    return this.client.updateUserRiskProfile(userId, updates);
  }

  /**
   * Get available sanction lists
   */
  async getAvailableSanctionLists() {
    return this.client.getAvailableSanctionLists();
  }

  /**
   * Health check
   */
  async healthCheck() {
    return this.client.healthCheck();
  }

  /**
   * Screen blockchain address via Circle Compliance Engine
   *
   * This is a CRITICAL security check for external transfers.
   * It screens the destination address against:
   * - OFAC sanctions list
   * - Terrorist financing databases
   * - Known hacking/fraud addresses
   * - Human trafficking networks
   * - Other illicit activity
   */
  async screenBlockchainAddress(
    address: string,
    blockchain: CircleBlockchain = 'MATIC',
  ): Promise<AddressScreeningAssessment> {
    try {
      const result = await this.circleCompliance.screenAddress({
        address,
        chain: blockchain,
      });

      return {
        address: result.address,
        blockchain: result.chain,
        decision: result.decision,
        riskSignals: result.riskSignals,
        screenedAt: result.screenedAt,
        provider: this.circleCompliance.isEnabled() ? 'circle' : 'mock',
      };
    } catch (error) {
      this.logger.error(`Address screening failed for ${address}`, error);

      // Fail CLOSED - if screening fails, block the transaction
      return {
        address,
        blockchain,
        decision: 'DENIED',
        riskSignals: [
          {
            category: 'OTHER',
            severity: 'CRITICAL',
            description:
              'Address screening unavailable - transaction blocked for safety',
          },
        ],
        screenedAt: new Date(),
        provider: 'internal',
      };
    }
  }

  /**
   * Check if a blockchain address is safe for transactions
   * Convenience method that returns a simple boolean
   */
  async isAddressSafe(
    address: string,
    blockchain: CircleBlockchain = 'MATIC',
  ): Promise<{
    safe: boolean;
    reason?: string;
    riskSignals?: AddressScreeningAssessment['riskSignals'];
  }> {
    const result = await this.screenBlockchainAddress(address, blockchain);

    if (result.decision === 'DENIED') {
      return {
        safe: false,
        reason: `Address blocked: ${result.riskSignals.map((s) => s.category).join(', ')}`,
        riskSignals: result.riskSignals,
      };
    }

    // Even if approved, check for high-severity warnings
    const criticalSignals = result.riskSignals.filter(
      (s) => s.severity === 'CRITICAL' || s.severity === 'HIGH',
    );

    if (criticalSignals.length > 0) {
      return {
        safe: false,
        reason: `High-risk signals: ${criticalSignals.map((s) => s.category).join(', ')}`,
        riskSignals: result.riskSignals,
      };
    }

    return { safe: true };
  }

  /**
   * Build full risk assessment from individual checks
   */
  private buildAssessment(
    transactionAnalysis: TransactionAnalysisResult,
    screeningResult?: ScreeningResult,
    velocityCheck?: VelocityCheckResult,
    deviceAnalysis?: DeviceFingerprintResult,
    addressScreening?: AddressScreeningAssessment,
  ): FullRiskAssessment {
    const blockedReasons: string[] = [];
    let requiresManualReview = false;

    // Check transaction analysis
    if (transactionAnalysis.riskDecision === 'block') {
      blockedReasons.push(`High risk score: ${transactionAnalysis.riskScore}`);
      transactionAnalysis.riskFactors.forEach((f) => blockedReasons.push(f));
    }

    // Check sanctions screening
    if (screeningResult && screeningResult.status !== 'clear') {
      if (screeningResult.status === 'confirmed_match') {
        blockedReasons.push('Sanctions match confirmed');
      } else if (screeningResult.status === 'potential_match') {
        requiresManualReview = true;
        blockedReasons.push(
          `Potential sanctions match: ${screeningResult.totalMatches} match(es)`,
        );
      }
    }

    // Check velocity
    if (velocityCheck?.isExceeded) {
      blockedReasons.push(
        `Velocity limit exceeded: ${velocityCheck.checkType}`,
      );
    }

    // Check device
    if (deviceAnalysis) {
      if (deviceAnalysis.deviceTrustScore < 30) {
        blockedReasons.push('Untrusted device');
      }
      if (deviceAnalysis.riskIndicators.includes('emulator_detected')) {
        blockedReasons.push('Emulator detected');
      }
    }

    // CRITICAL: Check Circle Compliance Engine address screening
    // This is a hard block - no override possible for sanctioned addresses
    if (addressScreening && addressScreening.decision === 'DENIED') {
      const criticalCategories = addressScreening.riskSignals
        .filter((s) => s.severity === 'CRITICAL')
        .map((s) => s.category);

      if (criticalCategories.length > 0) {
        blockedReasons.push(
          `[CIRCLE COMPLIANCE] Address blocked: ${criticalCategories.join(', ')}`,
        );
      } else {
        blockedReasons.push(
          `[CIRCLE COMPLIANCE] Address flagged: ${addressScreening.riskSignals.map((s) => s.category).join(', ')}`,
        );
      }

      // Log for compliance audit
      this.logger.warn('Circle Compliance blocked transaction', {
        address: addressScreening.address,
        riskSignals: addressScreening.riskSignals,
      });
    }

    // Check for address screening warnings (not blocked but requires review)
    if (addressScreening && addressScreening.decision === 'APPROVED') {
      const highRiskSignals = addressScreening.riskSignals.filter(
        (s) =>
          s.severity === 'HIGH' ||
          s.category === 'PEP' ||
          s.category === 'HIGH_RISK_INDUSTRY',
      );

      if (highRiskSignals.length > 0) {
        requiresManualReview = true;
        blockedReasons.push(
          `[CIRCLE COMPLIANCE] Manual review: ${highRiskSignals.map((s) => s.category).join(', ')}`,
        );
      }
    }

    // Determine final decision
    let finalDecision: RiskDecision;
    if (blockedReasons.length > 0 && !requiresManualReview) {
      // Check if all reasons are soft blocks (can be overridden by step-up)
      // Note: Circle Compliance blocks are ALWAYS hard blocks
      const hardBlocks = blockedReasons.filter(
        (r) =>
          r.includes('Sanctions match confirmed') ||
          r.includes('Velocity limit exceeded') ||
          r.includes('[CIRCLE COMPLIANCE] Address blocked') ||
          transactionAnalysis.riskScore >= 90,
      );

      if (hardBlocks.length > 0) {
        finalDecision = 'block';
      } else {
        finalDecision = 'review';
      }
    } else if (
      requiresManualReview ||
      transactionAnalysis.riskDecision === 'review'
    ) {
      finalDecision = 'review';
    } else {
      finalDecision = 'allow';
    }

    return {
      transactionAnalysis,
      screeningResult,
      velocityCheck,
      deviceAnalysis,
      addressScreening,
      finalDecision,
      requiresManualReview,
      blockedReasons: blockedReasons.length > 0 ? blockedReasons : undefined,
    };
  }
}
