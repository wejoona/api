import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RiskEvaluationRequest {
  transactionId: string;
  amount: number;
  currency: string;
  type: 'OCT' | 'AFT' | 'P2P' | 'DEPOSIT' | 'WITHDRAWAL';
  senderId: string;
  receiverId?: string;
  senderCountry?: string;
  receiverCountry?: string;
  ipAddress?: string;
  deviceFingerprint?: string;
  metadata?: Record<string, any>;
}

export interface RiskEvaluationResult {
  transactionId: string;
  score: number;
  decision: 'APPROVE' | 'REVIEW' | 'STEP_UP' | 'DECLINE';
  factors: string[];
  triggeredRules: string[];
  evaluationTimeMs: number;
  timestamp: string;
}

/**
 * Calls Risk Manager service for real-time risk evaluation.
 * Graceful degradation: returns APPROVE if Risk Manager is unavailable.
 */
@Injectable()
export class RiskEvaluationService {
  private readonly logger = new Logger(RiskEvaluationService.name);
  private readonly riskManagerUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.riskManagerUrl = this.configService.get<string>('RISK_MANAGER_URL', 'http://risk-manager:3000');
    this.apiKey = this.configService.get<string>('RISK_MANAGER_API_KEY', 'dev-api-key');
    this.timeoutMs = this.configService.get<number>('RISK_EVALUATION_TIMEOUT_MS', 2000);
    this.enabled = this.configService.get<string>('RISK_MANAGER_ENABLED', 'false') === 'true';
  }

  async evaluate(request: RiskEvaluationRequest): Promise<RiskEvaluationResult | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(`${this.riskManagerUrl}/api/v1/scoring/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        this.logger.warn(`Risk Manager returned ${response.status}`);
        return null;
      }

      const result = await response.json() as RiskEvaluationResult;
      this.logger.log(
        `Risk: txn=${request.transactionId} score=${result.score} decision=${result.decision} (${result.evaluationTimeMs}ms)`,
      );
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown';
      this.logger.warn(`Risk Manager unavailable: ${msg}`);
      return null;
    }
  }

  /**
   * Evaluate a transfer and throw if declined.
   */
  async evaluateTransfer(params: {
    transactionId: string;
    amount: number;
    currency: string;
    senderId: string;
    receiverId: string;
    type?: 'P2P' | 'WITHDRAWAL';
  }): Promise<RiskEvaluationResult | null> {
    const result = await this.evaluate({
      transactionId: params.transactionId,
      amount: params.amount,
      currency: params.currency,
      type: params.type || 'P2P',
      senderId: params.senderId,
      receiverId: params.receiverId,
      senderCountry: 'CI', // Default for Korido
    });

    if (result?.decision === 'DECLINE') {
      throw new Error(`Transaction declined by risk engine (score: ${result.score})`);
    }

    return result;
  }
}
