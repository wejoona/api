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

  // ============================================
  // REAL API IMPLEMENTATIONS
  // ============================================

  /**
   * Generate HMAC signature for Yellow Card API authentication
   */
  private generateSignature(
    method: string,
    path: string,
    timestamp: string,
    body?: string,
  ): string {
    const message = body
      ? `${timestamp}${method}${path}${body}`
      : `${timestamp}${method}${path}`;
    return crypto
      .createHmac('sha256', this.config.secretKey || '')
      .update(message)
      .digest('hex');
  }

  /**
   * Make authenticated request to Yellow Card API
   */
  private async makeRequest<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const timestamp = new Date().toISOString();
    const bodyStr = body ? JSON.stringify(body) : undefined;
    const signature = this.generateSignature(method, path, timestamp, bodyStr);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-YC-Timestamp': timestamp,
      Authorization: `YcHmacV1 ${this.config.apiKey}:${signature}`,
    };

    const url = `${this.config.apiUrl}${path}`;

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: bodyStr,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          (errorData as { message?: string }).message ||
          `HTTP ${response.status}`;
        this.logger.error(`Yellow Card API error: ${errorMessage}`);
        throw new Error(`Yellow Card API error: ${errorMessage}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Yellow Card')) {
        throw error;
      }
      this.logger.error(`Yellow Card request failed: ${error}`);
      throw new Error(`Yellow Card API request failed: ${error}`);
    }
  }

  private async apiCreateSubwallet(
    request: CreateSubwalletRequest,
  ): Promise<SubwalletResponse> {
    this.logger.log(
      `Creating subwallet for ${request.name} in ${request.country}`,
    );

    interface YCSubwalletResponse {
      id: string;
      name: string;
      email?: string;
      country: string;
      phone?: string;
      walletAddress: string;
      balance: number;
      currency: string;
      createdAt: string;
    }

    const response = await this.makeRequest<{ data: YCSubwalletResponse }>(
      'POST',
      '/business/subwallets',
      {
        name: request.name,
        email: request.email,
        country: request.country,
        phone: request.phone,
      },
    );

    return {
      id: response.data.id,
      name: response.data.name,
      email: response.data.email || null,
      country: response.data.country,
      phone: response.data.phone || null,
      address: response.data.walletAddress,
      balance: response.data.balance,
      currency: response.data.currency,
      createdAt: response.data.createdAt,
    };
  }

  private async apiGetBalance(subwalletId: string): Promise<BalanceResponse> {
    this.logger.debug(`Getting balance for subwallet ${subwalletId}`);

    interface YCBalance {
      currency: string;
      available: number;
      pending: number;
      total: number;
    }

    const response = await this.makeRequest<{
      data: { balances: YCBalance[] };
    }>('GET', `/business/subwallets/${subwalletId}/balances`);

    return {
      subwalletId,
      balances: response.data.balances.map((b) => ({
        currency: b.currency,
        available: b.available,
        pending: b.pending,
        total: b.total,
      })),
    };
  }

  private async apiGetOnRampChannels(
    country: string,
  ): Promise<OnRampChannel[]> {
    this.logger.debug(`Getting on-ramp channels for ${country}`);

    interface YCChannel {
      id: string;
      name: string;
      channelType: 'mobile_money' | 'bank_transfer';
      network: string;
      country: string;
      minAmount: number;
      maxAmount: number;
      percentFee: number;
      flatFee: number;
    }

    const response = await this.makeRequest<{ data: YCChannel[] }>(
      'GET',
      `/business/channels?country=${country}&type=payment`,
    );

    return response.data.map((ch) => ({
      id: ch.id,
      name: ch.name,
      type: ch.channelType,
      provider: ch.network,
      country: ch.country,
      minAmount: ch.minAmount,
      maxAmount: ch.maxAmount,
      fee: ch.percentFee,
      feeType: ch.flatFee > 0 ? ('fixed' as const) : ('percentage' as const),
    }));
  }

  private async apiInitiateDeposit(
    request: InitiateDepositRequest,
  ): Promise<DepositResponse> {
    this.logger.log(
      `Initiating deposit: ${request.amount} ${request.sourceCurrency} to ${request.subwalletId}`,
    );

    interface YCPayment {
      id: string;
      subwalletId: string;
      amount: number;
      currency: string;
      destinationCurrency: string;
      rate: number;
      fee: number;
      destinationAmount: number;
      status: string;
      paymentDetails: {
        type: string;
        network: string;
        accountNumber: string;
        accountName: string;
        reference: string;
        instructions: string;
        expiresAt: string;
      };
      createdAt: string;
    }

    const response = await this.makeRequest<{ data: YCPayment }>(
      'POST',
      '/business/payments',
      {
        subwalletId: request.subwalletId,
        amount: request.amount,
        currency: request.sourceCurrency,
        channelId: request.channelId,
        customerPhone: request.customerPhone,
      },
    );

    const payment = response.data;
    return {
      id: payment.id,
      subwalletId: payment.subwalletId,
      amount: payment.amount,
      sourceCurrency: payment.currency,
      targetCurrency: payment.destinationCurrency,
      rate: payment.rate,
      fee: payment.fee,
      targetAmount: payment.destinationAmount,
      status: payment.status as DepositResponse['status'],
      paymentInstructions: {
        type: payment.paymentDetails.type as 'mobile_money' | 'bank_transfer',
        provider: payment.paymentDetails.network,
        accountNumber: payment.paymentDetails.accountNumber,
        accountName: payment.paymentDetails.accountName,
        reference: payment.paymentDetails.reference,
        instructions: payment.paymentDetails.instructions,
      },
      createdAt: payment.createdAt,
      expiresAt: payment.paymentDetails.expiresAt,
    };
  }

  private async apiInternalTransfer(
    request: InternalTransferRequest,
  ): Promise<TransferResponse> {
    this.logger.log(
      `Internal transfer: ${request.amount} ${request.currency} from ${request.fromSubwalletId} to ${request.toSubwalletId}`,
    );

    interface YCTransfer {
      id: string;
      type: 'internal' | 'external';
      fromSubwalletId: string;
      toSubwalletId: string;
      amount: number;
      currency: string;
      fee: number;
      status: string;
      createdAt: string;
    }

    const response = await this.makeRequest<{ data: YCTransfer }>(
      'POST',
      '/business/transfers',
      {
        fromSubwalletId: request.fromSubwalletId,
        toSubwalletId: request.toSubwalletId,
        amount: request.amount,
        currency: request.currency,
        reference: request.reference,
      },
    );

    const transfer = response.data;
    return {
      id: transfer.id,
      type: 'internal',
      fromSubwalletId: transfer.fromSubwalletId,
      toSubwalletId: transfer.toSubwalletId,
      amount: transfer.amount,
      currency: transfer.currency,
      fee: transfer.fee,
      status: transfer.status as TransferResponse['status'],
      createdAt: transfer.createdAt,
    };
  }

  private async apiExternalTransfer(
    request: ExternalTransferRequest,
  ): Promise<TransferResponse> {
    this.logger.log(
      `External transfer: ${request.amount} ${request.currency} from ${request.subwalletId} to ${request.toAddress}`,
    );

    interface YCWithdrawal {
      id: string;
      subwalletId: string;
      toAddress: string;
      amount: number;
      currency: string;
      network: string;
      fee: number;
      status: string;
      txHash?: string;
      createdAt: string;
    }

    const response = await this.makeRequest<{ data: YCWithdrawal }>(
      'POST',
      '/business/withdrawals',
      {
        subwalletId: request.subwalletId,
        toAddress: request.toAddress,
        amount: request.amount,
        currency: request.currency,
        network: request.network,
        reference: request.reference,
      },
    );

    const withdrawal = response.data;
    return {
      id: withdrawal.id,
      type: 'external',
      fromSubwalletId: withdrawal.subwalletId,
      toAddress: withdrawal.toAddress,
      amount: withdrawal.amount,
      currency: withdrawal.currency,
      fee: withdrawal.fee,
      status: withdrawal.status as TransferResponse['status'],
      txHash: withdrawal.txHash,
      createdAt: withdrawal.createdAt,
    };
  }

  private async apiGetRate(request: RateRequest): Promise<RateResponse> {
    this.logger.debug(
      `Getting rate: ${request.amount} ${request.sourceCurrency} to ${request.targetCurrency}`,
    );

    interface YCRate {
      source: string;
      destination: string;
      buy: number;
      sell: number;
      expiresAt: string;
    }

    const response = await this.makeRequest<{ data: YCRate }>(
      'GET',
      `/business/rates?source=${request.sourceCurrency}&destination=${request.targetCurrency}`,
    );

    const rate = response.data;
    const conversionRate =
      request.sourceCurrency === 'USD' ? rate.sell : rate.buy;
    const fee = request.amount * 0.015; // 1.5% fee
    const targetAmount = (request.amount - fee) * conversionRate;

    return {
      sourceCurrency: request.sourceCurrency,
      targetCurrency: request.targetCurrency,
      rate: conversionRate,
      sourceAmount: request.amount,
      targetAmount,
      fee,
      expiresAt: rate.expiresAt,
    };
  }
}
