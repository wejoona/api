import { DocumentVerification, LivenessSession, LivenessCheck, IdentityVerification, ChallengeSubmitResult } from './types';

export class VerifyHQClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  private async request<T>(method: string, path: string, body?: any, isFormData = false): Promise<T> {
    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
    };

    let requestBody: any;
    if (isFormData) {
      requestBody = body; // FormData
    } else if (body) {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(body);
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: requestBody,
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`VerifyHQ API error ${res.status}: ${error}`);
    }

    return res.json() as Promise<T>;
  }

  // === Document Verification ===

  async submitDocument(
    userId: string,
    docType: string,
    frontImage: Blob,
    backImage?: Blob,
  ): Promise<DocumentVerification> {
    const form = new FormData();
    form.append('userId', userId);
    form.append('documentType', docType);
    form.append('documentCountry', 'US');
    form.append('frontImage', frontImage);
    if (backImage) form.append('backImage', backImage);

    return this.request<DocumentVerification>('POST', '/verifications/document', form, true);
  }

  async getDocumentVerification(id: string): Promise<DocumentVerification> {
    return this.request<DocumentVerification>('GET', `/verifications/document/${id}`);
  }

  // === Liveness (Challenge-based) ===

  async createLivenessSession(userId: string): Promise<LivenessSession> {
    return this.request<LivenessSession>('POST', '/verifications/liveness/session', { userId });
  }

  async submitChallenge(
    sessionToken: string,
    challengeId: string,
    photo: Blob,
  ): Promise<ChallengeSubmitResult> {
    const form = new FormData();
    form.append('sessionToken', sessionToken);
    form.append('challengeId', challengeId);
    form.append('photo', photo);

    return this.request<ChallengeSubmitResult>('POST', '/verifications/liveness/challenge', form, true);
  }

  async submitReferenceSelfie(sessionToken: string, selfie: Blob): Promise<LivenessCheck> {
    const form = new FormData();
    form.append('sessionToken', sessionToken);
    form.append('selfie', selfie);

    return this.request<LivenessCheck>('POST', '/verifications/liveness/reference-selfie', form, true);
  }

  /** @deprecated Use submitChallenge() instead */
  async submitLiveness(sessionToken: string, video: Blob, selfie: Blob): Promise<LivenessCheck> {
    const form = new FormData();
    form.append('sessionToken', sessionToken);
    form.append('video', video);
    form.append('selfie', selfie);

    return this.request<LivenessCheck>('POST', '/verifications/liveness/submit', form, true);
  }

  async getLivenessCheck(id: string): Promise<LivenessCheck> {
    return this.request<LivenessCheck>('GET', `/verifications/liveness/${id}`);
  }

  // === Identity Verification ===

  async startIdentityVerification(userId: string, tier?: string): Promise<IdentityVerification> {
    return this.request<IdentityVerification>('POST', '/verifications/identity', { userId, tier });
  }

  async getVerificationStatus(verificationId: string): Promise<IdentityVerification> {
    return this.request<IdentityVerification>('GET', `/verifications/identity/${verificationId}`);
  }

  async getUserVerifications(userId: string): Promise<IdentityVerification[]> {
    return this.request<IdentityVerification[]>('GET', `/verifications/identity/user/${userId}`);
  }
}
