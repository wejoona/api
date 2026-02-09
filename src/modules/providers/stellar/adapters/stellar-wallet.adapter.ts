/**
 * Stellar Wallet Adapter
 *
 * Implements IWalletProvider for Stellar blockchain.
 * Handles wallet creation, balance queries, and deposit addresses.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IWalletProvider,
  CreateWalletData,
  ProviderWallet,
  WalletBalance,
} from '../../interfaces';
import { StellarHorizonService } from '../services/stellar-horizon.service';
import { StellarConfig, StellarNetwork, StellarError } from '../stellar.types';
import { KeyVaultService } from '@modules/shared/infrastructure/services';

/**
 * Stellar Wallet Adapter
 *
 * Provides wallet operations via Stellar blockchain:
 * - Generate Stellar keypairs for new wallets
 * - Query USDC and XLM balances
 * - Create USDC trustlines for receiving tokens
 *
 * Note: Unlike Circle wallets, Stellar wallets require:
 * 1. Account activation with XLM (minimum balance)
 * 2. Trustline creation for USDC before receiving
 */
@Injectable()
export class StellarWalletAdapter implements IWalletProvider {
  private readonly logger = new Logger(StellarWalletAdapter.name);
  private readonly config: StellarConfig;

  readonly providerName = 'stellar';

  constructor(
    private readonly configService: ConfigService,
    private readonly horizonService: StellarHorizonService,
    private readonly keyVault: KeyVaultService,
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

    this.logger.log('Stellar Wallet adapter initialized');
  }

  /**
   * Create a new Stellar wallet
   *
   * This generates a new keypair and optionally funds it on testnet.
   * The secret key should be stored securely (encrypted) by the caller.
   *
   * @param data Wallet creation data
   * @returns Created wallet information
   */
  async createWallet(data: CreateWalletData): Promise<ProviderWallet> {
    try {
      // Generate a new Stellar keypair
      const keypair = this.horizonService.generateKeypair();

      this.logger.log(
        `Created Stellar keypair for user ${data.userId}: ${keypair.publicKey}`,
      );

      // On testnet, we can use Friendbot to fund the account
      if (this.config.network === 'testnet') {
        try {
          await this.horizonService.fundTestnetAccount(keypair.publicKey);
          this.logger.log(`Funded testnet account: ${keypair.publicKey}`);

          // Create USDC trustline
          await this.horizonService.createUsdcTrustline(keypair.secretKey);
          this.logger.log(`Created USDC trustline for: ${keypair.publicKey}`);
        } catch (fundError) {
          this.logger.warn(
            `Failed to auto-fund testnet account: ${fundError instanceof Error ? fundError.message : String(fundError)}`,
          );
        }
      }

      // Return wallet info
      // Note: The secret key is included in metadata and should be encrypted by the caller
      return {
        providerId: keypair.publicKey, // Use public key as provider ID
        address: keypair.publicKey,
        blockchain: 'STELLAR',
        balances: [],
        status: 'active',
        createdAt: new Date(),
        // Store secret key encrypted in metadata
        metadata: {
          ...(data.metadata || {}),
          secretKey: this.keyVault.encrypt(keypair.secretKey),
          secretKeyEncrypted: this.keyVault.isEnabled(),
        },
      } as ProviderWallet;
    } catch (error) {
      this.logger.error(
        `Failed to create Stellar wallet: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get wallet information by public key
   * @param providerWalletId Stellar public key
   * @returns Wallet information or null if not found/inactive
   */
  async getWallet(providerWalletId: string): Promise<ProviderWallet | null> {
    try {
      const account = await this.horizonService.getAccount(providerWalletId);

      if (!account) {
        return null;
      }

      // Map Stellar balances to our format
      const balances: WalletBalance[] = account.balances.map((b) => ({
        currency: b.assetCode,
        available: b.balance,
        pending: '0',
        total: b.balance,
      }));

      return {
        providerId: account.accountId,
        address: account.accountId,
        blockchain: 'STELLAR',
        balances,
        status: account.status === 'active' ? 'active' : 'frozen',
        createdAt: new Date(), // Stellar doesn't provide creation date in account info
      };
    } catch (error) {
      if (error instanceof StellarError) {
        throw error;
      }
      this.logger.error(
        `Failed to get Stellar wallet: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get wallet balances
   * @param providerWalletId Stellar public key
   * @returns Array of balances for all assets
   */
  async getBalance(providerWalletId: string): Promise<WalletBalance[]> {
    try {
      const account = await this.horizonService.getAccount(providerWalletId);

      if (!account) {
        // Account doesn't exist or isn't funded
        return [
          {
            currency: 'USDC',
            available: '0',
            pending: '0',
            total: '0',
          },
          {
            currency: 'XLM',
            available: '0',
            pending: '0',
            total: '0',
          },
        ];
      }

      return account.balances.map((b) => ({
        currency: b.assetCode,
        available: b.balance,
        pending: '0',
        total: b.balance,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get balance: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get deposit address for a wallet
   *
   * For Stellar, the deposit address is the public key.
   * The address can receive any asset the account has a trustline for.
   *
   * @param providerWalletId Stellar public key
   * @param _blockchain Ignored for Stellar (always STELLAR)
   * @returns The Stellar public key as deposit address
   */
  async getDepositAddress(
    providerWalletId: string,
    _blockchain?: string,
  ): Promise<string> {
    // For Stellar, the wallet ID IS the deposit address
    // Verify the account exists
    const account = await this.horizonService.getAccount(providerWalletId);

    if (!account) {
      throw new StellarError(
        'Account not found or not activated',
        'ACCOUNT_NOT_FOUND',
        { publicKey: providerWalletId },
      );
    }

    // Check if account has USDC trustline
    if (!account.hasUsdcTrustline) {
      this.logger.warn(
        `Account ${providerWalletId} does not have USDC trustline. Cannot receive USDC until trustline is created.`,
      );
    }

    return providerWalletId;
  }

  /**
   * List all wallets for a user
   *
   * Note: Stellar doesn't have a native concept of "user". This method
   * assumes a 1:1 mapping where userProviderId is the Stellar public key.
   * For multi-wallet users, implement external tracking.
   *
   * @param userProviderId The user's Stellar public key
   * @returns Array containing the single wallet
   */
  async listWallets(userProviderId: string): Promise<ProviderWallet[]> {
    try {
      const wallet = await this.getWallet(userProviderId);

      if (!wallet) {
        return [];
      }

      return [wallet];
    } catch (error) {
      this.logger.error(
        `Failed to list wallets: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * Ensure account has USDC trustline
   *
   * Creates a trustline if one doesn't exist.
   * This is required before the account can receive USDC.
   *
   * @param secretKey Account's secret key
   * @returns True if trustline exists or was created
   */
  async ensureUsdcTrustline(secretKey: string): Promise<boolean> {
    try {
      const keypair = this.horizonService.keypairFromSecret(secretKey);
      const publicKey = keypair.publicKey();

      const account = await this.horizonService.getAccount(publicKey);

      if (!account) {
        throw new StellarError(
          'Account not found',
          'ACCOUNT_NOT_FOUND',
          { publicKey },
        );
      }

      if (account.hasUsdcTrustline) {
        return true;
      }

      // Create trustline
      await this.horizonService.createUsdcTrustline(secretKey);
      this.logger.log(`Created USDC trustline for: ${publicKey}`);

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to ensure USDC trustline: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Check if account is ready to receive USDC
   *
   * An account is ready if:
   * 1. It exists on the network (funded with XLM)
   * 2. It has a USDC trustline
   *
   * @param publicKey Account's public key
   * @returns True if account can receive USDC
   */
  async isReadyForUsdc(publicKey: string): Promise<boolean> {
    try {
      const account = await this.horizonService.getAccount(publicKey);
      return account !== null && account.hasUsdcTrustline;
    } catch {
      return false;
    }
  }

  /**
   * Decrypt a stored secret key from wallet metadata
   *
   * Use this when you need the secret key for signing transactions.
   * The key is encrypted at rest via KeyVaultService.
   *
   * @param encryptedKey The encrypted secret key from wallet metadata
   * @returns Decrypted Stellar secret key (starts with S...)
   */
  decryptSecretKey(encryptedKey: string): string {
    return this.keyVault.decrypt(encryptedKey);
  }
}
