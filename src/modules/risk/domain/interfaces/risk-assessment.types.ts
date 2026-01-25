/**
 * Risk Assessment Types
 * Shared types for risk management integration
 */

// Risk Levels
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type RiskDecision = 'allow' | 'review' | 'block';

// Transaction Analysis
export interface TransactionAnalysisRequest {
  transactionId: string;
  userId: string;
  type: 'transfer' | 'deposit' | 'withdrawal' | 'exchange';
  amount: number;
  currency: string;
  sourceCountry?: string;
  destinationCountry?: string;
  recipientId?: string;
  recipientType?: 'internal' | 'external' | 'merchant';
  channel: 'mobile' | 'web' | 'api';
  deviceFingerprint?: DeviceFingerprint;
  metadata?: Record<string, unknown>;
}

export interface TransactionAnalysisResult {
  analysisId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  riskDecision: RiskDecision;
  riskFactors: string[];
  requiresStepUp: boolean;
  stepUpType?: 'biometric' | 'otp' | 'pin' | 'manual_review';
  processedAt: Date;
  expiresAt?: Date;
}

// Device Fingerprint
export interface DeviceFingerprint {
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  osVersion?: string;
  appVersion?: string;
  ipAddress?: string;
  userAgent?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  isEmulator?: boolean;
  isRooted?: boolean;
}

export interface DeviceFingerprintResult {
  fingerprintId: string;
  isKnownDevice: boolean;
  deviceTrustScore: number;
  riskIndicators: string[];
  lastSeenAt?: Date;
  firstSeenAt?: Date;
}

// Sanctions Screening
export type ScreeningSubjectType = 'individual' | 'entity';
export type MatchConfidence = 'exact' | 'strong' | 'possible' | 'weak';
export type ScreeningStatus = 'clear' | 'potential_match' | 'confirmed_match';

export interface IndividualScreeningRequest {
  referenceId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: string;
  nationality?: string;
  countryOfResidence?: string;
  idType?: string;
  idNumber?: string;
  aliases?: string[];
  listsToScreen?: string[];
}

export interface EntityScreeningRequest {
  referenceId: string;
  entityName: string;
  entityType?: string;
  registrationNumber?: string;
  countryOfRegistration?: string;
  aliases?: string[];
  listsToScreen?: string[];
}

export interface ScreeningMatch {
  matchId: string;
  listCode: string;
  listName: string;
  entryId: string;
  matchedName: string;
  matchConfidence: MatchConfidence;
  matchScore: number;
  matchedFields: string[];
  sanctionPrograms?: string[];
  remarks?: string;
}

export interface ScreeningResult {
  screeningId: string;
  referenceId: string;
  subjectType: ScreeningSubjectType;
  status: ScreeningStatus;
  totalMatches: number;
  matches: ScreeningMatch[];
  screenedAt: Date;
  listsScreened: string[];
}

// Velocity Check
export interface VelocityCheckRequest {
  userId: string;
  checkType: 'transaction_count' | 'transaction_amount' | 'unique_recipients' | 'failed_attempts';
  timeWindowMinutes: number;
  currentValue?: number;
}

export interface VelocityCheckResult {
  checkId: string;
  userId: string;
  checkType: string;
  currentCount: number;
  limit: number;
  remainingAllowance: number;
  isExceeded: boolean;
  resetAt: Date;
}

// Risk Profile
export interface UserRiskProfile {
  userId: string;
  overallRiskScore: number;
  riskLevel: RiskLevel;
  kycLevel: number;
  transactionLimits: {
    dailyLimit: number;
    monthlyLimit: number;
    singleTransactionLimit: number;
  };
  velocityLimits: {
    maxTransactionsPerHour: number;
    maxTransactionsPerDay: number;
    maxUniqueRecipientsPerDay: number;
  };
  screeningStatus: ScreeningStatus;
  lastScreenedAt?: Date;
  riskFactors: string[];
  updatedAt: Date;
}

// Aggregated Risk Assessment
export interface FullRiskAssessment {
  transactionAnalysis: TransactionAnalysisResult;
  screeningResult?: ScreeningResult;
  velocityCheck?: VelocityCheckResult;
  deviceAnalysis?: DeviceFingerprintResult;
  addressScreening?: AddressScreeningAssessment;
  finalDecision: RiskDecision;
  requiresManualReview: boolean;
  blockedReasons?: string[];
}

// Circle Compliance Engine - Address Screening
export type AddressRiskCategory =
  | 'SANCTIONS'
  | 'CSAM'
  | 'ILLICIT_BEHAVIOR'
  | 'GAMBLING'
  | 'TERRORIST_FINANCING'
  | 'UNSUPPORTED'
  | 'FROZEN'
  | 'OTHER'
  | 'HIGH_RISK_INDUSTRY'
  | 'PEP'
  | 'TRUSTED'
  | 'HACKING'
  | 'HUMAN_TRAFFICKING'
  | 'SPECIAL_MEASURES';

export interface AddressRiskSignal {
  category: AddressRiskCategory;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description?: string;
  source?: string;
}

export interface AddressScreeningAssessment {
  address: string;
  blockchain: string;
  decision: 'APPROVED' | 'DENIED';
  riskSignals: AddressRiskSignal[];
  screenedAt: Date;
  provider: 'circle' | 'internal' | 'mock';
}
