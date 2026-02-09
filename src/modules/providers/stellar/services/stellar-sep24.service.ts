/**
 * Stellar SEP-24 Interactive Deposit/Withdrawal Service
 *
 * Implements SEP-24: Interactive Anchor/Wallet Interoperability.
 * Enables fiat-to-crypto and crypto-to-fiat flows via anchor web interfaces.
 *
 * @see https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Sep24Info,
  Sep24DepositRequest,
  Sep24WithdrawalRequest,
  Sep24InteractiveResponse,
  Sep24Transaction,
  StellarConfig,
  StellarNetwork,
  StellarAuthError,
} from '../stellar.types';
import { StellarSep10Service } from './stellar-sep10.service';

/**
 * SEP-24 Interactive Anchor Service
 *
 * Handles interactive deposit and withdrawal flows:
 * - Deposit: Fiat → USDC (user sends fiat, receives USDC)
 * - Withdrawal: USDC → Fiat (user sends USDC, receives fiat)
 *
 * The actual deposit/withdrawal UI is hosted by the anchor.
 * This service provides the integration points.
 */
@Injectable()
export class StellarSep24Service {
  private readonly logger = new Logger(StellarSep24Service.name);
  private readonly config: StellarConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly sep10Service: StellarSep10Service,
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
      useMock: this.configService.get<boolean>('stellar.useMock') ?? false,
    };

    this.logger.log('Stellar SEP-24 service initialized');
  }

  /**
   * Get the SEP-24 transfer server URL from stellar.toml
   * @param domain The anchor domain
   * @returns The TRANSFER_SERVER_SEP0024 URL
   */
  async getTransferServerUrl(domain: string): Promise<string> {
    try {
      const tomlUrl = `https://${domain}/.well-known/stellar.toml`;
      const response = await fetch(tomlUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch stellar.toml: ${response.status}`);
      }

      const tomlText = await response.text();

      // Try SEP-24 endpoint first, fall back to generic transfer server
      let match = tomlText.match(/TRANSFER_SERVER_SEP0024\s*=\s*"([^"]+)"/);
      if (!match) {
        match = tomlText.match(/TRANSFER_SERVER\s*=\s*"([^"]+)"/);
      }

      if (!match) {
        throw new Error('Transfer server URL not found in stellar.toml');
      }

      return match[1];
    } catch (error) {
      throw new StellarAuthError('Failed to get SEP-24 transfer server', {
        domain,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get SEP-24 service info (supported assets and features)
   * @param domain The anchor domain
   * @returns Service info including supported assets
   */
  async getInfo(domain?: string): Promise<Sep24Info> {
    const anchorDomain = domain || this.config.anchorDomain;

    if (!anchorDomain) {
      throw new StellarAuthError('Anchor domain not configured');
    }

    try {
      const transferServer = await this.getTransferServerUrl(anchorDomain);
      const response = await fetch(`${transferServer}/info`);

      if (!response.ok) {
        throw new Error(`Info request failed: ${response.status}`);
      }

      return (await response.json()) as Sep24Info;
    } catch (error) {
      throw new StellarAuthError('Failed to get SEP-24 info', {
        domain: anchorDomain,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Initiate an interactive deposit (fiat → USDC)
   * @param request Deposit request parameters
   * @returns Interactive URL to redirect user to
   */
  async initiateDeposit(
    request: Sep24DepositRequest,
  ): Promise<Sep24InteractiveResponse> {
    const domain = this.config.anchorDomain;

    if (!domain) {
      throw new StellarAuthError('Anchor domain not configured');
    }

    try {
      const transferServer = await this.getTransferServerUrl(domain);

      // Build form data for the deposit request
      const formData = new URLSearchParams();
      formData.append('asset_code', request.assetCode);
      formData.append('account', request.account);

      if (request.memo) {
        formData.append('memo', request.memo);
      }
      if (request.memoType) {
        formData.append('memo_type', request.memoType);
      }
      if (request.amount) {
        formData.append('amount', request.amount);
      }
      if (request.lang) {
        formData.append('lang', request.lang);
      }
      if (request.countryCode) {
        formData.append('country_code', request.countryCode);
      }
      if (request.claimableBalanceSupported) {
        formData.append('claimable_balance_supported', 'true');
      }

      const response = await fetch(
        `${transferServer}/transactions/deposit/interactive`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${request.authToken}`,
          },
          body: formData.toString(),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Deposit initiation failed: ${response.status} - ${errorBody}`);
      }

      const data = (await response.json()) as Sep24InteractiveResponse;

      this.logger.log(
        `Deposit initiated for ${request.account}, transaction ID: ${data.id}`,
      );

      return data;
    } catch (error) {
      throw new StellarAuthError('Failed to initiate deposit', {
        account: request.account,
        assetCode: request.assetCode,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Initiate an interactive withdrawal (USDC → fiat)
   * @param request Withdrawal request parameters
   * @returns Interactive URL to redirect user to
   */
  async initiateWithdrawal(
    request: Sep24WithdrawalRequest,
  ): Promise<Sep24InteractiveResponse> {
    const domain = this.config.anchorDomain;

    if (!domain) {
      throw new StellarAuthError('Anchor domain not configured');
    }

    try {
      const transferServer = await this.getTransferServerUrl(domain);

      // Build form data for the withdrawal request
      const formData = new URLSearchParams();
      formData.append('asset_code', request.assetCode);
      formData.append('account', request.account);

      if (request.amount) {
        formData.append('amount', request.amount);
      }
      if (request.refundMemo) {
        formData.append('refund_memo', request.refundMemo);
      }
      if (request.refundMemoType) {
        formData.append('refund_memo_type', request.refundMemoType);
      }
      if (request.lang) {
        formData.append('lang', request.lang);
      }
      if (request.countryCode) {
        formData.append('country_code', request.countryCode);
      }

      const response = await fetch(
        `${transferServer}/transactions/withdraw/interactive`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${request.authToken}`,
          },
          body: formData.toString(),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Withdrawal initiation failed: ${response.status} - ${errorBody}`);
      }

      const data = (await response.json()) as Sep24InteractiveResponse;

      this.logger.log(
        `Withdrawal initiated for ${request.account}, transaction ID: ${data.id}`,
      );

      return data;
    } catch (error) {
      throw new StellarAuthError('Failed to initiate withdrawal', {
        account: request.account,
        assetCode: request.assetCode,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get the status of a SEP-24 transaction
   * @param transactionId The transaction ID from initiateDeposit/initiateWithdrawal
   * @param authToken JWT token from SEP-10 authentication
   * @returns Transaction status and details
   */
  async getTransaction(
    transactionId: string,
    authToken: string,
  ): Promise<Sep24Transaction> {
    const domain = this.config.anchorDomain;

    if (!domain) {
      throw new StellarAuthError('Anchor domain not configured');
    }

    try {
      const transferServer = await this.getTransferServerUrl(domain);

      const response = await fetch(
        `${transferServer}/transaction?id=${transactionId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Transaction query failed: ${response.status} - ${errorBody}`);
      }

      const data = (await response.json()) as { transaction: Sep24Transaction };
      return data.transaction;
    } catch (error) {
      throw new StellarAuthError('Failed to get transaction status', {
        transactionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get transaction by Stellar transaction ID
   * @param stellarTransactionId The Stellar blockchain transaction hash
   * @param authToken JWT token from SEP-10 authentication
   * @returns Transaction status and details
   */
  async getTransactionByStellarId(
    stellarTransactionId: string,
    authToken: string,
  ): Promise<Sep24Transaction> {
    const domain = this.config.anchorDomain;

    if (!domain) {
      throw new StellarAuthError('Anchor domain not configured');
    }

    try {
      const transferServer = await this.getTransferServerUrl(domain);

      const response = await fetch(
        `${transferServer}/transaction?stellar_transaction_id=${stellarTransactionId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Transaction query failed: ${response.status} - ${errorBody}`);
      }

      const data = (await response.json()) as { transaction: Sep24Transaction };
      return data.transaction;
    } catch (error) {
      throw new StellarAuthError('Failed to get transaction by Stellar ID', {
        stellarTransactionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * List all transactions for an account
   * @param authToken JWT token from SEP-10 authentication
   * @param options Query options
   * @returns List of transactions
   */
  async listTransactions(
    authToken: string,
    options?: {
      assetCode?: string;
      noOlderThan?: string;
      limit?: number;
      kind?: 'deposit' | 'withdrawal';
      pagingId?: string;
    },
  ): Promise<Sep24Transaction[]> {
    const domain = this.config.anchorDomain;

    if (!domain) {
      throw new StellarAuthError('Anchor domain not configured');
    }

    try {
      const transferServer = await this.getTransferServerUrl(domain);

      const params = new URLSearchParams();
      if (options?.assetCode) {
        params.append('asset_code', options.assetCode);
      }
      if (options?.noOlderThan) {
        params.append('no_older_than', options.noOlderThan);
      }
      if (options?.limit) {
        params.append('limit', options.limit.toString());
      }
      if (options?.kind) {
        params.append('kind', options.kind);
      }
      if (options?.pagingId) {
        params.append('paging_id', options.pagingId);
      }

      const queryString = params.toString();
      const url = `${transferServer}/transactions${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Transactions list failed: ${response.status} - ${errorBody}`);
      }

      const data = (await response.json()) as {
        transactions: Sep24Transaction[];
      };
      return data.transactions;
    } catch (error) {
      throw new StellarAuthError('Failed to list transactions', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get exchange rate quote from the anchor
   * @param authToken JWT token
   * @param sellAsset Asset to sell (e.g., 'iso4217:USD' or 'stellar:USDC:issuer')
   * @param buyAsset Asset to buy
   * @param sellAmount Amount to sell
   * @returns Quote with rate and fees
   */
  async getQuote(
    authToken: string,
    sellAsset: string,
    buyAsset: string,
    sellAmount: string,
  ): Promise<{
    id: string;
    expiresAt: string;
    price: string;
    sellAmount: string;
    buyAmount: string;
    fee: {
      total: string;
      asset: string;
    };
  }> {
    const domain = this.config.anchorDomain;

    if (!domain) {
      throw new StellarAuthError('Anchor domain not configured');
    }

    try {
      const transferServer = await this.getTransferServerUrl(domain);

      const response = await fetch(`${transferServer}/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sell_asset: sellAsset,
          buy_asset: buyAsset,
          sell_amount: sellAmount,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Quote request failed: ${response.status} - ${errorBody}`);
      }

      const data = (await response.json()) as {
        id: string;
        expires_at: string;
        price: string;
        sell_amount: string;
        buy_amount: string;
        fee: {
          total: string;
          asset: string;
        };
      };

      return {
        id: data.id,
        expiresAt: data.expires_at,
        price: data.price,
        sellAmount: data.sell_amount,
        buyAmount: data.buy_amount,
        fee: data.fee,
      };
    } catch (error) {
      throw new StellarAuthError('Failed to get quote', {
        sellAsset,
        buyAsset,
        sellAmount,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Map SEP-24 transaction status to our internal status
   * @param sep24Status SEP-24 status string
   * @returns Mapped internal status
   */
  mapTransactionStatus(
    sep24Status: string,
  ): 'pending' | 'processing' | 'completed' | 'failed' | 'expired' {
    switch (sep24Status) {
      case 'completed':
        return 'completed';
      case 'error':
      case 'no_market':
        return 'failed';
      case 'expired':
        return 'expired';
      case 'pending_stellar':
      case 'pending_external':
      case 'pending_anchor':
        return 'processing';
      case 'incomplete':
      case 'pending_user_transfer_start':
      case 'pending_user_transfer_complete':
      case 'pending_trust':
      case 'pending_user':
      default:
        return 'pending';
    }
  }
}
