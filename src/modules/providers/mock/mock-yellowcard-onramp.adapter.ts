import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  IOnRampProvider,
  PaymentChannel,
  InitiateDepositData,
  DepositResult,
} from '../interfaces';

interface YellowCardChannelsMockData {
  [country: string]: {
    onramp: Array<{
      id: string;
      name: string;
      type: string;
      provider: string;
      currency: string;
      minAmount: number;
      maxAmount: number;
      fee: number;
      feeType: string;
      estimatedTime: string;
      isActive: boolean;
    }>;
  };
}

interface YellowCardRatesMockData {
  XOF_USDC: {
    rate: number;
    fee: number;
    expiresInMinutes: number;
  };
}

/**
 * Mock Yellow Card On-Ramp Adapter
 *
 * Uses JSON mock data for testing and development.
 * Implements the same interface as the real Yellow Card adapter.
 */
@Injectable()
export class MockYellowCardOnRampAdapter implements IOnRampProvider {
  private readonly logger = new Logger(MockYellowCardOnRampAdapter.name);
  private readonly channelsMockData: YellowCardChannelsMockData;
  private readonly ratesMockData: YellowCardRatesMockData;

  readonly providerName = 'yellowcard_mock';
  readonly supportedCountries = [
    'CI',
    'SN',
    'ML',
    'BF',
    'BJ',
    'TG',
    'NE',
    'GW',
  ];

  constructor() {
    this.channelsMockData = this.loadChannelsMockData();
    this.ratesMockData = this.loadRatesMockData();
    this.logger.warn('Yellow Card On-Ramp running in MOCK mode');
  }

  private loadChannelsMockData(): YellowCardChannelsMockData {
    try {
      const mockDataPath = path.join(
        __dirname,
        '../mock-data/yellowcard/channels.json',
      );
      const data = fs.readFileSync(mockDataPath, 'utf-8');
      return JSON.parse(data) as YellowCardChannelsMockData;
    } catch {
      return {
        CI: {
          onramp: [
            {
              id: 'orange_ci_onramp',
              name: 'Orange Money',
              type: 'mobile_money',
              provider: 'orange',
              currency: 'XOF',
              minAmount: 500,
              maxAmount: 1000000,
              fee: 1.5,
              feeType: 'percentage',
              estimatedTime: '5-15 minutes',
              isActive: true,
            },
          ],
        },
      };
    }
  }

  private loadRatesMockData(): YellowCardRatesMockData {
    try {
      const mockDataPath = path.join(
        __dirname,
        '../mock-data/yellowcard/rates.json',
      );
      const data = fs.readFileSync(mockDataPath, 'utf-8');
      return JSON.parse(data) as YellowCardRatesMockData;
    } catch {
      return {
        XOF_USDC: {
          rate: 0.00166,
          fee: 1.5,
          expiresInMinutes: 5,
        },
      };
    }
  }

  async getChannels(
    country: string,
    _currency?: string,
  ): Promise<PaymentChannel[]> {
    const countryData = this.channelsMockData[country];
    if (!countryData?.onramp) {
      return [];
    }

    return countryData.onramp.map((ch) => ({
      id: ch.id,
      name: ch.name,
      type: ch.type as 'mobile_money' | 'bank_transfer',
      provider: ch.provider,
      country,
      currency: ch.currency,
      minAmount: ch.minAmount,
      maxAmount: ch.maxAmount,
      fee: ch.fee,
      feeType: ch.feeType as 'fixed' | 'percentage',
      estimatedTime: ch.estimatedTime,
      isActive: ch.isActive,
    }));
  }

  async getRate(
    _sourceCurrency: string,
    _targetCurrency: string,
    amount: number,
  ): Promise<{
    rate: number;
    sourceAmount: number;
    targetAmount: number;
    fee: number;
    expiresAt: Date;
  }> {
    const rateData = this.ratesMockData.XOF_USDC;
    const fee = amount * (rateData.fee / 100);
    const targetAmount = (amount - fee) * rateData.rate;

    return {
      rate: rateData.rate,
      sourceAmount: amount,
      targetAmount: Math.round(targetAmount * 100) / 100,
      fee,
      expiresAt: new Date(Date.now() + rateData.expiresInMinutes * 60 * 1000),
    };
  }

  async initiateDeposit(data: InitiateDepositData): Promise<DepositResult> {
    const providerId = `yc_pay_${uuidv4().slice(0, 8)}`;
    const rateData = this.ratesMockData.XOF_USDC;
    const fee = data.amount * (rateData.fee / 100);
    const targetAmount = (data.amount - fee) * rateData.rate;

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
      rate: rateData.rate,
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

  async getDepositStatus(providerDepositId: string): Promise<DepositResult> {
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

  verifyWebhookSignature(_payload: string, _signature: string): boolean {
    return true;
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
    const data = payload.data as { id: string };
    return {
      type: 'deposit.pending',
      depositId: data?.id || 'mock_deposit_id',
      data: payload,
    };
  }
}
