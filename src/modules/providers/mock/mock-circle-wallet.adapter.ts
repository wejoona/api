import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  IWalletProvider,
  CreateWalletData,
  ProviderWallet,
  WalletBalance,
} from '../interfaces';

interface CircleWalletsMockData {
  defaultWallet: {
    providerId: string;
    blockchain: string;
    address: string;
    balance: string;
    currency: string;
    status: string;
  };
  blockchains: string[];
  defaultBlockchain: string;
  depositAddressPrefix: string;
  mockBalances: Record<string, string>;
}

/**
 * Mock Circle Wallet Adapter
 *
 * Uses JSON mock data for testing and development.
 * Implements the same interface as the real Circle adapter.
 */
@Injectable()
export class MockCircleWalletAdapter implements IWalletProvider {
  private readonly logger = new Logger(MockCircleWalletAdapter.name);
  private readonly mockData: CircleWalletsMockData;

  readonly providerName = 'circle_mock';

  constructor() {
    this.mockData = this.loadMockData();
    this.logger.warn('Circle Wallet running in MOCK mode');
  }

  private loadMockData(): CircleWalletsMockData {
    try {
      const mockDataPath = path.join(
        __dirname,
        '../mock-data/circle/wallets.json',
      );
      const data = fs.readFileSync(mockDataPath, 'utf-8');
      return JSON.parse(data) as CircleWalletsMockData;
    } catch {
      return {
        defaultWallet: {
          providerId: 'wallet_mock_001',
          blockchain: 'MATIC',
          address: '0x1234567890abcdef1234567890abcdef12345678',
          balance: '100.00',
          currency: 'USDC',
          status: 'active',
        },
        blockchains: ['MATIC', 'ETH', 'SOL', 'AVAX'],
        defaultBlockchain: 'MATIC',
        depositAddressPrefix: '0x',
        mockBalances: {
          new_user: '0.00',
          basic_user: '100.00',
          active_user: '1000.00',
        },
      };
    }
  }

  async createWallet(data: CreateWalletData): Promise<ProviderWallet> {
    const providerId = `circle_wallet_${uuidv4().slice(0, 8)}`;
    const address = `0x${this.generateMockAddress()}`;

    this.logger.log(
      `[MOCK] Created Circle wallet: ${providerId} for user: ${data.userProviderId}`,
    );

    return {
      providerId,
      address,
      blockchain: this.mockData.defaultBlockchain,
      balances: [
        { currency: 'USDC', available: '0', pending: '0', total: '0' },
      ],
      status: 'active',
      createdAt: new Date(),
    };
  }

  async getWallet(providerWalletId: string): Promise<ProviderWallet | null> {
    return {
      providerId: providerWalletId,
      address: `0x${this.generateMockAddress()}`,
      blockchain: this.mockData.defaultBlockchain,
      balances: [
        {
          currency: 'USDC',
          available: this.mockData.defaultWallet.balance,
          pending: '0',
          total: this.mockData.defaultWallet.balance,
        },
      ],
      status: 'active',
      createdAt: new Date(),
    };
  }

  async getBalance(_providerWalletId: string): Promise<WalletBalance[]> {
    return [
      {
        currency: 'USDC',
        available: this.mockData.defaultWallet.balance,
        pending: '0',
        total: this.mockData.defaultWallet.balance,
      },
    ];
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
    return [
      {
        providerId: `circle_wallet_${userProviderId.slice(-8)}`,
        address: `0x${this.generateMockAddress()}`,
        blockchain: this.mockData.defaultBlockchain,
        balances: [
          {
            currency: 'USDC',
            available: this.mockData.defaultWallet.balance,
            pending: '0',
            total: this.mockData.defaultWallet.balance,
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
}
