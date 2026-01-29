import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  LivenessChallenge,
  LivenessSession,
  LivenessResult,
  StartSessionResponse,
  SubmitChallengeResponse,
  ChallengeType,
} from '../../domain/interfaces/liveness.types';

/**
 * Liveness Service
 *
 * Mock implementation that simulates liveness detection with random challenges.
 * In production, this would integrate with services like:
 * - FaceTec ZoOm
 * - Onfido Smart Capture
 * - iProov Dynamic Liveness
 * - AWS Rekognition Face Liveness
 */
@Injectable()
export class LivenessService {
  private readonly logger = new Logger(LivenessService.name);

  // In-memory storage for sessions (use Redis in production)
  private sessions = new Map<string, LivenessSession>();

  // Session expiry time in milliseconds (5 minutes)
  private readonly sessionExpiryMs = 5 * 60 * 1000;

  // Challenge expiry time in milliseconds (30 seconds)
  private readonly challengeExpiryMs = 30 * 1000;

  // Simulated pass rate (95% of valid submissions pass)
  private readonly passRate = 0.95;

  // Minimum confidence for a passing challenge
  private readonly minPassConfidence = 70;

  // All possible challenge types
  private readonly allChallengeTypes: ChallengeType[] = [
    'blink',
    'smile',
    'turn_head',
    'nod',
  ];

  /**
   * Start a new liveness session
   */
  async startSession(userId: string): Promise<StartSessionResponse> {
    this.logger.log(`Starting liveness session for user: ${userId}`);

    // Generate 2-3 random challenges
    const challengeCount = 2 + Math.floor(Math.random() * 2); // 2 or 3
    const challenges = this.generateChallenges(challengeCount);

    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionExpiryMs);

    const session: LivenessSession = {
      sessionId,
      userId,
      challenges,
      completedChallenges: [],
      status: 'in_progress',
      createdAt: now,
      expiresAt,
      currentChallengeIndex: 0,
    };

    this.sessions.set(sessionId, session);

    // Clean up expired sessions periodically
    this.cleanupExpiredSessions();

    this.logger.log(
      `Liveness session ${sessionId} started with ${challengeCount} challenges`,
    );

    return {
      sessionId,
      currentChallenge: challenges[0],
      totalChallenges: challengeCount,
      expiresAt,
    };
  }

  /**
   * Submit a challenge response
   */
  async submitChallenge(
    sessionId: string,
    challengeId: string,
    videoFrameBase64: string,
    userId?: string,
  ): Promise<SubmitChallengeResponse> {
    const session = this.sessions.get(sessionId);

    // Validate session exists
    if (!session) {
      throw new NotFoundException('Liveness session not found or expired');
    }

    // Validate user ownership (if userId provided)
    if (userId && session.userId !== userId) {
      throw new UnauthorizedException('Session does not belong to this user');
    }

    // Check if session expired
    if (new Date() > session.expiresAt) {
      session.status = 'expired';
      this.sessions.set(sessionId, session);
      throw new BadRequestException('Liveness session has expired');
    }

    // Check if session already completed or failed
    if (session.status === 'completed' || session.status === 'failed') {
      throw new BadRequestException(
        `Session already ${session.status}. Please start a new session.`,
      );
    }

    // Find the challenge
    const currentChallenge = session.challenges[session.currentChallengeIndex];
    if (!currentChallenge || currentChallenge.challengeId !== challengeId) {
      throw new BadRequestException(
        'Invalid challenge ID or challenge out of order',
      );
    }

    // Check if challenge expired
    if (new Date() > currentChallenge.expiresAt) {
      throw new BadRequestException('Challenge has expired');
    }

    // Validate input
    if (!videoFrameBase64 || videoFrameBase64.length < 100) {
      throw new BadRequestException(
        'Invalid video frame data - must be base64 encoded image',
      );
    }

    // MOCK: Simulate liveness detection with 95% pass rate
    const passed = Math.random() < this.passRate;
    const confidence = passed
      ? this.minPassConfidence + Math.floor(Math.random() * 30) // 70-100
      : Math.floor(Math.random() * this.minPassConfidence); // 0-69

    // Record challenge result
    session.completedChallenges.push({
      challengeId,
      type: currentChallenge.type,
      passed,
      confidence,
      submittedAt: new Date(),
    });

    // Move to next challenge
    session.currentChallengeIndex++;
    const nextChallengeIndex = session.currentChallengeIndex;
    const isComplete = nextChallengeIndex >= session.challenges.length;

    let nextChallenge: LivenessChallenge | undefined;
    if (!isComplete) {
      nextChallenge = session.challenges[nextChallengeIndex];
    }

    // If all challenges complete, finalize session
    if (isComplete) {
      const allPassed = session.completedChallenges.every((c) => c.passed);
      session.status = allPassed ? 'completed' : 'failed';
    }

    this.sessions.set(sessionId, session);

    this.logger.log(
      `Challenge ${challengeId} submitted - passed: ${passed}, confidence: ${confidence}`,
    );

    return {
      sessionId,
      passed,
      confidence,
      nextChallenge,
      sessionComplete: isComplete,
      completedCount: session.completedChallenges.length,
      totalChallenges: session.challenges.length,
    };
  }

  /**
   * Complete session and get final result
   */
  async completeSession(
    sessionId: string,
    userId?: string,
  ): Promise<LivenessResult> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new NotFoundException('Liveness session not found or expired');
    }

    // Validate user ownership
    if (userId && session.userId !== userId) {
      throw new UnauthorizedException('Session does not belong to this user');
    }

    // Check if all challenges completed
    if (session.currentChallengeIndex < session.challenges.length) {
      throw new BadRequestException(
        'Cannot complete session - not all challenges submitted',
      );
    }

    // Calculate overall confidence (average of all challenges)
    const totalConfidence = session.completedChallenges.reduce(
      (sum, c) => sum + c.confidence,
      0,
    );
    const averageConfidence =
      session.completedChallenges.length > 0
        ? Math.round(totalConfidence / session.completedChallenges.length)
        : 0;

    // Determine if live (all challenges passed and confidence >= threshold)
    const allPassed = session.completedChallenges.every((c) => c.passed);
    const isLive = allPassed && averageConfidence >= this.minPassConfidence;

    // Update session status
    if (session.status !== 'completed' && session.status !== 'failed') {
      session.status = isLive ? 'completed' : 'failed';
      this.sessions.set(sessionId, session);
    }

    const result: LivenessResult = {
      sessionId,
      userId: session.userId,
      isLive,
      confidence: averageConfidence,
      challenges: session.completedChallenges,
      status: session.status,
      completedAt: new Date(),
      riskSignals: this.detectRiskSignals(session),
      failureReason: !isLive ? this.getFailureReason(session) : undefined,
    };

    this.logger.log(
      `Session ${sessionId} completed - isLive: ${isLive}, confidence: ${averageConfidence}`,
    );

    return result;
  }

  /**
   * Get session status
   */
  async getSessionStatus(
    sessionId: string,
    userId?: string,
  ): Promise<LivenessResult | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Validate user ownership
    if (userId && session.userId !== userId) {
      throw new UnauthorizedException('Session does not belong to this user');
    }

    // Check if expired
    if (new Date() > session.expiresAt && session.status === 'in_progress') {
      session.status = 'expired';
      this.sessions.set(sessionId, session);
    }

    // Calculate current confidence
    const totalConfidence = session.completedChallenges.reduce(
      (sum, c) => sum + c.confidence,
      0,
    );
    const averageConfidence =
      session.completedChallenges.length > 0
        ? Math.round(totalConfidence / session.completedChallenges.length)
        : 0;

    const allPassed = session.completedChallenges.every((c) => c.passed);
    const isComplete =
      session.currentChallengeIndex >= session.challenges.length;
    const isLive =
      isComplete && allPassed && averageConfidence >= this.minPassConfidence;

    return {
      sessionId,
      userId: session.userId,
      isLive,
      confidence: averageConfidence,
      challenges: session.completedChallenges,
      status: session.status,
      completedAt: isComplete ? new Date() : session.createdAt,
      riskSignals: this.detectRiskSignals(session),
      failureReason:
        session.status === 'failed'
          ? this.getFailureReason(session)
          : undefined,
    };
  }

  /**
   * Cancel a liveness session
   */
  async cancelSession(
    sessionId: string,
    userId?: string,
  ): Promise<{ success: boolean; message: string }> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new NotFoundException('Liveness session not found or expired');
    }

    // Validate user ownership
    if (userId && session.userId !== userId) {
      throw new UnauthorizedException('Session does not belong to this user');
    }

    // Check if session is already completed or failed
    if (session.status === 'completed' || session.status === 'failed') {
      throw new BadRequestException(
        `Cannot cancel session that is already ${session.status}`,
      );
    }

    // Mark session as cancelled by setting status to 'expired'
    // (Using 'expired' as there's no 'cancelled' status in the current type)
    session.status = 'expired';
    this.sessions.set(sessionId, session);

    this.logger.log(`Session ${sessionId} cancelled by user ${userId}`);

    return {
      success: true,
      message: 'Session cancelled successfully',
    };
  }

  // ==========================================
  // Private Helper Methods
  // ==========================================

  /**
   * Generate random challenges for a session
   */
  private generateChallenges(count: number): LivenessChallenge[] {
    const challenges: LivenessChallenge[] = [];
    const selectedTypes = this.selectRandomChallengeTypes(count);

    for (let i = 0; i < count; i++) {
      const type = selectedTypes[i];
      const challengeId = uuidv4();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.challengeExpiryMs);

      challenges.push({
        challengeId,
        type,
        instruction: this.getInstructionForType(type),
        expiresAt,
        order: i + 1,
      });
    }

    return challenges;
  }

  /**
   * Select random challenge types (no duplicates)
   */
  private selectRandomChallengeTypes(count: number): ChallengeType[] {
    const types = [...this.allChallengeTypes];
    const selected: ChallengeType[] = [];

    for (let i = 0; i < Math.min(count, types.length); i++) {
      const randomIndex = Math.floor(Math.random() * types.length);
      selected.push(types[randomIndex]);
      types.splice(randomIndex, 1); // Remove to avoid duplicates
    }

    return selected;
  }

  /**
   * Get user-friendly instruction for challenge type
   */
  private getInstructionForType(type: ChallengeType): string {
    const instructions: Record<ChallengeType, string> = {
      blink: 'Please blink your eyes slowly',
      smile: 'Please smile naturally',
      turn_head: 'Please turn your head slowly to the left, then to the right',
      nod: 'Please nod your head up and down',
    };

    return instructions[type];
  }

  /**
   * Detect risk signals based on session behavior
   */
  private detectRiskSignals(session: LivenessSession): string[] | undefined {
    const signals: string[] = [];

    // Check for suspicious patterns
    const failedChallenges = session.completedChallenges.filter(
      (c) => !c.passed,
    );
    if (failedChallenges.length > 0) {
      signals.push('failed_challenges_detected');
    }

    // Check for low confidence scores
    const lowConfidenceChallenges = session.completedChallenges.filter(
      (c) => c.confidence < 50,
    );
    if (lowConfidenceChallenges.length > 0) {
      signals.push('low_confidence_detections');
    }

    // Check if completed too quickly (potential automation)
    if (session.completedChallenges.length >= 2) {
      const firstSubmit = session.completedChallenges[0].submittedAt.getTime();
      const lastSubmit =
        session.completedChallenges[
          session.completedChallenges.length - 1
        ].submittedAt.getTime();
      const timeDiff = lastSubmit - firstSubmit;

      // If all challenges completed in less than 3 seconds, suspicious
      if (timeDiff < 3000) {
        signals.push('suspicious_completion_speed');
      }
    }

    return signals.length > 0 ? signals : undefined;
  }

  /**
   * Get failure reason based on session
   */
  private getFailureReason(session: LivenessSession): string {
    const failedChallenges = session.completedChallenges.filter(
      (c) => !c.passed,
    );

    if (session.status === 'expired') {
      return 'Session expired before completion';
    }

    if (failedChallenges.length > 0) {
      return `Failed ${failedChallenges.length} out of ${session.challenges.length} challenges`;
    }

    const avgConfidence =
      session.completedChallenges.reduce((sum, c) => sum + c.confidence, 0) /
      session.completedChallenges.length;

    if (avgConfidence < this.minPassConfidence) {
      return `Overall confidence too low: ${Math.round(avgConfidence)}%`;
    }

    return 'Liveness verification failed';
  }

  /**
   * Clean up expired sessions (called periodically)
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired liveness sessions`);
    }
  }

  /**
   * Get total active sessions count (for monitoring)
   */
  getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  /**
   * Clear all sessions (for testing only)
   */
  clearAllSessions(): void {
    this.sessions.clear();
    this.logger.warn('All liveness sessions cleared');
  }
}
