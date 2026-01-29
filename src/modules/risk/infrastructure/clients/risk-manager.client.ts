/**
 * Risk Manager HTTP Client
 * Connects to external Risk Manager service
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { AxiosError } from 'axios';
import { IRiskClient } from '../../domain/interfaces/risk-client.interface';
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
} from '../../domain/interfaces/risk-assessment.types';

@Injectable()
export class RiskManagerClient implements IRiskClient {
  private readonly logger = new Logger(RiskManagerClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'RISK_MANAGER_URL',
      'http://localhost:3001',
    );
    this.apiKey = this.configService.get<string>('RISK_MANAGER_API_KEY', '');
    this.timeoutMs = this.configService.get<number>(
      'RISK_MANAGER_TIMEOUT_MS',
      5000,
    );
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      'X-Client-Service': 'usdc-wallet',
    };
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    data?: any,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const startTime = Date.now();

    try {
      const response = await firstValueFrom(
        this.httpService
          .request<T>({
            method,
            url,
            headers: this.getHeaders(),
            data,
          })
          .pipe(
            timeout(this.timeoutMs),
            catchError((error: AxiosError) => {
              this.logger.error(
                `Risk Manager request failed: ${method} ${path}`,
                {
                  status: error.response?.status,
                  message: error.message,
                  latencyMs: Date.now() - startTime,
                },
              );
              throw error;
            }),
          ),
      );

      this.logger.debug(`Risk Manager request completed: ${method} ${path}`, {
        latencyMs: Date.now() - startTime,
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async analyzeTransaction(
    request: TransactionAnalysisRequest,
  ): Promise<TransactionAnalysisResult> {
    const response = await this.request<{
      risk_score: number;
      risk_level: string;
      risk_decision: string;
      risk_factors: string[];
      analysis_id: string;
      processed_at: string;
    }>('POST', '/transactions/analyze', {
      transactionId: request.transactionId,
      userId: request.userId,
      type: request.type,
      amount: request.amount,
      currency: request.currency,
      sourceCountry: request.sourceCountry,
      destinationCountry: request.destinationCountry,
      recipientId: request.recipientId,
      recipientType: request.recipientType,
      channel: request.channel,
      deviceFingerprint: request.deviceFingerprint,
      metadata: request.metadata,
    });

    return {
      analysisId: response.analysis_id,
      riskScore: response.risk_score,
      riskLevel: response.risk_level as any,
      riskDecision: response.risk_decision as any,
      riskFactors: response.risk_factors,
      requiresStepUp: response.risk_decision === 'review',
      stepUpType: response.risk_decision === 'review' ? 'biometric' : undefined,
      processedAt: new Date(response.processed_at),
    };
  }

  async analyzeTransactionBatch(
    requests: TransactionAnalysisRequest[],
  ): Promise<{
    results: TransactionAnalysisResult[];
    summary: {
      total: number;
      byLevel: Record<string, number>;
      byDecision: Record<string, number>;
      averageScore: number;
    };
  }> {
    const response = await this.request<{
      results: Array<{
        risk_score: number;
        risk_level: string;
        risk_decision: string;
        risk_factors: string[];
        analysis_id: string;
        processed_at: string;
      }>;
      summary: {
        total: number;
        by_level: Record<string, number>;
        by_decision: Record<string, number>;
        average_score: number;
      };
    }>('POST', '/transactions/analyze/batch', {
      transactions: requests.map((r) => ({
        transactionId: r.transactionId,
        userId: r.userId,
        type: r.type,
        amount: r.amount,
        currency: r.currency,
        sourceCountry: r.sourceCountry,
        destinationCountry: r.destinationCountry,
      })),
    });

    return {
      results: response.results.map((r) => ({
        analysisId: r.analysis_id,
        riskScore: r.risk_score,
        riskLevel: r.risk_level as any,
        riskDecision: r.risk_decision as any,
        riskFactors: r.risk_factors,
        requiresStepUp: r.risk_decision === 'review',
        processedAt: new Date(r.processed_at),
      })),
      summary: {
        total: response.summary.total,
        byLevel: response.summary.by_level,
        byDecision: response.summary.by_decision,
        averageScore: response.summary.average_score,
      },
    };
  }

  async screenIndividual(
    request: IndividualScreeningRequest,
  ): Promise<ScreeningResult> {
    const response = await this.request<{
      screening_id: string;
      reference_id: string;
      status: string;
      total_matches: number;
      matches: Array<{
        match_id: string;
        list_code: string;
        list_name: string;
        entry_id: string;
        matched_name: string;
        match_confidence: string;
        match_score: number;
        matched_fields: string[];
        sanction_programs?: string[];
        remarks?: string;
      }>;
      screened_at: string;
      lists_screened: string[];
    }>('POST', '/screening/individual', {
      reference_id: request.referenceId,
      first_name: request.firstName,
      last_name: request.lastName,
      middle_name: request.middleName,
      date_of_birth: request.dateOfBirth,
      nationality: request.nationality,
      country_of_residence: request.countryOfResidence,
      id_type: request.idType,
      id_number: request.idNumber,
      aliases: request.aliases,
      lists: request.listsToScreen,
    });

    return this.mapScreeningResponse(response, 'individual');
  }

  async screenEntity(
    request: EntityScreeningRequest,
  ): Promise<ScreeningResult> {
    const response = await this.request<{
      screening_id: string;
      reference_id: string;
      status: string;
      total_matches: number;
      matches: Array<{
        match_id: string;
        list_code: string;
        list_name: string;
        entry_id: string;
        matched_name: string;
        match_confidence: string;
        match_score: number;
        matched_fields: string[];
        sanction_programs?: string[];
        remarks?: string;
      }>;
      screened_at: string;
      lists_screened: string[];
    }>('POST', '/screening/entity', {
      reference_id: request.referenceId,
      entity_name: request.entityName,
      entity_type: request.entityType,
      registration_number: request.registrationNumber,
      country_of_registration: request.countryOfRegistration,
      aliases: request.aliases,
      lists: request.listsToScreen,
    });

    return this.mapScreeningResponse(response, 'entity');
  }

  private mapScreeningResponse(
    response: any,
    subjectType: 'individual' | 'entity',
  ): ScreeningResult {
    return {
      screeningId: response.screening_id,
      referenceId: response.reference_id,
      subjectType,
      status: response.status,
      totalMatches: response.total_matches,
      matches: response.matches.map((m: any) => ({
        matchId: m.match_id,
        listCode: m.list_code,
        listName: m.list_name,
        entryId: m.entry_id,
        matchedName: m.matched_name,
        matchConfidence: m.match_confidence,
        matchScore: m.match_score,
        matchedFields: m.matched_fields,
        sanctionPrograms: m.sanction_programs,
        remarks: m.remarks,
      })),
      screenedAt: new Date(response.screened_at),
      listsScreened: response.lists_screened,
    };
  }

  async screenBatch(
    requests: (IndividualScreeningRequest | EntityScreeningRequest)[],
  ): Promise<{
    batchId: string;
    status: 'completed' | 'processing';
    results?: ScreeningResult[];
  }> {
    const subjects = requests.map((r) => {
      if ('firstName' in r) {
        return {
          type: 'individual',
          reference_id: r.referenceId,
          first_name: r.firstName,
          last_name: r.lastName,
          date_of_birth: r.dateOfBirth,
          nationality: r.nationality,
        };
      } else {
        return {
          type: 'entity',
          reference_id: r.referenceId,
          entity_name: r.entityName,
          country_of_registration: r.countryOfRegistration,
        };
      }
    });

    const response = await this.request<{
      batch_id: string;
      status: string;
      results?: any[];
    }>('POST', '/screening/batch', { subjects });

    return {
      batchId: response.batch_id,
      status: response.status as any,
      results: response.results?.map((r, i) =>
        this.mapScreeningResponse(
          r,
          'firstName' in requests[i] ? 'individual' : 'entity',
        ),
      ),
    };
  }

  async getScreeningResult(
    screeningId: string,
  ): Promise<ScreeningResult | null> {
    try {
      const response = await this.request<any>(
        'GET',
        `/screening/result/${screeningId}`,
      );
      return this.mapScreeningResponse(response, response.subject_type);
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async checkVelocity(
    request: VelocityCheckRequest,
  ): Promise<VelocityCheckResult> {
    const response = await this.request<{
      check_id: string;
      user_id: string;
      check_type: string;
      current_count: number;
      limit: number;
      remaining_allowance: number;
      is_exceeded: boolean;
      reset_at: string;
    }>('POST', '/velocity/check', {
      user_id: request.userId,
      check_type: request.checkType,
      time_window_minutes: request.timeWindowMinutes,
      current_value: request.currentValue,
    });

    return {
      checkId: response.check_id,
      userId: response.user_id,
      checkType: response.check_type,
      currentCount: response.current_count,
      limit: response.limit,
      remainingAllowance: response.remaining_allowance,
      isExceeded: response.is_exceeded,
      resetAt: new Date(response.reset_at),
    };
  }

  async registerDevice(
    userId: string,
    fingerprint: DeviceFingerprint,
  ): Promise<DeviceFingerprintResult> {
    const response = await this.request<{
      fingerprint_id: string;
      is_known_device: boolean;
      device_trust_score: number;
      risk_indicators: string[];
      last_seen_at?: string;
      first_seen_at?: string;
    }>('POST', '/devices/register', {
      user_id: userId,
      device_id: fingerprint.deviceId,
      platform: fingerprint.platform,
      os_version: fingerprint.osVersion,
      app_version: fingerprint.appVersion,
      ip_address: fingerprint.ipAddress,
      user_agent: fingerprint.userAgent,
      is_emulator: fingerprint.isEmulator,
      is_rooted: fingerprint.isRooted,
    });

    return {
      fingerprintId: response.fingerprint_id,
      isKnownDevice: response.is_known_device,
      deviceTrustScore: response.device_trust_score,
      riskIndicators: response.risk_indicators,
      lastSeenAt: response.last_seen_at
        ? new Date(response.last_seen_at)
        : undefined,
      firstSeenAt: response.first_seen_at
        ? new Date(response.first_seen_at)
        : undefined,
    };
  }

  async analyzeDevice(
    fingerprint: DeviceFingerprint,
  ): Promise<DeviceFingerprintResult> {
    const response = await this.request<{
      fingerprint_id: string;
      is_known_device: boolean;
      device_trust_score: number;
      risk_indicators: string[];
    }>('POST', '/devices/analyze', {
      device_id: fingerprint.deviceId,
      platform: fingerprint.platform,
      ip_address: fingerprint.ipAddress,
      is_emulator: fingerprint.isEmulator,
      is_rooted: fingerprint.isRooted,
    });

    return {
      fingerprintId: response.fingerprint_id,
      isKnownDevice: response.is_known_device,
      deviceTrustScore: response.device_trust_score,
      riskIndicators: response.risk_indicators,
    };
  }

  async getUserRiskProfile(userId: string): Promise<UserRiskProfile | null> {
    try {
      const response = await this.request<{
        user_id: string;
        overall_risk_score: number;
        risk_level: string;
        kyc_level: number;
        transaction_limits: {
          daily_limit: number;
          monthly_limit: number;
          single_transaction_limit: number;
        };
        velocity_limits: {
          max_transactions_per_hour: number;
          max_transactions_per_day: number;
          max_unique_recipients_per_day: number;
        };
        screening_status: string;
        last_screened_at?: string;
        risk_factors: string[];
        updated_at: string;
      }>('GET', `/entities/risk-profiles/${userId}`);

      return {
        userId: response.user_id,
        overallRiskScore: response.overall_risk_score,
        riskLevel: response.risk_level as any,
        kycLevel: response.kyc_level,
        transactionLimits: {
          dailyLimit: response.transaction_limits.daily_limit,
          monthlyLimit: response.transaction_limits.monthly_limit,
          singleTransactionLimit:
            response.transaction_limits.single_transaction_limit,
        },
        velocityLimits: {
          maxTransactionsPerHour:
            response.velocity_limits.max_transactions_per_hour,
          maxTransactionsPerDay:
            response.velocity_limits.max_transactions_per_day,
          maxUniqueRecipientsPerDay:
            response.velocity_limits.max_unique_recipients_per_day,
        },
        screeningStatus: response.screening_status as any,
        lastScreenedAt: response.last_screened_at
          ? new Date(response.last_screened_at)
          : undefined,
        riskFactors: response.risk_factors,
        updatedAt: new Date(response.updated_at),
      };
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async updateUserRiskProfile(
    userId: string,
    updates: Partial<UserRiskProfile>,
  ): Promise<UserRiskProfile> {
    const _response = await this.request<any>(
      'PUT',
      `/entities/risk-profiles/${userId}`,
      {
        overall_risk_score: updates.overallRiskScore,
        risk_level: updates.riskLevel,
        kyc_level: updates.kycLevel,
        risk_factors: updates.riskFactors,
      },
    );

    return this.getUserRiskProfile(userId);
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
    const response = await this.request<{
      lists: Array<{
        code: string;
        name: string;
        description: string;
        entry_count: number;
        last_updated: string;
      }>;
    }>('GET', '/lists');

    return {
      lists: response.lists.map((l) => ({
        code: l.code,
        name: l.name,
        description: l.description,
        entryCount: l.entry_count,
        lastUpdated: new Date(l.last_updated),
      })),
    };
  }

  async healthCheck(): Promise<{
    status: 'ok' | 'degraded' | 'down';
    latencyMs: number;
  }> {
    const startTime = Date.now();
    try {
      await this.request<any>('GET', '/transactions/health');
      return {
        status: 'ok',
        latencyMs: Date.now() - startTime,
      };
    } catch (_error) {
      return {
        status: 'down',
        latencyMs: Date.now() - startTime,
      };
    }
  }
}
