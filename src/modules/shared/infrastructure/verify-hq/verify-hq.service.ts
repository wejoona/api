import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  VerifyHQClient,
  DocumentVerification,
  LivenessSession,
  LivenessCheck,
  IdentityVerification,
  ChallengeSubmitResult,
} from '@joonapay/verify-hq-sdk';

/**
 * VerifyHQ Service
 *
 * Wraps the VerifyHQ SDK with Korido-specific logic.
 * Config from env: VERIFY_HQ_URL, VERIFY_HQ_API_KEY
 */
@Injectable()
export class VerifyHqService {
  private readonly logger = new Logger(VerifyHqService.name);
  private readonly client: VerifyHQClient;

  constructor(private readonly configService: ConfigService) {
    const baseUrl = this.configService.get<string>(
      'VERIFY_HQ_URL',
      'http://localhost:3300',
    );
    const apiKey = this.configService.get<string>(
      'VERIFY_HQ_API_KEY',
      '',
    );

    this.client = new VerifyHQClient(baseUrl, apiKey);
    this.logger.log(`VerifyHQ client initialized (url: ${baseUrl})`);
  }

  // === Document Verification ===

  async submitDocumentVerification(
    userId: string,
    docType: string,
    frontImage: Blob,
    backImage?: Blob,
  ): Promise<DocumentVerification> {
    this.logger.log(`Submitting document verification for user ${userId}, type=${docType}`);
    return this.client.submitDocument(userId, docType, frontImage, backImage);
  }

  async getDocumentVerification(id: string): Promise<DocumentVerification> {
    return this.client.getDocumentVerification(id);
  }

  // === Liveness (Challenge-based) ===

  /**
   * Create session — returns sessionToken + array of challenges (2-3)
   */
  async createLivenessSession(userId: string): Promise<LivenessSession> {
    this.logger.log(`Creating liveness session for user ${userId}`);
    return this.client.createLivenessSession(userId);
  }

  /**
   * Submit a photo for one challenge.
   * When all challenges submitted, VerifyHQ auto-verifies and returns result.
   */
  async submitChallenge(
    sessionToken: string,
    challengeId: string,
    photo: Blob,
  ): Promise<ChallengeSubmitResult> {
    this.logger.log(`Submitting challenge ${challengeId} for session ${sessionToken}`);
    return this.client.submitChallenge(sessionToken, challengeId, photo);
  }

  /**
   * Submit reference selfie for face matching against challenge photos
   */
  async submitReferenceSelfie(sessionToken: string, selfie: Blob): Promise<LivenessCheck> {
    this.logger.log(`Submitting reference selfie for session ${sessionToken}`);
    return this.client.submitReferenceSelfie(sessionToken, selfie);
  }

  /** @deprecated Use submitChallenge() */
  async submitLivenessCheck(
    sessionToken: string,
    video: Blob,
    selfie: Blob,
  ): Promise<LivenessCheck> {
    this.logger.log(`[Legacy] Submitting liveness check for session ${sessionToken}`);
    return this.client.submitLiveness(sessionToken, video, selfie);
  }

  async getLivenessCheck(id: string): Promise<LivenessCheck> {
    return this.client.getLivenessCheck(id);
  }

  // === Identity Verification ===

  async startFullVerification(userId: string, tier?: string): Promise<IdentityVerification> {
    this.logger.log(`Starting full verification for user ${userId}, tier=${tier || 'STANDARD'}`);
    return this.client.startIdentityVerification(userId, tier);
  }

  async getVerificationStatus(verificationId: string): Promise<IdentityVerification> {
    return this.client.getVerificationStatus(verificationId);
  }

  async getUserVerifications(userId: string): Promise<IdentityVerification[]> {
    return this.client.getUserVerifications(userId);
  }
}
