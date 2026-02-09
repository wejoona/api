import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  VerifyHQClient,
  DocumentVerification,
  LivenessSession,
  LivenessCheck,
  IdentityVerification,
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

  /**
   * Submit a document for verification
   */
  async submitDocumentVerification(
    userId: string,
    docType: string,
    frontImage: Blob,
    backImage?: Blob,
  ): Promise<DocumentVerification> {
    this.logger.log(
      `Submitting document verification for user ${userId}, type=${docType}`,
    );
    return this.client.submitDocument(userId, docType, frontImage, backImage);
  }

  /**
   * Get document verification status
   */
  async getDocumentVerification(id: string): Promise<DocumentVerification> {
    return this.client.getDocumentVerification(id);
  }

  /**
   * Create a liveness session — returns session token + challenges
   */
  async createLivenessSession(userId: string): Promise<LivenessSession> {
    this.logger.log(`Creating liveness session for user ${userId}`);
    return this.client.createLivenessSession(userId);
  }

  /**
   * Submit liveness check — returns pass/fail
   */
  async submitLivenessCheck(
    sessionToken: string,
    video: Blob,
    selfie: Blob,
  ): Promise<LivenessCheck> {
    this.logger.log(`Submitting liveness check for session ${sessionToken}`);
    return this.client.submitLiveness(sessionToken, video, selfie);
  }

  /**
   * Get liveness check status
   */
  async getLivenessCheck(id: string): Promise<LivenessCheck> {
    return this.client.getLivenessCheck(id);
  }

  /**
   * Start full identity verification (doc + liveness + face match)
   */
  async startFullVerification(
    userId: string,
    tier?: string,
  ): Promise<IdentityVerification> {
    this.logger.log(
      `Starting full verification for user ${userId}, tier=${tier || 'STANDARD'}`,
    );
    return this.client.startIdentityVerification(userId, tier);
  }

  /**
   * Get verification status for a verification ID
   */
  async getVerificationStatus(
    verificationId: string,
  ): Promise<IdentityVerification> {
    return this.client.getVerificationStatus(verificationId);
  }

  /**
   * Get all verifications for a user
   */
  async getUserVerifications(
    userId: string,
  ): Promise<IdentityVerification[]> {
    return this.client.getUserVerifications(userId);
  }
}
