import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
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
 * Mock Sanctions Screening Provider
 *
 * For development and testing purposes.
 * Simulates external provider behavior with configurable test scenarios.
 *
 * Test Triggers:
 * - Name contains "SANCTION" -> High-risk sanctions match
 * - Name contains "PEP" -> PEP match
 * - Phone contains "666" -> Exact match (auto-block)
 * - Name contains "FUZZY" -> Fuzzy match requiring review
 */
@Injectable()
export class MockSanctionsProvider extends SanctionsScreeningProvider {
  private readonly logger = new Logger(MockSanctionsProvider.name);

  // Mock watchlist entries
  private readonly mockWatchlist = [
    {
      matchId: 'OFAC-SDN-001',
      name: 'John Sanction Test',
      listType: 'sanctions' as const,
      source: 'OFAC SDN List',
      aliases: ['J. Sanction', 'Johnny Sanction'],
      nationality: 'RU',
    },
    {
      matchId: 'EU-SANC-001',
      name: 'Vladimir Putin',
      listType: 'sanctions' as const,
      source: 'EU Consolidated List',
      aliases: [],
      nationality: 'RU',
    },
    {
      matchId: 'PEP-001',
      name: 'Alassane Ouattara',
      listType: 'pep' as const,
      source: 'World-Check PEP Database',
      aliases: [],
      nationality: 'CI',
    },
    {
      matchId: 'PEP-002',
      name: 'Macky Sall',
      listType: 'pep' as const,
      source: 'World-Check PEP Database',
      aliases: [],
      nationality: 'SN',
    },
    {
      matchId: 'ADV-001',
      name: 'Fraud Test Entity',
      listType: 'adverse_media' as const,
      source: 'Dow Jones Adverse Media',
      aliases: ['Fraud Inc'],
      nationality: 'NG',
    },
  ];

  async screenIndividual(
    request: IndividualScreeningRequest,
  ): Promise<ScreeningResult> {
    this.logger.log(
      `[MOCK] Screening individual: ${request.name}`,
    );

    const requestId = uuidv4();
    const matches: ScreeningMatchDetail[] = [];

    // Check for test triggers in name
    const name = request.name.toLowerCase();

    // Exact match trigger (auto-block)
    if (name.includes('sanction') || request.phone?.includes('666')) {
      matches.push({
        matchId: 'OFAC-SDN-001',
        matchedName: 'John Sanction Test',
        listType: 'sanctions',
        source: 'OFAC SDN List',
        score: 98,
        matchType: 'exact',
        aliases: ['J. Sanction', 'Johnny Sanction'],
        nationality: 'RU',
        identifiers: {
          passport: ['RU123456'],
        },
        additionalInfo: {
          program: 'UKRAINE-EO13662',
          remarks: 'Blocked for sanctions violations',
        },
      });
    }

    // PEP match trigger
    if (name.includes('pep') || name.includes('ouattara') || name.includes('sall')) {
      matches.push({
        matchId: 'PEP-001',
        matchedName: 'Political Figure',
        listType: 'pep',
        source: 'World-Check PEP Database',
        score: 85,
        matchType: 'fuzzy',
        nationality: 'CI',
        additionalInfo: {
          position: 'Former President',
          pepClass: 'Head of State',
        },
      });
    }

    // Fuzzy match trigger (requires review)
    if (name.includes('fuzzy')) {
      matches.push({
        matchId: 'FUZZY-001',
        matchedName: 'Similar Name Person',
        listType: 'sanctions',
        source: 'UN Security Council',
        score: 72,
        matchType: 'fuzzy',
        nationality: 'SY',
        additionalInfo: {
          confidence: 'medium',
        },
      });
    }

    // Adverse media trigger
    if (name.includes('fraud') || name.includes('scam')) {
      matches.push({
        matchId: 'ADV-001',
        matchedName: 'Fraud Test Entity',
        listType: 'adverse_media',
        source: 'Dow Jones Adverse Media',
        score: 65,
        matchType: 'partial',
        aliases: ['Fraud Inc'],
        additionalInfo: {
          category: 'Financial Crime',
          articleDate: '2024-01-15',
        },
      });
    }

    const highestScore = matches.length > 0 ? Math.max(...matches.map(m => m.score)) : 0;
    const riskLevel = this.calculateRiskLevel(highestScore);
    const autoBlocked = highestScore >= 95;
    const requiresReview = !autoBlocked && highestScore >= 70;

    this.logger.log(
      `[MOCK] Screening complete: ${matches.length} matches, highest score: ${highestScore}`,
    );

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

  async screenEntity(
    request: EntityScreeningRequest,
  ): Promise<ScreeningResult> {
    this.logger.log(`[MOCK] Screening entity: ${request.name}`);

    const requestId = uuidv4();
    const matches: ScreeningMatchDetail[] = [];

    const name = request.name.toLowerCase();

    // Sanctions entity trigger
    if (name.includes('sanction') || name.includes('blocked')) {
      matches.push({
        matchId: 'ENT-SANC-001',
        matchedName: 'Sanctioned Corporation',
        listType: 'sanctions',
        source: 'OFAC SDN List',
        score: 95,
        matchType: 'exact',
        additionalInfo: {
          type: 'Entity',
          program: 'RUSSIA-EO14024',
        },
      });
    }

    const highestScore = matches.length > 0 ? Math.max(...matches.map(m => m.score)) : 0;
    const riskLevel = this.calculateRiskLevel(highestScore);

    return {
      requestId,
      screened: true,
      timestamp: new Date(),
      matches,
      totalMatches: matches.length,
      highestScore,
      riskLevel,
      requiresReview: highestScore >= 70 && highestScore < 95,
      autoBlocked: highestScore >= 95,
    };
  }

  async batchScreen(
    request: BatchScreeningRequest,
  ): Promise<BatchScreeningResult> {
    this.logger.log(
      `[MOCK] Batch screening: ${request.individuals?.length || 0} individuals, ${request.entities?.length || 0} entities`,
    );

    const requestId = uuidv4();
    const results: BatchScreeningResult['results'] = [];

    // Screen individuals
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

    // Screen entities
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
      requestId,
      screened: true,
      timestamp: new Date(),
      results,
    };
  }

  async getMatchDetails(matchId: string): Promise<ScreeningMatchDetail> {
    this.logger.log(`[MOCK] Getting match details for: ${matchId}`);

    const entry = this.mockWatchlist.find(e => e.matchId === matchId);

    if (!entry) {
      throw new Error(`Match ${matchId} not found`);
    }

    return {
      matchId: entry.matchId,
      matchedName: entry.name,
      listType: entry.listType,
      source: entry.source,
      score: 100,
      matchType: 'exact',
      aliases: entry.aliases,
      nationality: entry.nationality,
      identifiers: {},
      additionalInfo: {
        lastUpdated: new Date().toISOString(),
        verificationStatus: 'verified',
      },
    };
  }

  async healthCheck(): Promise<boolean> {
    this.logger.log('[MOCK] Health check');
    return true;
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
