/**
 * Circle Compliance Engine Adapter
 *
 * Integrates Circle's Compliance Engine for blockchain address screening.
 * This is an ADDITIONAL security layer on top of our internal risk assessment.
 *
 * Features:
 * - Address screening against sanctions, terrorist financing, illicit activity
 * - Real-time transaction screening (embedded mode)
 * - Standalone address checks before allowing withdrawals
 *
 * @see https://developers.circle.com/wallets/compliance-engine
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

// Risk categories from Circle Compliance Engine
export type CircleRiskCategory =
  | 'SANCTIONS'
  | 'CSAM'
  | 'ILLICIT_BEHAVIOR'
  | 'GAMBLING'
  | 'TERRORIST_FINANCING'
  | 'UNSUPPORTED'
  | 'FROZEN'
  | 'OTHER'
  | 'HIGH_RISK_INDUSTRY'
  | 'PEP'
  | 'TRUSTED'
  | 'HACKING'
  | 'HUMAN_TRAFFICKING'
  | 'SPECIAL_MEASURES';

export type ScreeningDecision = 'APPROVED' | 'DENIED';

export interface AddressScreeningRequest {
  address: string;
  chain: CircleBlockchain;
}

export type CircleBlockchain =
  | 'ETH'
  | 'MATIC'
  | 'ARB'
  | 'AVAX'
  | 'BASE'
  | 'OP'
  | 'SOL'
  | 'NEAR'
  | 'APTOS';

export interface RiskSignal {
  category: CircleRiskCategory;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description?: string;
  source?: string;
}

export interface AddressScreeningResult {
  address: string;
  chain: CircleBlockchain;
  decision: ScreeningDecision;
  riskSignals: RiskSignal[];
  screenedAt: Date;
  // Details from vendor response (if available)
  vendorDetails?: {
    provider: string;
    findings: string[];
  };
}

export interface TransactionScreeningRequest {
  transactionId: string;
  sourceAddress: string;
  destinationAddress: string;
  amount: string;
  currency: string;
  chain: CircleBlockchain;
}

export interface TransactionScreeningResult {
  transactionId: string;
  decision: ScreeningDecision;
  sourceScreening: AddressScreeningResult;
  destinationScreening: AddressScreeningResult;
  matchedRules: string[];
  requiresReview: boolean;
  screenedAt: Date;
}

// Cached screening result with TTL
interface CachedScreeningResult {
  result: AddressScreeningResult;
  cachedAt: number;
}

@Injectable()
export class CircleComplianceAdapter {
  private readonly logger = new Logger(CircleComplianceAdapter.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly enabled: boolean;

  // Cache screening results for 5 minutes to avoid redundant API calls
  private readonly screeningCache = new Map<string, CachedScreeningResult>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  // High-risk categories that should always block
  private readonly BLOCKING_CATEGORIES: CircleRiskCategory[] = [
    'SANCTIONS',
    'TERRORIST_FINANCING',
    'HUMAN_TRAFFICKING',
    'CSAM',
    'HACKING',
    'FROZEN',
  ];

  // Categories that require manual review
  private readonly REVIEW_CATEGORIES: CircleRiskCategory[] = [
    'ILLICIT_BEHAVIOR',
    'HIGH_RISK_INDUSTRY',
    'PEP',
    'SPECIAL_MEASURES',
    'GAMBLING',
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiUrl = this.configService.get<string>(
      'circle.apiUrl',
      'https://api.circle.com',
    );
    this.apiKey = this.configService.get<string>('circle.apiKey', '');

    // Compliance Engine requires separate enablement
    const complianceEnabled = this.configService.get<boolean>(
      'circle.complianceEnabled',
      false,
    );
    this.enabled = complianceEnabled && !!this.apiKey;

    if (!this.enabled) {
      this.logger.warn(
        'Circle Compliance Engine is DISABLED. Set CIRCLE_COMPLIANCE_ENABLED=true to enable.',
      );
    } else {
      this.logger.log('Circle Compliance Engine initialized');
    }
  }

  /**
   * Check if Compliance Engine is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Screen a blockchain address
   *
   * This should be called BEFORE allowing any external transfer or withdrawal
   * to ensure the destination address is not sanctioned or high-risk.
   */
  async screenAddress(
    request: AddressScreeningRequest,
  ): Promise<AddressScreeningResult> {
    const cacheKey = `${request.chain}:${request.address.toLowerCase()}`;

    // Check cache first
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      this.logger.debug(`Using cached screening result for ${cacheKey}`);
      return cached;
    }

    // If not enabled, return mock approved result
    if (!this.enabled) {
      return this.getMockScreeningResult(request);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<CircleScreeningResponse>(
          `${this.apiUrl}/v1/w3s/compliance/screening/addresses`,
          {
            address: request.address,
            blockchain: request.chain,
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000, // 10 second timeout
          },
        ),
      );

      const result = this.mapCircleResponse(request, response.data);

      // Cache the result
      this.cacheResult(cacheKey, result);

      // Log for audit trail
      this.logScreeningResult(result);

      return result;
    } catch (error) {
      return this.handleScreeningError(request, error);
    }
  }

  /**
   * Screen a transaction (both source and destination)
   *
   * This performs comprehensive screening of both addresses involved
   * in a transaction.
   */
  async screenTransaction(
    request: TransactionScreeningRequest,
  ): Promise<TransactionScreeningResult> {
    const [sourceResult, destResult] = await Promise.all([
      this.screenAddress({
        address: request.sourceAddress,
        chain: request.chain,
      }),
      this.screenAddress({
        address: request.destinationAddress,
        chain: request.chain,
      }),
    ]);

    const matchedRules: string[] = [];
    let decision: ScreeningDecision = 'APPROVED';
    let requiresReview = false;

    // Check source address
    if (sourceResult.decision === 'DENIED') {
      decision = 'DENIED';
      matchedRules.push(
        `Source address blocked: ${sourceResult.riskSignals.map((s) => s.category).join(', ')}`,
      );
    }

    // Check destination address
    if (destResult.decision === 'DENIED') {
      decision = 'DENIED';
      matchedRules.push(
        `Destination address blocked: ${destResult.riskSignals.map((s) => s.category).join(', ')}`,
      );
    }

    // Check for review categories
    const allSignals = [...sourceResult.riskSignals, ...destResult.riskSignals];
    const reviewSignals = allSignals.filter((s) =>
      this.REVIEW_CATEGORIES.includes(s.category),
    );

    if (reviewSignals.length > 0 && decision === 'APPROVED') {
      requiresReview = true;
      matchedRules.push(
        `Manual review required: ${reviewSignals.map((s) => s.category).join(', ')}`,
      );
    }

    const result: TransactionScreeningResult = {
      transactionId: request.transactionId,
      decision,
      sourceScreening: sourceResult,
      destinationScreening: destResult,
      matchedRules,
      requiresReview,
      screenedAt: new Date(),
    };

    this.logger.log(
      `Transaction screening completed: ${request.transactionId}`,
      {
        decision,
        matchedRules,
        requiresReview,
      },
    );

    return result;
  }

  /**
   * Check if an address is safe for transactions
   *
   * Convenience method that returns a simple boolean.
   * Use screenAddress() if you need detailed risk signals.
   */
  async isAddressSafe(
    address: string,
    chain: CircleBlockchain = 'MATIC',
  ): Promise<{ safe: boolean; reason?: string }> {
    const result = await this.screenAddress({ address, chain });

    if (result.decision === 'DENIED') {
      return {
        safe: false,
        reason: `Address flagged: ${result.riskSignals.map((s) => s.category).join(', ')}`,
      };
    }

    // Check for high-severity signals that weren't blocked but are concerning
    const highSeveritySignals = result.riskSignals.filter(
      (s) => s.severity === 'HIGH' || s.severity === 'CRITICAL',
    );

    if (highSeveritySignals.length > 0) {
      return {
        safe: false,
        reason: `High-risk signals detected: ${highSeveritySignals.map((s) => s.category).join(', ')}`,
      };
    }

    return { safe: true };
  }

  /**
   * Batch screen multiple addresses
   *
   * Useful for screening all addresses in a transaction history
   * or for periodic compliance reviews.
   */
  async batchScreenAddresses(
    addresses: AddressScreeningRequest[],
  ): Promise<Map<string, AddressScreeningResult>> {
    const results = new Map<string, AddressScreeningResult>();

    // Process in parallel with concurrency limit
    const BATCH_SIZE = 10;
    for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
      const batch = addresses.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((req) => this.screenAddress(req)),
      );

      batchResults.forEach((result, idx) => {
        const key = `${batch[idx].chain}:${batch[idx].address.toLowerCase()}`;
        results.set(key, result);
      });
    }

    return results;
  }

  /**
   * Clear the screening cache
   *
   * Call this if you need to force fresh screening results.
   */
  clearCache(): void {
    this.screeningCache.clear();
    this.logger.log('Screening cache cleared');
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private getCachedResult(key: string): AddressScreeningResult | null {
    const cached = this.screeningCache.get(key);

    if (!cached) {
      return null;
    }

    // Check if cache is still valid
    if (Date.now() - cached.cachedAt > this.CACHE_TTL_MS) {
      this.screeningCache.delete(key);
      return null;
    }

    return cached.result;
  }

  private cacheResult(key: string, result: AddressScreeningResult): void {
    this.screeningCache.set(key, {
      result,
      cachedAt: Date.now(),
    });

    // Clean up old cache entries periodically
    if (this.screeningCache.size > 1000) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.screeningCache.forEach((value, key) => {
      if (now - value.cachedAt > this.CACHE_TTL_MS) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.screeningCache.delete(key));
    this.logger.debug(`Cleaned up ${keysToDelete.length} cached entries`);
  }

  private mapCircleResponse(
    request: AddressScreeningRequest,
    response: CircleScreeningResponse,
  ): AddressScreeningResult {
    const riskSignals: RiskSignal[] = [];

    // Map Circle's risk signals to our format
    if (response.data?.screeningDecision?.signals) {
      for (const signal of response.data.screeningDecision.signals) {
        riskSignals.push({
          category: signal.category as CircleRiskCategory,
          severity: this.mapSeverity(signal.category as CircleRiskCategory),
          description: signal.description,
          source: signal.source,
        });
      }
    }

    // Determine decision based on risk signals
    let decision: ScreeningDecision = 'APPROVED';
    const blockingSignals = riskSignals.filter((s) =>
      this.BLOCKING_CATEGORIES.includes(s.category),
    );

    if (blockingSignals.length > 0) {
      decision = 'DENIED';
    }

    return {
      address: request.address,
      chain: request.chain,
      decision:
        (response.data?.screeningResult as ScreeningDecision) || decision,
      riskSignals,
      screenedAt: new Date(),
      vendorDetails: response.data?.vendorResponse
        ? {
            provider: response.data.vendorResponse.provider || 'circle',
            findings: response.data.vendorResponse.findings || [],
          }
        : undefined,
    };
  }

  private mapSeverity(
    category: CircleRiskCategory,
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (this.BLOCKING_CATEGORIES.includes(category)) {
      return 'CRITICAL';
    }
    if (this.REVIEW_CATEGORIES.includes(category)) {
      return 'HIGH';
    }
    if (category === 'TRUSTED') {
      return 'LOW';
    }
    return 'MEDIUM';
  }

  private getMockScreeningResult(
    request: AddressScreeningRequest,
  ): AddressScreeningResult {
    // In mock mode, check for known test addresses
    const testBlockedAddresses = [
      '0x0000000000000000000000000000000000000000', // Null address
      '0x000000000000000000000000000000000000dead', // Burn address
    ];

    const isBlocked = testBlockedAddresses.some(
      (addr) => addr.toLowerCase() === request.address.toLowerCase(),
    );

    this.logger.debug(`[MOCK] Screening address: ${request.address}`, {
      decision: isBlocked ? 'DENIED' : 'APPROVED',
    });

    return {
      address: request.address,
      chain: request.chain,
      decision: isBlocked ? 'DENIED' : 'APPROVED',
      riskSignals: isBlocked
        ? [
            {
              category: 'ILLICIT_BEHAVIOR',
              severity: 'CRITICAL',
              description: 'Known burn/null address',
            },
          ]
        : [],
      screenedAt: new Date(),
    };
  }

  private handleScreeningError(
    request: AddressScreeningRequest,
    error: unknown,
  ): AddressScreeningResult {
    const axiosError = error as AxiosError;
    const statusCode = axiosError.response?.status;
    const errorMessage =
      axiosError.message || 'Unknown error during address screening';

    this.logger.error(
      `Address screening failed for ${request.address}: ${errorMessage}`,
      {
        statusCode,
        chain: request.chain,
      },
    );

    // On error, fail CLOSED for security - require manual review
    // This ensures we don't accidentally allow a sanctioned address through
    // if the Compliance Engine is temporarily unavailable
    return {
      address: request.address,
      chain: request.chain,
      decision: 'DENIED', // Fail closed!
      riskSignals: [
        {
          category: 'OTHER',
          severity: 'CRITICAL',
          description: `Screening failed: ${errorMessage}. Manual review required.`,
        },
      ],
      screenedAt: new Date(),
    };
  }

  private logScreeningResult(result: AddressScreeningResult): void {
    // Log all screening results for compliance audit trail
    const logLevel =
      result.decision === 'DENIED' || result.riskSignals.length > 0
        ? 'warn'
        : 'debug';

    this.logger[logLevel](`Address screening: ${result.address}`, {
      chain: result.chain,
      decision: result.decision,
      riskSignals: result.riskSignals.map((s) => s.category),
      screenedAt: result.screenedAt,
    });
  }
}

// Circle API Response Types
interface CircleScreeningResponse {
  data?: {
    screeningResult?: string;
    screeningDecision?: {
      signals?: Array<{
        category: string;
        description?: string;
        source?: string;
      }>;
    };
    vendorResponse?: {
      provider?: string;
      findings?: string[];
    };
  };
}
