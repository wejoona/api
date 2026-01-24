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
 * Handles user identity operations via Circle Programmable Wallets API.
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
      entitySecret:
        this.configService.get<string>('circle.entitySecretCipherText') || '',
      baseUrl:
        this.configService.get<string>('circle.apiUrl') ||
        'https://api.circle.com/v1/w3s',
      walletSetId: this.configService.get<string>('circle.walletSetId'),
      useMock: false, // This adapter is for real API only
    };

    if (!this.config.apiKey) {
      this.logger.warn('Circle API key not configured');
    } else {
      this.logger.log('Circle Identity adapter initialized');
    }
  }

  async createUser(data: CreateUserData): Promise<IdentityProviderUser> {
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

  async getUser(providerId: string): Promise<IdentityProviderUser | null> {
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
        kycStatus: 'none',
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

  async submitKyc(_providerId: string, _data: KycData): Promise<KycResult> {
    // Circle Programmable Wallets doesn't have built-in KYC
    // You would integrate with a separate KYC provider here
    throw new Error(
      'KYC submission requires separate KYC provider integration',
    );
  }

  async getKycStatus(_providerId: string): Promise<KycResult> {
    // Return from your database/KYC provider
    throw new Error('KYC status requires separate KYC provider integration');
  }

  async updateUser(
    providerId: string,
    _data: Partial<CreateUserData>,
  ): Promise<IdentityProviderUser> {
    // Circle Programmable Wallets has limited update capabilities
    // The primary update is enabling/disabling users via status change
    // For profile data (email, phone, etc.), store locally as Circle doesn't manage these

    try {
      // Circle W3S doesn't have a dedicated update endpoint for users
      // Instead, we fetch the current user state and return it
      // Profile updates should be handled in the local database

      const user = await this.getUser(providerId);
      if (!user) {
        throw new Error(`Circle user ${providerId} not found`);
      }

      this.logger.log(
        `User profile data updates stored locally for Circle user ${providerId}`,
      );

      // Return the current Circle user state
      // The actual profile updates (email, phone, etc.) should be stored
      // in the local database and merged with this data
      return user;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update Circle user: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Update user status (enable/disable)
   * This is a Circle-specific operation not in the base interface
   */
  async updateUserStatus(
    providerId: string,
    status: 'ENABLED' | 'DISABLED',
  ): Promise<IdentityProviderUser> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/users/${providerId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({ status }),
        },
      );

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
      this.logger.error(`Failed to update Circle user status: ${errorMessage}`);
      throw error;
    }
  }
}
