import { Injectable, Logger } from '@nestjs/common';
import { YellowCardAuthService } from './yellow-card-auth.service';
import {
  CreateSubwalletRequest,
  SubwalletResponse,
  InitiateDepositRequest,
  DepositResponse,
  InternalTransferRequest,
  ExternalTransferRequest,
  TransferResponse,
  BalanceResponse,
} from './yellow-card.types';

/**
 * Yellow Card Payments Service
 * Handles subwallets, deposits, transfers, and balances
 */
@Injectable()
export class YellowCardPaymentsService {
  private readonly logger = new Logger(YellowCardPaymentsService.name);

  constructor(private readonly authService: YellowCardAuthService) {}

  /**
   * Create a new subwallet
   */
  async createSubwallet(
    request: CreateSubwalletRequest,
  ): Promise<SubwalletResponse> {
    if (this.authService.isMockMode()) {
      return this.mockCreateSubwallet(request);
    }
    return this.apiCreateSubwallet(request);
  }

  /**
   * Get subwallet balance
   */
  async getBalance(subwalletId: string): Promise<BalanceResponse> {
    if (this.authService.isMockMode()) {
      return this.mockGetBalance(subwalletId);
    }
    return this.apiGetBalance(subwalletId);
  }

  /**
   * Initiate deposit (on-ramp)
   */
  async initiateDeposit(
    request: InitiateDepositRequest,
  ): Promise<DepositResponse> {
    if (this.authService.isMockMode()) {
      return this.mockInitiateDeposit(request);
    }
    return this.apiInitiateDeposit(request);
  }

  /**
   * Internal transfer between subwallets
   */
  async internalTransfer(
    request: InternalTransferRequest,
  ): Promise<TransferResponse> {
    if (this.authService.isMockMode()) {
      return this.mockInternalTransfer(request);
    }
    return this.apiInternalTransfer(request);
  }

  /**
   * External transfer to blockchain address
   */
  async externalTransfer(
    request: ExternalTransferRequest,
  ): Promise<TransferResponse> {
    if (this.authService.isMockMode()) {
      return this.mockExternalTransfer(request);
    }
    return this.apiExternalTransfer(request);
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
      address: `0x${this.authService.generateMockAddress()}`,
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

  // ============================================
  // REAL API IMPLEMENTATIONS
  // ============================================

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

    const response = await this.authService.makeRequest<{
      data: YCSubwalletResponse;
    }>('POST', '/business/subwallets', {
      name: request.name,
      email: request.email,
      country: request.country,
      phone: request.phone,
    });

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

    const response = await this.authService.makeRequest<{
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

    const response = await this.authService.makeRequest<{ data: YCPayment }>(
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

    const response = await this.authService.makeRequest<{ data: YCTransfer }>(
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

    const response = await this.authService.makeRequest<{ data: YCWithdrawal }>(
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
}
