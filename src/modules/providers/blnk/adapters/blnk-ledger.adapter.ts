import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlnkInit } from '@blnkfinance/blnk-typescript';
import type { Blnk } from '@blnkfinance/blnk-typescript/dist/src/blnk/endpoints/baseBlnkClient';
import {
  ILedgerProvider,
  UserBalanceInfo,
  RecordDepositParams,
  RecordWithdrawalParams,
  RecordP2PTransferParams,
  RecordExternalTransferParams,
  TransactionHistoryOptions,
  LedgerTransactionResult,
} from '@modules/providers/interfaces';
import {
  JOONAPAY_LEDGERS,
  JOONAPAY_INTERNAL_BALANCES,
  BlnkTransactionStatus,
} from '../blnk.types';
import { BlnkSearchAdapter } from './blnk-search.adapter';

// Blnk API Response wrapper
interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

// Blnk response types
interface BlnkLedgerResponse {
  ledger_id: string;
  name: string;
  created_at: string;
  meta_data?: Record<string, unknown>;
}

interface BlnkBalanceResponse {
  balance_id: string;
  balance: number;
  credit_balance: number;
  debit_balance: number;
  inflight_balance: number;
  inflight_credit_balance: number;
  inflight_debit_balance: number;
  currency: string;
  ledger_id: string;
  identity_id?: string;
  precision: number;
  created_at: string;
  meta_data?: Record<string, unknown>;
}

interface BlnkTransactionResponse {
  transaction_id: string;
  source: string;
  destination: string;
  reference: string;
  amount: number;
  precise_amount: number;
  precision: number;
  currency: string;
  description?: string;
  status: BlnkTransactionStatus;
  created_at: string;
  meta_data?: Record<string, unknown>;
  parent_transaction?: string;
}

/**
 * Blnk Finance Ledger Adapter
 *
 * Implements the ledger provider interface using Blnk Finance.
 * Blnk is an open-source financial ledger database that provides
 * double-entry accounting for fintech products.
 *
 * JoonaPay Ledger Architecture:
 * - General Ledger: System accounts (@PayIn*, @PayOut*, @Fees, @Revenue)
 * - Customer Wallets Ledger: User USDC balances
 *
 * @see https://docs.blnkfinance.com/
 */
@Injectable()
export class BlnkLedgerAdapter implements ILedgerProvider, OnModuleInit {
  private readonly logger = new Logger(BlnkLedgerAdapter.name);
  private client: Blnk;
  private generalLedgerId: string | null = null;
  private customerWalletsLedgerId: string | null = null;

  // USDC precision: 6 decimal places (1 USDC = 1,000,000 micro-USDC)
  private readonly USDC_PRECISION = 1000000;

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => BlnkSearchAdapter))
    private readonly searchAdapter: BlnkSearchAdapter,
  ) {
    const blnkUrl = this.configService.get<string>(
      'blnk.url',
      'http://localhost:5001',
    );
    const blnkApiKey = this.configService.get<string>('blnk.apiKey', '');

    this.client = BlnkInit(blnkApiKey, {
      baseUrl: blnkUrl,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  // ==========================================
  // Initialization
  // ==========================================

  async initialize(): Promise<void> {
    this.logger.log('Initializing Blnk ledger...');

    try {
      // Create or get the General Ledger
      this.generalLedgerId = await this.getOrCreateLedger(
        JOONAPAY_LEDGERS.GENERAL,
        { description: 'JoonaPay General Ledger - System accounts' },
      );

      // Create or get the Customer Wallets Ledger
      this.customerWalletsLedgerId = await this.getOrCreateLedger(
        JOONAPAY_LEDGERS.CUSTOMER_WALLETS,
        { description: 'JoonaPay Customer Wallets - User USDC balances' },
      );

      this.logger.log('Blnk ledger initialized successfully');
      this.logger.log(`General Ledger ID: ${this.generalLedgerId}`);
      this.logger.log(
        `Customer Wallets Ledger ID: ${this.customerWalletsLedgerId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to initialize Blnk ledger: ${errorMessage}`);
      throw error;
    }
  }

  private async getOrCreateLedger(
    name: string,
    metaData: Record<string, unknown>,
  ): Promise<string> {
    try {
      const response = (await this.client.Ledgers.create({
        name,
        meta_data: metaData,
      })) as ApiResponse<BlnkLedgerResponse | null>;

      if (response.data) {
        return response.data.ledger_id;
      }
      throw new Error('Failed to create ledger');
    } catch {
      // If ledger already exists, use the name as identifier
      this.logger.warn(
        `Ledger ${name} may already exist, using name as identifier`,
      );
      return name;
    }
  }

  // ==========================================
  // Balance Management
  // ==========================================

  async createUserBalance(userId: string, currency: string): Promise<string> {
    if (!this.customerWalletsLedgerId) {
      throw new Error('Ledger not initialized');
    }

    this.logger.log(`Creating balance for user ${userId} in ${currency}`);

    const response = (await this.client.LedgerBalances.create({
      ledger_id: this.customerWalletsLedgerId,
      currency,
      meta_data: {
        user_id: userId,
        type: 'customer_wallet',
        created_by: 'joonapay',
      },
    })) as unknown as ApiResponse<BlnkBalanceResponse | null>;

    if (!response.data) {
      throw new Error('Failed to create balance');
    }

    this.logger.log(
      `Created balance ${response.data.balance_id} for user ${userId}`,
    );
    return response.data.balance_id;
  }

  async getUserBalance(
    userId: string,
    currency: string,
  ): Promise<UserBalanceInfo | null> {
    try {
      const balanceId = this.getUserBalanceId(userId, currency);
      const response = (await this.client.LedgerBalances.get(
        balanceId,
      )) as ApiResponse<BlnkBalanceResponse | null>;

      if (!response.data) {
        return null;
      }

      const balance = response.data;
      return {
        balanceId: balance.balance_id,
        userId,
        currency: balance.currency,
        balance: this.toBigInt(balance.balance),
        creditBalance: this.toBigInt(balance.credit_balance),
        debitBalance: this.toBigInt(balance.debit_balance),
        inflightBalance: this.toBigInt(balance.inflight_balance),
        availableBalance: this.toBigInt(
          balance.balance - balance.inflight_debit_balance,
        ),
      };
    } catch {
      this.logger.warn(`Balance not found for user ${userId}`);
      return null;
    }
  }

  async getAvailableBalance(userId: string, currency: string): Promise<bigint> {
    const balance = await this.getUserBalance(userId, currency);
    return balance?.availableBalance ?? BigInt(0);
  }

  // ==========================================
  // Transaction Recording
  // ==========================================

  async recordDeposit(
    params: RecordDepositParams,
  ): Promise<LedgerTransactionResult> {
    const {
      userId,
      amount,
      currency,
      reference,
      description,
      provider,
      externalId,
      fee,
      metadata,
    } = params;

    this.logger.log(
      `Recording deposit: ${amount} ${currency} for user ${userId}`,
    );

    // Determine the pay-in source based on provider
    const source =
      provider === 'yellowcard'
        ? JOONAPAY_INTERNAL_BALANCES.PAY_IN_YELLOWCARD
        : JOONAPAY_INTERNAL_BALANCES.PAY_IN_CIRCLE;

    const destination = this.getUserBalanceId(userId, currency);

    // Record the main deposit transaction
    const response = (await this.client.Transactions.create({
      amount: this.toFloat(amount),
      reference,
      currency,
      precision: this.USDC_PRECISION,
      source,
      destination,
      description: description || `Deposit via ${provider}`,
      allow_overdraft: true,
      meta_data: {
        type: 'deposit',
        provider,
        external_id: externalId,
        user_id: userId,
        ...metadata,
      },
    })) as unknown as ApiResponse<BlnkTransactionResponse | null>;

    // Record fee transaction if applicable
    if (fee && fee > BigInt(0)) {
      await this.recordFeeTransaction(
        destination,
        fee,
        currency,
        `${reference}-fee`,
        `Deposit fee for ${reference}`,
      );
    }

    if (!response.data) {
      throw new Error('Failed to record deposit transaction');
    }

    return this.mapTransactionResult(response.data);
  }

  async recordWithdrawal(
    params: RecordWithdrawalParams,
  ): Promise<LedgerTransactionResult> {
    const {
      userId,
      amount,
      currency,
      reference,
      description,
      provider,
      fee,
      inflight,
      metadata,
    } = params;

    this.logger.log(
      `Recording withdrawal: ${amount} ${currency} for user ${userId}`,
    );

    const source = this.getUserBalanceId(userId, currency);

    // Determine the pay-out destination based on provider
    const destination =
      provider === 'yellowcard'
        ? JOONAPAY_INTERNAL_BALANCES.PAY_OUT_YELLOWCARD
        : JOONAPAY_INTERNAL_BALANCES.PAY_OUT_CIRCLE;

    // First, deduct the fee from user's balance
    if (fee > BigInt(0)) {
      await this.recordFeeTransaction(
        source,
        fee,
        currency,
        `${reference}-fee`,
        `Withdrawal fee for ${reference}`,
      );
    }

    // Record the main withdrawal transaction
    const response = (await this.client.Transactions.create({
      amount: this.toFloat(amount),
      reference,
      currency,
      precision: this.USDC_PRECISION,
      source,
      destination,
      description: description || `Withdrawal via ${provider}`,
      inflight: inflight ?? true,
      allow_overdraft: true,
      meta_data: {
        type: 'withdrawal',
        provider,
        user_id: userId,
        fee: fee.toString(),
        ...metadata,
      },
    })) as unknown as ApiResponse<BlnkTransactionResponse | null>;

    if (!response.data) {
      throw new Error('Failed to record withdrawal transaction');
    }

    return this.mapTransactionResult(response.data);
  }

  async recordP2PTransfer(
    params: RecordP2PTransferParams,
  ): Promise<LedgerTransactionResult> {
    const {
      senderId,
      recipientId,
      amount,
      currency,
      reference,
      description,
      note,
      metadata,
    } = params;

    this.logger.log(
      `Recording P2P transfer: ${amount} ${currency} from ${senderId} to ${recipientId}`,
    );

    const source = this.getUserBalanceId(senderId, currency);
    const destination = this.getUserBalanceId(recipientId, currency);

    // P2P transfers are instant and free
    const response = (await this.client.Transactions.create({
      amount: this.toFloat(amount),
      reference,
      currency,
      precision: this.USDC_PRECISION,
      source,
      destination,
      description: description || `P2P transfer${note ? `: ${note}` : ''}`,
      meta_data: {
        type: 'transfer_p2p',
        sender_id: senderId,
        recipient_id: recipientId,
        note,
        ...metadata,
      },
    })) as unknown as ApiResponse<BlnkTransactionResponse | null>;

    if (!response.data) {
      throw new Error('Failed to record P2P transfer');
    }

    return this.mapTransactionResult(response.data);
  }

  async recordExternalTransfer(
    params: RecordExternalTransferParams,
  ): Promise<LedgerTransactionResult> {
    const {
      userId,
      amount,
      currency,
      reference,
      destinationAddress,
      blockchain,
      fee,
      inflight,
      description,
      metadata,
    } = params;

    this.logger.log(
      `Recording external transfer: ${amount} ${currency} from ${userId} to ${destinationAddress}`,
    );

    const source = this.getUserBalanceId(userId, currency);
    const destination = JOONAPAY_INTERNAL_BALANCES.PAY_OUT_CIRCLE;

    // Deduct fee first
    if (fee > BigInt(0)) {
      await this.recordFeeTransaction(
        source,
        fee,
        currency,
        `${reference}-fee`,
        `External transfer fee for ${reference}`,
      );
    }

    // Record the main transfer transaction
    const response = (await this.client.Transactions.create({
      amount: this.toFloat(amount),
      reference,
      currency,
      precision: this.USDC_PRECISION,
      source,
      destination,
      description:
        description ||
        `External transfer to ${destinationAddress.slice(0, 10)}...`,
      inflight: inflight ?? true,
      allow_overdraft: true,
      meta_data: {
        type: 'transfer_external',
        user_id: userId,
        destination_address: destinationAddress,
        blockchain,
        fee: fee.toString(),
        ...metadata,
      },
    })) as unknown as ApiResponse<BlnkTransactionResponse | null>;

    if (!response.data) {
      throw new Error('Failed to record external transfer');
    }

    return this.mapTransactionResult(response.data);
  }

  // ==========================================
  // Transaction Lifecycle
  // ==========================================

  async commitTransaction(transactionId: string): Promise<void> {
    this.logger.log(`Committing transaction ${transactionId}`);

    await this.client.Transactions.updateStatus(transactionId, {
      status: 'commit',
    });
  }

  async voidTransaction(transactionId: string): Promise<void> {
    this.logger.log(`Voiding transaction ${transactionId}`);

    await this.client.Transactions.updateStatus(transactionId, {
      status: 'void',
    });
  }

  async getTransactionByReference(
    reference: string,
  ): Promise<LedgerTransactionResult | null> {
    this.logger.debug(`Looking up transaction by reference: ${reference}`);

    try {
      const result = await this.searchAdapter.searchTransactions({
        query: reference,
        filterBy: `reference:=${reference}`,
        perPage: 1,
      });

      if (result.found > 0 && result.hits.length > 0) {
        this.logger.debug(`Found transaction for reference: ${reference}`);
        return result.hits[0];
      }

      this.logger.debug(`No transaction found for reference: ${reference}`);
      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to search for transaction by reference ${reference}: ${errorMessage}`,
      );
      return null;
    }
  }

  // ==========================================
  // History & Reporting
  // ==========================================

  async getUserTransactionHistory(
    userId: string,
    options?: TransactionHistoryOptions,
  ): Promise<LedgerTransactionResult[]> {
    this.logger.debug(`Fetching transaction history for user: ${userId}`);

    try {
      const balanceId = this.getUserBalanceId(userId, 'USD');

      // Build filter for transactions involving this user's balance
      let filterBy = `source:=${balanceId} || destination:=${balanceId}`;

      if (options?.type) {
        filterBy += ` && meta_data.type:=${options.type}`;
      }

      if (options?.startDate) {
        filterBy += ` && created_at:>=${options.startDate.getTime()}`;
      }

      if (options?.endDate) {
        filterBy += ` && created_at:<=${options.endDate.getTime()}`;
      }

      // Convert offset to page number (page = offset / limit + 1)
      const limit = options?.limit || 50;
      const offset = options?.offset || 0;
      const page = Math.floor(offset / limit) + 1;

      const result = await this.searchAdapter.searchTransactions({
        query: '*',
        filterBy,
        sortBy: 'created_at:desc',
        page,
        perPage: limit,
      });

      return result.hits;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to fetch transaction history for user ${userId}: ${errorMessage}`,
      );
      return [];
    }
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  private getUserBalanceId(userId: string, currency: string): string {
    // In production, this would be a lookup in your database
    // For now, use a deterministic naming pattern
    return `user-${userId}-${currency.toLowerCase()}`;
  }

  private async recordFeeTransaction(
    source: string,
    amount: bigint,
    currency: string,
    reference: string,
    description: string,
  ): Promise<void> {
    await this.client.Transactions.create({
      amount: this.toFloat(amount),
      reference,
      currency,
      precision: this.USDC_PRECISION,
      source,
      destination: JOONAPAY_INTERNAL_BALANCES.FEES,
      description,
      meta_data: {
        type: 'fee',
      },
    });
  }

  private toBigInt(value: number): bigint {
    return BigInt(Math.round(value));
  }

  private toFloat(value: bigint): number {
    return Number(value) / this.USDC_PRECISION;
  }

  private mapTransactionResult(
    response: BlnkTransactionResponse,
  ): LedgerTransactionResult {
    return {
      transactionId: response.transaction_id,
      reference: response.reference,
      status: this.mapStatus(response.status),
      source: response.source,
      destination: response.destination,
      amount: BigInt(response.precise_amount),
      currency: response.currency,
      description: response.description,
      createdAt: new Date(response.created_at),
      metadata: response.meta_data,
    };
  }

  private mapStatus(
    status: BlnkTransactionStatus,
  ): 'queued' | 'applied' | 'rejected' | 'inflight' | 'void' | 'committed' {
    const statusMap: Record<BlnkTransactionStatus, string> = {
      QUEUED: 'queued',
      APPLIED: 'applied',
      REJECTED: 'rejected',
      INFLIGHT: 'inflight',
      VOID: 'void',
      COMMIT: 'committed',
    };
    return statusMap[status] as
      | 'queued'
      | 'applied'
      | 'rejected'
      | 'inflight'
      | 'void'
      | 'committed';
  }
}
