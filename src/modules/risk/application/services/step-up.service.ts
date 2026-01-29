/**
 * Step-Up Authentication Service
 * Risk-based adaptive authentication (Visa 3DS / Apple style)
 *
 * Flow Colors:
 * 🟢 GREEN (score 0-30): Frictionless - No step-up required
 * 🟡 YELLOW (score 31-60): Low friction - Biometric only
 * 🔴 RED (score 61+): High friction - Liveness required
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import {
  TransactionRiskService,
  PreTransactionCheckInput,
} from './transaction-risk.service';
import {
  StepUpDecision,
  StepUpValidation,
  StepUpResult,
  StepUpRequirement,
  RiskFlow,
  StepUpConfig,
  DEFAULT_STEP_UP_CONFIG,
} from '../../domain/interfaces/step-up.types';

export interface TransactionStepUpInput {
  transactionId?: string;
  userId: string;
  type: 'transfer' | 'deposit' | 'withdrawal' | 'exchange';
  amount: number;
  currency: string;
  recipientId?: string;
  recipientType?: 'internal' | 'external' | 'merchant';
  isFirstTransactionToRecipient?: boolean;
  channel: 'mobile' | 'web' | 'api';
  deviceId?: string;
  ipAddress?: string;
}

export interface OperationStepUpInput {
  userId: string;
  operation:
    | 'pin_change'
    | 'add_recipient'
    | 'account_recovery'
    | 'kyc_selfie'
    | 'biometric_enroll'
    | 'export_keys'
    | 'delete_account';
  metadata?: Record<string, unknown>;
}

@Injectable()
export class StepUpService {
  private readonly logger = new Logger(StepUpService.name);
  private readonly config: StepUpConfig;

  // Challenge token storage (in production, use Redis)
  private readonly pendingChallenges = new Map<
    string,
    {
      decision: StepUpDecision;
      createdAt: Date;
      userId: string;
    }
  >();

  // Completed step-ups (cached for session)
  private readonly completedStepUps = new Map<string, StepUpResult>();

  constructor(
    private readonly riskService: TransactionRiskService,
    private readonly configService: ConfigService,
  ) {
    // Load config from environment or use defaults
    this.config = {
      greenMaxScore: this.configService.get<number>(
        'STEP_UP_GREEN_MAX',
        DEFAULT_STEP_UP_CONFIG.greenMaxScore,
      ),
      yellowMaxScore: this.configService.get<number>(
        'STEP_UP_YELLOW_MAX',
        DEFAULT_STEP_UP_CONFIG.yellowMaxScore,
      ),
      redMinScore: this.configService.get<number>(
        'STEP_UP_RED_MIN',
        DEFAULT_STEP_UP_CONFIG.redMinScore,
      ),
      highValueThreshold: this.configService.get<number>(
        'STEP_UP_HIGH_VALUE',
        DEFAULT_STEP_UP_CONFIG.highValueThreshold,
      ),
      alwaysRequireLiveness: DEFAULT_STEP_UP_CONFIG.alwaysRequireLiveness,
      alwaysRequireBiometric: DEFAULT_STEP_UP_CONFIG.alwaysRequireBiometric,
    };
  }

  /**
   * Evaluate step-up requirements for a transaction
   */
  async evaluateTransaction(
    input: TransactionStepUpInput,
  ): Promise<StepUpDecision> {
    this.logger.log(
      `Evaluating step-up for transaction: ${input.type} ${input.amount} ${input.currency}`,
    );

    // Build risk check input
    const riskInput: PreTransactionCheckInput = {
      transactionId: input.transactionId || uuidv4(),
      userId: input.userId,
      userFirstName: '', // Will be fetched by risk service if needed
      userLastName: '',
      type: input.type,
      amount: input.amount,
      currency: input.currency,
      recipientId: input.recipientId,
      recipientType: input.recipientType,
      channel: input.channel,
      deviceFingerprint: input.deviceId
        ? {
            deviceId: input.deviceId,
            platform: input.channel === 'mobile' ? 'ios' : 'web',
            ipAddress: input.ipAddress,
          }
        : undefined,
      skipSanctionsCheck: input.recipientType === 'internal',
    };

    // Get risk assessment
    const riskResult = await this.riskService.checkTransaction(riskInput);

    // Determine step-up based on risk score and factors
    const decision = this.determineStepUp(
      riskResult.riskScore,
      riskResult.riskLevel,
      riskResult.blockedReasons || [],
      input,
    );

    // Store challenge if step-up required
    if (decision.stepUpRequired) {
      this.pendingChallenges.set(decision.challengeToken, {
        decision,
        createdAt: new Date(),
        userId: input.userId,
      });
    }

    this.logger.log(
      `Step-up decision: ${decision.flow} flow, ${decision.stepUpType}`,
      {
        riskScore: decision.riskScore,
        stepUpRequired: decision.stepUpRequired,
      },
    );

    return decision;
  }

  /**
   * Evaluate step-up for non-transaction operations
   */
  async evaluateOperation(
    input: OperationStepUpInput,
  ): Promise<StepUpDecision> {
    this.logger.log(`Evaluating step-up for operation: ${input.operation}`);

    // Operation-specific step-up requirements
    const operationRequirements: Record<string, StepUpRequirement> = {
      pin_change: 'biometric',
      add_recipient: 'biometric',
      biometric_enroll: 'none', // First-time setup
      account_recovery: 'liveness',
      kyc_selfie: 'liveness',
      export_keys: 'biometric_and_liveness',
      delete_account: 'biometric_and_liveness',
    };

    const stepUpType = operationRequirements[input.operation] || 'biometric';
    const flow = this.stepUpTypeToFlow(stepUpType);

    const decision: StepUpDecision = {
      flow,
      riskScore: flow === 'green' ? 10 : flow === 'yellow' ? 45 : 75,
      riskLevel:
        flow === 'green' ? 'low' : flow === 'yellow' ? 'medium' : 'high',
      stepUpRequired: stepUpType !== 'none',
      stepUpType,
      reason: `Operation ${input.operation} requires ${stepUpType}`,
      factors: [`operation_type:${input.operation}`],
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      challengeToken: stepUpType !== 'none' ? uuidv4() : undefined,
    };

    if (decision.stepUpRequired) {
      this.pendingChallenges.set(decision.challengeToken, {
        decision,
        createdAt: new Date(),
        userId: input.userId,
      });
    }

    return decision;
  }

  /**
   * Validate completed step-up
   */
  async validateStepUp(validation: StepUpValidation): Promise<StepUpResult> {
    const pending = this.pendingChallenges.get(validation.challengeToken);

    if (!pending) {
      throw new Error('Invalid or expired challenge token');
    }

    // Check expiry
    if (new Date() > pending.decision.expiresAt) {
      this.pendingChallenges.delete(validation.challengeToken);
      throw new Error('Challenge has expired');
    }

    // Validate based on step-up type
    const { stepUpType } = pending.decision;
    let valid = false;

    switch (stepUpType) {
      case 'biometric':
        valid = validation.biometricVerified === true;
        break;
      case 'otp':
        valid = validation.otpVerified === true;
        break;
      case 'liveness':
        valid = !!validation.livenessSessionId;
        // In production, verify liveness session with liveness service
        break;
      case 'biometric_and_liveness':
        valid =
          validation.biometricVerified === true &&
          !!validation.livenessSessionId;
        break;
      default:
        valid = true;
    }

    if (!valid) {
      throw new Error(`Step-up validation failed: ${stepUpType} not completed`);
    }

    // Create result
    const result: StepUpResult = {
      valid: true,
      stepUpType,
      completedAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // Valid for 10 minutes
    };

    // Cache result
    this.completedStepUps.set(validation.challengeToken, result);
    this.pendingChallenges.delete(validation.challengeToken);

    this.logger.log(`Step-up validated: ${stepUpType}`);
    return result;
  }

  /**
   * Check if a challenge token has completed step-up
   */
  isStepUpComplete(challengeToken: string): StepUpResult | null {
    const result = this.completedStepUps.get(challengeToken);
    if (result && new Date() < result.expiresAt) {
      return result;
    }
    return null;
  }

  /**
   * Determine step-up requirements based on risk score
   */
  private determineStepUp(
    riskScore: number,
    riskLevel: string,
    riskFactors: string[],
    input: TransactionStepUpInput,
  ): StepUpDecision {
    let flow: RiskFlow;
    let stepUpType: StepUpRequirement;
    const factors = [...riskFactors];

    // Check for mandatory step-up conditions first

    // High value always requires liveness
    if (input.amount >= this.config.highValueThreshold) {
      flow = 'red';
      stepUpType = 'liveness';
      factors.push(`high_value:${input.amount}`);
    }
    // First transaction to recipient requires liveness
    else if (
      input.isFirstTransactionToRecipient &&
      input.recipientType === 'external'
    ) {
      flow = 'red';
      stepUpType = 'liveness';
      factors.push('first_external_withdrawal');
    }
    // External transfers always require at least biometric
    else if (
      input.recipientType === 'external' &&
      riskScore <= this.config.greenMaxScore
    ) {
      flow = 'yellow';
      stepUpType = 'biometric';
      factors.push('external_transfer_override');
    }
    // Risk score based decision
    else if (riskScore <= this.config.greenMaxScore) {
      // 🟢 GREEN: Frictionless
      flow = 'green';
      stepUpType = 'none';
    } else if (riskScore <= this.config.yellowMaxScore) {
      // 🟡 YELLOW: Biometric
      flow = 'yellow';
      stepUpType = 'biometric';
    } else {
      // 🔴 RED: Liveness
      flow = 'red';
      stepUpType = 'liveness';
    }

    // Upgrade to biometric+liveness for very high scores
    if (riskScore >= 80 && stepUpType === 'liveness') {
      stepUpType = 'biometric_and_liveness';
    }

    // Block if risk is critical (score >= 90)
    if (riskScore >= 90) {
      stepUpType = 'manual_review';
      factors.push('critical_risk_blocked');
    }

    return {
      flow,
      riskScore,
      riskLevel: riskLevel as any,
      stepUpRequired: stepUpType !== 'none',
      stepUpType,
      reason: this.buildReason(flow, stepUpType, factors),
      factors,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minute expiry
      challengeToken: stepUpType !== 'none' ? uuidv4() : undefined,
    };
  }

  private stepUpTypeToFlow(stepUpType: StepUpRequirement): RiskFlow {
    switch (stepUpType) {
      case 'none':
        return 'green';
      case 'biometric':
      case 'otp':
        return 'yellow';
      case 'liveness':
      case 'biometric_and_liveness':
      case 'manual_review':
        return 'red';
      default:
        return 'yellow';
    }
  }

  private buildReason(
    flow: RiskFlow,
    stepUpType: StepUpRequirement,
    factors: string[],
  ): string {
    const flowEmoji = { green: '🟢', yellow: '🟡', red: '🔴' };

    if (stepUpType === 'none') {
      return `${flowEmoji[flow]} Transaction approved - no additional verification needed`;
    }

    if (stepUpType === 'manual_review') {
      return `${flowEmoji[flow]} Transaction requires manual review due to high risk`;
    }

    const verificationText = {
      biometric: 'fingerprint or face ID',
      otp: 'one-time password',
      liveness: 'liveness verification',
      biometric_and_liveness: 'biometric and liveness verification',
    };

    return `${flowEmoji[flow]} Please verify with ${verificationText[stepUpType] || stepUpType}`;
  }

  /**
   * Get step-up configuration (for admin/debug)
   */
  getConfig(): StepUpConfig {
    return { ...this.config };
  }
}
