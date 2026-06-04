import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IPaymentGateway,
  CreateSubwalletRequest,
  Subwallet,
  BalanceResponse,
  OnRampChannel,
  InitiateDepositRequest,
  DepositResponse,
  InternalTransferRequest,
  ExternalTransferRequest,
  TransferResponse,
  RateRequest,
  RateResponse,
  PaymentInstructions,
  SubmitKycRequest,
  KycResponse,
  WebhookEvent,
  WebhookEventType,
} from '../../../domain/gateways/payment.gateway';
import * as crypto from 'crypto';

interface YellowCardConfig {
  apiUrl: string;
  apiKey: string;
  secretKey: string;
  webhookSecret: string;
  useMock: boolean;
}

@Injectable()
export class YellowCardPaymentAdapter implements IPaymentGateway {
  private readonly logger = new Logger(YellowCardPaymentAdapter.name);
  private readonly config: YellowCardConfig;

  readonly providerName = 'yellow_card';

  constructor(private readonly configService: ConfigService) {
    this.config = {
      apiUrl:
        this.configService.get<string>('yellowCard.apiUrl') ||
        'https://sandbox.yellowcard.io',
      apiKey: this.configService.get<string>('yellowCard.apiKey') || '',
      secretKey: this.configService.get<string>('yellowCard.secretKey') || '',
      webhookSecret:
        this.configService.get<string>('yellowCard.webhookSecret') || '',
      useMock: this.configService.get<boolean>('yellowCard.useMock') ?? true,
    };

    if (this.config.useMock) {
      this.logger.warn('Payment Gateway running in MOCK mode (Yellow Card)');
    }
  }

  // ============================================
  // SUBWALLET OPERATIONS
  // ============================================

  async createSubwallet(request: CreateSubwalletRequest): Promise<Subwallet> {
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

  // ============================================
  // ON-RAMP (DEPOSITS)
  // ============================================

  async getOnRampChannels(
    country: string,
    currency?: string,
  ): Promise<OnRampChannel[]> {
    if (this.config.useMock) {
      return this.mockGetOnRampChannels(country, currency);
    }
    return this.apiGetOnRampChannels(country, currency);
  }

  async initiateDeposit(
    request: InitiateDepositRequest,
  ): Promise<DepositResponse> {
    if (this.config.useMock) {
      return this.mockInitiateDeposit(request);
    }
    return this.apiInitiateDeposit(request);
  }

  async getDepositStatus(depositId: string): Promise<DepositResponse> {
    if (this.config.useMock) {
      return this.mockGetDepositStatus(depositId);
    }
    return this.apiGetDepositStatus(depositId);
  }

  // ============================================
  // TRANSFERS
  // ============================================

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

  async getTransferStatus(transferId: string): Promise<TransferResponse> {
    if (this.config.useMock) {
      return this.mockGetTransferStatus(transferId);
    }
    return this.apiGetTransferStatus(transferId);
  }

  // ============================================
  // RATES
  // ============================================

  async getRate(request: RateRequest): Promise<RateResponse> {
    if (this.config.useMock) {
      return this.mockGetRate(request);
    }
    return this.apiGetRate(request);
  }

  // ============================================
  // KYC
  // ============================================

  async submitKyc(request: SubmitKycRequest): Promise<KycResponse> {
    if (this.config.useMock) {
      return this.mockSubmitKyc(request);
    }
    return this.apiSubmitKyc(request);
  }

  async getKycStatus(subwalletId: string): Promise<KycResponse> {
    if (this.config.useMock) {
      return this.mockGetKycStatus(subwalletId);
    }
    return this.apiGetKycStatus(subwalletId);
  }

  // ============================================
  // WEBHOOKS
  // ============================================

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (this.config.useMock) {
      return true;
    }
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex');
    return signature === expectedSignature;
  }

  parseWebhookEvent(payload: Record<string, unknown>): WebhookEvent {
    // Map Yellow Card webhook format to our generic format
    // referenceId is the ID of the actual resource (deposit, transfer, etc.)
    // externalId is Yellow Card's event ID
    return {
      id: payload.id as string,
      type: this.mapWebhookEventType(payload.type as string),
      referenceId:
        (payload.referenceId as string) ||
        (payload.resourceId as string) ||
        (payload.id as string),
      externalId: payload.id as string,
      data: (payload.data as Record<string, unknown>) || payload,
      createdAt: new Date((payload.createdAt as string) || Date.now()),
    };
  }

  private mapWebhookEventType(ycType: string): WebhookEventType {
    const mapping: Record<string, WebhookEventType> = {
      'payment.pending': 'deposit.pending',
      'payment.completed': 'deposit.completed',
      'payment.failed': 'deposit.failed',
      'transfer.pending': 'transfer.pending',
      'transfer.completed': 'transfer.completed',
      'transfer.failed': 'transfer.failed',
      'kyc.approved': 'kyc.approved',
      'kyc.rejected': 'kyc.rejected',
    };
    return mapping[ycType] || (ycType as WebhookEventType);
  }

  // ============================================
  // MOCK IMPLEMENTATIONS
  // ============================================

  private mockCreateSubwallet(request: CreateSubwalletRequest): Subwallet {
    const id = `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      id,
      externalId: `yc_${id}`,
      userId: request.userId,
      address: `0x${this.generateMockAddress()}`,
      currency: 'USDC',
      createdAt: new Date(),
    };
  }

  private mockGetBalance(subwalletId: string): BalanceResponse {
    return {
      subwalletId,
      balances: [
        { currency: 'USD', available: 100.0, pending: 0, total: 100.0 },
        { currency: 'USDC', available: 100.0, pending: 0, total: 100.0 },
      ],
    };
  }

  private mockGetOnRampChannels(
    country: string,

    currency?: string,
  ): OnRampChannel[] {
    const normalizedCountry = country.trim().toUpperCase();
    const normalizedCurrency = currency?.trim().toUpperCase();
    const channels: OnRampChannel[] = [];

    if (normalizedCountry === 'CI') {
      channels.push(
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
          currency: 'XOF',
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
          currency: 'XOF',
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
          currency: 'XOF',
        },
      );
    }

    if (normalizedCountry === 'US') {
      channels.push({
        id: 'usdc_crypto_us',
        name: 'USDC Transfer',
        type: 'crypto',
        provider: 'usdc',
        country: 'US',
        minAmount: 1,
        maxAmount: 100000,
        fee: 0,
        feeType: 'fixed',
        currency: 'USD',
      });
    }

    return normalizedCurrency
      ? channels.filter((channel) => channel.currency === normalizedCurrency)
      : channels;
  }

  private mockInitiateDeposit(
    request: InitiateDepositRequest,
  ): DepositResponse {
    const id = `dep_${Date.now()}`;
    const sourceCurrency = request.sourceCurrency.trim().toUpperCase();
    const targetCurrency = (request.targetCurrency || 'USDC')
      .trim()
      .toUpperCase();
    const isUsdStablecoinDeposit =
      sourceCurrency === 'USD' && targetCurrency === 'USDC';
    const rate = isUsdStablecoinDeposit ? 1 : 0.00166; // XOF to USDC fallback
    const fee = isUsdStablecoinDeposit ? 0 : request.amount * 0.015;
    const reference = `DEP-${id.slice(-8).toUpperCase()}`;
    const paymentInstructions: PaymentInstructions = isUsdStablecoinDeposit
      ? {
          type: 'crypto',
          provider: 'usdc',
          accountNumber: '0x0000000000000000000000000000000000000000',
          accountName: 'Korido USDC Omnibus',
          reference,
          instructions: `Send ${request.amount} USD-equivalent USDC using reference ${reference}.`,
        }
      : {
          type: 'mobile_money',
          provider: 'orange',
          accountNumber: '+2250700000000',
          accountName: 'USD Wallet',
          reference,
          instructions: `Send ${request.amount} ${request.sourceCurrency} to the number above with reference ${reference}`,
        };

    return {
      id,
      externalId: `yc_${id}`,
      subwalletId: request.subwalletId,
      amount: request.amount,
      sourceCurrency,
      targetCurrency,
      rate,
      fee,
      status: 'pending',
      paymentInstructions,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    };
  }

  private mockGetDepositStatus(depositId: string): DepositResponse {
    return {
      id: depositId,
      externalId: `yc_${depositId}`,
      subwalletId: 'mock_wallet',
      amount: 10000,
      sourceCurrency: 'XOF',
      targetCurrency: 'USD',
      rate: 0.00166,
      fee: 150,
      status: 'pending',
      paymentInstructions: {
        type: 'mobile_money',
        provider: 'orange',
        reference: `DEP-${depositId.slice(-8).toUpperCase()}`,
        instructions: 'Payment instructions',
      },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    };
  }

  private mockInternalTransfer(
    request: InternalTransferRequest,
  ): TransferResponse {
    const id = `txn_${Date.now()}`;
    return {
      id,
      externalId: `yc_${id}`,
      type: 'internal',
      fromSubwalletId: request.fromSubwalletId,
      toSubwalletId: request.toSubwalletId,
      amount: request.amount,
      currency: request.currency,
      fee: 0,
      status: 'completed', // Internal transfers are instant
      createdAt: new Date(),
    };
  }

  private mockExternalTransfer(
    request: ExternalTransferRequest,
  ): TransferResponse {
    const id = `txn_${Date.now()}`;
    return {
      id,
      externalId: `yc_${id}`,
      type: 'external',
      fromSubwalletId: request.subwalletId,
      toAddress: request.toAddress,
      amount: request.amount,
      currency: request.currency,
      fee: 1.0,
      status: 'pending',
      createdAt: new Date(),
    };
  }

  private mockGetTransferStatus(transferId: string): TransferResponse {
    return {
      id: transferId,
      externalId: `yc_${transferId}`,
      type: 'external',
      fromSubwalletId: 'mock_wallet',
      toAddress: '0x...',
      amount: 50,
      currency: 'USD',
      fee: 1.0,
      status: 'pending',
      createdAt: new Date(),
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
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    };
  }

  private mockSubmitKyc(request: SubmitKycRequest): KycResponse {
    return {
      id: `kyc_${Date.now()}`,
      subwalletId: request.subwalletId,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private mockGetKycStatus(subwalletId: string): KycResponse {
    return {
      id: `kyc_${subwalletId}`,
      subwalletId,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
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
  // REAL API IMPLEMENTATIONS (TODO when keys available)
  // ============================================

  private apiCreateSubwallet(
    _request: CreateSubwalletRequest,
  ): Promise<Subwallet> {
    return Promise.reject(
      new Error(
        'Real Yellow Card API not implemented. Set YELLOW_CARD_USE_MOCK=true',
      ),
    );
  }

  private apiGetBalance(_subwalletId: string): Promise<BalanceResponse> {
    return Promise.reject(new Error('Real Yellow Card API not implemented'));
  }

  private apiGetOnRampChannels(
    _country: string,
    _currency?: string,
  ): Promise<OnRampChannel[]> {
    return Promise.reject(new Error('Real Yellow Card API not implemented'));
  }

  private apiInitiateDeposit(
    _request: InitiateDepositRequest,
  ): Promise<DepositResponse> {
    return Promise.reject(new Error('Real Yellow Card API not implemented'));
  }

  private apiGetDepositStatus(_depositId: string): Promise<DepositResponse> {
    return Promise.reject(new Error('Real Yellow Card API not implemented'));
  }

  private apiInternalTransfer(
    _request: InternalTransferRequest,
  ): Promise<TransferResponse> {
    return Promise.reject(new Error('Real Yellow Card API not implemented'));
  }

  private apiExternalTransfer(
    _request: ExternalTransferRequest,
  ): Promise<TransferResponse> {
    return Promise.reject(new Error('Real Yellow Card API not implemented'));
  }

  private apiGetTransferStatus(_transferId: string): Promise<TransferResponse> {
    return Promise.reject(new Error('Real Yellow Card API not implemented'));
  }

  private apiGetRate(_request: RateRequest): Promise<RateResponse> {
    return Promise.reject(new Error('Real Yellow Card API not implemented'));
  }

  private apiSubmitKyc(_request: SubmitKycRequest): Promise<KycResponse> {
    return Promise.reject(new Error('Real Yellow Card API not implemented'));
  }

  private apiGetKycStatus(_subwalletId: string): Promise<KycResponse> {
    return Promise.reject(new Error('Real Yellow Card API not implemented'));
  }
}
