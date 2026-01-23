import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  IOffRampProvider,
  WithdrawalChannel,
  InitiateWithdrawalData,
  WithdrawalResult,
  WithdrawalStatus,
  MobileMoneyDetails,
} from '../../interfaces';
import {
  YellowCardConfig,
  YellowCardChannel,
  YellowCardPayout,
  YELLOWCARD_COUNTRIES,
} from '../yellowcard.types';

interface YellowCardApiResponse<T> {
  data: T;
}

interface YellowCardRateResponse {
  sell: number;
  buy: number;
  expiresAt: string;
}

interface YellowCardApiError {
  message: string;
}

/**
 * Yellow Card Off-Ramp Adapter
 *
 * Handles withdrawal operations (USDC → XOF) via Yellow Card API.
 * This adapter is for real API calls only - mock operations are handled
 * by MockYellowCardOffRampAdapter.
 */
@Injectable()
export class YellowCardOffRampAdapter implements IOffRampProvider {
  private readonly logger = new Logger(YellowCardOffRampAdapter.name);
  private readonly config: YellowCardConfig;

  readonly providerName = 'yellowcard';
  readonly supportedCountries = Object.keys(YELLOWCARD_COUNTRIES);

  constructor(private readonly configService: ConfigService) {
    this.config = {
      apiUrl:
        this.configService.get<string>('yellowCard.apiUrl') ||
        'https://sandbox.yellowcard.io',
      apiKey: this.configService.get<string>('yellowCard.apiKey') || '',
      secretKey: this.configService.get<string>('yellowCard.secretKey') || '',
      webhookSecret:
        this.configService.get<string>('yellowCard.webhookSecret') || '',
      useMock: false,
    };

    if (!this.config.apiKey) {
      this.logger.warn('Yellow Card API key not configured');
    } else {
      this.logger.log('Yellow Card Off-Ramp adapter initialized');
    }
  }

  async getChannels(
    country: string,
    _currency?: string,
  ): Promise<WithdrawalChannel[]> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/channels?country=${country}&type=payout`,
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to get channels');
      }

      const result = (await response.json()) as YellowCardApiResponse<
        YellowCardChannel[]
      >;
      const channels: YellowCardChannel[] = result.data || [];

      return channels.map((ch) => ({
        id: ch.id,
        name: ch.name,
        type: ch.channelType as 'mobile_money' | 'bank_transfer',
        provider: ch.network,
        country: ch.country,
        currency: ch.currency,
        minAmount: ch.minAmount,
        maxAmount: ch.maxAmount,
        fee: ch.percentFee,
        feeType: 'percentage' as const,
        estimatedTime: ch.estimatedSettlementTime,
        isActive: true,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get Yellow Card channels: ${errorMessage}`);
      throw error;
    }
  }

  async getRate(
    sourceCurrency: string,
    targetCurrency: string,
    amount: number,
  ): Promise<{
    rate: number;
    sourceAmount: number;
    targetAmount: number;
    fee: number;
    expiresAt: Date;
  }> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/rates?source=${sourceCurrency}&destination=${targetCurrency}`,
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to get rate');
      }

      const result =
        (await response.json()) as YellowCardApiResponse<YellowCardRateResponse>;
      const rateData = result.data;

      const rate = rateData.sell;
      const fee = amount * 0.015;
      const targetAmount = (amount - fee) * rate;

      return {
        rate,
        sourceAmount: amount,
        targetAmount,
        fee,
        expiresAt: new Date(rateData.expiresAt),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get Yellow Card rate: ${errorMessage}`);
      throw error;
    }
  }

  async initiateWithdrawal(
    data: InitiateWithdrawalData,
  ): Promise<WithdrawalResult> {
    try {
      const destination = data.destination as MobileMoneyDetails;

      const response = await fetch(`${this.config.apiUrl}/payouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          channelId: data.channelId,
          amount: data.amount,
          currency: 'USDC',
          destinationCurrency: data.targetCurrency,
          destination: {
            type: 'mobile_money',
            network: destination.provider,
            accountNumber: destination.phoneNumber,
            accountName: destination.accountName,
          },
          reference: data.idempotencyKey,
          metadata: data.metadata,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as YellowCardApiError;
        throw new Error(`Yellow Card API error: ${errorData.message}`);
      }

      const result =
        (await response.json()) as YellowCardApiResponse<YellowCardPayout>;
      return this.mapPayoutToWithdrawal(result.data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to initiate Yellow Card withdrawal: ${errorMessage}`,
      );
      throw error;
    }
  }

  async getWithdrawalStatus(
    providerWithdrawalId: string,
  ): Promise<WithdrawalResult> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/payouts/${providerWithdrawalId}`,
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to get withdrawal status');
      }

      const result =
        (await response.json()) as YellowCardApiResponse<YellowCardPayout>;
      return this.mapPayoutToWithdrawal(result.data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get Yellow Card withdrawal status: ${errorMessage}`,
      );
      throw error;
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex');
    return signature === expectedSignature;
  }

  parseWebhookEvent(payload: Record<string, unknown>): {
    type:
      | 'withdrawal.pending'
      | 'withdrawal.completed'
      | 'withdrawal.failed'
      | 'withdrawal.returned';
    withdrawalId: string;
    data: Record<string, unknown>;
  } {
    const ycType = payload.type as string;
    const typeMap: Record<
      string,
      | 'withdrawal.pending'
      | 'withdrawal.completed'
      | 'withdrawal.failed'
      | 'withdrawal.returned'
    > = {
      'payout.pending': 'withdrawal.pending',
      'payout.processing': 'withdrawal.pending',
      'payout.complete': 'withdrawal.completed',
      'payout.failed': 'withdrawal.failed',
    };

    const data = payload.data as YellowCardPayout;

    return {
      type: typeMap[ycType] || 'withdrawal.pending',
      withdrawalId: data.id,
      data: data as unknown as Record<string, unknown>,
    };
  }

  private mapPayoutToWithdrawal(payout: YellowCardPayout): WithdrawalResult {
    const statusMap: Record<string, WithdrawalStatus> = {
      pending: 'pending',
      processing: 'processing',
      complete: 'completed',
      failed: 'failed',
      cancelled: 'cancelled',
    };

    return {
      providerId: payout.id,
      status: statusMap[payout.status] || 'pending',
      sourceAmount: payout.amount,
      sourceCurrency: payout.currency,
      targetAmount: payout.destinationAmount,
      targetCurrency: payout.destinationCurrency,
      rate: payout.rate,
      fee: payout.fee,
      destination: {
        provider: payout.destination.type,
        phoneNumber: payout.destination.accountNumber,
        accountName: payout.destination.accountName,
      },
      reference: payout.reference,
      errorMessage: payout.failureReason,
      createdAt: new Date(payout.createdAt),
      completedAt: payout.completedAt
        ? new Date(payout.completedAt)
        : undefined,
    };
  }
}
