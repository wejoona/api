/**
 * Risk Client Interface
 * Abstract interface for Risk Manager integration
 */

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
} from './risk-assessment.types';

export interface IRiskClient {
  /**
   * Analyze a transaction for risk
   */
  analyzeTransaction(
    request: TransactionAnalysisRequest,
  ): Promise<TransactionAnalysisResult>;

  /**
   * Analyze a batch of transactions
   */
  analyzeTransactionBatch(requests: TransactionAnalysisRequest[]): Promise<{
    results: TransactionAnalysisResult[];
    summary: {
      total: number;
      byLevel: Record<string, number>;
      byDecision: Record<string, number>;
      averageScore: number;
    };
  }>;

  /**
   * Screen an individual against sanction lists
   */
  screenIndividual(
    request: IndividualScreeningRequest,
  ): Promise<ScreeningResult>;

  /**
   * Screen a business entity against sanction lists
   */
  screenEntity(request: EntityScreeningRequest): Promise<ScreeningResult>;

  /**
   * Batch screening for multiple subjects
   */
  screenBatch(
    requests: (IndividualScreeningRequest | EntityScreeningRequest)[],
  ): Promise<{
    batchId: string;
    status: 'completed' | 'processing';
    results?: ScreeningResult[];
  }>;

  /**
   * Get screening result by ID
   */
  getScreeningResult(screeningId: string): Promise<ScreeningResult | null>;

  /**
   * Check velocity limits
   */
  checkVelocity(request: VelocityCheckRequest): Promise<VelocityCheckResult>;

  /**
   * Register/update device fingerprint
   */
  registerDevice(
    userId: string,
    fingerprint: DeviceFingerprint,
  ): Promise<DeviceFingerprintResult>;

  /**
   * Analyze device for risk
   */
  analyzeDevice(
    fingerprint: DeviceFingerprint,
  ): Promise<DeviceFingerprintResult>;

  /**
   * Get user risk profile
   */
  getUserRiskProfile(userId: string): Promise<UserRiskProfile | null>;

  /**
   * Update user risk profile
   */
  updateUserRiskProfile(
    userId: string,
    updates: Partial<UserRiskProfile>,
  ): Promise<UserRiskProfile>;

  /**
   * Get available sanction lists
   */
  getAvailableSanctionLists(): Promise<{
    lists: Array<{
      code: string;
      name: string;
      description: string;
      entryCount: number;
      lastUpdated: Date;
    }>;
  }>;

  /**
   * Health check
   */
  healthCheck(): Promise<{
    status: 'ok' | 'degraded' | 'down';
    latencyMs: number;
  }>;
}

export const RISK_CLIENT = Symbol('RISK_CLIENT');
