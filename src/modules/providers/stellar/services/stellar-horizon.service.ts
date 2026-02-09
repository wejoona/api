/**
 * Stellar Horizon Service
 *
 * Core service for interacting with the Stellar Horizon API.
 * Handles account management, transactions, and balance queries.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';
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

const { Keypair, Asset, TransactionBuilder, Operation, Horizon } =
  StellarSdk;

/**
 * Stellar Horizon Service
 *
 * Provides low-level access to the Stellar network via Horizon API.
 * This service handles:
 * - Account creation and management
 * - Balance queries
 * - Transaction building and submission
 * - Trustline operations
 */
@Injectable()
export class StellarHorizonService implements OnModuleInit {
  private readonly logger = new Logger(StellarHorizonService.name);
  private server!: StellarSdk.Horizon.Server;
  private networkPassphrase!: string;
  private readonly config: StellarConfig;
  private usdcAsset!: StellarSdk.Asset;

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
  }

  /**
   * Initialize the Horizon server connection
   */
  onModuleInit(): void {
    this.server = new Horizon.Server(this.config.horizonUrl);
    this.networkPassphrase =
      this.config.network === 'mainnet'
        ? MAINNET_PASSPHRASE
        : TESTNET_PASSPHRASE;
    this.usdcAsset = new Asset(
      this.config.usdcAssetCode,
      this.config.usdcIssuer,
    );

    this.logger.log(
      `Stellar Horizon service initialized (network: ${this.config.network})`,
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
   * Get the Stellar account information
   * @param publicKey The account's public key
   * @returns Account information or null if not found
   */
  async getAccount(publicKey: string): Promise<StellarAccount | null> {
    try {
      const account = await this.server.loadAccount(publicKey);

      const balances: StellarBalance[] = account.balances
        .filter((balance) => balance.asset_type !== 'liquidity_pool_shares')
        .map((balance) => {
          if (balance.asset_type === 'native') {
            const nativeBalance = balance as StellarSdk.Horizon.HorizonApi.BalanceLineNative;
            return {
              assetType: 'native',
              assetCode: 'XLM',
              assetIssuer: null,
              balance: nativeBalance.balance,
              buyingLiabilities: nativeBalance.buying_liabilities || '0',
              sellingLiabilities: nativeBalance.selling_liabilities || '0',
            };
          }
          // Type guard for credit_alphanum assets
          const creditBalance =
            balance as StellarSdk.Horizon.HorizonApi.BalanceLineAsset;
          return {
            assetType: balance.asset_type,
            assetCode: creditBalance.asset_code,
            assetIssuer: creditBalance.asset_issuer,
            balance: creditBalance.balance,
            buyingLiabilities: creditBalance.buying_liabilities || '0',
            sellingLiabilities: creditBalance.selling_liabilities || '0',
          };
        });

      const hasUsdcTrustline = balances.some(
        (b) =>
          b.assetCode === this.config.usdcAssetCode &&
          b.assetIssuer === this.config.usdcIssuer,
      );

      return {
        accountId: account.accountId(),
        sequence: account.sequenceNumber(),
        balances,
        hasUsdcTrustline,
        status: 'active',
      };
    } catch (error) {
      // Check for 404/not found errors
      const isNotFound =
        (error instanceof Error && error.message.includes('404')) ||
        (error instanceof Error && error.message.includes('not found'));
      if (isNotFound) {
        return null;
      }
      throw new StellarNetworkError('Failed to load account', {
        publicKey,
        error: error instanceof Error ? error.message : String(error),
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
      const account = await this.server.loadAccount(publicKey);

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

      const result = await this.server.submitTransaction(transaction);

      this.logger.log(`USDC trustline created for account: ${publicKey}`);

      // Cast result to access typed properties
      const typedResult = result as unknown as {
        hash: string;
        ledger: number;
        successful: boolean;
        fee_charged?: string;
        result_xdr: string;
      };

      return {
        transactionId: typedResult.hash,
        hash: typedResult.hash,
        ledger: typedResult.ledger,
        successful: typedResult.successful,
        feeCharged: typedResult.fee_charged || '0',
        resultXdr: typedResult.result_xdr,
        createdAt: new Date(),
      };
    } catch (error) {
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
      const sourceAccount = await this.server.loadAccount(sourcePublicKey);

      // Determine the asset
      const asset =
        request.assetCode === 'XLM'
          ? Asset.native()
          : new Asset(request.assetCode, request.assetIssuer!);

      // Build the transaction
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

      // Add memo if provided
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

      const result = await this.server.submitTransaction(transaction);

      this.logger.log(
        `Payment sent: ${request.amount} ${request.assetCode} from ${sourcePublicKey} to ${request.destinationPublicKey}`,
      );

      // Cast result to access typed properties
      const typedResult = result as unknown as {
        hash: string;
        ledger: number;
        successful: boolean;
        fee_charged?: string;
        result_xdr: string;
      };

      return {
        transactionId: typedResult.hash,
        hash: typedResult.hash,
        ledger: typedResult.ledger,
        successful: typedResult.successful,
        feeCharged: typedResult.fee_charged || '0',
        resultXdr: typedResult.result_xdr,
        createdAt: new Date(),
      };
    } catch (error) {
      // Extract detailed error info from Stellar
      let errorDetails: Record<string, unknown> = {
        source: sourcePublicKey,
        destination: request.destinationPublicKey,
        amount: request.amount,
        asset: request.assetCode,
      };

      if (error instanceof Error) {
        errorDetails.message = error.message;
        // Check for result codes in Stellar errors
        if ('response' in error) {
          const stellarError = error as {
            response?: {
              data?: {
                extras?: { result_codes?: Record<string, unknown> };
              };
            };
          };
          errorDetails.resultCodes =
            stellarError.response?.data?.extras?.result_codes;
        }
      }

      throw new StellarTransactionError('Payment failed', errorDetails);
    }
  }

  /**
   * Get transaction details by hash
   * @param transactionHash The transaction hash
   * @returns Transaction details or null if not found
   */
  async getTransaction(
    transactionHash: string,
  ): Promise<StellarTransactionResult | null> {
    try {
      const transaction =
        await this.server.transactions().transaction(transactionHash).call();

      // Cast to access typed properties
      const tx = transaction as unknown as {
        hash: string;
        ledger: number;
        successful: boolean;
        fee_charged: string;
        result_xdr: string;
        created_at: string;
      };

      return {
        transactionId: tx.hash,
        hash: tx.hash,
        ledger: tx.ledger,
        successful: tx.successful,
        feeCharged: tx.fee_charged,
        resultXdr: tx.result_xdr,
        createdAt: new Date(tx.created_at),
      };
    } catch (error) {
      // Check for 404/not found errors
      const isNotFound =
        (error instanceof Error && error.message.includes('404')) ||
        (error instanceof Error && error.message.includes('not found'));
      if (isNotFound) {
        return null;
      }
      throw new StellarNetworkError('Failed to get transaction', {
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
      const sourceAccount = await this.server.loadAccount(sourcePublicKey);

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

      const result = await this.server.submitTransaction(transaction);

      this.logger.log(`Account created: ${newPublicKey}`);

      // Cast result to access typed properties
      const typedResult = result as unknown as {
        hash: string;
        ledger: number;
        successful: boolean;
        fee_charged?: string;
        result_xdr: string;
      };

      return {
        transactionId: typedResult.hash,
        hash: typedResult.hash,
        ledger: typedResult.ledger,
        successful: typedResult.successful,
        feeCharged: typedResult.fee_charged || '0',
        resultXdr: typedResult.result_xdr,
        createdAt: new Date(),
      };
    } catch (error) {
      throw new StellarTransactionError('Failed to create account', {
        newPublicKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get recent transactions for an account
   * @param publicKey The account's public key
   * @param limit Maximum number of transactions to return
   * @returns List of transactions
   */
  async getAccountTransactions(
    publicKey: string,
    limit: number = 10,
  ): Promise<StellarTransactionResult[]> {
    try {
      const transactions = await this.server
        .transactions()
        .forAccount(publicKey)
        .limit(limit)
        .order('desc')
        .call();

      return transactions.records.map((tx) => {
        // Cast to access typed properties
        const typedTx = tx as unknown as {
          hash: string;
          ledger: number;
          successful: boolean;
          fee_charged: string;
          result_xdr: string;
          created_at: string;
        };
        return {
          transactionId: typedTx.hash,
          hash: typedTx.hash,
          ledger: typedTx.ledger,
          successful: typedTx.successful,
          feeCharged: typedTx.fee_charged,
          resultXdr: typedTx.result_xdr,
          createdAt: new Date(typedTx.created_at),
        };
      });
    } catch (error) {
      throw new StellarNetworkError('Failed to get account transactions', {
        publicKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
   * Get the Horizon server instance
   * @returns Horizon server
   */
  getServer(): StellarSdk.Horizon.Server {
    return this.server;
  }

  /**
   * Get provider configuration
   * @returns Current configuration
   */
  getConfig(): StellarConfig {
    return this.config;
  }
}
