import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  YellowCardConfig,
  CreateSubwalletRequest,
  SubwalletResponse,
  InitiateDepositRequest,
  DepositResponse,
  InternalTransferRequest,
  ExternalTransferRequest,
  TransferResponse,
  BalanceResponse,
  OnRampChannel,
  RateRequest,
  RateResponse,
} from './yellow-card.types';

@Injectable()
export class YellowCardService {
  private readonly logger = new Logger(YellowCardService.name);
  private readonly config: YellowCardConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      apiUrl: this.configService.get<string>('yellowCard.apiUrl'),
      apiKey: this.configService.get<string>('yellowCard.apiKey'),
      secretKey: this.configService.get<string>('yellowCard.secretKey'),
      webhookSecret: this.configService.get<string>('yellowCard.webhookSecret'),
      useMock: this.configService.get<boolean>('yellowCard.useMock'),
    };

    if (this.config.useMock) {
      this.logger.warn('Yellow Card service running in MOCK mode');
    }
  }

  async createSubwallet(
    request: CreateSubwalletRequest,
  ): Promise<SubwalletResponse> {
    if (this.config.useMock) {
      return this.mockCreateSubwallet(request);
    }
    return this.apiCreateSubwallet(request);
  }

  async getBalance(subwalletId: string): Promise<BalanceResponse> {
    if (this.config.useMock) {
      return this.mockGetBalance(subwalletId);
    }
    return this.apiGetBalance(subwalletId);
  }

  async getOnRampChannels(country: string): Promise<OnRampChannel[]> {
    if (this.config.useMock) {
      return this.mockGetOnRampChannels(country);
    }
    return this.apiGetOnRampChannels(country);
  }

  async initiateDeposit(
    request: InitiateDepositRequest,
  ): Promise<DepositResponse> {
    if (this.config.useMock) {
      return this.mockInitiateDeposit(request);
    }
    return this.apiInitiateDeposit(request);
  }

  async internalTransfer(
    request: InternalTransferRequest,
  ): Promise<TransferResponse> {
    if (this.config.useMock) {
      return this.mockInternalTransfer(request);
    }
    return this.apiInternalTransfer(request);
  }

  async externalTransfer(
    request: ExternalTransferRequest,
  ): Promise<TransferResponse> {
    if (this.config.useMock) {
      return this.mockExternalTransfer(request);
    }
    return this.apiExternalTransfer(request);
  }

  async getRate(request: RateRequest): Promise<RateResponse> {
    if (this.config.useMock) {
      return this.mockGetRate(request);
    }
    return this.apiGetRate(request);
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (this.config.useMock) {
      return true;
    }
    // Implement HMAC verification
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret || '')
      .update(payload)
      .digest('hex');
    return signature === expectedSignature;
  }

  // ============================================
  // MOCK IMPLEMENTATIONS
  // ============================================

  private mockCreateSubwallet(
    request: CreateSubwalletRequest,
  ): SubwalletResponse {
    const id = `mock_wallet_${Date.now()}`;
    return {
      id,
      name: request.name,
      email: request.email || null,
      country: request.country,
      phone: request.phone || null,
      address: `0x${this.generateMockAddress()}`,
      balance: 0,
      currency: 'USDC',
      createdAt: new Date().toISOString(),
    };
  }

  private mockGetBalance(subwalletId: string): BalanceResponse {
    return {
      subwalletId,
      balances: [
        {
          currency: 'USD',
          available: 100.0,
          pending: 0,
          total: 100.0,
        },
        {
          currency: 'USDC',
          available: 100.0,
          pending: 0,
          total: 100.0,
        },
      ],
    };
  }

  private mockGetOnRampChannels(country: string): OnRampChannel[] {
    if (country === 'CI') {
      return [
        {
          id: 'orange_money_ci',
          name: 'Orange Money',
          type: 'mobile_money',
          provider: 'orange',
          country: 'CI',
          minAmount: 1000,
          maxAmount: 500000,
          fee: 1.5,
          feeType: 'percentage',
        },
        {
          id: 'wave_ci',
          name: 'Wave',
          type: 'mobile_money',
          provider: 'wave',
          country: 'CI',
          minAmount: 500,
          maxAmount: 1000000,
          fee: 1.0,
          feeType: 'percentage',
        },
        {
          id: 'mtn_momo_ci',
          name: 'MTN Mobile Money',
          type: 'mobile_money',
          provider: 'mtn',
          country: 'CI',
          minAmount: 1000,
          maxAmount: 500000,
          fee: 1.5,
          feeType: 'percentage',
        },
      ];
    }
    return [];
  }

  private mockInitiateDeposit(
    request: InitiateDepositRequest,
  ): DepositResponse {
    const id = `mock_deposit_${Date.now()}`;
    const rate = 0.00166; // Mock XOF to USD rate

    return {
      id,
      subwalletId: request.subwalletId,
      amount: request.amount,
      sourceCurrency: request.sourceCurrency,
      targetCurrency: 'USD',
      rate,
      fee: request.amount * 0.015,
      targetAmount: request.amount * rate,
      status: 'pending',
      paymentInstructions: {
        type: 'mobile_money',
        provider: 'orange',
        accountNumber: '+2250700000000',
        accountName: 'JoonaPay USD Wallet',
        reference: `DEP-${id.slice(-8).toUpperCase()}`,
        instructions: `Send ${request.amount} ${request.sourceCurrency} to the number above with reference ${id.slice(-8).toUpperCase()}`,
      },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  private mockInternalTransfer(
    request: InternalTransferRequest,
  ): TransferResponse {
    const id = `mock_transfer_${Date.now()}`;
    return {
      id,
      type: 'internal',
      fromSubwalletId: request.fromSubwalletId,
      toSubwalletId: request.toSubwalletId,
      amount: request.amount,
      currency: request.currency,
      fee: 0,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
  }

  private mockExternalTransfer(
    request: ExternalTransferRequest,
  ): TransferResponse {
    const id = `mock_transfer_${Date.now()}`;
    return {
      id,
      type: 'external',
      fromSubwalletId: request.subwalletId,
      toAddress: request.toAddress,
      amount: request.amount,
      currency: request.currency,
      fee: 1.0,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  }

  private mockGetRate(request: RateRequest): RateResponse {
    let rate = 1;
    if (request.sourceCurrency === 'XOF' && request.targetCurrency === 'USD') {
      rate = 0.00166;
    } else if (
      request.sourceCurrency === 'USD' &&
      request.targetCurrency === 'XOF'
    ) {
      rate = 602.41;
    }

    return {
      sourceCurrency: request.sourceCurrency,
      targetCurrency: request.targetCurrency,
      rate,
      sourceAmount: request.amount,
      targetAmount: request.amount * rate,
      fee: request.amount * 0.015,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  }

  private generateMockAddress(): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 40; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  // ============================================
  // REAL API IMPLEMENTATIONS (placeholder)
  // ============================================

  private apiCreateSubwallet(
    _request: CreateSubwalletRequest,
  ): Promise<SubwalletResponse> {
    // TODO: Implement real API call
    return Promise.reject(
      new Error(
        'Real Yellow Card API not implemented. Set YELLOW_CARD_USE_MOCK=true',
      ),
    );
  }

  private apiGetBalance(_subwalletId: string): Promise<BalanceResponse> {
    return Promise.reject(
      new Error(
        'Real Yellow Card API not implemented. Set YELLOW_CARD_USE_MOCK=true',
      ),
    );
  }

  private apiGetOnRampChannels(_country: string): Promise<OnRampChannel[]> {
    return Promise.reject(
      new Error(
        'Real Yellow Card API not implemented. Set YELLOW_CARD_USE_MOCK=true',
      ),
    );
  }

  private apiInitiateDeposit(
    _request: InitiateDepositRequest,
  ): Promise<DepositResponse> {
    return Promise.reject(
      new Error(
        'Real Yellow Card API not implemented. Set YELLOW_CARD_USE_MOCK=true',
      ),
    );
  }

  private apiInternalTransfer(
    _request: InternalTransferRequest,
  ): Promise<TransferResponse> {
    return Promise.reject(
      new Error(
        'Real Yellow Card API not implemented. Set YELLOW_CARD_USE_MOCK=true',
      ),
    );
  }

  private apiExternalTransfer(
    _request: ExternalTransferRequest,
  ): Promise<TransferResponse> {
    return Promise.reject(
      new Error(
        'Real Yellow Card API not implemented. Set YELLOW_CARD_USE_MOCK=true',
      ),
    );
  }

  private apiGetRate(_request: RateRequest): Promise<RateResponse> {
    return Promise.reject(
      new Error(
        'Real Yellow Card API not implemented. Set YELLOW_CARD_USE_MOCK=true',
      ),
    );
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
}
