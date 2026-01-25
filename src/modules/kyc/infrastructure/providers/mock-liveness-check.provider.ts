import { Injectable, Logger } from '@nestjs/common';
import {
  ILivenessCheckProvider,
  LivenessCheckType,
  LivenessCheckInput,
  LivenessCheckResult,
} from '../../domain/interfaces/liveness-check-provider.interface';

/**
 * Mock Liveness Check Provider
 *
 * For development and testing. Simulates liveness detection
 * based on user ID patterns:
 *
 * - Contains "LIVE" → High score (90+), is live
 * - Contains "SPOOF" → Detected as spoof attempt
 * - Contains "PHOTO" → Detected as photo attack
 * - Contains "VIDEO" → Detected as video attack
 * - Contains "FAIL" → Low score, not live
 * - Default → Random score 75-95
 */
@Injectable()
export class MockLivenessCheckProvider implements ILivenessCheckProvider {
  private readonly logger = new Logger(MockLivenessCheckProvider.name);

  readonly providerName = 'mock_liveness';
  readonly supportedCheckTypes: LivenessCheckType[] = ['passive', 'active', 'video'];
  readonly passThreshold = 80;

  private checks = new Map<string, LivenessCheckResult>();

  async checkLiveness(input: LivenessCheckInput): Promise<LivenessCheckResult> {
    this.logger.log(`[MOCK] Checking liveness for user ${input.userId}`);

    // Simulate processing delay
    await this.delay(600);

    const scenario = this.detectTestScenario(input);
    const score = this.calculateScore(scenario);
    const isLive = this.determineIsLive(score, scenario);

    const result: LivenessCheckResult = {
      verificationId: `mock_live_${input.requestId}_${Date.now()}`,
      isLive,
      status: this.determineStatus(score, isLive, scenario),
      score,
      checks: {
        liveness: {
          passed: isLive,
          score,
          details: isLive ? 'User appears to be live' : 'Liveness check failed',
        },
        faceDetection: {
          passed: true,
          faceCount: 1,
          details: 'Single face detected',
        },
        imageQuality: {
          passed: score >= 70,
          score: Math.min(100, score + 5),
          issues: score < 70 ? ['lighting_poor'] : undefined,
        },
        spoofDetection: {
          passed: !scenario.spoof,
          spoofType: scenario.spoofType || 'none',
          confidence: scenario.spoof ? 85 : 95,
        },
        deviceIntegrity: {
          passed: true,
          issues: undefined,
        },
      },
      faceComparison: input.referenceImageUrl
        ? {
            matched: score >= 75,
            similarity: score,
            threshold: 75,
          }
        : undefined,
      faceData: {
        boundingBox: { x: 100, y: 100, width: 200, height: 250 },
        age: { min: 25, max: 35 },
        gender: 'unknown',
      },
      riskSignals: scenario.spoof
        ? ['potential_spoof_attempt', `detected_${scenario.spoofType}`]
        : undefined,
      provider: this.providerName,
      rawResponse: {
        mock: true,
        scenario: scenario.name,
      },
      completedAt: new Date(),
    };

    this.checks.set(result.verificationId, result);
    this.logger.log(
      `[MOCK] Liveness check complete: ${result.verificationId} - isLive: ${isLive} (score: ${score})`,
    );

    return result;
  }

  async getCheckStatus(verificationId: string): Promise<LivenessCheckResult> {
    const result = this.checks.get(verificationId);
    if (!result) {
      return {
        verificationId,
        isLive: false,
        status: 'error',
        score: 0,
        checks: {
          liveness: { passed: false, score: 0 },
        },
        errorMessage: 'Check not found',
        provider: this.providerName,
        completedAt: new Date(),
      };
    }
    return result;
  }

  async generateSessionToken(userId: string): Promise<{ sessionToken: string; expiresAt: Date }> {
    return {
      sessionToken: `mock_session_${userId}_${Date.now()}`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    };
  }

  validateWebhookSignature(_payload: string, _signature: string): boolean {
    return true;
  }

  parseWebhookPayload(payload: Record<string, unknown>): LivenessCheckResult {
    const verificationId = payload.verificationId as string;
    return (
      this.checks.get(verificationId) || {
        verificationId,
        isLive: false,
        status: 'error',
        score: 0,
        checks: { liveness: { passed: false, score: 0 } },
        errorMessage: 'Check not found',
        provider: this.providerName,
        completedAt: new Date(),
      }
    );
  }

  // ==========================================
  // Private Helpers
  // ==========================================

  private detectTestScenario(input: LivenessCheckInput): {
    name: string;
    live: boolean;
    spoof: boolean;
    spoofType?: 'photo' | 'video' | 'mask' | 'deepfake';
    fail: boolean;
  } {
    const userId = input.userId.toUpperCase();

    if (userId.includes('LIVE')) {
      return { name: 'forced_live', live: true, spoof: false, fail: false };
    }
    if (userId.includes('PHOTO')) {
      return { name: 'photo_attack', live: false, spoof: true, spoofType: 'photo', fail: true };
    }
    if (userId.includes('VIDEO')) {
      return { name: 'video_attack', live: false, spoof: true, spoofType: 'video', fail: true };
    }
    if (userId.includes('MASK')) {
      return { name: 'mask_attack', live: false, spoof: true, spoofType: 'mask', fail: true };
    }
    if (userId.includes('SPOOF')) {
      return { name: 'spoof_attempt', live: false, spoof: true, spoofType: 'photo', fail: true };
    }
    if (userId.includes('FAIL')) {
      return { name: 'forced_fail', live: false, spoof: false, fail: true };
    }

    return { name: 'default', live: true, spoof: false, fail: false };
  }

  private calculateScore(scenario: ReturnType<typeof this.detectTestScenario>): number {
    if (scenario.live && !scenario.spoof && !scenario.fail) {
      return 90 + Math.floor(Math.random() * 10);
    }
    if (scenario.spoof || scenario.fail) {
      return 20 + Math.floor(Math.random() * 30);
    }
    return 80 + Math.floor(Math.random() * 15);
  }

  private determineIsLive(
    score: number,
    scenario: ReturnType<typeof this.detectTestScenario>,
  ): boolean {
    if (scenario.spoof || scenario.fail) return false;
    return score >= this.passThreshold;
  }

  private determineStatus(
    score: number,
    isLive: boolean,
    scenario: ReturnType<typeof this.detectTestScenario>,
  ): 'passed' | 'failed' | 'review' | 'pending' | 'error' {
    if (scenario.spoof) return 'failed';
    if (!isLive) return 'failed';
    if (score >= 85) return 'passed';
    if (score >= 70) return 'review';
    return 'failed';
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
