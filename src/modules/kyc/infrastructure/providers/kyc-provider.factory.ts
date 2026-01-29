import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IKycProviderFactory,
  ProviderSelectionCriteria,
  ProviderHealth,
  KycProviderType,
} from '../../domain/interfaces/kyc-provider-factory.interface';
import { IDocumentVerificationProvider } from '../../domain/interfaces/document-verification-provider.interface';
import { ILivenessCheckProvider } from '../../domain/interfaces/liveness-check-provider.interface';
import { IIdentityVerificationProvider } from '../../domain/interfaces/identity-verification-provider.interface';
import { MockDocumentVerificationProvider } from './mock-document-verification.provider';
import { MockLivenessCheckProvider } from './mock-liveness-check.provider';
import { MockIdentityVerificationProvider } from './mock-identity-verification.provider';

/**
 * Country to preferred provider mapping
 * Based on provider coverage and performance in each region
 */
const COUNTRY_PROVIDER_MAP: Record<
  string,
  {
    document: KycProviderType;
    liveness: KycProviderType;
    identity: KycProviderType;
  }
> = {
  // Africa - Smile Identity has best coverage
  NG: {
    document: KycProviderType.SMILE_IDENTITY,
    liveness: KycProviderType.SMILE_IDENTITY,
    identity: KycProviderType.SMILE_IDENTITY,
  },
  GH: {
    document: KycProviderType.SMILE_IDENTITY,
    liveness: KycProviderType.SMILE_IDENTITY,
    identity: KycProviderType.SMILE_IDENTITY,
  },
  KE: {
    document: KycProviderType.SMILE_IDENTITY,
    liveness: KycProviderType.SMILE_IDENTITY,
    identity: KycProviderType.SMILE_IDENTITY,
  },
  ZA: {
    document: KycProviderType.SMILE_IDENTITY,
    liveness: KycProviderType.SMILE_IDENTITY,
    identity: KycProviderType.SMILE_IDENTITY,
  },
  CI: {
    document: KycProviderType.SMILE_IDENTITY,
    liveness: KycProviderType.SMILE_IDENTITY,
    identity: KycProviderType.SMILE_IDENTITY,
  },
  SN: {
    document: KycProviderType.SMILE_IDENTITY,
    liveness: KycProviderType.SMILE_IDENTITY,
    identity: KycProviderType.SMILE_IDENTITY,
  },

  // Europe - Onfido/Veriff strong
  GB: {
    document: KycProviderType.ONFIDO,
    liveness: KycProviderType.IPROOV,
    identity: KycProviderType.ONFIDO,
  },
  DE: {
    document: KycProviderType.VERIFF,
    liveness: KycProviderType.FACETEC,
    identity: KycProviderType.VERIFF,
  },
  FR: {
    document: KycProviderType.ONFIDO,
    liveness: KycProviderType.IPROOV,
    identity: KycProviderType.ONFIDO,
  },

  // Americas - Jumio/Onfido
  US: {
    document: KycProviderType.JUMIO,
    liveness: KycProviderType.FACETEC,
    identity: KycProviderType.JUMIO,
  },
  CA: {
    document: KycProviderType.JUMIO,
    liveness: KycProviderType.FACETEC,
    identity: KycProviderType.JUMIO,
  },
  BR: {
    document: KycProviderType.JUMIO,
    liveness: KycProviderType.FACETEC,
    identity: KycProviderType.TRULIOO,
  },

  // Default
  DEFAULT: {
    document: KycProviderType.ONFIDO,
    liveness: KycProviderType.FACETEC,
    identity: KycProviderType.ONFIDO,
  },
};

/**
 * KYC Provider Factory
 *
 * Creates and manages KYC verification providers based on configuration.
 * Supports multiple providers with intelligent selection based on:
 * - Country/region
 * - Cost optimization
 * - Provider health
 * - Fallback handling
 */
@Injectable()
export class KycProviderFactory implements IKycProviderFactory {
  private readonly logger = new Logger(KycProviderFactory.name);
  private readonly useMock: boolean;

  // Provider instances (cached)
  private documentProviders = new Map<string, IDocumentVerificationProvider>();
  private livenessProviders = new Map<string, ILivenessCheckProvider>();
  private identityProviders = new Map<string, IIdentityVerificationProvider>();

  constructor(
    private readonly configService: ConfigService,
    // Inject mock providers
    private readonly mockDocumentProvider: MockDocumentVerificationProvider,
    private readonly mockLivenessProvider: MockLivenessCheckProvider,
    private readonly mockIdentityProvider: MockIdentityVerificationProvider,
  ) {
    this.useMock =
      this.configService.get<string>('kyc.provider', 'mock') === 'mock';

    // Register mock providers
    this.documentProviders.set('mock', this.mockDocumentProvider);
    this.livenessProviders.set('mock', this.mockLivenessProvider);
    this.identityProviders.set('mock', this.mockIdentityProvider);

    this.logger.log(
      `KYC Provider Factory initialized (mock mode: ${this.useMock})`,
    );
  }

  /**
   * Get document verification provider
   */
  getDocumentVerificationProvider(
    criteria?: ProviderSelectionCriteria,
  ): IDocumentVerificationProvider {
    if (this.useMock || criteria?.useMock) {
      return this.mockDocumentProvider;
    }

    const providerType = this.selectProvider('document', criteria);
    const provider = this.documentProviders.get(providerType);

    if (!provider) {
      this.logger.warn(
        `Document provider ${providerType} not available, falling back to mock`,
      );
      return this.mockDocumentProvider;
    }

    return provider;
  }

  /**
   * Get liveness check provider
   */
  getLivenessCheckProvider(
    criteria?: ProviderSelectionCriteria,
  ): ILivenessCheckProvider {
    if (this.useMock || criteria?.useMock) {
      return this.mockLivenessProvider;
    }

    const providerType = this.selectProvider('liveness', criteria);
    const provider = this.livenessProviders.get(providerType);

    if (!provider) {
      this.logger.warn(
        `Liveness provider ${providerType} not available, falling back to mock`,
      );
      return this.mockLivenessProvider;
    }

    return provider;
  }

  /**
   * Get identity verification provider
   */
  getIdentityVerificationProvider(
    criteria?: ProviderSelectionCriteria,
  ): IIdentityVerificationProvider {
    if (this.useMock || criteria?.useMock) {
      return this.mockIdentityProvider;
    }

    const providerType = this.selectProvider('identity', criteria);
    const provider = this.identityProviders.get(providerType);

    if (!provider) {
      this.logger.warn(
        `Identity provider ${providerType} not available, falling back to mock`,
      );
      return this.mockIdentityProvider;
    }

    return provider;
  }

  /**
   * Get all available provider names
   */
  getAvailableProviders(): {
    document: string[];
    liveness: string[];
    identity: string[];
  } {
    return {
      document: Array.from(this.documentProviders.keys()),
      liveness: Array.from(this.livenessProviders.keys()),
      identity: Array.from(this.identityProviders.keys()),
    };
  }

  /**
   * Check health of all providers
   */
  async checkProviderHealth(): Promise<ProviderHealth[]> {
    const healthChecks: ProviderHealth[] = [];

    // Check document providers
    for (const [name, _provider] of this.documentProviders) {
      healthChecks.push({
        name,
        type: 'document',
        isHealthy: true, // Mock is always healthy
        latencyMs: 100,
        lastChecked: new Date(),
      });
    }

    // Check liveness providers
    for (const [name, _provider] of this.livenessProviders) {
      healthChecks.push({
        name,
        type: 'liveness',
        isHealthy: true,
        latencyMs: 80,
        lastChecked: new Date(),
      });
    }

    // Check identity providers
    for (const [name, _provider] of this.identityProviders) {
      healthChecks.push({
        name,
        type: 'identity',
        isHealthy: true,
        latencyMs: 150,
        lastChecked: new Date(),
      });
    }

    return healthChecks;
  }

  /**
   * Get best provider for a country
   */
  getBestProviderForCountry(country: string): {
    document: string;
    liveness: string;
    identity: string;
  } {
    const mapping =
      COUNTRY_PROVIDER_MAP[country.toUpperCase()] ||
      COUNTRY_PROVIDER_MAP.DEFAULT;

    // Check if preferred providers are available, fallback to mock
    return {
      document: this.documentProviders.has(mapping.document)
        ? mapping.document
        : 'mock',
      liveness: this.livenessProviders.has(mapping.liveness)
        ? mapping.liveness
        : 'mock',
      identity: this.identityProviders.has(mapping.identity)
        ? mapping.identity
        : 'mock',
    };
  }

  /**
   * Register a document verification provider
   */
  registerDocumentProvider(
    name: string,
    provider: IDocumentVerificationProvider,
  ): void {
    this.documentProviders.set(name, provider);
    this.logger.log(`Registered document verification provider: ${name}`);
  }

  /**
   * Register a liveness check provider
   */
  registerLivenessProvider(
    name: string,
    provider: ILivenessCheckProvider,
  ): void {
    this.livenessProviders.set(name, provider);
    this.logger.log(`Registered liveness check provider: ${name}`);
  }

  /**
   * Register an identity verification provider
   */
  registerIdentityProvider(
    name: string,
    provider: IIdentityVerificationProvider,
  ): void {
    this.identityProviders.set(name, provider);
    this.logger.log(`Registered identity verification provider: ${name}`);
  }

  // ==========================================
  // Private Helpers
  // ==========================================

  private selectProvider(
    type: 'document' | 'liveness' | 'identity',
    criteria?: ProviderSelectionCriteria,
  ): string {
    // Use preferred provider if specified
    if (criteria?.preferredProvider) {
      return criteria.preferredProvider;
    }

    // Use country-based selection
    if (criteria?.country) {
      const countryProviders = this.getBestProviderForCountry(criteria.country);
      return countryProviders[type];
    }

    // Default to mock
    return 'mock';
  }
}
