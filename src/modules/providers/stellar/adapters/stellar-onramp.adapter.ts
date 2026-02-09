/**
 * Stellar On-Ramp Adapter
 *
 * Implements IOnRampProvider for Stellar blockchain using SEP-24.
 * Handles fiat-to-USDC deposits via anchor interactive flows.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  IOnRampProvider,
  PaymentChannel,
  InitiateDepositData,
  DepositResult,
  DepositStatus,
  PaymentInstructions,
} from '../../interfaces';
import { StellarSep10Service } from '../services/stellar-sep10.service';
import { StellarSep24Service } from '../services/stellar-sep24.service';
import {
  StellarConfig,
  StellarNetwork,
  Sep24Transaction,
  StellarAuthError,
} from '../stellar.types';

/**
 * Stellar On-Ramp Adapter
 *
 * Provides fiat-to-crypto on-ramp via SEP-24:
 * - User initiates deposit
 * - User is redirected to anchor's interactive web flow
 * - Anchor handles fiat collection (bank, card, mobile money)
 * - Anchor sends USDC to user's Stellar account
 *
 * Note: The anchor provides the actual payment rails.
 * This adapter integrates with the anchor's SEP-24 API.
 */
@Injectable()
export class StellarOnRampAdapter implements IOnRampProvider {
  private readonly logger = new Logger(StellarOnRampAdapter.name);
  private readonly config: StellarConfig;

  readonly providerName = 'stellar';
  readonly supportedCountries: string[] = ['US', 'CI', 'SN', 'ML', 'BF', 'GH', 'NG'];

  constructor(
    private readonly configService: ConfigService,
    private readonly sep10Service: StellarSep10Service,
    private readonly sep24Service: StellarSep24Service,
  ) {
    this.config = {
      network: (this.configService.get<string>('stellar.network') || 'testnet') as StellarNetwork,
      horizonUrl:
        this.configService.get<string>('stellar.horizonUrl') ||
        'https://horizon-testnet.stellar.org',
      usdcAssetCode:
        this.configService.get<string>('stellar.usdcAssetCode') || 'USDC',
      usdcIssuer:
        this.configService.get<string>('stellar.usdcIssuer') ||
        'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      anchorDomain: this.configService.get<string>('stellar.anchorDomain'),
      useMock: false,
    };

    this.logger.log('Stellar On-Ramp adapter initialized');
  }

  /**
   * Get available payment channels from the anchor
   *
   * Channels depend on the anchor's capabilities and the user's country.
   *
   * @param country ISO country code
   * @param _currency Optional currency filter
   * @returns Available payment channels
   */
  async getChannels(
    country: string,
    _currency?: string,
  ): Promise<PaymentChannel[]> {
    try {
      // Get anchor's SEP-24 info
      const info = await this.sep24Service.getInfo();

      if (!info.deposit?.USDC) {
        return [];
      }

      const usdcInfo = info.deposit.USDC;
      if (!usdcInfo.enabled) {
        return [];
      }

      // Map anchor's deposit types to payment channels
      const channels: PaymentChannel[] = [];
      const types = usdcInfo.types || {};

      if (types.bank_transfer || types.wire) {
        channels.push({
          id: 'stellar-bank-transfer',
          name: 'Bank Transfer',
          type: 'bank_transfer',
          provider: 'stellar-anchor',
          country,
          currency: 'USD',
          minAmount: usdcInfo.minAmount || 10,
          maxAmount: usdcInfo.maxAmount || 10000,
          fee: usdcInfo.fee?.fixed || 0,
          feeType: usdcInfo.fee?.percent ? 'percentage' : 'fixed',
          estimatedTime: '1-3 business days',
          isActive: true,
        });
      }

      if (types.mobile_money) {
        channels.push({
          id: 'stellar-mobile-money',
          name: 'Mobile Money',
          type: 'mobile_money',
          provider: 'stellar-anchor',
          country,
          currency: country === 'CI' ? 'XOF' : 'USD',
          minAmount: usdcInfo.minAmount || 5,
          maxAmount: usdcInfo.maxAmount || 5000,
          fee: usdcInfo.fee?.fixed || 0,
          feeType: usdcInfo.fee?.percent ? 'percentage' : 'fixed',
          estimatedTime: '5-30 minutes',
          isActive: true,
        });
      }

      if (types.card) {
        channels.push({
          id: 'stellar-card',
          name: 'Card Payment',
          type: 'card',
          provider: 'stellar-anchor',
          country,
          currency: 'USD',
          minAmount: usdcInfo.minAmount || 10,
          maxAmount: usdcInfo.maxAmount || 2500,
          fee: usdcInfo.fee?.fixed || 0,
          feeType: usdcInfo.fee?.percent ? 'percentage' : 'fixed',
          estimatedTime: 'Instant',
          isActive: true,
        });
      }

      // Default channel if no specific types
      if (channels.length === 0) {
        channels.push({
          id: 'stellar-default',
          name: 'Deposit via Anchor',
          type: 'bank_transfer',
          provider: 'stellar-anchor',
          country,
          currency: 'USD',
          minAmount: usdcInfo.minAmount || 10,
          maxAmount: usdcInfo.maxAmount || 10000,
          fee: usdcInfo.fee?.fixed || 0,
          feeType: 'fixed',
          estimatedTime: 'Varies',
          isActive: true,
        });
      }

      return channels;
    } catch (error) {
      this.logger.error(
        `Failed to get channels: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * Get exchange rate quote
   *
   * Note: For Stellar USDC, the rate is typically 1:1 for USD.
   * For other currencies, the anchor may provide conversion rates.
   *
   * @param sourceCurrency Source fiat currency
   * @param targetCurrency Target crypto (USDC)
   * @param amount Amount to convert
   * @returns Rate quote
   */
  async getRate(
    sourceCurrency: string,
    targetCurrency: string,
    amount: number,
  ): Promise<{
    rate: number;
    sourceAmount: number;
    targetAmount: number;
    fee: number;
    expiresAt: Date;
  }> {
    // For USD to USDC, rate is 1:1 minus fees
    // For other currencies, would need anchor's quote API
    const rate = sourceCurrency === 'USD' ? 1 : 0.95; // Simplified
    const fee = amount * 0.01; // 1% fee estimate
    const targetAmount = (amount - fee) * rate;

    return {
      rate,
      sourceAmount: amount,
      targetAmount,
      fee,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minute expiry
    };
  }

  /**
   * Initiate a deposit (fiat → USDC)
   *
   * This starts the SEP-24 interactive flow:
   * 1. Authenticate with the anchor via SEP-10
   * 2. Request deposit interactive URL
   * 3. Return URL for user to complete deposit
   *
   * @param data Deposit request data
   * @returns Deposit result with interactive URL
   */
  async initiateDeposit(data: InitiateDepositData): Promise<DepositResult> {
    try {
      // Get the source secret key for SEP-10 authentication
      const sourceSecretKey = data.metadata?.sourceSecretKey as
        | string
        | undefined;

      if (!sourceSecretKey) {
        throw new StellarAuthError(
          'Source secret key required in metadata.sourceSecretKey for SEP-10 authentication',
        );
      }

      // Step 1: Authenticate with anchor via SEP-10
      const authToken = await this.sep10Service.authenticate(
        data.destinationWalletId,
        sourceSecretKey,
      );

      // Step 2: Initiate SEP-24 deposit
      const interactiveResponse = await this.sep24Service.initiateDeposit({
        authToken: authToken.token,
        assetCode: 'USDC',
        account: data.destinationWalletId,
        amount: data.amount.toString(),
        lang: 'en',
        countryCode: data.metadata?.countryCode as string,
      });

      // Create payment instructions pointing to interactive URL
      const instructions: PaymentInstructions = {
        type: 'bank_transfer', // Default, will be determined in interactive flow
        provider: 'stellar-anchor',
        reference: interactiveResponse.id,
        instructions: `Complete your deposit at the anchor's secure website: ${interactiveResponse.url}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minute expiry
        deepLink: interactiveResponse.url,
      };

      this.logger.log(
        `Deposit initiated: ${interactiveResponse.id} for ${data.destinationWalletId}`,
      );

      return {
        providerId: interactiveResponse.id,
        status: 'awaiting_payment',
        amount: data.amount,
        sourceCurrency: data.sourceCurrency,
        targetAmount: data.amount * 0.99, // Estimate with 1% fee
        targetCurrency: data.targetCurrency,
        rate: 1,
        fee: data.amount * 0.01,
        paymentInstructions: instructions,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      };
    } catch (error) {
      this.logger.error(
        `Failed to initiate deposit: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get deposit status
   * @param providerDepositId SEP-24 transaction ID
   * @returns Current deposit status
   */
  async getDepositStatus(providerDepositId: string): Promise<DepositResult> {
    try {
      // We need an auth token to query status
      // In practice, this should be cached or passed in
      const sourceSecretKey = ''; // Would need to be provided or cached
      if (!sourceSecretKey) {
        throw new StellarAuthError(
          'Auth token required to query deposit status',
        );
      }

      // For now, return a pending status
      // Full implementation would require caching auth tokens
      return {
        providerId: providerDepositId,
        status: 'pending',
        amount: 0,
        sourceCurrency: 'USD',
        targetAmount: 0,
        targetCurrency: 'USDC',
        rate: 1,
        fee: 0,
        paymentInstructions: {
          type: 'bank_transfer',
          provider: 'stellar-anchor',
          reference: providerDepositId,
          instructions: 'Status check requires authentication',
          expiresAt: new Date(),
        },
        createdAt: new Date(),
        expiresAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get deposit status: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get deposit status with auth token
   *
   * Use this method when you have the auth token available.
   *
   * @param providerDepositId SEP-24 transaction ID
   * @param authToken JWT token from SEP-10
   * @returns Current deposit status
   */
  async getDepositStatusWithAuth(
    providerDepositId: string,
    authToken: string,
  ): Promise<DepositResult> {
    try {
      const transaction = await this.sep24Service.getTransaction(
        providerDepositId,
        authToken,
      );

      return this.mapSep24Transaction(transaction);
    } catch (error) {
      this.logger.error(
        `Failed to get deposit status: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Verify webhook signature
   *
   * Note: SEP-24 doesn't define a standard webhook format.
   * This implementation assumes HMAC-SHA256 signature.
   *
   * @param payload Raw webhook payload
   * @param signature Signature from header
   * @returns True if signature is valid
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = this.configService.get<string>('stellar.webhookSecret');
    if (!secret) {
      this.logger.warn('Webhook secret not configured');
      return false;
    }

    const hmac = crypto.createHmac('sha256', secret);
    const expectedSignature = hmac.update(payload).digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  /**
   * Parse webhook event
   *
   * @param payload Webhook payload
   * @returns Parsed event
   */
  parseWebhookEvent(payload: Record<string, unknown>): {
    type:
      | 'deposit.pending'
      | 'deposit.completed'
      | 'deposit.failed'
      | 'deposit.expired'
      | 'withdrawal.pending'
      | 'withdrawal.completed'
      | 'withdrawal.failed';
    depositId: string;
    data: Record<string, unknown>;
  } {
    const transaction = payload.transaction as Sep24Transaction | undefined;

    if (!transaction) {
      throw new Error('Invalid webhook payload: missing transaction');
    }

    const statusMap: Record<
      string,
      | 'deposit.pending'
      | 'deposit.completed'
      | 'deposit.failed'
      | 'deposit.expired'
      | 'withdrawal.pending'
      | 'withdrawal.completed'
      | 'withdrawal.failed'
    > = {
      pending_user_transfer_start: 'deposit.pending',
      pending_external: 'deposit.pending',
      pending_anchor: 'deposit.pending',
      pending_stellar: 'deposit.pending',
      completed: 'deposit.completed',
      error: 'deposit.failed',
      expired: 'deposit.expired',
    };

    const kind = transaction.kind === 'withdrawal' ? 'withdrawal' : 'deposit';
    let type = statusMap[transaction.status];

    // Adjust for withdrawal events
    if (kind === 'withdrawal') {
      type = type?.replace('deposit', 'withdrawal') as typeof type;
    }

    return {
      type: type || 'deposit.pending',
      depositId: transaction.id,
      data: payload,
    };
  }

  /**
   * Map SEP-24 transaction to DepositResult
   */
  private mapSep24Transaction(transaction: Sep24Transaction): DepositResult {
    const statusMap: Record<string, DepositStatus> = {
      incomplete: 'pending',
      pending_user_transfer_start: 'awaiting_payment',
      pending_user_transfer_complete: 'processing',
      pending_external: 'processing',
      pending_anchor: 'processing',
      pending_stellar: 'processing',
      pending_trust: 'pending',
      pending_user: 'pending',
      completed: 'completed',
      error: 'failed',
      expired: 'expired',
      refunded: 'refunded',
    };

    return {
      providerId: transaction.id,
      status: statusMap[transaction.status] || 'pending',
      amount: parseFloat(transaction.amountIn || '0'),
      sourceCurrency: 'USD',
      targetAmount: parseFloat(transaction.amountOut || '0'),
      targetCurrency: 'USDC',
      rate: 1,
      fee: parseFloat(transaction.amountFee || '0'),
      paymentInstructions: {
        type: 'bank_transfer',
        provider: 'stellar-anchor',
        reference: transaction.depositMemo || transaction.id,
        instructions: transaction.moreInfoUrl
          ? `More info: ${transaction.moreInfoUrl}`
          : 'Check anchor for payment instructions',
        expiresAt: new Date(),
      },
      createdAt: new Date(transaction.startedAt || Date.now()),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      completedAt: transaction.completedAt
        ? new Date(transaction.completedAt)
        : undefined,
    };
  }
}
