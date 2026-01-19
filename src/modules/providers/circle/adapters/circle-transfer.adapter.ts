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
import { v4 as uuidv4 } from 'uuid';

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
      entitySecret: this.configService.get<string>('circle.entitySecret') || '',
      baseUrl:
        this.configService.get<string>('circle.baseUrl') ||
        'https://api.circle.com/v1/w3s',
      walletSetId: this.configService.get<string>('circle.walletSetId'),
      useMock: this.configService.get<boolean>('circle.useMock') ?? true,
    };

    this.defaultBlockchain =
      this.configService.get<string>('circle.blockchain') || 'ETH-SEPOLIA';
    const tokenMap: Record<string, string> = CIRCLE_USDC_TOKENS;
    this.usdcTokenId =
      tokenMap[this.defaultBlockchain] || CIRCLE_USDC_TOKENS['ETH-SEPOLIA'];

    if (this.config.useMock) {
      this.logger.warn('Circle Transfer running in MOCK mode');
    }
  }

  async internalTransfer(data: InternalTransferData): Promise<TransferResult> {
    if (this.config.useMock) {
      return this.mockInternalTransfer(data);
    }
    return this.apiInternalTransfer(data);
  }

  async externalTransfer(data: ExternalTransferData): Promise<TransferResult> {
    if (this.config.useMock) {
      return this.mockExternalTransfer(data);
    }
    return this.apiExternalTransfer(data);
  }

  async getTransferStatus(providerTransferId: string): Promise<TransferResult> {
    if (this.config.useMock) {
      return this.mockGetTransferStatus(providerTransferId);
    }
    return this.apiGetTransferStatus(providerTransferId);
  }

  async estimateFee(
    data: Partial<ExternalTransferData>,
  ): Promise<{ fee: string; currency: string }> {
    if (this.config.useMock) {
      return this.mockEstimateFee(data);
    }
    return this.apiEstimateFee(data);
  }

  // ============================================
  // MOCK IMPLEMENTATIONS
  // ============================================

  private mockInternalTransfer(data: InternalTransferData): TransferResult {
    const providerId = `circle_tx_${uuidv4().slice(0, 8)}`;

    this.logger.log(
      `[MOCK] Internal transfer: ${data.amount} ${data.currency} from ${data.fromWalletId} to ${data.toWalletId}`,
    );

    // Internal transfers are instant and free
    return {
      providerId,
      status: 'completed',
      amount: data.amount,
      currency: data.currency,
      fee: '0',
      fromWalletId: data.fromWalletId,
      toWalletId: data.toWalletId,
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }

  private mockExternalTransfer(data: ExternalTransferData): TransferResult {
    const providerId = `circle_tx_${uuidv4().slice(0, 8)}`;

    this.logger.log(
      `[MOCK] External transfer: ${data.amount} ${data.currency} from ${data.fromWalletId} to ${data.toAddress}`,
    );

    return {
      providerId,
      status: 'pending',
      amount: data.amount,
      currency: data.currency,
      fee: '1.00',
      fromWalletId: data.fromWalletId,
      toAddress: data.toAddress,
      createdAt: new Date(),
    };
  }

  private mockGetTransferStatus(providerTransferId: string): TransferResult {
    return {
      providerId: providerTransferId,
      status: 'completed',
      amount: '100.00',
      currency: 'USDC',
      fee: '0',
      fromWalletId: 'mock_wallet',
      txHash: `0x${this.generateMockTxHash()}`,
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private mockEstimateFee(data: Partial<ExternalTransferData>): {
    fee: string;
    currency: string;
  } {
    return {
      fee: '1.00',
      currency: 'USDC',
    };
  }

  private generateMockTxHash(): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  // ============================================
  // REAL API IMPLEMENTATIONS
  // ============================================

  private async apiInternalTransfer(
    data: InternalTransferData,
  ): Promise<TransferResult> {
    // For internal transfers between Circle wallets, we need to:
    // 1. Get the destination wallet's address
    // 2. Execute a transfer to that address

    try {
      // First, get destination wallet address
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

  private async apiExternalTransfer(
    data: ExternalTransferData,
  ): Promise<TransferResult> {
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

  private async apiGetTransferStatus(
    providerTransferId: string,
  ): Promise<TransferResult> {
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

  private async apiEstimateFee(
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
