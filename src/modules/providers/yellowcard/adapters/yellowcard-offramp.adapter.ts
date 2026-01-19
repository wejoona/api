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
  YELLOWCARD_MOBILE_MONEY_NETWORKS,
} from '../yellowcard.types';
import { v4 as uuidv4 } from 'uuid';

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
      useMock: this.configService.get<boolean>('yellowCard.useMock') ?? true,
    };

    if (this.config.useMock) {
      this.logger.warn('Yellow Card Off-Ramp running in MOCK mode');
    }
  }

  async getChannels(
    country: string,
    currency?: string,
  ): Promise<WithdrawalChannel[]> {
    if (this.config.useMock) {
      return this.mockGetChannels(country, currency);
    }
    return this.apiGetChannels(country, currency);
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
    if (this.config.useMock) {
      return this.mockGetRate(sourceCurrency, targetCurrency, amount);
    }
    return this.apiGetRate(sourceCurrency, targetCurrency, amount);
  }

  async initiateWithdrawal(
    data: InitiateWithdrawalData,
  ): Promise<WithdrawalResult> {
    if (this.config.useMock) {
      return this.mockInitiateWithdrawal(data);
    }
    return this.apiInitiateWithdrawal(data);
  }

  async getWithdrawalStatus(
    providerWithdrawalId: string,
  ): Promise<WithdrawalResult> {
    if (this.config.useMock) {
      return this.mockGetWithdrawalStatus(providerWithdrawalId);
    }
    return this.apiGetWithdrawalStatus(providerWithdrawalId);
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (this.config.useMock) {
      return true;
    }
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

  // ============================================
  // MOCK IMPLEMENTATIONS
  // ============================================

  private mockGetChannels(
    country: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _currency?: string,
  ): WithdrawalChannel[] {
    const networksMap: Record<string, readonly string[]> =
      YELLOWCARD_MOBILE_MONEY_NETWORKS;
    const defaultNetworks: string[] = ['orange', 'mtn', 'wave'];
    const networks: readonly string[] = networksMap[country] || defaultNetworks;

    return networks.map((network: string) => ({
      id: `${network}_${country.toLowerCase()}_offramp`,
      name: this.getNetworkName(network),
      type: 'mobile_money' as const,
      provider: network,
      country,
      currency: 'XOF',
      minAmount: 1, // In USDC
      maxAmount: 5000,
      fee: 1.5,
      feeType: 'percentage' as const,
      estimatedTime: '5-30 minutes',
      isActive: true,
    }));
  }

  private mockGetRate(
    sourceCurrency: string,
    targetCurrency: string,
    amount: number,
  ): {
    rate: number;
    sourceAmount: number;
    targetAmount: number;
    fee: number;
    expiresAt: Date;
  } {
    // USD/USDC to XOF rate
    let rate = 1;
    if (
      (sourceCurrency === 'USD' || sourceCurrency === 'USDC') &&
      targetCurrency === 'XOF'
    ) {
      rate = 600; // 1 USD = 600 XOF (sell rate, slightly lower than buy)
    }

    const fee = amount * 0.015;
    const targetAmount = (amount - fee) * rate;

    return {
      rate,
      sourceAmount: amount,
      targetAmount: Math.round(targetAmount),
      fee,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    };
  }

  private mockInitiateWithdrawal(
    data: InitiateWithdrawalData,
  ): WithdrawalResult {
    const providerId = `yc_payout_${uuidv4().slice(0, 8)}`;
    const rate = 600;
    const fee = data.amount * 0.015;
    const targetAmount = (data.amount - fee) * rate;

    const destination = data.destination as MobileMoneyDetails;

    this.logger.log(
      `[MOCK] Initiated withdrawal: ${providerId} for ${data.amount} USDC to ${destination.phoneNumber}`,
    );

    return {
      providerId,
      status: 'pending',
      sourceAmount: data.amount,
      sourceCurrency: 'USDC',
      targetAmount: Math.round(targetAmount),
      targetCurrency: data.targetCurrency,
      rate,
      fee,
      destination: data.destination,
      reference: `WD-${providerId.slice(-8).toUpperCase()}`,
      createdAt: new Date(),
      estimatedArrival: new Date(Date.now() + 30 * 60 * 1000),
    };
  }

  private mockGetWithdrawalStatus(
    providerWithdrawalId: string,
  ): WithdrawalResult {
    return {
      providerId: providerWithdrawalId,
      status: 'pending',
      sourceAmount: 100,
      sourceCurrency: 'USDC',
      targetAmount: 59000,
      targetCurrency: 'XOF',
      rate: 600,
      fee: 1.5,
      destination: {
        provider: 'orange',
        phoneNumber: '+2250701234567',
        accountName: 'Test User',
      },
      reference: `WD-${providerWithdrawalId.slice(-8).toUpperCase()}`,
      createdAt: new Date(),
      estimatedArrival: new Date(Date.now() + 30 * 60 * 1000),
    };
  }

  private getNetworkName(network: string): string {
    const names: Record<string, string> = {
      orange: 'Orange Money',
      mtn: 'MTN Mobile Money',
      wave: 'Wave',
      moov: 'Moov Money',
      free: 'Free Money',
    };
    return names[network] || network;
  }

  // ============================================
  // REAL API IMPLEMENTATIONS
  // ============================================

  private async apiGetChannels(
    country: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  private async apiGetRate(
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

      const rate = rateData.sell; // Use sell rate for off-ramp
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

  private async apiInitiateWithdrawal(
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

  private async apiGetWithdrawalStatus(
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
