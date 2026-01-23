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
@Injectable()
export class CircleTransferAdapter implements ITransferProvider {
  private readonly logger = new Logger(CircleTransferAdapter.name);
  private readonly config: CircleConfig;
  private readonly defaultBlockchain: string;
  private readonly usdcTokenId: string;

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

    if (!this.config.apiKey) {
      this.logger.warn('Circle API key not configured');
    } else {
      this.logger.log('Circle Transfer adapter initialized');
    }
  }

  async internalTransfer(data: InternalTransferData): Promise<TransferResult> {
    try {
      // For internal transfers between Circle wallets, we need to:
      // 1. Get the destination wallet's address
      // 2. Execute a transfer to that address
      const destWalletResponse = await fetch(
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
      const response = await fetch(
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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to execute internal transfer: ${errorMessage}`);
      throw error;
    }
  }

  async externalTransfer(data: ExternalTransferData): Promise<TransferResult> {
    try {
      const response = await fetch(
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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to execute external transfer: ${errorMessage}`);
      throw error;
    }
  }

  async getTransferStatus(providerTransferId: string): Promise<TransferResult> {
    try {
      const response = await fetch(
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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get transfer status: ${errorMessage}`);
      throw error;
    }
  }

  async estimateFee(
    data: Partial<ExternalTransferData>,
  ): Promise<{ fee: string; currency: string }> {
    try {
      const response = await fetch(
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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to estimate fee: ${errorMessage}`);
      // Return default fee on error
      return { fee: '1.00', currency: 'USDC' };
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
