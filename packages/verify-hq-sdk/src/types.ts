export interface DocumentVerification {
  id: string;
  userId: string;
  documentType: string;
  documentCountry: string;
  frontImageUrl: string;
  backImageUrl?: string;
  extractedData?: {
    fullName?: string;
    dateOfBirth?: string;
    documentNumber?: string;
    expiryDate?: string;
    nationality?: string;
    gender?: string;
    mrz?: string;
  };
  status: 'PENDING' | 'PROCESSING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  rejectionReason?: string;
  confidence?: number;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LivenessSession {
  id: string;
  userId: string;
  sessionToken: string;
  challengeType: string;
  challengeData: Record<string, any>;
  status: string;
  createdAt: string;
}

export interface LivenessCheck {
  id: string;
  userId: string;
  sessionToken: string;
  challengeType: string;
  isAlive?: boolean;
  confidence?: number;
  antiSpoofScore?: number;
  status: 'PENDING' | 'PROCESSING' | 'PASSED' | 'FAILED';
  failureReason?: string;
  completedAt?: string;
  createdAt: string;
}

export interface IdentityVerification {
  id: string;
  userId: string;
  documentVerificationId?: string;
  livenessCheckId?: string;
  faceMatchScore?: number;
  overallStatus: 'PENDING' | 'IN_PROGRESS' | 'VERIFIED' | 'REJECTED' | 'MANUAL_REVIEW';
  tier: 'BASIC' | 'STANDARD' | 'ENHANCED';
  reviewedBy?: string;
  reviewNotes?: string;
  verifiedAt?: string;
  expiresAt?: string;
  createdAt: string;
}
