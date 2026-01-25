/**
 * Mock Risk Client
 * For development and testing when Risk Manager is not available
 */

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  IRiskClient,
} from '../../domain/interfaces/risk-client.interface';
import {
  TransactionAnalysisRequest,
  TransactionAnalysisResult,
  IndividualScreeningRequest,
  EntityScreeningRequest,
  ScreeningResult,
  VelocityCheckRequest,
  VelocityCheckResult,
  DeviceFingerprint,
  DeviceFingerprintResult,
  UserRiskProfile,
  RiskLevel,
  RiskDecision,
  ScreeningStatus,
} from '../../domain/interfaces/risk-assessment.types';

// Mock sanction list entries for testing
const MOCK_SANCTION_ENTRIES = [
  { name: 'John Terrorist', listCode: 'OFAC_SDN', programs: ['SDGT'] },
  { name: 'Evil Corporation', listCode: 'OFAC_SDN', programs: ['CYBER2'] },
  { name: 'Ahmed Blocked', listCode: 'UN_SC', programs: ['ISIL'] },
  { name: 'Test Sanctioned', listCode: 'EU_FSF', programs: ['SYRIA'] },
];

@Injectable()
export class MockRiskClient implements IRiskClient {
  private readonly logger = new Logger(MockRiskClient.name);
  private readonly deviceRegistry = new Map<string, DeviceFingerprintResult>();
  private readonly velocityCounters = new Map<string, { count: number; resetAt: Date }>();
  private readonly userProfiles = new Map<string, UserRiskProfile>();

  async analyzeTransaction(request: TransactionAnalysisRequest): Promise<TransactionAnalysisResult> {
    this.logger.debug(`[MOCK] Analyzing transaction: ${request.transactionId}`);

    // Simulate processing delay
    await this.delay(50);

    // Calculate risk score based on various factors
    let riskScore = 20; // Base score
    const riskFactors: string[] = [];

    // Amount-based risk
    if (request.amount >= 10000) {
      riskScore += 30;
      riskFactors.push(`High amount: ${request.amount} ${request.currency}`);
    } else if (request.amount >= 5000) {
      riskScore += 15;
      riskFactors.push(`Medium-high amount: ${request.amount} ${request.currency}`);
    }

    // Cross-border risk
    if (request.sourceCountry && request.destinationCountry &&
        request.sourceCountry !== request.destinationCountry) {
      riskScore += 15;
      riskFactors.push(`Cross-border: ${request.sourceCountry} → ${request.destinationCountry}`);
    }

    // External recipient risk
    if (request.recipientType === 'external') {
      riskScore += 10;
      riskFactors.push('External recipient');
    }

    // Device risk
    if (request.deviceFingerprint) {
      if (request.deviceFingerprint.isEmulator) {
        riskScore += 25;
        riskFactors.push('Emulator detected');
      }
      if (request.deviceFingerprint.isRooted) {
        riskScore += 20;
        riskFactors.push('Rooted/jailbroken device');
      }
    }

    // Withdrawal type risk
    if (request.type === 'withdrawal') {
      riskScore += 5;
    }

    // Cap at 100
    riskScore = Math.min(riskScore, 100);

    // Determine risk level and decision
    const { riskLevel, riskDecision } = this.determineRiskLevelAndDecision(riskScore);

    return {
      analysisId: uuidv4(),
      riskScore,
      riskLevel,
      riskDecision,
      riskFactors,
      requiresStepUp: riskDecision === 'review',
      stepUpType: riskDecision === 'review' ? 'biometric' : undefined,
      processedAt: new Date(),
    };
  }

  async analyzeTransactionBatch(requests: TransactionAnalysisRequest[]): Promise<{
    results: TransactionAnalysisResult[];
    summary: {
      total: number;
      byLevel: Record<string, number>;
      byDecision: Record<string, number>;
      averageScore: number;
    };
  }> {
    const results = await Promise.all(requests.map(r => this.analyzeTransaction(r)));

    const byLevel: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    const byDecision: Record<string, number> = { allow: 0, review: 0, block: 0 };
    let totalScore = 0;

    for (const result of results) {
      byLevel[result.riskLevel]++;
      byDecision[result.riskDecision]++;
      totalScore += result.riskScore;
    }

    return {
      results,
      summary: {
        total: results.length,
        byLevel,
        byDecision,
        averageScore: totalScore / results.length,
      },
    };
  }

  async screenIndividual(request: IndividualScreeningRequest): Promise<ScreeningResult> {
    this.logger.debug(`[MOCK] Screening individual: ${request.firstName} ${request.lastName}`);

    await this.delay(100);

    const fullName = `${request.firstName} ${request.lastName}`.toLowerCase();
    const matches = MOCK_SANCTION_ENTRIES
      .filter(entry => {
        const entryName = entry.name.toLowerCase();
        // Check for exact or partial match
        return entryName.includes(fullName) ||
               fullName.includes(entryName.split(' ')[0]) ||
               fullName.includes('sanctioned') ||
               fullName.includes('blocked') ||
               fullName.includes('terrorist');
      })
      .map(entry => ({
        matchId: uuidv4(),
        listCode: entry.listCode,
        listName: this.getListName(entry.listCode),
        entryId: uuidv4(),
        matchedName: entry.name,
        matchConfidence: 'strong' as const,
        matchScore: 85,
        matchedFields: ['name'],
        sanctionPrograms: entry.programs,
      }));

    const status: ScreeningStatus = matches.length > 0 ? 'potential_match' : 'clear';

    return {
      screeningId: uuidv4(),
      referenceId: request.referenceId,
      subjectType: 'individual',
      status,
      totalMatches: matches.length,
      matches,
      screenedAt: new Date(),
      listsScreened: request.listsToScreen || ['OFAC_SDN', 'UN_SC', 'EU_FSF', 'BCEAO_GEL'],
    };
  }

  async screenEntity(request: EntityScreeningRequest): Promise<ScreeningResult> {
    this.logger.debug(`[MOCK] Screening entity: ${request.entityName}`);

    await this.delay(100);

    const entityName = request.entityName.toLowerCase();
    const matches = MOCK_SANCTION_ENTRIES
      .filter(entry => {
        const entryName = entry.name.toLowerCase();
        return entryName.includes(entityName) ||
               entityName.includes('evil') ||
               entityName.includes('blocked');
      })
      .map(entry => ({
        matchId: uuidv4(),
        listCode: entry.listCode,
        listName: this.getListName(entry.listCode),
        entryId: uuidv4(),
        matchedName: entry.name,
        matchConfidence: 'possible' as const,
        matchScore: 72,
        matchedFields: ['name'],
        sanctionPrograms: entry.programs,
      }));

    const status: ScreeningStatus = matches.length > 0 ? 'potential_match' : 'clear';

    return {
      screeningId: uuidv4(),
      referenceId: request.referenceId,
      subjectType: 'entity',
      status,
      totalMatches: matches.length,
      matches,
      screenedAt: new Date(),
      listsScreened: request.listsToScreen || ['OFAC_SDN', 'UN_SC', 'EU_FSF'],
    };
  }

  async screenBatch(requests: (IndividualScreeningRequest | EntityScreeningRequest)[]): Promise<{
    batchId: string;
    status: 'completed' | 'processing';
    results?: ScreeningResult[];
  }> {
    const results = await Promise.all(
      requests.map(r =>
        'firstName' in r ? this.screenIndividual(r) : this.screenEntity(r)
      )
    );

    return {
      batchId: uuidv4(),
      status: 'completed',
      results,
    };
  }

  async getScreeningResult(screeningId: string): Promise<ScreeningResult | null> {
    // In mock, we don't persist results, so return null
    return null;
  }

  async checkVelocity(request: VelocityCheckRequest): Promise<VelocityCheckResult> {
    this.logger.debug(`[MOCK] Checking velocity for user: ${request.userId}`);

    const key = `${request.userId}:${request.checkType}`;
    const now = new Date();

    let counter = this.velocityCounters.get(key);
    if (!counter || counter.resetAt < now) {
      counter = {
        count: 0,
        resetAt: new Date(now.getTime() + request.timeWindowMinutes * 60 * 1000),
      };
    }

    // Increment counter
    counter.count++;
    this.velocityCounters.set(key, counter);

    // Define limits based on check type
    const limits: Record<string, number> = {
      transaction_count: 10,
      transaction_amount: 50000,
      unique_recipients: 5,
      failed_attempts: 3,
    };

    const limit = limits[request.checkType] || 10;

    return {
      checkId: uuidv4(),
      userId: request.userId,
      checkType: request.checkType,
      currentCount: counter.count,
      limit,
      remainingAllowance: Math.max(0, limit - counter.count),
      isExceeded: counter.count > limit,
      resetAt: counter.resetAt,
    };
  }

  async registerDevice(userId: string, fingerprint: DeviceFingerprint): Promise<DeviceFingerprintResult> {
    this.logger.debug(`[MOCK] Registering device for user: ${userId}`);

    const key = `${userId}:${fingerprint.deviceId}`;
    const existing = this.deviceRegistry.get(key);

    const result: DeviceFingerprintResult = {
      fingerprintId: existing?.fingerprintId || uuidv4(),
      isKnownDevice: !!existing,
      deviceTrustScore: this.calculateDeviceTrustScore(fingerprint),
      riskIndicators: this.getDeviceRiskIndicators(fingerprint),
      firstSeenAt: existing?.firstSeenAt || new Date(),
      lastSeenAt: new Date(),
    };

    this.deviceRegistry.set(key, result);
    return result;
  }

  async analyzeDevice(fingerprint: DeviceFingerprint): Promise<DeviceFingerprintResult> {
    return {
      fingerprintId: uuidv4(),
      isKnownDevice: false,
      deviceTrustScore: this.calculateDeviceTrustScore(fingerprint),
      riskIndicators: this.getDeviceRiskIndicators(fingerprint),
    };
  }

  async getUserRiskProfile(userId: string): Promise<UserRiskProfile | null> {
    const existing = this.userProfiles.get(userId);
    if (existing) return existing;

    // Create default profile
    const profile: UserRiskProfile = {
      userId,
      overallRiskScore: 25,
      riskLevel: 'low',
      kycLevel: 1,
      transactionLimits: {
        dailyLimit: 1000,
        monthlyLimit: 10000,
        singleTransactionLimit: 500,
      },
      velocityLimits: {
        maxTransactionsPerHour: 5,
        maxTransactionsPerDay: 20,
        maxUniqueRecipientsPerDay: 10,
      },
      screeningStatus: 'clear',
      riskFactors: [],
      updatedAt: new Date(),
    };

    this.userProfiles.set(userId, profile);
    return profile;
  }

  async updateUserRiskProfile(userId: string, updates: Partial<UserRiskProfile>): Promise<UserRiskProfile> {
    const existing = await this.getUserRiskProfile(userId);
    const updated: UserRiskProfile = {
      ...existing!,
      ...updates,
      updatedAt: new Date(),
    };
    this.userProfiles.set(userId, updated);
    return updated;
  }

  async getAvailableSanctionLists(): Promise<{
    lists: Array<{
      code: string;
      name: string;
      description: string;
      entryCount: number;
      lastUpdated: Date;
    }>;
  }> {
    return {
      lists: [
        {
          code: 'OFAC_SDN',
          name: 'OFAC Specially Designated Nationals',
          description: 'US Treasury OFAC SDN List',
          entryCount: 12500,
          lastUpdated: new Date(),
        },
        {
          code: 'UN_SC',
          name: 'UN Security Council Consolidated List',
          description: 'United Nations Security Council sanctions',
          entryCount: 850,
          lastUpdated: new Date(),
        },
        {
          code: 'EU_FSF',
          name: 'EU Financial Sanctions Files',
          description: 'European Union consolidated sanctions list',
          entryCount: 2100,
          lastUpdated: new Date(),
        },
        {
          code: 'BCEAO_GEL',
          name: 'BCEAO Gel List',
          description: 'West African Central Bank sanctions list',
          entryCount: 450,
          lastUpdated: new Date(),
        },
        {
          code: 'PEP_GLOBAL',
          name: 'Global PEP Database',
          description: 'Politically Exposed Persons database',
          entryCount: 1500000,
          lastUpdated: new Date(),
        },
      ],
    };
  }

  async healthCheck(): Promise<{ status: 'ok' | 'degraded' | 'down'; latencyMs: number }> {
    return {
      status: 'ok',
      latencyMs: 5,
    };
  }

  // Helper methods

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private determineRiskLevelAndDecision(score: number): { riskLevel: RiskLevel; riskDecision: RiskDecision } {
    if (score >= 80) {
      return { riskLevel: 'critical', riskDecision: 'block' };
    } else if (score >= 60) {
      return { riskLevel: 'high', riskDecision: 'review' };
    } else if (score >= 40) {
      return { riskLevel: 'medium', riskDecision: 'review' };
    } else {
      return { riskLevel: 'low', riskDecision: 'allow' };
    }
  }

  private calculateDeviceTrustScore(fingerprint: DeviceFingerprint): number {
    let score = 80;

    if (fingerprint.isEmulator) score -= 40;
    if (fingerprint.isRooted) score -= 30;
    if (!fingerprint.appVersion) score -= 10;
    if (!fingerprint.osVersion) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  private getDeviceRiskIndicators(fingerprint: DeviceFingerprint): string[] {
    const indicators: string[] = [];

    if (fingerprint.isEmulator) indicators.push('emulator_detected');
    if (fingerprint.isRooted) indicators.push('rooted_device');
    if (!fingerprint.appVersion) indicators.push('missing_app_version');

    return indicators;
  }

  private getListName(code: string): string {
    const names: Record<string, string> = {
      OFAC_SDN: 'OFAC Specially Designated Nationals',
      UN_SC: 'UN Security Council Consolidated List',
      EU_FSF: 'EU Financial Sanctions Files',
      BCEAO_GEL: 'BCEAO Gel List',
    };
    return names[code] || code;
  }
}
