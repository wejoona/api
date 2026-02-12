import { DocumentVerification, LivenessSession, LivenessCheck, IdentityVerification, ChallengeSubmitResult } from './types';
export declare class VerifyHQClient {
    private readonly baseUrl;
    private readonly apiKey;
    constructor(baseUrl: string, apiKey: string);
    private request;
    submitDocument(userId: string, docType: string, frontImage: Blob, backImage?: Blob): Promise<DocumentVerification>;
    getDocumentVerification(id: string): Promise<DocumentVerification>;
    createLivenessSession(userId: string): Promise<LivenessSession>;
    submitChallenge(sessionToken: string, challengeId: string, photo: Blob): Promise<ChallengeSubmitResult>;
    submitReferenceSelfie(sessionToken: string, selfie: Blob): Promise<LivenessCheck>;
    /** @deprecated Use submitChallenge() instead */
    submitLiveness(sessionToken: string, video: Blob, selfie: Blob): Promise<LivenessCheck>;
    getLivenessCheck(id: string): Promise<LivenessCheck>;
    startIdentityVerification(userId: string, tier?: string): Promise<IdentityVerification>;
    getVerificationStatus(verificationId: string): Promise<IdentityVerification>;
    getUserVerifications(userId: string): Promise<IdentityVerification[]>;
}
