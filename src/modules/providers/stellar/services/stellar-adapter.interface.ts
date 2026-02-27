/**
 * Stellar Adapter Interface
 *
 * Defines the common API surface for Stellar network interaction.
 * Both Horizon and RPC implementations must satisfy this contract,
 * enabling seamless switching between backends via configuration.
 *
 * @see StellarHorizonService - Horizon API implementation
 * @see StellarRpcService - Soroban RPC implementation (default)
 */

import * as StellarSdk from '@stellar/stellar-sdk';
import {
  StellarAccount,
  StellarKeyPair,
  StellarTransactionRequest,
  StellarTransactionResult,
  StellarConfig,
} from '../stellar.types';

/**
 * Stellar network adapter interface.
 *
 * Abstracts the underlying Stellar API (Horizon or RPC) so that
 * higher-level adapters (wallet, transfer, on/off-ramp) can work
 * with either backend transparently.
 */
export interface StellarAdapter {
  // ── Lifecycle ──────────────────────────────────────────────

  /** Initialize the service (called by NestJS OnModuleInit) */
  onModuleInit(): void;

  // ── Keypair Operations ─────────────────────────────────────

  /** Generate a new random Stellar keypair */
  generateKeypair(): StellarKeyPair;

  /** Restore a Keypair object from a secret key */
  keypairFromSecret(secretKey: string): StellarSdk.Keypair;

  // ── Account Queries ────────────────────────────────────────

  /** Load full account info, or null if the account doesn't exist */
  getAccount(publicKey: string): Promise<StellarAccount | null>;

  /** Check whether an account exists on the network */
  accountExists(publicKey: string): Promise<boolean>;

  // ── Balance Queries ────────────────────────────────────────

  /** Get the USDC balance (returns '0' when no trustline) */
  getUsdcBalance(publicKey: string): Promise<string>;

  /** Get the XLM (native) balance */
  getXlmBalance(publicKey: string): Promise<string>;

  // ── Testnet Funding ────────────────────────────────────────

  /** Fund an account via Friendbot (testnet only) */
  fundTestnetAccount(publicKey: string): Promise<boolean>;

  // ── Trustline Operations ───────────────────────────────────

  /** Create a USDC trustline for the given account */
  createUsdcTrustline(secretKey: string): Promise<StellarTransactionResult>;

  // ── Transaction Operations ─────────────────────────────────

  /** Submit a payment transaction */
  sendPayment(request: StellarTransactionRequest): Promise<StellarTransactionResult>;

  /** Look up a transaction by hash */
  getTransaction(transactionHash: string): Promise<StellarTransactionResult | null>;

  /** Create and fund a new account on-chain */
  createAccount(
    secretKey: string,
    newPublicKey: string,
    startingBalance?: string,
  ): Promise<StellarTransactionResult>;

  /** Get recent transactions for an account */
  getAccountTransactions(
    publicKey: string,
    limit?: number,
  ): Promise<StellarTransactionResult[]>;

  // ── Asset / Config Accessors ───────────────────────────────

  /** Get the configured USDC Asset object */
  getUsdcAsset(): StellarSdk.Asset;

  /** Get the network passphrase */
  getNetworkPassphrase(): string;

  /** Get the provider configuration */
  getConfig(): StellarConfig;
}
