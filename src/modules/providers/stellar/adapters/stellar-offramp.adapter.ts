/**
 * Stellar Off-Ramp Adapter
 *
 * Implements IOffRampProvider for Stellar blockchain using SEP-24.
 * Handles USDC-to-fiat withdrawals via anchor interactive flows.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  IOffRampProvider,
  WithdrawalChannel,
  InitiateWithdrawalData,
  WithdrawalResult,
  WithdrawalStatus,
  BankDetails,
  MobileMoneyDetails,
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
 * Stellar Off-Ramp Adapter
 *
 * Provides crypto-to-fiat off-ramp via SEP-24:
 * - User initiates withdrawal
 * - User is redirected to anchor's interactive web flow
 * - User provides bank/mobile money details
 * - User sends USDC to anchor's Stellar account
 * - Anchor sends fiat to user's bank/mobile money
 *
 * Note: The anchor provides the actual fiat disbursement.
 * This adapter integrates with the anchor's SEP-24 API.
 */
@Injectable()
export class StellarOffRampAdapter implements IOffRampProvider {
  private readonly logger = new Logger(StellarOffRampAdapter.name);
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

    this.logger.log('Stellar Off-Ramp adapter initialized');
  }

  /**
   * Get available withdrawal channels from the anchor
   *
   * @param country ISO country code
   * @param _currency Optional currency filter
   * @returns Available withdrawal channels
   */
  async getChannels(
    country: string,
    _currency?: string,
  ): Promise<WithdrawalChannel[]> {
    try {
      // Get anchor's SEP-24 info
      const info = await this.sep24Service.getInfo();

      if (!info.withdraw?.USDC) {
        return [];
      }

      const usdcInfo = info.withdraw.USDC;
      if (!usdcInfo.enabled) {
        return [];
      }

      // Map anchor's withdrawal types to channels
      const channels: WithdrawalChannel[] = [];
      const types = usdcInfo.types || {};

      if (types.bank_transfer || types.wire) {
        channels.push({
          id: 'stellar-bank-transfer',
          name: 'Bank Transfer',
          type: 'bank_transfer',
          provider: 'stellar-anchor',
          country,
          currency: 'USD',
          minAmount: usdcInfo.minAmount || 20,
          maxAmount: usdcInfo.maxAmount || 10000,
          fee: usdcInfo.fee?.fixed || 1,
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
          fee: usdcInfo.fee?.fixed || 0.5,
          feeType: usdcInfo.fee?.percent ? 'percentage' : 'fixed',
          estimatedTime: '5-30 minutes',
          isActive: true,
        });
      }

      if (types.ach) {
        channels.push({
          id: 'stellar-ach',
          name: 'ACH Transfer',
          type: 'ach',
          provider: 'stellar-anchor',
          country: 'US',
          currency: 'USD',
          minAmount: usdcInfo.minAmount || 20,
          maxAmount: usdcInfo.maxAmount || 25000,
          fee: usdcInfo.fee?.fixed || 0,
          feeType: 'fixed',
          estimatedTime: '1-2 business days',
          isActive: true,
        });
      }

      // Default channel if no specific types
      if (channels.length === 0) {
        channels.push({
          id: 'stellar-default',
          name: 'Withdraw via Anchor',
          type: 'bank_transfer',
          provider: 'stellar-anchor',
          country,
          currency: 'USD',
          minAmount: usdcInfo.minAmount || 20,
          maxAmount: usdcInfo.maxAmount || 10000,
          fee: usdcInfo.fee?.fixed || 1,
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
   * Get exchange rate quote for withdrawal
   *
   * @param sourceCurrency Source crypto (USDC)
   * @param targetCurrency Target fiat currency
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
    // For USDC to USD, rate is 1:1 minus fees
    // For other currencies, would need anchor's quote API
    const rate = targetCurrency === 'USD' ? 1 : 0.95;
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
   * Initiate a withdrawal (USDC → fiat)
   *
   * This starts the SEP-24 interactive flow:
   * 1. Authenticate with the anchor via SEP-10
   * 2. Request withdrawal interactive URL
   * 3. User completes flow and sends USDC to anchor
   * 4. Anchor sends fiat to user's bank/mobile money
   *
   * @param data Withdrawal request data
   * @returns Withdrawal result with interactive URL
   */
  async initiateWithdrawal(
    data: InitiateWithdrawalData,
  ): Promise<WithdrawalResult> {
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
        data.sourceWalletId,
        sourceSecretKey,
      );

      // Step 2: Initiate SEP-24 withdrawal
      const interactiveResponse = await this.sep24Service.initiateWithdrawal({
        authToken: authToken.token,
        assetCode: 'USDC',
        account: data.sourceWalletId,
        amount: data.amount.toString(),
        lang: 'en',
        countryCode: data.metadata?.countryCode as string,
      });

      this.logger.log(
        `Withdrawal initiated: ${interactiveResponse.id} for ${data.sourceWalletId}`,
      );

      return {
        providerId: interactiveResponse.id,
        status: 'pending',
        sourceAmount: data.amount,
        sourceCurrency: 'USDC',
        targetAmount: data.amount * 0.99, // Estimate with 1% fee
        targetCurrency: data.targetCurrency,
        rate: 1,
        fee: data.amount * 0.01,
        destination: data.destination,
        reference: interactiveResponse.url, // URL for user to complete
        createdAt: new Date(),
        estimatedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    } catch (error) {
      this.logger.error(
        `Failed to initiate withdrawal: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get withdrawal status
   * @param providerWithdrawalId SEP-24 transaction ID
   * @returns Current withdrawal status
   */
  async getWithdrawalStatus(
    providerWithdrawalId: string,
  ): Promise<WithdrawalResult> {
    // Same limitation as on-ramp - need cached auth token
    return {
      providerId: providerWithdrawalId,
      status: 'pending',
      sourceAmount: 0,
      sourceCurrency: 'USDC',
      targetAmount: 0,
      targetCurrency: 'USD',
      rate: 1,
      fee: 0,
      destination: { bankName: '', accountNumber: '', accountHolderName: '' },
      reference: providerWithdrawalId,
      createdAt: new Date(),
    };
  }

  /**
   * Get withdrawal status with auth token
   *
   * @param providerWithdrawalId SEP-24 transaction ID
   * @param authToken JWT token from SEP-10
   * @returns Current withdrawal status
   */
  async getWithdrawalStatusWithAuth(
    providerWithdrawalId: string,
    authToken: string,
  ): Promise<WithdrawalResult> {
    try {
      const transaction = await this.sep24Service.getTransaction(
        providerWithdrawalId,
        authToken,
      );

      return this.mapSep24Transaction(transaction);
    } catch (error) {
      this.logger.error(
        `Failed to get withdrawal status: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Verify webhook signature
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
      | 'withdrawal.pending'
      | 'withdrawal.completed'
      | 'withdrawal.failed'
      | 'withdrawal.returned';
    withdrawalId: string;
    data: Record<string, unknown>;
  } {
    const transaction = payload.transaction as Sep24Transaction | undefined;

    if (!transaction) {
      throw new Error('Invalid webhook payload: missing transaction');
    }

    const statusMap: Record<
      string,
      | 'withdrawal.pending'
      | 'withdrawal.completed'
      | 'withdrawal.failed'
      | 'withdrawal.returned'
    > = {
      pending_user_transfer_start: 'withdrawal.pending',
      pending_external: 'withdrawal.pending',
      pending_anchor: 'withdrawal.pending',
      pending_stellar: 'withdrawal.pending',
      completed: 'withdrawal.completed',
      error: 'withdrawal.failed',
      refunded: 'withdrawal.returned',
    };

    return {
      type: statusMap[transaction.status] || 'withdrawal.pending',
      withdrawalId: transaction.id,
      data: payload,
    };
  }

  /**
   * Map SEP-24 transaction to WithdrawalResult
   */
  private mapSep24Transaction(transaction: Sep24Transaction): WithdrawalResult {
    const statusMap: Record<string, WithdrawalStatus> = {
      incomplete: 'pending',
      pending_user_transfer_start: 'pending',
      pending_user_transfer_complete: 'processing',
      pending_external: 'processing',
      pending_anchor: 'processing',
      pending_stellar: 'processing',
      pending_trust: 'pending',
      pending_user: 'pending',
      completed: 'completed',
      error: 'failed',
      refunded: 'returned',
    };

    // Extract destination from transaction if available
    const destination: BankDetails | MobileMoneyDetails = {
      bankName: '',
      accountNumber: '',
      accountHolderName: '',
    };

    return {
      providerId: transaction.id,
      status: statusMap[transaction.status] || 'pending',
      sourceAmount: parseFloat(transaction.amountIn || '0'),
      sourceCurrency: 'USDC',
      targetAmount: parseFloat(transaction.amountOut || '0'),
      targetCurrency: 'USD',
      rate: 1,
      fee: parseFloat(transaction.amountFee || '0'),
      destination,
      reference: transaction.externalTransactionId || transaction.id,
      createdAt: new Date(transaction.startedAt || Date.now()),
      estimatedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000),
      completedAt: transaction.completedAt
        ? new Date(transaction.completedAt)
        : undefined,
    };
  }
}
