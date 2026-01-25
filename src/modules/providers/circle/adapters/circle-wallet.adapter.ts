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
import {
  CircuitBreaker,
  fetchWithTimeout,
  RequestTimeoutError,
  CircuitOpenError,
} from '@common/utils';

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

/** Default timeout for Circle API calls (5 seconds) */
const CIRCLE_API_TIMEOUT = 5000;

/**
 * Circle Wallet Adapter
 *
 * Handles wallet operations via Circle Programmable Wallets API.
 * This adapter is for real API calls only - mock operations are handled
 * by MockCircleWalletAdapter.
 */
@Injectable()
export class CircleWalletAdapter implements IWalletProvider {
  private readonly logger = new Logger(CircleWalletAdapter.name);
  private readonly config: CircleConfig;
  private readonly defaultBlockchain: string;
  private readonly circuitBreaker: CircuitBreaker;

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
      useMock: false,
    };

    this.defaultBlockchain =
      this.configService.get<string>('circle.defaultBlockchain') || 'MATIC';

    // Initialize circuit breaker for API resilience
    // Opens after 5 consecutive failures, resets after 30 seconds
    this.circuitBreaker = new CircuitBreaker({
      name: 'circle-wallet',
      failureThreshold: 5,
      resetTimeout: 30000,
    });

    if (!this.config.apiKey) {
      this.logger.warn('Circle API key not configured');
    } else {
      this.logger.log('Circle Wallet adapter initialized');
    }
  }

  /**
   * Execute a fetch request with timeout and circuit breaker protection
   * @param url The URL to fetch
   * @param options Fetch options
   * @returns The fetch Response
   */
  private async secureFetch(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    return this.circuitBreaker.execute(async () => {
      return fetchWithTimeout(url, {
        ...options,
        timeout: CIRCLE_API_TIMEOUT,
        logger: this.logger,
      });
    });
  }

  /**
   * Handle API errors with proper logging based on error type
   */
  private handleApiError(error: unknown, operation: string): void {
    if (error instanceof RequestTimeoutError) {
      this.logger.error(
        `Circle API timeout during ${operation}: ${error.message}`,
      );
    } else if (error instanceof CircuitOpenError) {
      this.logger.warn(
        `Circuit breaker open for Circle API during ${operation}: ${error.message}`,
      );
    } else {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to ${operation}: ${errorMessage}`);
    }
  }

  async createWallet(data: CreateWalletData): Promise<ProviderWallet> {
    try {
      const response = await this.secureFetch(`${this.config.baseUrl}/wallets`, {
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
      this.handleApiError(error, 'create Circle wallet');
      throw error;
    }
  }

  async getWallet(providerWalletId: string): Promise<ProviderWallet | null> {
    try {
      const response = await this.secureFetch(
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
      this.handleApiError(error, 'get Circle wallet');
      throw error;
    }
  }

  async getBalance(providerWalletId: string): Promise<WalletBalance[]> {
    try {
      const response = await this.secureFetch(
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
      this.handleApiError(error, 'get Circle wallet balance');
      throw error;
    }
  }

  async getDepositAddress(
    providerWalletId: string,
    _blockchain?: string,
  ): Promise<string> {
    const wallet = await this.getWallet(providerWalletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    return wallet.address;
  }

  async listWallets(userProviderId: string): Promise<ProviderWallet[]> {
    try {
      const response = await this.secureFetch(
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
      this.handleApiError(error, 'list Circle wallets');
      throw error;
    }
  }

  private mapCircleWallet(circleWallet: CircleWallet): ProviderWallet {
    return {
      providerId: circleWallet.id,
      address: circleWallet.address,
      blockchain: circleWallet.blockchain,
      balances: [],
      status: circleWallet.state === 'LIVE' ? 'active' : 'frozen',
      createdAt: new Date(circleWallet.createDate),
    };
  }
}
