import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RiskEvaluationService } from '../../risk-evaluation.service';
import { ConfigService } from '@nestjs/config';

/**
 * Listens to transaction events and sends them to Risk Manager
 * for ongoing monitoring, velocity tracking, and anomaly detection.
 *
 * This is fire-and-forget — transaction processing is NOT blocked.
 */
@Injectable()
export class TransactionRiskListener {
  private readonly logger = new Logger(TransactionRiskListener.name);
  private readonly riskManagerUrl: string;
  private readonly apiKey: string;
  private readonly enabled: boolean;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.riskManagerUrl = this.configService.get<string>('RISK_MANAGER_URL', 'http://risk-manager:3000');
    this.apiKey = this.configService.get<string>('RISK_MANAGER_API_KEY', 'dev-api-key');
    this.enabled = this.configService.get<string>('RISK_MANAGER_ENABLED', 'false') === 'true';
  }

  @OnEvent('transaction.transfer.sent')
  async onTransferSent(payload: {
    userId: string;
    transactionId: string;
    recipientId: string;
    amount: number;
    currency: string;
    timestamp: Date;
  }) {
    await this.reportTransaction({
      eventType: 'TRANSFER_SENT',
      transactionId: payload.transactionId,
      userId: payload.userId,
      counterpartyId: payload.recipientId,
      amount: payload.amount,
      currency: payload.currency,
      timestamp: payload.timestamp,
    });
  }

  @OnEvent('deposit.completed')
  async onDepositCompleted(payload: {
    userId: string;
    transactionId: string;
    amount: number;
    currency: string;
    provider: string;
    timestamp: Date;
  }) {
    await this.reportTransaction({
      eventType: 'DEPOSIT',
      transactionId: payload.transactionId,
      userId: payload.userId,
      amount: payload.amount,
      currency: payload.currency,
      provider: payload.provider,
      timestamp: payload.timestamp,
    });
  }

  @OnEvent('withdrawal.completed')
  async onWithdrawalCompleted(payload: {
    userId: string;
    transactionId: string;
    amount: number;
    currency: string;
    timestamp: Date;
  }) {
    await this.reportTransaction({
      eventType: 'WITHDRAWAL',
      transactionId: payload.transactionId,
      userId: payload.userId,
      amount: payload.amount,
      currency: payload.currency,
      timestamp: payload.timestamp,
    });
  }

  private async reportTransaction(event: Record<string, any>): Promise<void> {
    if (!this.enabled) return;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      await fetch(`${this.riskManagerUrl}/api/v1/transactions/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          'X-Source': 'korido',
        },
        body: JSON.stringify(event),
        signal: controller.signal,
      });

      clearTimeout(timeout);
    } catch (error) {
      // Fire-and-forget: don't block transactions if Risk Manager is down
      this.logger.debug(
        `Risk Manager event report failed (non-blocking): ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }
}
