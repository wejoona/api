import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IIdentityProvider,
  CreateUserData,
  KycData,
  KycResult,
  IdentityProviderUser,
} from '../../interfaces';
import { CircleConfig, CircleUser } from '../circle.types';
import { v4 as uuidv4 } from 'uuid';

interface CircleApiResponse<T> {
  data: T;
}

interface CircleUserResponse {
  user: CircleUser;
}

interface CircleApiError {
  message: string;
}

/**
 * Circle Identity Adapter
 *
 * Note: Circle Programmable Wallets doesn't have a full KYC system built-in.
 * For production, you'd typically:
 * 1. Use Circle's entity system for user creation
 * 2. Integrate with a separate KYC provider (Persona, Onfido, etc.)
 * 3. Or use Circle's full compliance suite (separate product)
 *
 * This adapter handles user creation and tracks KYC status internally.
 */
@Injectable()
export class CircleIdentityAdapter implements IIdentityProvider {
  private readonly logger = new Logger(CircleIdentityAdapter.name);
  private readonly config: CircleConfig;

  readonly providerName = 'circle';

  constructor(private readonly configService: ConfigService) {
    this.config = {
      apiKey: this.configService.get<string>('circle.apiKey') || '',
      entitySecret: this.configService.get<string>('circle.entitySecret') || '',
      baseUrl:
        this.configService.get<string>('circle.baseUrl') ||
        'https://api.circle.com/v1/w3s',
      walletSetId: this.configService.get<string>('circle.walletSetId'),
      useMock: this.configService.get<boolean>('circle.useMock') ?? true,
    };

    if (this.config.useMock) {
      this.logger.warn('Circle Identity running in MOCK mode');
    }
  }

  async createUser(data: CreateUserData): Promise<IdentityProviderUser> {
    if (this.config.useMock) {
      return this.mockCreateUser(data);
    }
    return this.apiCreateUser(data);
  }

  async getUser(providerId: string): Promise<IdentityProviderUser | null> {
    if (this.config.useMock) {
      return this.mockGetUser(providerId);
    }
    return this.apiGetUser(providerId);
  }

  async submitKyc(providerId: string, data: KycData): Promise<KycResult> {
    if (this.config.useMock) {
      return this.mockSubmitKyc(providerId, data);
    }
    return this.apiSubmitKyc(providerId, data);
  }

  async getKycStatus(providerId: string): Promise<KycResult> {
    if (this.config.useMock) {
      return this.mockGetKycStatus(providerId);
    }
    return this.apiGetKycStatus(providerId);
  }

  async updateUser(
    providerId: string,
    data: Partial<CreateUserData>,
  ): Promise<IdentityProviderUser> {
    if (this.config.useMock) {
      return this.mockUpdateUser(providerId, data);
    }
    return this.apiUpdateUser(providerId, data);
  }

  // ============================================
  // MOCK IMPLEMENTATIONS
  // ============================================

  private mockCreateUser(data: CreateUserData): IdentityProviderUser {
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

  private mockGetUser(providerId: string): IdentityProviderUser | null {
    return {
      providerId,
      status: 'active',
      kycStatus: 'none',
      kycTier: 'basic',
      createdAt: new Date(),
    };
  }

  private mockSubmitKyc(_providerId: string, data: KycData): KycResult {
    this.logger.log(
      `[MOCK] KYC submitted for ${data.firstName} ${data.lastName}`,
    );

    // Simulate instant approval for mock mode
    return {
      status: 'pending',
      tier: 'basic',
      limits: {
        dailyDeposit: 1000,
        dailyWithdrawal: 500,
        monthlyVolume: 10000,
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private mockGetKycStatus(_providerId: string): KycResult {
    return {
      status: 'approved',
      tier: 'standard',
      limits: {
        dailyDeposit: 10000,
        dailyWithdrawal: 5000,
        monthlyVolume: 50000,
      },
    };
  }

  private mockUpdateUser(
    providerId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _data: Partial<CreateUserData>,
  ): IdentityProviderUser {
    return {
      providerId,
      status: 'active',
      kycStatus: 'approved',
      kycTier: 'standard',
      createdAt: new Date(),
    };
  }

  // ============================================
  // REAL API IMPLEMENTATIONS
  // ============================================

  private async apiCreateUser(
    data: CreateUserData,
  ): Promise<IdentityProviderUser> {
    try {
      const response = await fetch(`${this.config.baseUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          idempotencyKey: data.userId,
          userId: data.userId,
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as CircleApiError;
        throw new Error(`Circle API error: ${error.message}`);
      }

      const result =
        (await response.json()) as CircleApiResponse<CircleUserResponse>;
      const circleUser = result.data.user;

      return {
        providerId: circleUser.id,
        status: circleUser.status === 'ENABLED' ? 'active' : 'inactive',
        kycStatus: 'none',
        kycTier: 'none',
        createdAt: new Date(circleUser.createDate),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create Circle user: ${errorMessage}`);
      throw error;
    }
  }

  private async apiGetUser(
    providerId: string,
  ): Promise<IdentityProviderUser | null> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/users/${providerId}`,
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
          },
        },
      );

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const error = (await response.json()) as CircleApiError;
        throw new Error(`Circle API error: ${error.message}`);
      }

      const result =
        (await response.json()) as CircleApiResponse<CircleUserResponse>;
      const circleUser = result.data.user;

      return {
        providerId: circleUser.id,
        status: circleUser.status === 'ENABLED' ? 'active' : 'inactive',
        kycStatus: 'none', // Circle doesn't track this directly
        kycTier: 'none',
        createdAt: new Date(circleUser.createDate),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get Circle user: ${errorMessage}`);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private apiSubmitKyc(providerId: string, data: KycData): Promise<KycResult> {
    // Circle Programmable Wallets doesn't have built-in KYC
    // You would integrate with a separate KYC provider here
    return Promise.reject(
      new Error('KYC submission requires separate KYC provider integration'),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private apiGetKycStatus(providerId: string): Promise<KycResult> {
    // Return from your database/KYC provider
    return Promise.reject(
      new Error('KYC status requires separate KYC provider integration'),
    );
  }

  private apiUpdateUser(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _providerId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _data: Partial<CreateUserData>,
  ): Promise<IdentityProviderUser> {
    return Promise.reject(new Error('User update not implemented for Circle'));
  }
}
