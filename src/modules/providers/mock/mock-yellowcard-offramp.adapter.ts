import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  IOffRampProvider,
  WithdrawalChannel,
  InitiateWithdrawalData,
  WithdrawalResult,
  MobileMoneyDetails,
} from '../interfaces';

interface YellowCardChannelsMockData {
  [country: string]: {
    offramp: Array<{
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
  USDC_XOF: {
    rate: number;
    fee: number;
    expiresInMinutes: number;
  };
}

/**
 * Mock Yellow Card Off-Ramp Adapter
 *
 * Uses JSON mock data for testing and development.
 * Implements the same interface as the real Yellow Card adapter.
 */
@Injectable()
export class MockYellowCardOffRampAdapter implements IOffRampProvider {
  private readonly logger = new Logger(MockYellowCardOffRampAdapter.name);
  private readonly channelsMockData: YellowCardChannelsMockData;
  private readonly ratesMockData: YellowCardRatesMockData;

  readonly providerName = 'yellowcard_mock';
  readonly supportedCountries = ['CI', 'SN', 'ML', 'BF', 'BJ', 'TG', 'NE', 'GW'];

  constructor() {
    this.channelsMockData = this.loadChannelsMockData();
    this.ratesMockData = this.loadRatesMockData();
    this.logger.warn('Yellow Card Off-Ramp running in MOCK mode');
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
          offramp: [
            {
              id: 'orange_ci_offramp',
              name: 'Orange Money',
              type: 'mobile_money',
              provider: 'orange',
              currency: 'XOF',
              minAmount: 500,
              maxAmount: 500000,
              fee: 1.5,
              feeType: 'percentage',
              estimatedTime: 'instant',
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
        USDC_XOF: {
          rate: 602.41,
          fee: 1.5,
          expiresInMinutes: 5,
        },
      };
    }
  }

  async getChannels(
    country: string,
    _currency?: string,
  ): Promise<WithdrawalChannel[]> {
    const countryData = this.channelsMockData[country];
    if (!countryData?.offramp) {
      return [];
    }

    return countryData.offramp.map((ch) => ({
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
    const rateData = this.ratesMockData.USDC_XOF;
    const fee = amount * (rateData.fee / 100);
    const targetAmount = (amount - fee) * rateData.rate;

    return {
      rate: rateData.rate,
      sourceAmount: amount,
      targetAmount: Math.round(targetAmount),
      fee,
      expiresAt: new Date(Date.now() + rateData.expiresInMinutes * 60 * 1000),
    };
  }

  async initiateWithdrawal(
    data: InitiateWithdrawalData,
  ): Promise<WithdrawalResult> {
    const providerId = `yc_payout_${uuidv4().slice(0, 8)}`;
    const rateData = this.ratesMockData.USDC_XOF;
    const fee = data.amount * (rateData.fee / 100);
    const targetAmount = (data.amount - fee) * rateData.rate;

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
      rate: rateData.rate,
      fee,
      destination: data.destination,
      reference: `WD-${providerId.slice(-8).toUpperCase()}`,
      createdAt: new Date(),
      estimatedArrival: new Date(Date.now() + 30 * 60 * 1000),
    };
  }

  async getWithdrawalStatus(
    providerWithdrawalId: string,
  ): Promise<WithdrawalResult> {
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

  verifyWebhookSignature(_payload: string, _signature: string): boolean {
    return true;
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
    const data = payload.data as { id: string };
    return {
      type: 'withdrawal.pending',
      withdrawalId: data?.id || 'mock_withdrawal_id',
      data: payload,
    };
  }
}
