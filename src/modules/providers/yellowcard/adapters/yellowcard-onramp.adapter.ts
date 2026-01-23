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
} from '../yellowcard.types';

interface YellowCardApiResponse<T> {
  data: T;
}

interface YellowCardApiError {
  message: string;
}

/**
 * Yellow Card On-Ramp Adapter
 *
 * Handles deposit operations (XOF → USDC) via Yellow Card API.
 * This adapter is for real API calls only - mock operations are handled
 * by MockYellowCardOnRampAdapter.
 */
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
      useMock: false,
    };

    if (!this.config.apiKey) {
      this.logger.warn('Yellow Card API key not configured');
    } else {
      this.logger.log('Yellow Card On-Ramp adapter initialized');
    }
  }

  async getChannels(
    country: string,
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

  async initiateDeposit(data: InitiateDepositData): Promise<DepositResult> {
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

  async getDepositStatus(providerDepositId: string): Promise<DepositResult> {
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

  verifyWebhookSignature(payload: string, signature: string): boolean {
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
