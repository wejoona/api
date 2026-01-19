import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IWalletProvider,
  CreateWalletData,
  ProviderWallet,
  WalletBalance,
} from '../../interfaces';
import {
  CircleConfig,
  CircleWallet,
  CircleWalletBalance,
} from '../circle.types';
import { v4 as uuidv4 } from 'uuid';

interface CircleApiResponse<T> {
  data: T;
}

interface CircleWalletsResponse {
  wallets: CircleWallet[];
}

interface CircleWalletResponse {
  wallet: CircleWallet;
}

interface CircleBalancesResponse {
  tokenBalances: CircleWalletBalance[];
}

interface CircleApiError {
  message: string;
}

@Injectable()
export class CircleWalletAdapter implements IWalletProvider {
  private readonly logger = new Logger(CircleWalletAdapter.name);
  private readonly config: CircleConfig;
  private readonly defaultBlockchain: string;

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

    // Use testnet by default in non-production
    this.defaultBlockchain =
      this.configService.get<string>('circle.blockchain') || 'ETH-SEPOLIA';

    if (this.config.useMock) {
      this.logger.warn('Circle Wallet running in MOCK mode');
    }
  }

  async createWallet(data: CreateWalletData): Promise<ProviderWallet> {
    if (this.config.useMock) {
      return this.mockCreateWallet(data);
    }
    return this.apiCreateWallet(data);
  }

  async getWallet(providerWalletId: string): Promise<ProviderWallet | null> {
    if (this.config.useMock) {
      return this.mockGetWallet(providerWalletId);
    }
    return this.apiGetWallet(providerWalletId);
  }

  async getBalance(providerWalletId: string): Promise<WalletBalance[]> {
    if (this.config.useMock) {
      return this.mockGetBalance(providerWalletId);
    }
    return this.apiGetBalance(providerWalletId);
  }

  async getDepositAddress(
    providerWalletId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _blockchain?: string,
  ): Promise<string> {
    const wallet = await this.getWallet(providerWalletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    return wallet.address;
  }

  async listWallets(userProviderId: string): Promise<ProviderWallet[]> {
    if (this.config.useMock) {
      return this.mockListWallets(userProviderId);
    }
    return this.apiListWallets(userProviderId);
  }

  // ============================================
  // MOCK IMPLEMENTATIONS
  // ============================================

  private mockCreateWallet(data: CreateWalletData): ProviderWallet {
    const providerId = `circle_wallet_${uuidv4().slice(0, 8)}`;
    const address = `0x${this.generateMockAddress()}`;

    this.logger.log(
      `[MOCK] Created Circle wallet: ${providerId} for user: ${data.userProviderId}`,
    );

    return {
      providerId,
      address,
      blockchain: this.defaultBlockchain,
      balances: [
        { currency: 'USDC', available: '0', pending: '0', total: '0' },
      ],
      status: 'active',
      createdAt: new Date(),
    };
  }

  private mockGetWallet(providerWalletId: string): ProviderWallet {
    return {
      providerId: providerWalletId,
      address: `0x${this.generateMockAddress()}`,
      blockchain: this.defaultBlockchain,
      balances: [
        {
          currency: 'USDC',
          available: '100.00',
          pending: '0',
          total: '100.00',
        },
      ],
      status: 'active',
      createdAt: new Date(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private mockGetBalance(_providerWalletId: string): WalletBalance[] {
    return [
      { currency: 'USDC', available: '100.00', pending: '0', total: '100.00' },
    ];
  }

  private mockListWallets(userProviderId: string): ProviderWallet[] {
    return [
      {
        providerId: `circle_wallet_${userProviderId.slice(-8)}`,
        address: `0x${this.generateMockAddress()}`,
        blockchain: this.defaultBlockchain,
        balances: [
          {
            currency: 'USDC',
            available: '100.00',
            pending: '0',
            total: '100.00',
          },
        ],
        status: 'active',
        createdAt: new Date(),
      },
    ];
  }

  private generateMockAddress(): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 40; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  // ============================================
  // REAL API IMPLEMENTATIONS
  // ============================================

  private async apiCreateWallet(
    data: CreateWalletData,
  ): Promise<ProviderWallet> {
    try {
      const response = await fetch(`${this.config.baseUrl}/wallets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
          'X-Entity-Secret': this.config.entitySecret,
        },
        body: JSON.stringify({
          idempotencyKey: data.userId,
          userId: data.userProviderId,
          blockchains: [this.defaultBlockchain],
          metadata: data.metadata
            ? [{ name: 'internalUserId', refId: data.userId }]
            : undefined,
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as CircleApiError;
        throw new Error(`Circle API error: ${error.message}`);
      }

      const result =
        (await response.json()) as CircleApiResponse<CircleWalletsResponse>;
      const circleWallet = result.data.wallets[0];

      return this.mapCircleWallet(circleWallet);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create Circle wallet: ${errorMessage}`);
      throw error;
    }
  }

  private async apiGetWallet(
    providerWalletId: string,
  ): Promise<ProviderWallet | null> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/wallets/${providerWalletId}`,
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
        (await response.json()) as CircleApiResponse<CircleWalletResponse>;
      return this.mapCircleWallet(result.data.wallet);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get Circle wallet: ${errorMessage}`);
      throw error;
    }
  }

  private async apiGetBalance(
    providerWalletId: string,
  ): Promise<WalletBalance[]> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/wallets/${providerWalletId}/balances`,
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        const error = (await response.json()) as CircleApiError;
        throw new Error(`Circle API error: ${error.message}`);
      }

      const result =
        (await response.json()) as CircleApiResponse<CircleBalancesResponse>;
      const balances = result.data.tokenBalances || [];

      return balances.map((b) => ({
        currency: b.token.symbol,
        available: b.amount,
        pending: '0',
        total: b.amount,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get Circle wallet balance: ${errorMessage}`);
      throw error;
    }
  }

  private async apiListWallets(
    userProviderId: string,
  ): Promise<ProviderWallet[]> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/wallets?userId=${userProviderId}`,
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        const error = (await response.json()) as CircleApiError;
        throw new Error(`Circle API error: ${error.message}`);
      }

      const result =
        (await response.json()) as CircleApiResponse<CircleWalletsResponse>;
      const wallets = result.data.wallets || [];

      return wallets.map((w) => this.mapCircleWallet(w));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to list Circle wallets: ${errorMessage}`);
      throw error;
    }
  }

  private mapCircleWallet(circleWallet: CircleWallet): ProviderWallet {
    return {
      providerId: circleWallet.id,
      address: circleWallet.address,
      blockchain: circleWallet.blockchain,
      balances: [], // Fetch separately
      status: circleWallet.state === 'LIVE' ? 'active' : 'frozen',
      createdAt: new Date(circleWallet.createDate),
    };
  }
}
