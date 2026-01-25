/**
 * BCEAO Compliance Types
 *
 * West African Economic and Monetary Union (WAEMU/UEMOA) regulatory compliance types.
 * BCEAO = Banque Centrale des États de l'Afrique de l'Ouest
 *
 * Regulatory Framework:
 * - AML/CFT directives per BCEAO standards
 * - Cross-border transaction reporting
 * - Large transaction monitoring (>1M XOF)
 * - SAR filing requirements
 * - 7-year data retention mandate
 */

/**
 * Transaction Report Types
 *
 * BCEAO requires multiple periodic reports:
 * - Daily: Summary of all transactions
 * - Weekly: Aggregate statistics and trends
 * - Monthly: Comprehensive compliance report
 * - Suspicious: On-demand SAR submissions
 */
export type ReportType = 'daily' | 'weekly' | 'monthly' | 'suspicious';

/**
 * Report Status
 *
 * Lifecycle:
 * 1. draft - Report generated but not reviewed
 * 2. pending_review - Awaiting compliance officer review
 * 3. approved - Approved for submission
 * 4. submitted - Submitted to BCEAO
 * 5. acknowledged - BCEAO confirmed receipt
 * 6. rejected - BCEAO rejected report (requires correction)
 */
export type ReportStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'submitted'
  | 'acknowledged'
  | 'rejected';

/**
 * SAR Trigger Reasons
 *
 * Automated and manual triggers for Suspicious Activity Reports
 */
export type SARTriggerReason =
  | 'structuring' // Breaking large transactions into smaller ones (smurfing)
  | 'velocity_anomaly' // Abnormal transaction frequency
  | 'geographic_risk' // High-risk jurisdiction involvement
  | 'pep_transaction' // Politically Exposed Person transaction
  | 'sanctions_proximity' // Transaction near sanctioned entity
  | 'manual_flag' // Compliance officer manual escalation
  | 'round_amount' // Suspiciously round transaction amounts
  | 'rapid_movement' // Funds moving quickly through accounts
  | 'inconsistent_profile'; // Transaction inconsistent with user profile

/**
 * SAR Status
 *
 * Lifecycle:
 * 1. draft - Initial detection, under review
 * 2. under_investigation - Compliance team investigating
 * 3. submitted - Filed with BCEAO
 * 4. closed - Investigation closed (filed or dismissed)
 * 5. dismissed - False positive, no filing required
 */
export type SARStatus =
  | 'draft'
  | 'under_investigation'
  | 'submitted'
  | 'closed'
  | 'dismissed';

/**
 * Risk Score Levels
 * Based on BCEAO risk matrix
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Transaction Report Interface
 *
 * Periodic transaction summary for BCEAO submission
 */
export interface TransactionReport {
  reportId: string;
  reportType: ReportType;
  periodStart: Date;
  periodEnd: Date;
  totalTransactions: number;
  totalVolume: number; // In USDC
  totalVolumeXof: number; // Converted to XOF
  crossBorderCount: number;
  crossBorderVolume: number; // In USDC
  flaggedTransactions: string[]; // Transaction IDs
  largeTransactionCount: number; // >1M XOF
  uniqueUsers: number;
  newUsers: number;
  suspiciousActivityCount: number;
  generatedAt: Date;
  generatedBy?: string; // User/System ID
  submittedAt?: Date;
  submittedBy?: string;
  status: ReportStatus;
}

/**
 * Suspicious Activity Report (SAR)
 *
 * Filed when transaction patterns indicate potential money laundering,
 * terrorism financing, or other financial crimes
 */
export interface SuspiciousActivityReport {
  sarId: string;
  userId: string;
  userDetails: {
    phone: string;
    firstName?: string;
    lastName?: string;
    countryCode: string;
    kycStatus: string;
    accountAge: number; // Days since account creation
  };
  transactionIds: string[];
  triggerReason: SARTriggerReason;
  riskScore: number; // 0-100
  riskLevel: RiskLevel;
  narrative: string; // Human-readable explanation
  detectionMethod: 'automated' | 'manual';
  detectedAt: Date;
  status: SARStatus;
  investigatedBy?: string;
  investigationNotes?: string;
  submittedAt?: Date;
  submittedBy?: string;
  closedAt?: Date;
  closedReason?: string;
}

/**
 * AML/CFT Rule Configuration
 *
 * Configurable thresholds for automated detection
 */
export interface AMLRule {
  ruleId: string;
  ruleName: string;
  ruleType: SARTriggerReason;
  enabled: boolean;
  severity: RiskLevel;
  threshold: number;
  timeWindow: number; // In minutes
  description: string;
}

/**
 * Transaction Pattern Analysis
 *
 * Result of pattern detection algorithms
 */
export interface TransactionPattern {
  userId: string;
  patternType: SARTriggerReason;
  detectedAt: Date;
  transactionIds: string[];
  confidence: number; // 0-100
  indicators: string[];
  metadata: Record<string, unknown>;
}

/**
 * Geographic Risk Data
 *
 * Country risk scores based on FATF and BCEAO guidelines
 */
export interface GeographicRisk {
  countryCode: string;
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  reasons: string[];
  isSanctioned: boolean;
  lastUpdated: Date;
}

/**
 * PEP Screening Result
 *
 * Politically Exposed Person screening outcome
 */
export interface PEPScreeningResult {
  userId: string;
  isPEP: boolean;
  pepCategory?: 'domestic' | 'foreign' | 'international_organization';
  position?: string;
  matchConfidence?: number; // 0-100
  screenedAt: Date;
  source?: string; // Screening database source
}

/**
 * BCEAO Report Metrics
 *
 * Key metrics included in regulatory reports
 */
export interface BCEAOReportMetrics {
  totalDeposits: number;
  totalWithdrawals: number;
  totalTransfers: number;
  totalInternalTransfers: number;
  totalExternalTransfers: number;
  totalCrossBorderTransactions: number;
  totalVolume: number;
  totalVolumeXof: number;
  averageTransactionSize: number;
  largeTransactions: number; // >1M XOF
  activeUsers: number;
  newUsers: number;
  suspiciousActivities: number;
  blockedTransactions: number;
}

/**
 * Compliance Alert
 *
 * Real-time alert for compliance officers
 */
export interface ComplianceAlert {
  alertId: string;
  alertType: SARTriggerReason;
  severity: RiskLevel;
  userId: string;
  transactionId?: string;
  title: string;
  description: string;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolution?: string;
}

/**
 * Velocity Check Result
 *
 * Transaction velocity analysis for smurfing detection
 */
export interface VelocityCheckResult {
  userId: string;
  timeWindow: number; // Minutes
  transactionCount: number;
  totalAmount: number;
  averageAmount: number;
  threshold: number;
  exceeded: boolean;
  riskScore: number;
  transactions: Array<{
    id: string;
    amount: number;
    timestamp: Date;
  }>;
}

/**
 * Structuring Detection Result
 *
 * Pattern indicating deliberate transaction structuring to evade reporting
 */
export interface StructuringDetectionResult {
  userId: string;
  detectionPeriod: {
    start: Date;
    end: Date;
  };
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  standardDeviation: number;
  consistentAmounts: boolean; // Similar amounts (structuring indicator)
  belowThreshold: boolean; // All below reporting threshold
  riskScore: number;
  confidence: number; // 0-100
  transactions: string[];
}

/**
 * BCEAO Submission Response
 *
 * Response from BCEAO regulatory system (future API integration)
 */
export interface BCEAOSubmissionResponse {
  submissionId: string;
  reportId: string;
  status: 'accepted' | 'rejected' | 'pending';
  acknowledgedAt?: Date;
  referenceNumber?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Compliance Dashboard Summary
 *
 * Overview for compliance officers
 */
export interface ComplianceDashboard {
  period: {
    start: Date;
    end: Date;
  };
  metrics: BCEAOReportMetrics;
  openAlerts: number;
  pendingSARs: number;
  pendingReports: number;
  recentSARs: SuspiciousActivityReport[];
  recentAlerts: ComplianceAlert[];
  riskTrends: Array<{
    date: string;
    riskScore: number;
    alertCount: number;
  }>;
}
