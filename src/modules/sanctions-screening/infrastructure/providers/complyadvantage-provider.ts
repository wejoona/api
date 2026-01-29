import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  SanctionsScreeningProvider,
  IndividualScreeningRequest,
  EntityScreeningRequest,
  BatchScreeningRequest,
  ScreeningResult,
  BatchScreeningResult,
  ScreeningMatchDetail,
} from '../../domain/interfaces/sanctions-screening-provider.interface';

/**
 * ComplyAdvantage Sanctions Screening Provider
 *
 * Integration with ComplyAdvantage API for real-time sanctions,
 * PEP, and adverse media screening.
 *
 * API Documentation: https://docs.complyadvantage.com/
 *
 * Features:
 * - Real-time screening against 600+ sanctions lists
 * - PEP database (3M+ records)
 * - Adverse media monitoring
 * - Ongoing monitoring
 *
 * Configuration:
 * - COMPLYADVANTAGE_API_KEY: API key
 * - COMPLYADVANTAGE_BASE_URL: API base URL (default: https://api.complyadvantage.com)
 * - COMPLYADVANTAGE_FUZZINESS: Match sensitivity (0.0-1.0, default: 0.8)
 */
@Injectable()
export class ComplyAdvantageProvider extends SanctionsScreeningProvider {
  private readonly logger = new Logger(ComplyAdvantageProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fuzziness: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    super();
    this.apiKey = this.configService.get<string>(
      'COMPLYADVANTAGE_API_KEY',
      '',
    );
    this.baseUrl = this.configService.get<string>(
      'COMPLYADVANTAGE_BASE_URL',
      'https://api.complyadvantage.com',
    );
    this.fuzziness = this.configService.get<number>(
      'COMPLYADVANTAGE_FUZZINESS',
      0.8,
    );
  }

  async screenIndividual(
    request: IndividualScreeningRequest,
  ): Promise<ScreeningResult> {
    this.logger.log(
      `Screening individual via ComplyAdvantage: ${request.name}`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/searches`,
          {
            search_term: request.name,
            fuzziness: this.fuzziness,
            filters: {
              types: ['sanction', 'warning', 'fitness-probity', 'pep'],
              birth_year: request.dateOfBirth?.getFullYear(),
              entity_type: 'person',
            },
            share_url: 1,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: this.apiKey,
            },
          },
        ),
      );

      return this.parseSearchResponse(response.data);
    } catch (error) {
      this.logger.error(
        `ComplyAdvantage screening failed: ${error.message}`,
      );
      throw new Error(`Sanctions screening failed: ${error.message}`);
    }
  }

  async screenEntity(
    request: EntityScreeningRequest,
  ): Promise<ScreeningResult> {
    this.logger.log(`Screening entity via ComplyAdvantage: ${request.name}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/searches`,
          {
            search_term: request.name,
            fuzziness: this.fuzziness,
            filters: {
              types: ['sanction', 'warning'],
              entity_type: 'organisation',
              country_codes: request.country ? [request.country] : undefined,
            },
            share_url: 1,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: this.apiKey,
            },
          },
        ),
      );

      return this.parseSearchResponse(response.data);
    } catch (error) {
      this.logger.error(
        `ComplyAdvantage entity screening failed: ${error.message}`,
      );
      throw new Error(`Entity screening failed: ${error.message}`);
    }
  }

  async batchScreen(
    request: BatchScreeningRequest,
  ): Promise<BatchScreeningResult> {
    this.logger.log('Batch screening via ComplyAdvantage');

    const results: BatchScreeningResult['results'] = [];

    // ComplyAdvantage doesn't have native batch API, so we'll process sequentially
    if (request.individuals) {
      for (const individual of request.individuals) {
        const result = await this.screenIndividual(individual);
        results.push({
          reference: individual.name,
          name: individual.name,
          result,
        });
      }
    }

    if (request.entities) {
      for (const entity of request.entities) {
        const result = await this.screenEntity(entity);
        results.push({
          reference: entity.name,
          name: entity.name,
          result,
        });
      }
    }

    return {
      requestId: `batch-${Date.now()}`,
      screened: true,
      timestamp: new Date(),
      results,
    };
  }

  async getMatchDetails(matchId: string): Promise<ScreeningMatchDetail> {
    this.logger.log(`Getting ComplyAdvantage match details: ${matchId}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/searches/${matchId}`, {
          headers: {
            Authorization: this.apiKey,
          },
        }),
      );

      const data = response.data.data;
      const hit = data.hits?.[0]; // Get first hit

      if (!hit) {
        throw new Error('Match not found');
      }

      return this.parseHit(hit);
    } catch (error) {
      this.logger.error(
        `Failed to get match details: ${error.message}`,
      );
      throw new Error(`Failed to get match details: ${error.message}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/health`, {
          headers: {
            Authorization: this.apiKey,
          },
        }),
      );
      return true;
    } catch (error) {
      this.logger.error(`ComplyAdvantage health check failed: ${error.message}`);
      return false;
    }
  }

  private parseSearchResponse(data: any): ScreeningResult {
    const requestId = data.data?.id || `search-${Date.now()}`;
    const hits = data.data?.hits || [];

    const matches: ScreeningMatchDetail[] = hits.map((hit: any) =>
      this.parseHit(hit),
    );

    const highestScore =
      matches.length > 0 ? Math.max(...matches.map((m) => m.score)) : 0;
    const riskLevel = this.calculateRiskLevel(highestScore);
    const autoBlocked = highestScore >= 95;
    const requiresReview = !autoBlocked && highestScore >= 70;

    return {
      requestId,
      screened: true,
      timestamp: new Date(),
      matches,
      totalMatches: matches.length,
      highestScore,
      riskLevel,
      requiresReview,
      autoBlocked,
    };
  }

  private parseHit(hit: any): ScreeningMatchDetail {
    const listType = this.mapListType(hit.doc?.types || []);
    const sources = hit.doc?.sources || [];
    const primarySource = sources[0]?.name || 'ComplyAdvantage';

    return {
      matchId: hit.doc?.id || hit.id,
      matchedName: hit.doc?.name || '',
      listType,
      source: primarySource,
      score: Math.round((hit.match_score || 0) * 100),
      matchType: this.mapMatchType(hit.match_score),
      aliases: hit.doc?.aka || [],
      dateOfBirth: hit.doc?.dob?.[0]
        ? new Date(hit.doc.dob[0])
        : undefined,
      nationality: hit.doc?.country_codes?.[0],
      identifiers: this.parseIdentifiers(hit.doc?.fields || []),
      additionalInfo: {
        entityType: hit.doc?.entity_type,
        sources: sources.map((s: any) => s.name),
        lastUpdated: hit.doc?.last_updated_utc,
        pepLevel: hit.doc?.pep_level,
      },
    };
  }

  private mapListType(types: string[]): ScreeningMatchDetail['listType'] {
    if (types.includes('sanction')) return 'sanctions';
    if (types.includes('pep')) return 'pep';
    if (types.includes('warning') || types.includes('adverse-media'))
      return 'adverse_media';
    if (types.includes('fitness-probity')) return 'enforcement';
    return 'sanctions'; // default
  }

  private mapMatchType(score: number): ScreeningMatchDetail['matchType'] {
    if (score >= 0.95) return 'exact';
    if (score >= 0.80) return 'fuzzy';
    if (score >= 0.60) return 'alias';
    return 'partial';
  }

  private parseIdentifiers(fields: any[]): Record<string, string> {
    const identifiers: Record<string, string> = {};

    for (const field of fields) {
      if (field.name === 'passport_number') {
        identifiers.passport = field.value;
      } else if (field.name === 'national_id') {
        identifiers.nationalId = field.value;
      } else if (field.name === 'tax_id') {
        identifiers.taxId = field.value;
      }
    }

    return identifiers;
  }

  private calculateRiskLevel(
    score: number,
  ): 'high' | 'medium' | 'low' | 'none' {
    if (score >= 85) return 'high';
    if (score >= 70) return 'medium';
    if (score >= 50) return 'low';
    return 'none';
  }
}
