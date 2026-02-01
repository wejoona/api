/**
 * Regulatory Report Types
 *
 * Type definitions for BCEAO and West African regulatory reporting.
 */

export enum RegulatoryReportType {
  BCEAO_TRANSACTION = 'bceao_transaction',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  MONTHLY_COMPLIANCE = 'monthly_compliance',
  AUDIT_TRAIL = 'audit_trail',
  LARGE_TRANSACTION = 'large_transaction',
  CROSS_BORDER = 'cross_border',
  KYC_SUMMARY = 'kyc_summary',
  AML_CFT = 'aml_cft',
}

export enum ReportStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  SUBMITTED = 'submitted',
  ACKNOWLEDGED = 'acknowledged',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
}

export enum ReportPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
  CUSTOM = 'custom',
}

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
  XML = 'xml',
  XLSX = 'xlsx',
}

export interface BCEAOTransactionReportData {
  summary: {
    totalTransactions: number;
    totalVolumeUsdc: number;
    totalVolumeXof: number;
    depositCount: number;
    depositVolume: number;
    withdrawalCount: number;
    withdrawalVolume: number;
    transferCount: number;
    transferVolume: number;
  };
  crossBorder: {
    count: number;
    volume: number;
    byCountry: Record<string, { count: number; volume: number }>;
  };
  largeTransactions: {
    count: number;
    totalVolume: number;
    transactions: LargeTransactionDetail[];
  };
  userMetrics: {
    activeUsers: number;
    newUsers: number;
    kycVerifiedUsers: number;
    averageTransactionPerUser: number;
  };
}

export interface LargeTransactionDetail {
  transactionId: string;
  amount: number;
  amountXof: number;
  type: string;
  senderWalletId: string;
  recipientInfo: string;
  timestamp: Date;
  flagReason: string;
}

export interface SuspiciousActivityReportData {
  caseId: string;
  reportDate: Date;
  filingInstitution: {
    name: string;
    code: string;
    address: string;
    contactPerson: string;
    phone: string;
    email: string;
  };
  subject: {
    type: 'individual' | 'entity';
    name: string;
    dateOfBirth?: Date;
    nationality?: string;
    idType?: string;
    idNumber?: string;
    address?: string;
    phone?: string;
    email?: string;
    occupation?: string;
    accountNumber?: string;
    accountOpenDate?: Date;
  };
  suspiciousActivity: {
    dateFrom: Date;
    dateTo: Date;
    totalAmount: number;
    currency: string;
    activityType: string;
    description: string;
    indicators: string[];
    relatedTransactions: string[];
  };
  actionTaken: {
    internalInvestigation: boolean;
    accountRestricted: boolean;
    accountClosed: boolean;
    lawEnforcementNotified: boolean;
    otherActions: string;
  };
  narrative: string;
  attachments: string[];
}

export interface MonthlyComplianceSummary {
  reportingPeriod: {
    month: number;
    year: number;
    startDate: Date;
    endDate: Date;
  };
  kycMetrics: {
    totalUsers: number;
    verifiedUsers: number;
    pendingVerification: number;
    rejectedVerifications: number;
    tier1Users: number;
    tier2Users: number;
    tier3Users: number;
  };
  transactionMetrics: {
    totalCount: number;
    totalVolume: number;
    averageTransactionSize: number;
    peakTransactionDay: Date;
    peakTransactionCount: number;
  };
  amlMetrics: {
    screeningsPerformed: number;
    alertsGenerated: number;
    alertsEscalated: number;
    alertsCleared: number;
    sarsGenerated: number;
    sarsSubmitted: number;
    blockedTransactions: number;
  };
  riskMetrics: {
    highRiskUsers: number;
    mediumRiskUsers: number;
    lowRiskUsers: number;
    riskScoreDistribution: Record<string, number>;
  };
  complianceIssues: ComplianceIssue[];
}

export interface ComplianceIssue {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
  status: 'open' | 'investigating' | 'resolved' | 'escalated';
}

export interface AuditTrailExportData {
  exportDate: Date;
  periodStart: Date;
  periodEnd: Date;
  generatedBy: string;
  totalRecords: number;
  records: AuditRecord[];
}

export interface AuditRecord {
  id: string;
  timestamp: Date;
  eventType: string;
  entityType: string;
  entityId: string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ReportGenerationOptions {
  reportType: RegulatoryReportType;
  periodStart: Date;
  periodEnd: Date;
  format?: ExportFormat;
  includeAttachments?: boolean;
  filters?: ReportFilters;
}

export interface ReportFilters {
  transactionTypes?: string[];
  minAmount?: number;
  maxAmount?: number;
  userIds?: string[];
  countries?: string[];
  riskLevels?: string[];
}

// BCEAO-specific thresholds (West African CFA Franc)
export const BCEAO_THRESHOLDS = {
  LARGE_TRANSACTION_XOF: 1_000_000, // 1M XOF (~$1,600 USD)
  STRUCTURING_THRESHOLD_XOF: 900_000, // 90% of large transaction threshold
  DAILY_AGGREGATE_XOF: 5_000_000, // 5M XOF daily aggregate reporting
  CROSS_BORDER_REPORTING_XOF: 500_000, // 500K XOF for cross-border
  XOF_TO_USD_RATE: 600, // Approximate XOF to USD rate
};

// WAEMU country codes
export const WAEMU_COUNTRIES = {
  CI: "Cote d'Ivoire",
  SN: 'Senegal',
  ML: 'Mali',
  BF: 'Burkina Faso',
  BJ: 'Benin',
  TG: 'Togo',
  NE: 'Niger',
  GW: 'Guinea-Bissau',
};

// Phone country codes for WAEMU region
export const WAEMU_PHONE_CODES: Record<string, string> = {
  '+225': 'CI',
  '+221': 'SN',
  '+223': 'ML',
  '+226': 'BF',
  '+229': 'BJ',
  '+228': 'TG',
  '+227': 'NE',
  '+245': 'GW',
};
