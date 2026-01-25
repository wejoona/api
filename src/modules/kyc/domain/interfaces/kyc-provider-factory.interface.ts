import { IDocumentVerificationProvider } from './document-verification-provider.interface';
import { ILivenessCheckProvider } from './liveness-check-provider.interface';
import { IIdentityVerificationProvider } from './identity-verification-provider.interface';

/**
 * KYC Provider Factory Interface
 *
 * Factory for creating KYC verification providers based on configuration.
 * Allows switching between providers based on:
 * - Country/region
 * - Verification level
 * - Cost optimization
 * - Fallback handling
 */

export const KYC_PROVIDER_FACTORY = Symbol('KYC_PROVIDER_FACTORY');

/**
 * Provider selection criteria
 */
export interface ProviderSelectionCriteria {
  /** Country for verification (ISO 3166-1 alpha-2) */
  country?: string;

  /** Document type */
  documentType?: string;

  /** Verification level required */
  level?: 'basic' | 'standard' | 'enhanced' | 'full';

  /** Preferred provider (if available) */
  preferredProvider?: string;

  /** Use mock provider (for testing) */
  useMock?: boolean;
}

/**
 * Provider health status
 */
export interface ProviderHealth {
  name: string;
  type: 'document' | 'liveness' | 'identity';
  isHealthy: boolean;
  latencyMs?: number;
  lastChecked: Date;
  errorRate?: number;
  message?: string;
}

/**
 * KYC Provider Factory Interface
 */
export interface IKycProviderFactory {
  /**
   * Get document verification provider
   */
  getDocumentVerificationProvider(
    criteria?: ProviderSelectionCriteria,
  ): IDocumentVerificationProvider;

  /**
   * Get liveness check provider
   */
  getLivenessCheckProvider(
    criteria?: ProviderSelectionCriteria,
  ): ILivenessCheckProvider;

  /**
   * Get full identity verification provider
   */
  getIdentityVerificationProvider(
    criteria?: ProviderSelectionCriteria,
  ): IIdentityVerificationProvider;

  /**
   * Get all available provider names
   */
  getAvailableProviders(): {
    document: string[];
    liveness: string[];
    identity: string[];
  };

  /**
   * Check health of all providers
   */
  checkProviderHealth(): Promise<ProviderHealth[]>;

  /**
   * Get best provider for a country
   */
  getBestProviderForCountry(country: string): {
    document: string;
    liveness: string;
    identity: string;
  };
}

/**
 * Supported KYC providers
 */
export enum KycProviderType {
  // Document Verification
  ONFIDO = 'onfido',
  JUMIO = 'jumio',
  VERIFF = 'veriff',
  SMILE_IDENTITY = 'smile_identity',
  TRULIOO = 'trulioo',
  REGULA = 'regula',

  // Liveness
  FACETEC = 'facetec',
  IPROOV = 'iproov',
  LIVENESS_3D = 'liveness_3d',

  // Mock (for testing)
  MOCK = 'mock',
}

/**
 * Provider configuration
 */
export interface KycProviderConfig {
  /** Provider type */
  type: KycProviderType;

  /** API credentials */
  apiKey?: string;
  apiSecret?: string;

  /** API endpoint */
  baseUrl?: string;

  /** Webhook secret */
  webhookSecret?: string;

  /** SDK token (for mobile SDKs) */
  sdkToken?: string;

  /** Priority for selection (lower = higher priority) */
  priority?: number;

  /** Countries supported */
  supportedCountries?: string[];

  /** Is this provider enabled? */
  enabled: boolean;

  /** Use as fallback only? */
  fallbackOnly?: boolean;
}
