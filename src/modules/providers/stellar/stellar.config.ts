/**
 * Stellar Provider Configuration
 *
 * Centralized configuration for Stellar blockchain integration.
 * Supports both testnet and mainnet environments.
 */

import { registerAs } from '@nestjs/config';

export default registerAs('stellar', () => ({
  /**
   * Network type: 'testnet' or 'mainnet'
   * Default: testnet for safety
   */
  network: process.env.STELLAR_NETWORK || 'testnet',

  /**
   * Provider backend: 'rpc' (Soroban RPC, default) or 'horizon'
   * RPC is the SDF-recommended default for SCF compliance.
   */
  provider: process.env.STELLAR_PROVIDER || 'rpc',

  /**
   * Horizon server URL
   * Default: Stellar testnet Horizon
   */
  horizonUrl:
    process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',

  /**
   * Soroban RPC server URL
   * Default: Stellar testnet RPC
   */
  rpcUrl:
    process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org',

  /**
   * USDC asset code
   * Default: USDC (standard)
   */
  usdcAssetCode: process.env.STELLAR_USDC_CODE || 'USDC',

  /**
   * USDC asset issuer public key
   * Default: Circle testnet issuer
   */
  usdcIssuer:
    process.env.STELLAR_USDC_ISSUER ||
    'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',

  /**
   * Anchor domain for SEP-24 flows
   * This is the domain of the anchor that provides deposit/withdrawal services
   */
  anchorDomain: process.env.STELLAR_ANCHOR_DOMAIN || '',

  /**
   * Use mock mode for testing
   * Set to 'true' to use mock adapters instead of real Stellar network
   */
  useMock: process.env.STELLAR_USE_MOCK === 'true',

  /**
   * Transaction timeout in seconds
   * Default: 30 seconds
   */
  transactionTimeout: parseInt(process.env.STELLAR_TX_TIMEOUT || '30', 10),

  /**
   * Base fee in stroops (1 stroop = 0.0000001 XLM)
   * Default: 100 stroops (0.00001 XLM)
   */
  baseFee: parseInt(process.env.STELLAR_BASE_FEE || '100', 10),

  /**
   * Maximum retries for failed transactions
   * Default: 3
   */
  maxRetries: parseInt(process.env.STELLAR_MAX_RETRIES || '3', 10),

  /**
   * Friendbot URL for testnet account funding
   * Only available on testnet
   */
  friendbotUrl:
    process.env.STELLAR_FRIENDBOT_URL ||
    'https://friendbot.stellar.org?addr=',

  /**
   * Webhook signing secret for anchor callbacks
   */
  webhookSecret: process.env.STELLAR_WEBHOOK_SECRET || '',

  /**
   * SEP-24 callback URL for deposit/withdrawal status updates
   */
  sep24CallbackUrl: process.env.STELLAR_SEP24_CALLBACK_URL || '',
}));
