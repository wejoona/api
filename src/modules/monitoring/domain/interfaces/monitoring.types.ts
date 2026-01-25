/**
 * Monitoring Types
 * Type definitions for real-time transaction monitoring and alerts
 */

// Alert severity levels
export type AlertSeverity = 'info' | 'warning' | 'critical';

// Alert types for various monitoring scenarios
export type AlertType =
  | 'large_transaction'      // Transaction above threshold
  | 'unusual_location'       // Different country/IP from usual
  | 'rapid_transactions'     // Multiple transactions in short time
  | 'new_recipient'          // First transaction to an address
  | 'suspicious_pattern'     // ML-detected anomaly
  | 'failed_attempts'        // Multiple failed transactions
  | 'account_change'         // Profile/security changes
  | 'login_new_device'       // New device detected
  | 'balance_threshold'      // Balance below/above threshold
  | 'external_withdrawal'    // Funds leaving platform
  | 'time_anomaly'          // Transaction at unusual hour
  | 'round_amount'          // Suspiciously round numbers (structuring indicator)
  | 'cumulative_daily'      // Daily volume exceeds limit
  | 'velocity_limit';       // Transaction velocity exceeded

// Alert action types
export type AlertAction =
  | 'block_recipient'        // Block future transactions to recipient
  | 'verify_identity'        // Verify this was the user
  | 'report_suspicious'      // Report as suspicious activity
  | 'contact_support'        // Contact customer support
  | 'dismiss'                // Dismiss alert
  | 'require_2fa'            // Require 2FA for future transactions
  | 'freeze_account';        // Temporarily freeze account

// Transaction alert entity
export interface TransactionAlert {
  alertId: string;
  userId: string;
  transactionId?: string;
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata: AlertMetadata;
  isRead: boolean;
  isActionRequired: boolean;
  actionTaken?: AlertAction;
  actionTakenAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Alert metadata structure
export interface AlertMetadata {
  amount?: number;
  currency?: string;
  recipientAddress?: string;
  recipientName?: string;
  location?: LocationInfo;
  deviceInfo?: DeviceInfo;
  riskScore?: number;
  ruleId?: string;
  ruleName?: string;
  transactionCount?: number;
  timeWindow?: number;
  threshold?: number;
  actualValue?: number;
  previousValue?: number;
  [key: string]: any;
}

// Location information
export interface LocationInfo {
  country?: string;
  countryCode?: string;
  city?: string;
  region?: string;
  ip?: string;
  isVpn?: boolean;
  isTor?: boolean;
}

// Device information
export interface DeviceInfo {
  deviceId?: string;
  deviceType?: string;
  platform?: 'ios' | 'android' | 'web';
  osVersion?: string;
  appVersion?: string;
  fingerprint?: string;
}

// User alert preferences
export interface UserAlertPreferences {
  userId: string;
  // Notification channels
  emailAlerts: boolean;
  pushAlerts: boolean;
  smsAlerts: boolean;
  // Thresholds
  largeTransactionThreshold: number;
  balanceLowThreshold: number;
  balanceHighThreshold?: number;
  dailyLimitThreshold?: number;
  // Alert type subscriptions
  alertTypes: AlertType[];
  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // HH:mm
  quietHoursEnd?: string;   // HH:mm
  timezone: string;
  // Settings
  instantCriticalAlerts: boolean;
  digestFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  createdAt: Date;
  updatedAt: Date;
}

// Rule condition types
export type RuleConditionType =
  | 'amount_greater_than'
  | 'amount_less_than'
  | 'velocity_exceeded'
  | 'location_mismatch'
  | 'time_outside_range'
  | 'recipient_new'
  | 'recipient_blacklisted'
  | 'cumulative_exceeded'
  | 'pattern_match'
  | 'device_new'
  | 'failed_count_exceeded';

// Rule condition
export interface RuleCondition {
  type: RuleConditionType;
  field?: string;
  operator?: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'regex';
  value?: any;
  timeWindowMinutes?: number;
  countThreshold?: number;
  customLogic?: string;
}

// Rule action
export interface RuleAction {
  createAlert: boolean;
  alertType?: AlertType;
  severity?: AlertSeverity;
  notifyUser: boolean;
  notifyAdmin: boolean;
  blockTransaction?: boolean;
  require2FA?: boolean;
  logToAudit: boolean;
  customAction?: string;
}

// Monitoring rule
export interface MonitoringRule {
  ruleId: string;
  name: string;
  description: string;
  category: 'fraud' | 'aml' | 'risk' | 'compliance' | 'user_defined';
  conditions: RuleCondition[];
  conditionLogic: 'AND' | 'OR';
  action: RuleAction;
  isActive: boolean;
  priority: number;
  isUserConfigurable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Transaction monitoring context
export interface TransactionContext {
  transactionId: string;
  userId: string;
  walletId: string;
  type: 'deposit' | 'withdrawal' | 'transfer_internal' | 'transfer_external';
  amount: number;
  currency: string;
  recipientAddress?: string;
  recipientWalletId?: string;
  recipientPhone?: string;
  status: string;
  location?: LocationInfo;
  device?: DeviceInfo;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// User transaction profile for pattern detection
export interface UserTransactionProfile {
  userId: string;
  averageTransactionAmount: number;
  maxTransactionAmount: number;
  typicalTransactionHours: number[];
  frequentRecipients: string[];
  typicalCountries: string[];
  knownDevices: string[];
  transactionVelocity: VelocityStats;
  lastUpdated: Date;
}

// Velocity statistics
export interface VelocityStats {
  last1Hour: number;
  last24Hours: number;
  last7Days: number;
  last30Days: number;
}

// Alert statistics for dashboard
export interface AlertStatistics {
  totalAlerts: number;
  unreadAlerts: number;
  criticalAlerts: number;
  actionRequiredAlerts: number;
  alertsByType: Record<AlertType, number>;
  alertsBySeverity: Record<AlertSeverity, number>;
  recentAlerts: TransactionAlert[];
}

// Alert filter options
export interface AlertFilterOptions {
  userId?: string;
  alertTypes?: AlertType[];
  severities?: AlertSeverity[];
  isRead?: boolean;
  isActionRequired?: boolean;
  fromDate?: Date;
  toDate?: Date;
  transactionId?: string;
}

// Pagination options
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// Paginated response
export interface PaginatedAlerts {
  alerts: TransactionAlert[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Alert event for EventEmitter
export interface AlertCreatedEvent {
  alert: TransactionAlert;
  user: {
    userId: string;
    phone?: string;
    email?: string;
  };
  shouldNotify: {
    push: boolean;
    sms: boolean;
    email: boolean;
  };
}

// Real-time alert for WebSocket
export interface RealTimeAlert {
  type: 'new_alert' | 'alert_read' | 'alert_action_taken';
  alertId: string;
  userId: string;
  data: Partial<TransactionAlert>;
  timestamp: Date;
}

// Default alert preferences
export const DEFAULT_ALERT_PREFERENCES: Omit<UserAlertPreferences, 'userId' | 'createdAt' | 'updatedAt'> = {
  emailAlerts: true,
  pushAlerts: true,
  smsAlerts: false,
  largeTransactionThreshold: 1000,
  balanceLowThreshold: 10,
  balanceHighThreshold: undefined,
  dailyLimitThreshold: 5000,
  alertTypes: [
    'large_transaction',
    'unusual_location',
    'rapid_transactions',
    'new_recipient',
    'failed_attempts',
    'login_new_device',
    'balance_threshold',
    'external_withdrawal',
  ],
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  timezone: 'UTC',
  instantCriticalAlerts: true,
  digestFrequency: 'realtime',
};

// Alert type configurations
export const ALERT_TYPE_CONFIG: Record<AlertType, {
  defaultSeverity: AlertSeverity;
  title: string;
  description: string;
  icon: string;
  color: string;
}> = {
  large_transaction: {
    defaultSeverity: 'warning',
    title: 'Large Transaction',
    description: 'Transaction amount exceeds your threshold',
    icon: 'attach_money',
    color: '#FF9800',
  },
  unusual_location: {
    defaultSeverity: 'critical',
    title: 'Unusual Location',
    description: 'Transaction from different country or IP',
    icon: 'location_off',
    color: '#F44336',
  },
  rapid_transactions: {
    defaultSeverity: 'warning',
    title: 'Rapid Transactions',
    description: 'Multiple transactions in short time',
    icon: 'speed',
    color: '#FF9800',
  },
  new_recipient: {
    defaultSeverity: 'info',
    title: 'New Recipient',
    description: 'First transaction to this address',
    icon: 'person_add',
    color: '#2196F3',
  },
  suspicious_pattern: {
    defaultSeverity: 'critical',
    title: 'Suspicious Pattern',
    description: 'Unusual transaction pattern detected',
    icon: 'warning',
    color: '#F44336',
  },
  failed_attempts: {
    defaultSeverity: 'warning',
    title: 'Failed Attempts',
    description: 'Multiple failed transaction attempts',
    icon: 'error_outline',
    color: '#FF9800',
  },
  account_change: {
    defaultSeverity: 'info',
    title: 'Account Change',
    description: 'Profile or security settings changed',
    icon: 'settings',
    color: '#2196F3',
  },
  login_new_device: {
    defaultSeverity: 'warning',
    title: 'New Device Login',
    description: 'Login from new device detected',
    icon: 'phone_android',
    color: '#9C27B0',
  },
  balance_threshold: {
    defaultSeverity: 'info',
    title: 'Balance Alert',
    description: 'Balance crossed threshold',
    icon: 'account_balance_wallet',
    color: '#4CAF50',
  },
  external_withdrawal: {
    defaultSeverity: 'warning',
    title: 'External Withdrawal',
    description: 'Funds sent to external address',
    icon: 'call_made',
    color: '#FF9800',
  },
  time_anomaly: {
    defaultSeverity: 'info',
    title: 'Unusual Time',
    description: 'Transaction at unusual hour',
    icon: 'schedule',
    color: '#607D8B',
  },
  round_amount: {
    defaultSeverity: 'warning',
    title: 'Round Amount',
    description: 'Suspiciously round transaction amount',
    icon: 'monetization_on',
    color: '#FF9800',
  },
  cumulative_daily: {
    defaultSeverity: 'warning',
    title: 'Daily Limit',
    description: 'Daily transaction volume exceeded',
    icon: 'trending_up',
    color: '#FF9800',
  },
  velocity_limit: {
    defaultSeverity: 'warning',
    title: 'Velocity Limit',
    description: 'Transaction rate limit exceeded',
    icon: 'flash_on',
    color: '#FF9800',
  },
};
