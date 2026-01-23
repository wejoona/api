import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  IIdentityProvider,
  CreateUserData,
  KycData,
  KycResult,
  IdentityProviderUser,
} from '../interfaces';

interface CircleUsersMockData {
  defaultUser: {
    providerId: string;
    status: string;
    kycStatus: string;
    kycTier: string;
  };
  kycLimits: Record<string, { dailyDeposit: number; dailyWithdrawal: number; monthlyVolume: number }>;
  kycTiers: string[];
  kycStatuses: string[];
}

/**
 * Mock Circle Identity Adapter
 *
 * Uses JSON mock data for testing and development.
 * Implements the same interface as the real Circle adapter.
 */
@Injectable()
export class MockCircleIdentityAdapter implements IIdentityProvider {
  private readonly logger = new Logger(MockCircleIdentityAdapter.name);
  private readonly mockData: CircleUsersMockData;

  readonly providerName = 'circle_mock';

  constructor() {
    this.mockData = this.loadMockData();
    this.logger.warn('Circle Identity running in MOCK mode');
  }

  private loadMockData(): CircleUsersMockData {
    try {
      const mockDataPath = path.join(
        __dirname,
        '../mock-data/circle/users.json',
      );
      const data = fs.readFileSync(mockDataPath, 'utf-8');
      return JSON.parse(data) as CircleUsersMockData;
    } catch {
      return {
        defaultUser: {
          providerId: 'circle_user_mock_001',
          status: 'active',
          kycStatus: 'approved',
          kycTier: 'standard',
        },
        kycLimits: {
          none: { dailyDeposit: 100, dailyWithdrawal: 50, monthlyVolume: 500 },
          basic: { dailyDeposit: 1000, dailyWithdrawal: 500, monthlyVolume: 10000 },
          standard: { dailyDeposit: 10000, dailyWithdrawal: 5000, monthlyVolume: 50000 },
        },
        kycTiers: ['none', 'basic', 'standard', 'enhanced'],
        kycStatuses: ['none', 'pending', 'approved', 'rejected'],
      };
    }
  }

  async createUser(data: CreateUserData): Promise<IdentityProviderUser> {
    const providerId = `circle_user_${uuidv4().slice(0, 8)}`;
    this.logger.log(
      `[MOCK] Created Circle user: ${providerId} for internal user: ${data.userId}`,
    );

    return {
      providerId,
      status: 'active',
      kycStatus: 'none',
      kycTier: 'none',
      createdAt: new Date(),
    };
  }

  async getUser(providerId: string): Promise<IdentityProviderUser | null> {
    return {
      providerId,
      status: 'active',
      kycStatus: 'none',
      kycTier: 'basic',
      createdAt: new Date(),
    };
  }

  async submitKyc(_providerId: string, data: KycData): Promise<KycResult> {
    this.logger.log(
      `[MOCK] KYC submitted for ${data.firstName} ${data.lastName}`,
    );

    const limits = this.mockData.kycLimits['basic'];
    return {
      status: 'pending',
      tier: 'basic',
      limits,
    };
  }

  async getKycStatus(_providerId: string): Promise<KycResult> {
    const limits = this.mockData.kycLimits['standard'];
    return {
      status: 'approved',
      tier: 'standard',
      limits,
    };
  }

  async updateUser(
    providerId: string,
    _data: Partial<CreateUserData>,
  ): Promise<IdentityProviderUser> {
    return {
      providerId,
      status: 'active',
      kycStatus: 'approved',
      kycTier: 'standard',
      createdAt: new Date(),
    };
  }
}
