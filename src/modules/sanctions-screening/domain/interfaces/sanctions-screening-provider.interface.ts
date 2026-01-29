/**
 * Sanctions Screening Provider Interface
 *
 * Abstraction for external sanctions screening providers like:
 * - ComplyAdvantage
 * - Refinitiv World-Check
 * - Dow Jones Risk & Compliance
 * - LexisNexis Bridger
 * - OFAC SDN API
 */

export interface IndividualScreeningRequest {
  name: string;
  dateOfBirth?: Date;
  nationality?: string;
  identificationNumber?: string;
  phone?: string;
}

export interface EntityScreeningRequest {
  name: string;
  country?: string;
  registrationNumber?: string;
}

export interface BatchScreeningRequest {
  individuals?: IndividualScreeningRequest[];
  entities?: EntityScreeningRequest[];
}

export interface ScreeningMatchDetail {
  matchId: string;
  matchedName: string;
  listType: 'sanctions' | 'pep' | 'adverse_media' | 'enforcement';
  source: string; // e.g., "OFAC SDN", "EU Sanctions", "UN Security Council"
  score: number; // 0-100
  matchType: 'exact' | 'fuzzy' | 'alias' | 'partial';
  aliases?: string[];
  dateOfBirth?: Date;
  nationality?: string;
  identifiers?: Record<string, string>;
  additionalInfo?: Record<string, any>;
}

export interface ScreeningResult {
  requestId: string;
  screened: boolean;
  timestamp: Date;
  matches: ScreeningMatchDetail[];
  totalMatches: number;
  highestScore: number;
  riskLevel: 'high' | 'medium' | 'low' | 'none';
  requiresReview: boolean;
  autoBlocked: boolean;
}

export interface BatchScreeningResult {
  requestId: string;
  screened: boolean;
  timestamp: Date;
  results: Array<{
    reference: string;
    name: string;
    result: ScreeningResult;
  }>;
}

export abstract class SanctionsScreeningProvider {
  /**
   * Screen an individual against sanctions, PEP, and adverse media lists
   */
  abstract screenIndividual(
    request: IndividualScreeningRequest,
  ): Promise<ScreeningResult>;

  /**
   * Screen an entity/organization
   */
  abstract screenEntity(
    request: EntityScreeningRequest,
  ): Promise<ScreeningResult>;

  /**
   * Batch screen multiple individuals/entities
   */
  abstract batchScreen(
    request: BatchScreeningRequest,
  ): Promise<BatchScreeningResult>;

  /**
   * Get detailed information about a specific match
   */
  abstract getMatchDetails(matchId: string): Promise<ScreeningMatchDetail>;

  /**
   * Health check for provider connectivity
   */
  abstract healthCheck(): Promise<boolean>;
}
