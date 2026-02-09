/**
 * Stellar SEP-10 Web Authentication Service
 *
 * Implements SEP-10: Stellar Web Authentication protocol.
 * This allows users to prove ownership of a Stellar account to anchors.
 *
 * @see https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';
import {
  Sep10AuthRequest,
  Sep10AuthChallenge,
  Sep10AuthToken,
  StellarAuthError,
  StellarConfig,
  StellarNetwork,
  TESTNET_PASSPHRASE,
  MAINNET_PASSPHRASE,
} from '../stellar.types';

const { Keypair, Transaction } = StellarSdk;

/**
 * SEP-10 Web Authentication Service
 *
 * Handles the SEP-10 authentication flow:
 * 1. Request a challenge from the anchor
 * 2. Sign the challenge with the user's keypair
 * 3. Submit the signed challenge to get a JWT token
 * 4. Use the token for authenticated anchor requests
 */
@Injectable()
export class StellarSep10Service {
  private readonly logger = new Logger(StellarSep10Service.name);
  private readonly config: StellarConfig;
  private readonly networkPassphrase: string;

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

    this.networkPassphrase =
      this.config.network === 'mainnet'
        ? MAINNET_PASSPHRASE
        : TESTNET_PASSPHRASE;

    this.logger.log('Stellar SEP-10 service initialized');
  }

  /**
   * Get the SEP-10 auth endpoint from the anchor's stellar.toml
   * @param domain The anchor domain
   * @returns The WEB_AUTH_ENDPOINT URL
   */
  async getAuthEndpoint(domain: string): Promise<string> {
    try {
      const tomlUrl = `https://${domain}/.well-known/stellar.toml`;
      const response = await fetch(tomlUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch stellar.toml: ${response.status}`);
      }

      const tomlText = await response.text();
      const match = tomlText.match(/WEB_AUTH_ENDPOINT\s*=\s*"([^"]+)"/);

      if (!match) {
        throw new Error('WEB_AUTH_ENDPOINT not found in stellar.toml');
      }

      return match[1];
    } catch (error) {
      throw new StellarAuthError('Failed to get SEP-10 auth endpoint', {
        domain,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Request an authentication challenge from the anchor
   * @param request Auth request parameters
   * @returns The challenge transaction
   */
  async getChallenge(request: Sep10AuthRequest): Promise<Sep10AuthChallenge> {
    const domain = request.homeDomain || this.config.anchorDomain;

    if (!domain) {
      throw new StellarAuthError('Anchor domain not configured');
    }

    try {
      const authEndpoint = await this.getAuthEndpoint(domain);

      // Build the challenge request URL
      const url = new URL(authEndpoint);
      url.searchParams.append('account', request.account);

      if (request.memo) {
        url.searchParams.append('memo', request.memo);
      }

      if (request.homeDomain) {
        url.searchParams.append('home_domain', request.homeDomain);
      }

      if (request.clientDomain) {
        url.searchParams.append('client_domain', request.clientDomain);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Challenge request failed: ${response.status} - ${errorBody}`);
      }

      const data = (await response.json()) as {
        transaction: string;
        network_passphrase: string;
      };

      return {
        transaction: data.transaction,
        networkPassphrase: data.network_passphrase,
      };
    } catch (error) {
      throw new StellarAuthError('Failed to get authentication challenge', {
        account: request.account,
        domain,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Sign the authentication challenge with the user's keypair
   * @param challenge The challenge from getChallenge
   * @param secretKey The user's secret key
   * @returns The signed challenge transaction XDR
   */
  signChallenge(challenge: Sep10AuthChallenge, secretKey: string): string {
    try {
      const keypair = Keypair.fromSecret(secretKey);
      const transaction = new Transaction(
        challenge.transaction,
        challenge.networkPassphrase,
      );

      // Sign the transaction
      transaction.sign(keypair);

      return transaction.toXDR();
    } catch (error) {
      throw new StellarAuthError('Failed to sign challenge', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Submit the signed challenge to get a JWT token
   * @param signedChallenge The signed challenge XDR
   * @param domain The anchor domain
   * @returns JWT token for authenticated requests
   */
  async submitChallenge(
    signedChallenge: string,
    domain?: string,
  ): Promise<Sep10AuthToken> {
    const anchorDomain = domain || this.config.anchorDomain;

    if (!anchorDomain) {
      throw new StellarAuthError('Anchor domain not configured');
    }

    try {
      const authEndpoint = await this.getAuthEndpoint(anchorDomain);

      const response = await fetch(authEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction: signedChallenge,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Token request failed: ${response.status} - ${errorBody}`);
      }

      const data = (await response.json()) as { token: string };

      // Decode JWT to get expiration
      const tokenParts = data.token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid JWT token format');
      }

      const payload = JSON.parse(
        Buffer.from(tokenParts[1], 'base64').toString('utf-8'),
      ) as { exp: number; sub: string };

      return {
        token: data.token,
        expiresAt: new Date(payload.exp * 1000),
        account: payload.sub,
      };
    } catch (error) {
      throw new StellarAuthError('Failed to get auth token', {
        domain: anchorDomain,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Perform the complete SEP-10 authentication flow
   * @param account The Stellar account to authenticate
   * @param secretKey The account's secret key
   * @param domain Optional anchor domain (defaults to config)
   * @returns JWT token for authenticated requests
   */
  async authenticate(
    account: string,
    secretKey: string,
    domain?: string,
  ): Promise<Sep10AuthToken> {
    const anchorDomain = domain || this.config.anchorDomain;

    if (!anchorDomain) {
      throw new StellarAuthError('Anchor domain not configured');
    }

    this.logger.log(`Authenticating account ${account} with ${anchorDomain}`);

    // Step 1: Get challenge
    const challenge = await this.getChallenge({
      account,
      homeDomain: anchorDomain,
    });

    // Step 2: Sign challenge
    const signedChallenge = this.signChallenge(challenge, secretKey);

    // Step 3: Submit and get token
    const token = await this.submitChallenge(signedChallenge, anchorDomain);

    this.logger.log(
      `Authentication successful for ${account}, token expires at ${token.expiresAt.toISOString()}`,
    );

    return token;
  }

  /**
   * Check if a token is still valid (not expired)
   * @param token The auth token to check
   * @returns True if the token is still valid
   */
  isTokenValid(token: Sep10AuthToken): boolean {
    // Add 60 second buffer to account for clock skew
    const bufferMs = 60 * 1000;
    return token.expiresAt.getTime() - bufferMs > Date.now();
  }

  /**
   * Verify a JWT token's signature (basic verification)
   * Note: Full verification requires the anchor's public key
   * @param token The JWT token string
   * @returns True if the token structure is valid
   */
  verifyTokenStructure(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      // Try to decode header and payload
      JSON.parse(Buffer.from(parts[0], 'base64').toString('utf-8'));
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8'),
      ) as { exp?: number };

      // Check expiration if present
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the network passphrase
   * @returns Network passphrase for transaction signing
   */
  getNetworkPassphrase(): string {
    return this.networkPassphrase;
  }
}
