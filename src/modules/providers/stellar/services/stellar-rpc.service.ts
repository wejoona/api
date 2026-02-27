/**
 * Stellar RPC Service
 *
 * Implements the StellarAdapter interface using Soroban RPC.
 * This is the recommended backend for SCF reviewers and is the
 * default provider when STELLAR_PROVIDER is not set.
 *
 * Key differences from Horizon:
 * - Uses `rpc.Server` instead of `Horizon.Server`
 * - Transaction submission is async: submit → poll `getTransaction`
 * - Account loading via `getAccount` (not `loadAccount`)
 * - Balance queries via `getLedgerEntries` for contract data
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';
import { StellarAdapter } from './stellar-adapter.interface';
import {
  StellarConfig,
  StellarNetwork,
  StellarAccount,
  StellarBalance,
  StellarKeyPair,
  StellarTransactionRequest,
  StellarTransactionResult,
  StellarNetworkError,
  StellarTransactionError,
  TESTNET_PASSPHRASE,
  MAINNET_PASSPHRASE,
  MINIMUM_XLM_BALANCE,
} from '../stellar.types';

const { Keypair, Asset, TransactionBuilder, Operation, rpc, xdr } = StellarSdk;

/** Maximum number of polls when waiting for transaction confirmation */
const MAX_POLL_ATTEMPTS = 30;

/** Initial delay between polls in milliseconds */
const INITIAL_POLL_DELAY_MS = 1000;

/** Maximum delay between polls in milliseconds */
const MAX_POLL_DELAY_MS = 5000;

/**
 * Stellar RPC Service
 *
 * Provides low-level access to the Stellar network via Soroban RPC.
 * Handles:
 * - Account creation and management
 * - Balance queries
 * - Transaction building and submission (with async polling)
 * - Trustline operations
 */
@Injectable()
export class StellarRpcService implements StellarAdapter, OnModuleInit {
  private readonly logger = new Logger(StellarRpcService.name);
  private server!: StellarSdk.rpc.Server;
  private networkPassphrase!: string;
  private readonly config: StellarConfig;
  private usdcAsset!: StellarSdk.Asset;
  private readonly rpcUrl: string;

  constructor(private readonly configService: ConfigService) {
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
      useMock: this.configService.get<boolean>('stellar.useMock') ?? false,
    };

    this.rpcUrl =
      this.configService.get<string>('stellar.rpcUrl') ||
      (this.config.network === 'mainnet'
        ? 'https://soroban.stellar.org'
        : 'https://soroban-testnet.stellar.org');
  }

  /**
   * Initialize the RPC server connection
   */
  onModuleInit(): void {
    this.server = new rpc.Server(this.rpcUrl);
    this.networkPassphrase =
      this.config.network === 'mainnet'
        ? MAINNET_PASSPHRASE
        : TESTNET_PASSPHRASE;
    this.usdcAsset = new Asset(
      this.config.usdcAssetCode,
      this.config.usdcIssuer,
    );

    this.logger.log(
      `Stellar RPC service initialized (network: ${this.config.network}, rpcUrl: ${this.rpcUrl})`,
    );
  }

  /**
   * Generate a new Stellar keypair
   * @returns A new keypair with public and secret keys
   */
  generateKeypair(): StellarKeyPair {
    const keypair = Keypair.random();
    return {
      publicKey: keypair.publicKey(),
      secretKey: keypair.secret(),
    };
  }

  /**
   * Get keypair from secret key
   * @param secretKey The account's secret key
   * @returns Keypair object
   */
  keypairFromSecret(secretKey: string): StellarSdk.Keypair {
    return Keypair.fromSecret(secretKey);
  }

  /**
   * Get the Stellar account information via RPC.
   *
   * RPC's `getAccount` only returns an Account object for transaction
   * building (accountId + sequence). To get balances we query the
   * account's ledger entry via `getLedgerEntries` and decode the XDR.
   *
   * @param publicKey The account's public key
   * @returns Account information or null if not found
   */
  async getAccount(publicKey: string): Promise<StellarAccount | null> {
    try {
      // Build ledger key for the account
      const accountId = Keypair.fromPublicKey(publicKey);
      const accountKey = xdr.LedgerKey.account(
        new xdr.LedgerKeyAccount({
          accountId: accountId.xdrPublicKey(),
        }),
      );

      // Also query USDC trustline
      const usdcTrustlineKey = xdr.LedgerKey.trustline(
        new xdr.LedgerKeyTrustLine({
          accountId: accountId.xdrPublicKey(),
          asset: this.usdcAsset.toTrustLineXDRObject(),
        }),
      );

      const response = await this.server.getLedgerEntries(
        accountKey,
        usdcTrustlineKey,
      );

      if (!response.entries || response.entries.length === 0) {
        return null;
      }

      const balances: StellarBalance[] = [];
      let sequence = '0';
      let hasUsdcTrustline = false;

      for (const entry of response.entries) {
        const ledgerEntryData = entry.val;
        const switchName = ledgerEntryData.switch().name;

        if (switchName === 'account') {
          const accountEntry = ledgerEntryData.account();
          sequence = accountEntry.seqNum().toString();

          // Extract native XLM balance (in stroops, convert to lumens)
          const xlmStroops = accountEntry.balance().toString();
          const xlmBalance = (BigInt(xlmStroops) / BigInt(10000000)).toString() +
            '.' +
            (BigInt(xlmStroops) % BigInt(10000000)).toString().padStart(7, '0');

          balances.push({
            assetType: 'native',
            assetCode: 'XLM',
            assetIssuer: null,
            balance: xlmBalance,
            buyingLiabilities: '0',
            sellingLiabilities: '0',
          });
        } else if (switchName === 'trustline') {
          const trustlineEntry = ledgerEntryData.trustLine();
          const balanceStroops = trustlineEntry.balance().toString();
          const balance = (BigInt(balanceStroops) / BigInt(10000000)).toString() +
            '.' +
            (BigInt(balanceStroops) % BigInt(10000000)).toString().padStart(7, '0');

          balances.push({
            assetType: 'credit_alphanum4',
            assetCode: this.config.usdcAssetCode,
            assetIssuer: this.config.usdcIssuer,
            balance,
            buyingLiabilities: '0',
            sellingLiabilities: '0',
          });
          hasUsdcTrustline = true;
        }
      }

      return {
        accountId: publicKey,
        sequence,
        balances,
        hasUsdcTrustline,
        status: 'active',
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const isNotFound =
        msg.includes('404') || msg.includes('not found') || msg.includes('Not Found');
      if (isNotFound) {
        return null;
      }
      throw new StellarNetworkError('Failed to load account via RPC', {
        publicKey,
        error: msg,
      });
    }
  }

  /**
   * Check if an account exists on the network
   * @param publicKey The account's public key
   * @returns True if the account exists
   */
  async accountExists(publicKey: string): Promise<boolean> {
    const account = await this.getAccount(publicKey);
    return account !== null;
  }

  /**
   * Get the USDC balance for an account
   * @param publicKey The account's public key
   * @returns USDC balance as string, or '0' if no trustline
   */
  async getUsdcBalance(publicKey: string): Promise<string> {
    const account = await this.getAccount(publicKey);
    if (!account) return '0';

    const usdcBalance = account.balances.find(
      (b) =>
        b.assetCode === this.config.usdcAssetCode &&
        b.assetIssuer === this.config.usdcIssuer,
    );

    return usdcBalance?.balance || '0';
  }

  /**
   * Get the XLM balance for an account
   * @param publicKey The account's public key
   * @returns XLM balance as string
   */
  async getXlmBalance(publicKey: string): Promise<string> {
    const account = await this.getAccount(publicKey);
    if (!account) return '0';

    const xlmBalance = account.balances.find((b) => b.assetCode === 'XLM');
    return xlmBalance?.balance || '0';
  }

  /**
   * Fund an account on testnet using Friendbot
   * @param publicKey The account's public key
   * @returns True if successful
   */
  async fundTestnetAccount(publicKey: string): Promise<boolean> {
    if (this.config.network !== 'testnet') {
      throw new StellarNetworkError('Friendbot only available on testnet');
    }

    try {
      const friendbotUrl =
        this.configService.get<string>('stellar.friendbotUrl') ||
        'https://friendbot.stellar.org?addr=';
      const response = await fetch(`${friendbotUrl}${publicKey}`);
      if (!response.ok) {
        throw new Error(`Friendbot request failed: ${response.status}`);
      }
      this.logger.log(`Funded testnet account: ${publicKey}`);
      return true;
    } catch (error) {
      throw new StellarNetworkError('Failed to fund testnet account', {
        publicKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Create a trustline for USDC
   * @param secretKey The account's secret key
   * @returns Transaction result
   */
  async createUsdcTrustline(
    secretKey: string,
  ): Promise<StellarTransactionResult> {
    const keypair = Keypair.fromSecret(secretKey);
    const publicKey = keypair.publicKey();

    try {
      const account = await this.server.getAccount(publicKey);

      const transaction = new TransactionBuilder(account, {
        fee: this.configService.get<string>('stellar.baseFee') || '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          Operation.changeTrust({
            asset: this.usdcAsset,
          }),
        )
        .setTimeout(30)
        .build();

      transaction.sign(keypair);

      const result = await this.submitAndPoll(transaction);

      this.logger.log(`USDC trustline created for account: ${publicKey}`);
      return result;
    } catch (error) {
      if (error instanceof StellarTransactionError) throw error;
      throw new StellarTransactionError('Failed to create USDC trustline', {
        publicKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send a payment transaction
   * @param request Transaction request details
   * @returns Transaction result
   */
  async sendPayment(
    request: StellarTransactionRequest,
  ): Promise<StellarTransactionResult> {
    const sourceKeypair = Keypair.fromSecret(request.sourceSecretKey);
    const sourcePublicKey = sourceKeypair.publicKey();

    try {
      const sourceAccount = await this.server.getAccount(sourcePublicKey);

      const asset =
        request.assetCode === 'XLM'
          ? Asset.native()
          : new Asset(request.assetCode, request.assetIssuer!);

      let builder = new TransactionBuilder(sourceAccount, {
        fee: this.configService.get<string>('stellar.baseFee') || '100',
        networkPassphrase: this.networkPassphrase,
      }).addOperation(
        Operation.payment({
          destination: request.destinationPublicKey,
          asset,
          amount: request.amount,
        }),
      );

      if (request.memo) {
        switch (request.memoType) {
          case 'id':
            builder = builder.addMemo(StellarSdk.Memo.id(request.memo));
            break;
          case 'hash':
            builder = builder.addMemo(StellarSdk.Memo.hash(request.memo));
            break;
          default:
            builder = builder.addMemo(StellarSdk.Memo.text(request.memo));
        }
      }

      const transaction = builder.setTimeout(30).build();
      transaction.sign(sourceKeypair);

      const result = await this.submitAndPoll(transaction);

      this.logger.log(
        `Payment sent: ${request.amount} ${request.assetCode} from ${sourcePublicKey} to ${request.destinationPublicKey}`,
      );

      return result;
    } catch (error) {
      if (error instanceof StellarTransactionError) throw error;

      const errorDetails: Record<string, unknown> = {
        source: sourcePublicKey,
        destination: request.destinationPublicKey,
        amount: request.amount,
        asset: request.assetCode,
      };

      if (error instanceof Error) {
        errorDetails.message = error.message;
      }

      throw new StellarTransactionError('Payment failed', errorDetails);
    }
  }

  /**
   * Get transaction details by hash via RPC
   * @param transactionHash The transaction hash
   * @returns Transaction details or null if not found
   */
  async getTransaction(
    transactionHash: string,
  ): Promise<StellarTransactionResult | null> {
    try {
      const response = await this.server.getTransaction(transactionHash);

      if (response.status === 'NOT_FOUND') {
        return null;
      }

      if (response.status === 'FAILED') {
        return {
          transactionId: transactionHash,
          hash: transactionHash,
          ledger: response.latestLedger,
          successful: false,
          feeCharged: '0',
          resultXdr: response.resultXdr?.toXDR('base64') ?? '',
          createdAt: new Date(),
        };
      }

      // SUCCESS
      return {
        transactionId: transactionHash,
        hash: transactionHash,
        ledger: response.latestLedger,
        successful: true,
        feeCharged: '0',
        resultXdr: response.resultXdr?.toXDR('base64') ?? '',
        createdAt: new Date(),
      };
    } catch (error) {
      throw new StellarNetworkError('Failed to get transaction via RPC', {
        transactionHash,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Create and fund a new account (for initial XLM deposit)
   * @param secretKey Funding account's secret key
   * @param newPublicKey New account's public key
   * @param startingBalance Starting balance in XLM
   * @returns Transaction result
   */
  async createAccount(
    secretKey: string,
    newPublicKey: string,
    startingBalance: string = MINIMUM_XLM_BALANCE,
  ): Promise<StellarTransactionResult> {
    const sourceKeypair = Keypair.fromSecret(secretKey);
    const sourcePublicKey = sourceKeypair.publicKey();

    try {
      const sourceAccount = await this.server.getAccount(sourcePublicKey);

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: this.configService.get<string>('stellar.baseFee') || '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          Operation.createAccount({
            destination: newPublicKey,
            startingBalance,
          }),
        )
        .setTimeout(30)
        .build();

      transaction.sign(sourceKeypair);

      const result = await this.submitAndPoll(transaction);

      this.logger.log(`Account created: ${newPublicKey}`);
      return result;
    } catch (error) {
      if (error instanceof StellarTransactionError) throw error;
      throw new StellarTransactionError('Failed to create account', {
        newPublicKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get recent transactions for an account.
   *
   * Note: Soroban RPC does not provide a transaction history endpoint
   * equivalent to Horizon's. This method queries the RPC `getTransactions`
   * endpoint (available since Protocol 21) with a pagination cursor.
   * For full history, Horizon remains the better choice.
   *
   * @param publicKey The account's public key
   * @param limit Maximum number of transactions to return
   * @returns List of transactions (may be empty if RPC doesn't support history)
   */
  async getAccountTransactions(
    publicKey: string,
    limit: number = 10,
  ): Promise<StellarTransactionResult[]> {
    // Soroban RPC does not have an equivalent to Horizon's
    // /accounts/{id}/transactions endpoint. We log a warning and
    // return an empty array. Consumers needing full history should
    // use the Horizon provider or a third-party indexer.
    this.logger.warn(
      `getAccountTransactions called on RPC provider — ` +
        `RPC does not support account transaction history. ` +
        `Returning empty array for ${publicKey}. ` +
        `Use the Horizon provider for transaction history queries.`,
    );
    return [];
  }

  /**
   * Get the USDC asset object
   * @returns Stellar Asset for USDC
   */
  getUsdcAsset(): StellarSdk.Asset {
    return this.usdcAsset;
  }

  /**
   * Get the network passphrase
   * @returns Network passphrase
   */
  getNetworkPassphrase(): string {
    return this.networkPassphrase;
  }

  /**
   * Get the RPC server instance
   * @returns RPC server
   */
  getServer(): StellarSdk.rpc.Server {
    return this.server;
  }

  /**
   * Get provider configuration
   * @returns Current configuration
   */
  getConfig(): StellarConfig {
    return this.config;
  }

  // ── Private Helpers ────────────────────────────────────────

  /**
   * Submit a transaction and poll for confirmation.
   *
   * RPC's `sendTransaction` returns immediately with a status.
   * We then poll `getTransaction` with exponential backoff until
   * the transaction is confirmed or fails.
   *
   * @param transaction Signed transaction to submit
   * @returns Transaction result after confirmation
   * @throws StellarTransactionError if submission or confirmation fails
   */
  private async submitAndPoll(
    transaction: StellarSdk.Transaction,
  ): Promise<StellarTransactionResult> {
    const hash = transaction.hash().toString('hex');

    // Step 1: Submit
    let sendResponse: StellarSdk.rpc.Api.SendTransactionResponse;
    try {
      sendResponse = await this.server.sendTransaction(transaction);
    } catch (error) {
      throw new StellarTransactionError('Failed to submit transaction to RPC', {
        hash,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Check immediate rejection
    if (sendResponse.status === 'ERROR') {
      throw new StellarTransactionError('Transaction rejected by RPC', {
        hash,
        errorResultXdr: sendResponse.errorResult?.toXDR('base64'),
      });
    }

    if (sendResponse.status === 'DUPLICATE') {
      this.logger.warn(`Duplicate transaction submitted: ${hash}`);
    }

    // Step 2: Poll for confirmation
    let delay = INITIAL_POLL_DELAY_MS;
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await this.sleep(delay);

      const txResponse = await this.server.getTransaction(hash);

      if (txResponse.status === 'SUCCESS') {
        return {
          transactionId: hash,
          hash,
          ledger: txResponse.latestLedger,
          successful: true,
          feeCharged: '0',
          resultXdr: txResponse.resultXdr?.toXDR('base64') ?? '',
          createdAt: new Date(),
        };
      }

      if (txResponse.status === 'FAILED') {
        throw new StellarTransactionError('Transaction failed on-chain', {
          hash,
          ledger: txResponse.latestLedger,
          resultXdr: txResponse.resultXdr?.toXDR('base64'),
        });
      }

      // NOT_FOUND — still pending, continue polling with backoff
      delay = Math.min(delay * 1.5, MAX_POLL_DELAY_MS);
    }

    throw new StellarTransactionError(
      'Transaction confirmation timed out after polling',
      { hash, maxAttempts: MAX_POLL_ATTEMPTS },
    );
  }

  /**
   * Sleep helper for polling delays
   * @param ms Milliseconds to wait
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
