/**
 * Wallet Provider Interface
 *
 * Handles USDC wallet creation and management.
 * Current implementation: Circle Programmable Wallets
 * Future: In-house custody or other custodians
 */

export interface CreateWalletData {
  userId: string; // Your internal user ID
  userProviderId: string; // Provider's user ID (e.g., Circle user ID)
  name?: string; // Wallet name/label
  metadata?: Record<string, unknown>;
}

export interface WalletBalance {
  currency: string; // 'USDC', 'USD', etc.
  available: string; // Available balance (string for precision)
  pending: string; // Pending balance
  total: string; // Total balance
}

export interface ProviderWallet {
  providerId: string; // Provider's wallet ID
  address: string; // Blockchain address (for USDC)
  blockchain: string; // 'ETH', 'MATIC', 'SOL', etc.
  balances: WalletBalance[];
  status: 'active' | 'frozen' | 'closed';
  createdAt: Date;
}

export interface IWalletProvider {
  readonly providerName: string;

  /**
   * Create a new wallet for a user
   */
  createWallet(data: CreateWalletData): Promise<ProviderWallet>;

  /**
   * Get wallet by provider wallet ID
   */
  getWallet(providerWalletId: string): Promise<ProviderWallet | null>;

  /**
   * Get wallet balance
   */
  getBalance(providerWalletId: string): Promise<WalletBalance[]>;

  /**
   * Get deposit address for a wallet
   */
  getDepositAddress(
    providerWalletId: string,
    blockchain?: string,
  ): Promise<string>;

  /**
   * List all wallets for a user
   */
  listWallets(userProviderId: string): Promise<ProviderWallet[]>;
}

export const WALLET_PROVIDER = Symbol('WALLET_PROVIDER');
