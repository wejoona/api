import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ITransferProvider,
  InternalTransferData,
  ExternalTransferData,
  TransferResult,
  TransferStatus,
} from '../../interfaces';
import {
  CircleConfig,
  CircleTransfer,
  CIRCLE_USDC_TOKENS,
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

interface CircleWalletResponse {
  wallet: { address: string };
}

interface CircleTransferResponse {
  transfer: CircleTransfer;
}

interface CircleTransactionResponse {
  transaction: CircleTransfer;
}

interface CircleFeeEstimateResponse {
  estimate: { baseFee?: string };
}

interface CircleApiError {
  message: string;
}

/**
 * Circle Transfer Adapter
 *
 * Handles transfer operations via Circle Programmable Wallets API.
 * This adapter is for real API calls only - mock operations are handled
 * by MockCircleTransferAdapter.
 */
/** Default timeout for Circle API calls (5 seconds) */
const CIRCLE_API_TIMEOUT = 5000;

@Injectable()
export class CircleTransferAdapter implements ITransferProvider {
  private readonly logger = new Logger(CircleTransferAdapter.name);
  private readonly config: CircleConfig;
  private readonly defaultBlockchain: string;
  private readonly usdcTokenId: string;
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
    const tokenMap: Record<string, string> = CIRCLE_USDC_TOKENS;
    this.usdcTokenId =
      tokenMap[this.defaultBlockchain] || CIRCLE_USDC_TOKENS['ETH-SEPOLIA'];

    // Initialize circuit breaker for API resilience
    // Opens after 5 consecutive failures, resets after 30 seconds
    this.circuitBreaker = new CircuitBreaker({
      name: 'circle-transfer',
      failureThreshold: 5,
      resetTimeout: 30000,
    });

    if (!this.config.apiKey) {
      this.logger.warn('Circle API key not configured');
    } else {
      this.logger.log('Circle Transfer adapter initialized');
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

  async internalTransfer(data: InternalTransferData): Promise<TransferResult> {
    try {
      // For internal transfers between Circle wallets, we need to:
      // 1. Get the destination wallet's address
      // 2. Execute a transfer to that address
      const destWalletResponse = await this.secureFetch(
        `${this.config.baseUrl}/wallets/${data.toWalletId}`,
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
          },
        },
      );

      if (!destWalletResponse.ok) {
        throw new Error('Destination wallet not found');
      }

      const destWalletResult =
        (await destWalletResponse.json()) as CircleApiResponse<CircleWalletResponse>;
      const destAddress = destWalletResult.data.wallet.address;

      // Execute transfer
      const response = await this.secureFetch(
        `${this.config.baseUrl}/transactions/transfer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
            'X-Entity-Secret': this.config.entitySecret,
          },
          body: JSON.stringify({
            idempotencyKey: data.idempotencyKey,
            walletId: data.fromWalletId,
            destinationAddress: destAddress,
            amounts: [
              {
                amount: data.amount,
                tokenId: this.usdcTokenId,
              },
            ],
            feeLevel: 'MEDIUM',
          }),
        },
      );

      if (!response.ok) {
        const error = (await response.json()) as CircleApiError;
        throw new Error(`Circle API error: ${error.message}`);
      }

      const result =
        (await response.json()) as CircleApiResponse<CircleTransferResponse>;
      return this.mapCircleTransfer(result.data.transfer);
    } catch (error) {
      this.handleApiError(error, 'execute internal transfer');
      throw error;
    }
  }

  async externalTransfer(data: ExternalTransferData): Promise<TransferResult> {
    try {
      const response = await this.secureFetch(
        `${this.config.baseUrl}/transactions/transfer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
            'X-Entity-Secret': this.config.entitySecret,
          },
          body: JSON.stringify({
            idempotencyKey: data.idempotencyKey,
            walletId: data.fromWalletId,
            destinationAddress: data.toAddress,
            amounts: [
              {
                amount: data.amount,
                tokenId: this.usdcTokenId,
              },
            ],
            feeLevel: 'MEDIUM',
          }),
        },
      );

      if (!response.ok) {
        const error = (await response.json()) as CircleApiError;
        throw new Error(`Circle API error: ${error.message}`);
      }

      const result =
        (await response.json()) as CircleApiResponse<CircleTransferResponse>;
      return this.mapCircleTransfer(result.data.transfer);
    } catch (error) {
      this.handleApiError(error, 'execute external transfer');
      throw error;
    }
  }

  async getTransferStatus(providerTransferId: string): Promise<TransferResult> {
    try {
      const response = await this.secureFetch(
        `${this.config.baseUrl}/transactions/${providerTransferId}`,
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
        (await response.json()) as CircleApiResponse<CircleTransactionResponse>;
      return this.mapCircleTransfer(result.data.transaction);
    } catch (error) {
      this.handleApiError(error, 'get transfer status');
      throw error;
    }
  }

  async estimateFee(
    data: Partial<ExternalTransferData>,
  ): Promise<{ fee: string; currency: string }> {
    try {
      const response = await this.secureFetch(
        `${this.config.baseUrl}/transactions/transfer/estimateFee`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            walletId: data.fromWalletId,
            destinationAddress: data.toAddress,
            amounts: [
              {
                amount: data.amount || '1',
                tokenId: this.usdcTokenId,
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        const error = (await response.json()) as CircleApiError;
        throw new Error(`Circle API error: ${error.message}`);
      }

      const result =
        (await response.json()) as CircleApiResponse<CircleFeeEstimateResponse>;
      const estimate = result.data.estimate;

      return {
        fee: estimate.baseFee || '0',
        currency: 'USDC',
      };
    } catch (error) {
      this.handleApiError(error, 'estimate fee');
      // Return default fee on error
      return { fee: '1.00', currency: 'USDC' };
    }
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

  private mapCircleTransfer(transfer: CircleTransfer): TransferResult {
    const statusMap: Record<string, TransferStatus> = {
      INITIATED: 'pending',
      PENDING_RISK_SCREENING: 'pending',
      QUEUED: 'pending',
      SENT: 'processing',
      CONFIRMED: 'processing',
      COMPLETE: 'completed',
      FAILED: 'failed',
      DENIED: 'failed',
      CANCELLED: 'cancelled',
    };

    return {
      providerId: transfer.id,
      status: statusMap[transfer.state] || 'pending',
      amount: transfer.amounts[0]?.amount || '0',
      currency: 'USDC',
      fee: transfer.fees?.[0]?.amount || '0',
      fromWalletId: transfer.walletId,
      toAddress: transfer.destinationAddress,
      txHash: transfer.txHash,
      createdAt: new Date(transfer.createDate),
      completedAt:
        transfer.state === 'COMPLETE'
          ? new Date(transfer.updateDate)
          : undefined,
    };
  }
}
