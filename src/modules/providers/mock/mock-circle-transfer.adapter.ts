import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  ITransferProvider,
  InternalTransferData,
  ExternalTransferData,
  TransferResult,
} from '../interfaces';

interface CircleTransfersMockData {
  defaultTransfer: {
    providerId: string;
    status: string;
    transactionHash: string;
  };
  statuses: string[];
  internalTransferFee: number;
  externalTransferFee: number;
  estimatedTimes: Record<string, string>;
  mockTransactionHashes: Record<string, string>;
}

/**
 * Mock Circle Transfer Adapter
 *
 * Uses JSON mock data for testing and development.
 * Implements the same interface as the real Circle adapter.
 */
@Injectable()
export class MockCircleTransferAdapter implements ITransferProvider {
  private readonly logger = new Logger(MockCircleTransferAdapter.name);
  private readonly mockData: CircleTransfersMockData;

  readonly providerName = 'circle_mock';

  constructor() {
    this.mockData = this.loadMockData();
    this.logger.warn('Circle Transfer running in MOCK mode');
  }

  private loadMockData(): CircleTransfersMockData {
    try {
      const mockDataPath = path.join(
        __dirname,
        '../mock-data/circle/transfers.json',
      );
      const data = fs.readFileSync(mockDataPath, 'utf-8');
      return JSON.parse(data) as CircleTransfersMockData;
    } catch {
      return {
        defaultTransfer: {
          providerId: 'transfer_mock_001',
          status: 'complete',
          transactionHash: '0xabcdef1234567890',
        },
        statuses: ['pending', 'processing', 'complete', 'failed'],
        internalTransferFee: 0,
        externalTransferFee: 0.5,
        estimatedTimes: {
          internal: 'instant',
          external_MATIC: '2-5 minutes',
        },
        mockTransactionHashes: {
          MATIC: '0xabcdef1234567890',
        },
      };
    }
  }

  async internalTransfer(data: InternalTransferData): Promise<TransferResult> {
    const providerId = `circle_tx_${uuidv4().slice(0, 8)}`;

    this.logger.log(
      `[MOCK] Internal transfer: ${data.amount} ${data.currency} from ${data.fromWalletId} to ${data.toWalletId}`,
    );

    return {
      providerId,
      status: 'completed',
      amount: data.amount,
      currency: data.currency,
      fee: this.mockData.internalTransferFee.toString(),
      fromWalletId: data.fromWalletId,
      toWalletId: data.toWalletId,
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }

  async externalTransfer(data: ExternalTransferData): Promise<TransferResult> {
    const providerId = `circle_tx_${uuidv4().slice(0, 8)}`;

    this.logger.log(
      `[MOCK] External transfer: ${data.amount} ${data.currency} from ${data.fromWalletId} to ${data.toAddress}`,
    );

    return {
      providerId,
      status: 'pending',
      amount: data.amount,
      currency: data.currency,
      fee: this.mockData.externalTransferFee.toString(),
      fromWalletId: data.fromWalletId,
      toAddress: data.toAddress,
      createdAt: new Date(),
    };
  }

  async getTransferStatus(providerTransferId: string): Promise<TransferResult> {
    return {
      providerId: providerTransferId,
      status: 'completed',
      amount: '100.00',
      currency: 'USDC',
      fee: '0',
      fromWalletId: 'mock_wallet',
      txHash: this.mockData.mockTransactionHashes['MATIC'] || this.generateMockTxHash(),
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }

  async estimateFee(
    _data: Partial<ExternalTransferData>,
  ): Promise<{ fee: string; currency: string }> {
    return {
      fee: this.mockData.externalTransferFee.toString(),
      currency: 'USDC',
    };
  }

  private generateMockTxHash(): string {
    const chars = '0123456789abcdef';
    let result = '0x';
    for (let i = 0; i < 64; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }
}
