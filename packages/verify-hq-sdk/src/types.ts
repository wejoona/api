export interface DocumentVerification {
  id: string;
  userId: string;
  documentType: string;
  frontImageUrl: string;
  backImageUrl?: string;
  status: string;
  extractedData?: Record<string, any>;
  confidence?: number;
  createdAt: string;
}

export interface LivenessChallenge {
  id: string;
  type: string;
  instruction: string;
}

export interface LivenessSession {
  sessionToken: string;
  challenges: LivenessChallenge[];
}

export interface ChallengeSubmitResult {
  sessionToken: string;
  status: string;
  challengesCompleted: number;
  challengesTotal: number;
  isAlive?: boolean;
  confidence?: number;
  result?: {
    isAlive: boolean;
    confidence: number;
    antiSpoofScore: number;
    faceMatchScore: number;
    failureReason?: string;
  };
}

export interface LivenessCheck {
  id: string;
  userId: string;
  sessionToken: string;
  challenges: Array<{
    id: string;
    type: string;
    instruction: string;
    photoUrl?: string;
    submittedAt?: string;
    passed?: boolean;
  }>;
  isAlive?: boolean;
  confidence?: number;
  antiSpoofScore?: number;
  faceMatchScore?: number;
  status: string;
  failureReason?: string;
  completedAt?: string;
  createdAt: string;
}

export interface IdentityVerification {
  id: string;
  userId: string;
  status: string;
  documentVerificationId?: string;
  livenessCheckId?: string;
  overallScore?: number;
  tier?: string;
  createdAt: string;
}
