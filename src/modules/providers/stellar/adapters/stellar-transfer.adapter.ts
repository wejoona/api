/**
 * Stellar Transfer Adapter
 *
 * Implements ITransferProvider for Stellar blockchain.
 * Handles USDC transfers between Stellar accounts.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ITransferProvider,
  InternalTransferData,
  ExternalTransferData,
  TransferResult,
  TransferStatus,
} from '../../interfaces';
import { StellarHorizonService } from '../services/stellar-horizon.service';
import {
  StellarConfig,
  StellarNetwork,
  StellarTransactionResult,
  StellarTransactionError,
} from '../stellar.types';

/**
 * Stellar Transfer Adapter
 *
 * Provides transfer operations via Stellar blockchain:
 * - Internal transfers: Between Stellar accounts (USDC or XLM)
 * - External transfers: Same as internal for Stellar (all on-chain)
 *
 * Key differences from Circle:
 * - All transfers are on-chain (no internal ledger)
 * - Fees are paid in XLM (not USDC)
 * - Transfers are fast (~5 second finality)
 * - Destination must have USDC trustline
 */
@Injectable()
export class StellarTransferAdapter implements ITransferProvider {
  private readonly logger = new Logger(StellarTransferAdapter.name);
  private readonly config: StellarConfig;

  readonly providerName = 'stellar';

  constructor(
    private readonly configService: ConfigService,
    private readonly horizonService: StellarHorizonService,
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

    this.logger.log('Stellar Transfer adapter initialized');
  }

  /**
   * Transfer USDC between Stellar accounts (internal)
   *
   * On Stellar, "internal" transfers are still on-chain.
   * This method requires the source account's secret key.
   *
   * @param data Transfer data including source secret key in metadata
   * @returns Transfer result with transaction hash
   */
  async internalTransfer(data: InternalTransferData): Promise<TransferResult> {
    try {
      // The source secret key should be passed in metadata
      const sourceSecretKey = data.metadata?.sourceSecretKey as
        | string
        | undefined;
      if (!sourceSecretKey) {
        throw new StellarTransactionError(
          'Source secret key required in metadata.sourceSecretKey',
          { fromWalletId: data.fromWalletId },
        );
      }

      // Verify destination account exists and has trustline
      const destAccount = await this.horizonService.getAccount(data.toWalletId);
      if (!destAccount) {
        throw new StellarTransactionError(
          'Destination account not found',
          { toWalletId: data.toWalletId },
        );
      }

      if (!destAccount.hasUsdcTrustline && data.currency === 'USDC') {
        throw new StellarTransactionError(
          'Destination account does not have USDC trustline',
          { toWalletId: data.toWalletId },
        );
      }

      // Execute the payment
      const result = await this.horizonService.sendPayment({
        sourceSecretKey,
        destinationPublicKey: data.toWalletId,
        amount: data.amount,
        assetCode: data.currency,
        assetIssuer:
          data.currency === 'USDC' ? this.config.usdcIssuer : undefined,
        memo: data.idempotencyKey.substring(0, 28), // Stellar memo max 28 chars
        memoType: 'text',
      });

      this.logger.log(
        `Transfer completed: ${data.amount} ${data.currency} from ${data.fromWalletId} to ${data.toWalletId}, tx: ${result.hash}`,
      );

      return this.mapTransactionResult(result, data);
    } catch (error) {
      this.logger.error(
        `Internal transfer failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Return failed result instead of throwing
      return {
        providerId: data.idempotencyKey,
        status: 'failed',
        amount: data.amount,
        currency: data.currency,
        fee: '0',
        fromWalletId: data.fromWalletId,
        toWalletId: data.toWalletId,
        errorCode: 'TRANSFER_FAILED',
        errorMessage:
          error instanceof Error ? error.message : 'Unknown error',
        createdAt: new Date(),
      };
    }
  }

  /**
   * Transfer USDC to an external Stellar address
   *
   * For Stellar, external and internal transfers are functionally identical
   * since all accounts are on the same network.
   *
   * @param data Transfer data
   * @returns Transfer result
   */
  async externalTransfer(data: ExternalTransferData): Promise<TransferResult> {
    try {
      // The source secret key should be passed in metadata
      const sourceSecretKey = data.metadata?.sourceSecretKey as
        | string
        | undefined;
      if (!sourceSecretKey) {
        throw new StellarTransactionError(
          'Source secret key required in metadata.sourceSecretKey',
          { fromWalletId: data.fromWalletId },
        );
      }

      // Verify destination account exists and has trustline
      const destAccount = await this.horizonService.getAccount(data.toAddress);
      if (!destAccount) {
        throw new StellarTransactionError(
          'Destination account not found on Stellar network',
          { toAddress: data.toAddress },
        );
      }

      if (!destAccount.hasUsdcTrustline && data.currency === 'USDC') {
        throw new StellarTransactionError(
          'Destination account does not have USDC trustline',
          { toAddress: data.toAddress },
        );
      }

      // Execute the payment
      const result = await this.horizonService.sendPayment({
        sourceSecretKey,
        destinationPublicKey: data.toAddress,
        amount: data.amount,
        assetCode: data.currency,
        assetIssuer:
          data.currency === 'USDC' ? this.config.usdcIssuer : undefined,
        memo: data.idempotencyKey.substring(0, 28),
        memoType: 'text',
      });

      this.logger.log(
        `External transfer completed: ${data.amount} ${data.currency} to ${data.toAddress}, tx: ${result.hash}`,
      );

      return this.mapExternalTransactionResult(result, data);
    } catch (error) {
      this.logger.error(
        `External transfer failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      return {
        providerId: data.idempotencyKey,
        status: 'failed',
        amount: data.amount,
        currency: data.currency,
        fee: '0',
        fromWalletId: data.fromWalletId,
        toAddress: data.toAddress,
        errorCode: 'TRANSFER_FAILED',
        errorMessage:
          error instanceof Error ? error.message : 'Unknown error',
        createdAt: new Date(),
      };
    }
  }

  /**
   * Get transfer status by transaction hash
   * @param providerTransferId Stellar transaction hash
   * @returns Transfer result with current status
   */
  async getTransferStatus(providerTransferId: string): Promise<TransferResult> {
    try {
      const transaction =
        await this.horizonService.getTransaction(providerTransferId);

      if (!transaction) {
        return {
          providerId: providerTransferId,
          status: 'pending',
          amount: '0',
          currency: 'USDC',
          fee: '0',
          fromWalletId: '',
          createdAt: new Date(),
        };
      }

      // Map Stellar transaction to TransferResult
      const status: TransferStatus = transaction.successful
        ? 'completed'
        : 'failed';

      return {
        providerId: transaction.transactionId,
        status,
        amount: '0', // Would need to parse operations to get amount
        currency: 'USDC',
        fee: this.stroopsToXlm(transaction.feeCharged),
        fromWalletId: '',
        txHash: transaction.hash,
        createdAt: transaction.createdAt,
        completedAt: transaction.successful ? transaction.createdAt : undefined,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get transfer status: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Estimate fee for a transfer
   *
   * Stellar fees are paid in XLM and are very low (~0.00001 XLM per operation).
   *
   * @param _data Transfer data (not used, fee is fixed)
   * @returns Estimated fee in XLM
   */
  async estimateFee(
    _data: Partial<ExternalTransferData>,
  ): Promise<{ fee: string; currency: string }> {
    // Stellar has a fixed base fee per operation
    const baseFee =
      this.configService.get<number>('stellar.baseFee') || 100; // stroops
    const feeXlm = this.stroopsToXlm(baseFee.toString());

    return {
      fee: feeXlm,
      currency: 'XLM', // Stellar fees are in XLM, not USDC
    };
  }

  /**
   * Convert stroops to XLM
   * @param stroops Amount in stroops (1 XLM = 10,000,000 stroops)
   * @returns Amount in XLM
   */
  private stroopsToXlm(stroops: string): string {
    const stroopsNum = parseInt(stroops, 10);
    return (stroopsNum / 10000000).toFixed(7);
  }

  /**
   * Map Stellar transaction result to our TransferResult format
   */
  private mapTransactionResult(
    result: StellarTransactionResult,
    data: InternalTransferData,
  ): TransferResult {
    return {
      providerId: result.transactionId,
      status: result.successful ? 'completed' : 'failed',
      amount: data.amount,
      currency: data.currency,
      fee: this.stroopsToXlm(result.feeCharged),
      fromWalletId: data.fromWalletId,
      toWalletId: data.toWalletId,
      txHash: result.hash,
      createdAt: result.createdAt,
      completedAt: result.successful ? result.createdAt : undefined,
    };
  }

  /**
   * Map Stellar transaction result for external transfer
   */
  private mapExternalTransactionResult(
    result: StellarTransactionResult,
    data: ExternalTransferData,
  ): TransferResult {
    return {
      providerId: result.transactionId,
      status: result.successful ? 'completed' : 'failed',
      amount: data.amount,
      currency: data.currency,
      fee: this.stroopsToXlm(result.feeCharged),
      fromWalletId: data.fromWalletId,
      toAddress: data.toAddress,
      txHash: result.hash,
      createdAt: result.createdAt,
      completedAt: result.successful ? result.createdAt : undefined,
    };
  }
}
