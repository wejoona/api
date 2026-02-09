import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  WALLET_PROVIDER,
  IWalletProvider,
  LEDGER_PROVIDER,
  ILedgerProvider,
} from '../../../providers/interfaces';

export type OmnibusNetwork = 'circle' | 'stellar';

export interface RouteExternalTransferParams {
  amount: number;
  destination: string;
  preferredNetwork?: OmnibusNetwork;
}

export interface RouteExternalTransferResult {
  network: OmnibusNetwork;
  omnibusWalletId: string;
  estimatedFee: number;
  /** Blnk balance ID for the omnibus account (for ledger transactions) */
  blnkOmnibusBalanceId?: string;
}

/**
 * Omnibus Service
 *
 * Manages the omnibus (pooled) wallets for Circle and Stellar networks.
 * One master wallet per network holds all pooled USDC.
 * Per-user on-chain wallets are created lazily only when needed.
 *
 * Config via env vars:
 *   CIRCLE_OMNIBUS_WALLET_ID — Circle programmable wallet holding pooled USDC
 *   STELLAR_OMNIBUS_ADDRESS — Stellar account holding pooled USDC
 */
@Injectable()
export class OmnibusService {
  private readonly logger = new Logger(OmnibusService.name);

  private readonly circleOmnibusWalletId: string;
  private readonly stellarOmnibusAddress: string;

  // Blnk balance IDs for omnibus accounts
  private readonly blnkCircleOmnibusBalanceId: string;
  private readonly blnkStellarOmnibusBalanceId: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject(WALLET_PROVIDER)
    private readonly walletProvider: IWalletProvider,
    @Inject(LEDGER_PROVIDER)
    private readonly ledgerProvider: ILedgerProvider,
  ) {
    this.circleOmnibusWalletId = this.configService.get<string>(
      'CIRCLE_OMNIBUS_WALLET_ID',
      '',
    );
    this.stellarOmnibusAddress = this.configService.get<string>(
      'STELLAR_OMNIBUS_ADDRESS',
      '',
    );
    this.blnkCircleOmnibusBalanceId = this.configService.get<string>(
      'blnk.circleOmnibusBalanceId',
      '',
    );
    this.blnkStellarOmnibusBalanceId = this.configService.get<string>(
      'blnk.stellarOmnibusBalanceId',
      '',
    );
  }

  /**
   * Get the on-chain balance of the omnibus wallet for a given network
   */
  async getOmnibusBalance(network: OmnibusNetwork): Promise<number> {
    try {
      if (network === 'circle') {
        if (!this.circleOmnibusWalletId) {
          this.logger.warn('CIRCLE_OMNIBUS_WALLET_ID not configured');
          return 0;
        }
        const balances = await this.walletProvider.getBalance(
          this.circleOmnibusWalletId,
        );
        const usdcBalance = balances.find((b) => b.currency === 'USDC');
        return usdcBalance ? parseFloat(usdcBalance.available) : 0;
      }

      if (network === 'stellar') {
        // TODO: Implement Stellar balance check via StellarWalletAdapter
        this.logger.warn('Stellar omnibus balance check not yet implemented');
        return 0;
      }

      return 0;
    } catch (error) {
      this.logger.error(
        `Failed to get omnibus balance for ${network}: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      return 0;
    }
  }

  /**
   * Route an external transfer to the best network.
   * Picks the network with sufficient liquidity and lowest fees.
   */
  async routeExternalTransfer(
    params: RouteExternalTransferParams,
  ): Promise<RouteExternalTransferResult> {
    const { amount, destination, preferredNetwork } = params;

    // If caller has a preference and it's available, use it
    if (preferredNetwork) {
      const walletId = this.getOmnibusWalletId(preferredNetwork);
      if (walletId) {
        return {
          network: preferredNetwork,
          omnibusWalletId: walletId,
          estimatedFee: this.estimateFee(preferredNetwork, amount),
          blnkOmnibusBalanceId:
            this.getBlnkOmnibusBalanceId(preferredNetwork) || undefined,
        };
      }
    }

    // Default routing: prefer Circle (EVM) for most transfers
    // Check Circle omnibus liquidity first
    if (this.circleOmnibusWalletId) {
      const circleBalance = await this.getOmnibusBalance('circle');
      if (circleBalance >= amount) {
        return {
          network: 'circle',
          omnibusWalletId: this.circleOmnibusWalletId,
          estimatedFee: this.estimateFee('circle', amount),
          blnkOmnibusBalanceId:
            this.getBlnkOmnibusBalanceId('circle') || undefined,
        };
      }
    }

    // Fallback to Stellar if Circle doesn't have enough
    if (this.stellarOmnibusAddress) {
      return {
        network: 'stellar',
        omnibusWalletId: this.stellarOmnibusAddress,
        estimatedFee: this.estimateFee('stellar', amount),
        blnkOmnibusBalanceId:
          this.getBlnkOmnibusBalanceId('stellar') || undefined,
      };
    }

    // No omnibus configured — use Circle as default
    this.logger.warn(
      'No omnibus wallet has sufficient balance; defaulting to Circle',
    );
    return {
      network: 'circle',
      omnibusWalletId: this.circleOmnibusWalletId || 'unconfigured',
      estimatedFee: this.estimateFee('circle', amount),
      blnkOmnibusBalanceId:
        this.getBlnkOmnibusBalanceId('circle') || undefined,
    };
  }

  /**
   * Sweep funds from omnibus to a per-user on-chain wallet (regulatory requirement).
   * Creates the per-user wallet lazily if it doesn't exist.
   */
  async sweepToPerUser(
    userId: string,
  ): Promise<{ network: OmnibusNetwork; address: string }> {
    this.logger.log(`Sweeping funds to per-user wallet for user ${userId}`);
    // TODO: Implement lazy per-user wallet creation + on-chain transfer
    // 1. Check if user has a per-user Circle wallet; if not, create one
    // 2. Transfer from omnibus to per-user wallet on-chain
    // 3. Record the movement in Blnk ledger
    throw new Error(
      'sweepToPerUser not yet implemented — per-user wallets are lazy',
    );
  }

  /**
   * Consolidate funds from a per-user wallet back to the omnibus.
   */
  async consolidateFromPerUser(
    userId: string,
  ): Promise<{ network: OmnibusNetwork; amount: number }> {
    this.logger.log(
      `Consolidating per-user wallet back to omnibus for user ${userId}`,
    );
    // TODO: Implement consolidation
    // 1. Find user's per-user on-chain wallet
    // 2. Transfer all funds back to omnibus
    // 3. Record in Blnk ledger
    throw new Error('consolidateFromPerUser not yet implemented');
  }

  // ==========================================
  // Helpers
  // ==========================================

  /**
   * Get the Blnk balance ID for the omnibus account on a given network.
   * Used by callers to record ledger transactions against the correct balance.
   */
  getBlnkOmnibusBalanceId(network: OmnibusNetwork): string | null {
    if (network === 'circle') return this.blnkCircleOmnibusBalanceId || null;
    if (network === 'stellar') return this.blnkStellarOmnibusBalanceId || null;
    return null;
  }

  private getOmnibusWalletId(network: OmnibusNetwork): string | null {
    if (network === 'circle') return this.circleOmnibusWalletId || null;
    if (network === 'stellar') return this.stellarOmnibusAddress || null;
    return null;
  }

  private estimateFee(network: OmnibusNetwork, _amount: number): number {
    // Simple fee estimation — can be made dynamic later
    if (network === 'circle') return 0.01; // ~$0.01 on Polygon
    if (network === 'stellar') return 0.001; // ~$0.001 on Stellar
    return 0;
  }
}
