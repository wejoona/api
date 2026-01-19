import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  IOnRampProvider,
  PaymentChannel,
  InitiateDepositData,
  DepositResult,
  DepositStatus,
} from '../../interfaces';
import {
  YellowCardConfig,
  YellowCardChannel,
  YellowCardPayment,
  YellowCardRate,
  YELLOWCARD_COUNTRIES,
  YELLOWCARD_MOBILE_MONEY_NETWORKS,
} from '../yellowcard.types';
import { v4 as uuidv4 } from 'uuid';

interface YellowCardApiResponse<T> {
  data: T;
}

interface YellowCardApiError {
  message: string;
}

@Injectable()
export class YellowCardOnRampAdapter implements IOnRampProvider {
  private readonly logger = new Logger(YellowCardOnRampAdapter.name);
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
      this.logger.warn('Yellow Card On-Ramp running in MOCK mode');
    }
  }

  async getChannels(
    country: string,
    currency?: string,
  ): Promise<PaymentChannel[]> {
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

  async initiateDeposit(data: InitiateDepositData): Promise<DepositResult> {
    if (this.config.useMock) {
      return this.mockInitiateDeposit(data);
    }
    return this.apiInitiateDeposit(data);
  }

  async getDepositStatus(providerDepositId: string): Promise<DepositResult> {
    if (this.config.useMock) {
      return this.mockGetDepositStatus(providerDepositId);
    }
    return this.apiGetDepositStatus(providerDepositId);
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
      | 'deposit.pending'
      | 'deposit.completed'
      | 'deposit.failed'
      | 'deposit.expired';
    depositId: string;
    data: Record<string, unknown>;
  } {
    const ycType = payload.type as string;
    const typeMap: Record<
      string,
      | 'deposit.pending'
      | 'deposit.completed'
      | 'deposit.failed'
      | 'deposit.expired'
    > = {
      'payment.pending': 'deposit.pending',
      'payment.awaiting_payment': 'deposit.pending',
      'payment.processing': 'deposit.pending',
      'payment.complete': 'deposit.completed',
      'payment.failed': 'deposit.failed',
      'payment.expired': 'deposit.expired',
    };

    const data = payload.data as YellowCardPayment;

    return {
      type: typeMap[ycType] || 'deposit.pending',
      depositId: data.id,
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
  ): PaymentChannel[] {
    const networksMap: Record<string, readonly string[]> =
      YELLOWCARD_MOBILE_MONEY_NETWORKS;
    const defaultNetworks: string[] = ['orange', 'mtn', 'wave'];
    const networks: readonly string[] = networksMap[country] || defaultNetworks;

    return networks.map((network: string) => ({
      id: `${network}_${country.toLowerCase()}_onramp`,
      name: this.getNetworkName(network),
      type: 'mobile_money' as const,
      provider: network,
      country,
      currency: 'XOF',
      minAmount: 500,
      maxAmount: 1000000,
      fee: 1.5,
      feeType: 'percentage' as const,
      estimatedTime: '5-15 minutes',
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
    // XOF to USD rate (approximately 1 USD = 600 XOF)
    let rate = 1;
    if (
      sourceCurrency === 'XOF' &&
      (targetCurrency === 'USD' || targetCurrency === 'USDC')
    ) {
      rate = 0.00166; // 1 XOF = 0.00166 USD
    } else if (
      (sourceCurrency === 'USD' || sourceCurrency === 'USDC') &&
      targetCurrency === 'XOF'
    ) {
      rate = 602;
    }

    const fee = amount * 0.015; // 1.5% fee
    const targetAmount = (amount - fee) * rate;

    return {
      rate,
      sourceAmount: amount,
      targetAmount: Math.round(targetAmount * 100) / 100,
      fee,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    };
  }

  private mockInitiateDeposit(data: InitiateDepositData): DepositResult {
    const providerId = `yc_pay_${uuidv4().slice(0, 8)}`;
    const rate = 0.00166;
    const fee = data.amount * 0.015;
    const targetAmount = (data.amount - fee) * rate;

    this.logger.log(
      `[MOCK] Initiated deposit: ${providerId} for ${data.amount} ${data.sourceCurrency}`,
    );

    return {
      providerId,
      status: 'awaiting_payment',
      amount: data.amount,
      sourceCurrency: data.sourceCurrency,
      targetAmount: Math.round(targetAmount * 100) / 100,
      targetCurrency: data.targetCurrency,
      rate,
      fee,
      paymentInstructions: {
        type: 'mobile_money',
        provider: 'orange',
        accountNumber: '+2250700000000',
        accountName: 'JoonaPay',
        reference: `DEP-${providerId.slice(-8).toUpperCase()}`,
        instructions: `Send ${data.amount} XOF to +2250700000000 via Orange Money. Use reference: DEP-${providerId.slice(-8).toUpperCase()}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    };
  }

  private mockGetDepositStatus(providerDepositId: string): DepositResult {
    return {
      providerId: providerDepositId,
      status: 'awaiting_payment',
      amount: 10000,
      sourceCurrency: 'XOF',
      targetAmount: 16.45,
      targetCurrency: 'USDC',
      rate: 0.00166,
      fee: 150,
      paymentInstructions: {
        type: 'mobile_money',
        provider: 'orange',
        reference: `DEP-${providerDepositId.slice(-8).toUpperCase()}`,
        instructions: 'Payment instructions',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
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
  ): Promise<PaymentChannel[]> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/channels?country=${country}&type=payment`,
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
        type: ch.channelType,
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
        (await response.json()) as YellowCardApiResponse<YellowCardRate>;
      const rateData: YellowCardRate = result.data;

      const rate = rateData.buy;
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

  private async apiInitiateDeposit(
    data: InitiateDepositData,
  ): Promise<DepositResult> {
    try {
      const response = await fetch(`${this.config.apiUrl}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          channelId: data.channelId,
          amount: data.amount,
          currency: data.sourceCurrency,
          destinationCurrency: data.targetCurrency,
          destinationAddress: data.destinationWalletId,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail,
          reference: data.idempotencyKey,
          metadata: data.metadata,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as YellowCardApiError;
        throw new Error(`Yellow Card API error: ${errorData.message}`);
      }

      const result =
        (await response.json()) as YellowCardApiResponse<YellowCardPayment>;
      const payment: YellowCardPayment = result.data;

      return this.mapPaymentToDeposit(payment);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to initiate Yellow Card deposit: ${errorMessage}`,
      );
      throw error;
    }
  }

  private async apiGetDepositStatus(
    providerDepositId: string,
  ): Promise<DepositResult> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/payments/${providerDepositId}`,
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to get deposit status');
      }

      const result =
        (await response.json()) as YellowCardApiResponse<YellowCardPayment>;
      return this.mapPaymentToDeposit(result.data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get Yellow Card deposit status: ${errorMessage}`,
      );
      throw error;
    }
  }

  private mapPaymentToDeposit(payment: YellowCardPayment): DepositResult {
    const statusMap: Record<string, DepositStatus> = {
      pending: 'pending',
      awaiting_payment: 'awaiting_payment',
      processing: 'processing',
      complete: 'completed',
      failed: 'failed',
      expired: 'expired',
    };

    return {
      providerId: payment.id,
      status: statusMap[payment.status] || 'pending',
      amount: payment.amount,
      sourceCurrency: payment.currency,
      targetAmount: payment.destinationAmount,
      targetCurrency: payment.destinationCurrency,
      rate: payment.rate,
      fee: payment.fee,
      paymentInstructions: {
        type: payment.channel.type as 'mobile_money' | 'bank_transfer',
        provider: payment.channel.network,
        accountNumber: payment.paymentDetails.accountNumber,
        accountName: payment.paymentDetails.accountName,
        reference: payment.paymentDetails.reference,
        instructions: payment.paymentDetails.instructions,
        expiresAt: new Date(payment.paymentDetails.expiresAt),
      },
      createdAt: new Date(payment.createdAt),
      expiresAt: new Date(payment.paymentDetails.expiresAt),
      completedAt:
        payment.status === 'complete' ? new Date(payment.updatedAt) : undefined,
    };
  }
}
