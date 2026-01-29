import { v4 as uuidv4 } from 'uuid';

export interface INotificationPreferences {
  id: string;
  userId: string;
  // Push notification settings
  pushEnabled: boolean;
  pushTransactions: boolean;
  pushSecurity: boolean;
  pushMarketing: boolean;
  // Email notification settings
  emailEnabled: boolean;
  emailTransactions: boolean;
  emailMonthlyStatement: boolean;
  emailMarketing: boolean;
  // SMS notification settings
  smsEnabled: boolean;
  smsTransactions: boolean;
  smsSecurity: boolean;
  // Thresholds
  largeTransactionThreshold: number;
  lowBalanceThreshold: number;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationPreferencesProps {
  userId: string;
}

export interface UpdateNotificationPreferencesProps {
  pushEnabled?: boolean;
  pushTransactions?: boolean;
  pushSecurity?: boolean;
  pushMarketing?: boolean;
  emailEnabled?: boolean;
  emailTransactions?: boolean;
  emailMonthlyStatement?: boolean;
  emailMarketing?: boolean;
  smsEnabled?: boolean;
  smsTransactions?: boolean;
  smsSecurity?: boolean;
  largeTransactionThreshold?: number;
  lowBalanceThreshold?: number;
}

export class NotificationPreferences implements INotificationPreferences {
  readonly id: string;
  readonly userId: string;
  // Push notification settings
  pushEnabled: boolean;
  pushTransactions: boolean;
  pushSecurity: boolean;
  pushMarketing: boolean;
  // Email notification settings
  emailEnabled: boolean;
  emailTransactions: boolean;
  emailMonthlyStatement: boolean;
  emailMarketing: boolean;
  // SMS notification settings
  smsEnabled: boolean;
  smsTransactions: boolean;
  smsSecurity: boolean;
  // Thresholds
  largeTransactionThreshold: number;
  lowBalanceThreshold: number;
  // Timestamps
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: INotificationPreferences) {
    this.id = props.id;
    this.userId = props.userId;
    this.pushEnabled = props.pushEnabled;
    this.pushTransactions = props.pushTransactions;
    this.pushSecurity = props.pushSecurity;
    this.pushMarketing = props.pushMarketing;
    this.emailEnabled = props.emailEnabled;
    this.emailTransactions = props.emailTransactions;
    this.emailMonthlyStatement = props.emailMonthlyStatement;
    this.emailMarketing = props.emailMarketing;
    this.smsEnabled = props.smsEnabled;
    this.smsTransactions = props.smsTransactions;
    this.smsSecurity = props.smsSecurity;
    this.largeTransactionThreshold = props.largeTransactionThreshold;
    this.lowBalanceThreshold = props.lowBalanceThreshold;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Create new notification preferences with defaults
   */
  static create(
    props: CreateNotificationPreferencesProps,
  ): NotificationPreferences {
    const now = new Date();
    return new NotificationPreferences({
      id: uuidv4(),
      userId: props.userId,
      // Push defaults - enabled with all alerts on except marketing
      pushEnabled: true,
      pushTransactions: true,
      pushSecurity: true,
      pushMarketing: false,
      // Email defaults - enabled with transactions and statements on
      emailEnabled: true,
      emailTransactions: true,
      emailMonthlyStatement: true,
      emailMarketing: false,
      // SMS defaults - enabled with security always on
      smsEnabled: true,
      smsTransactions: true,
      smsSecurity: true, // This is always true for security reasons
      // Default thresholds
      largeTransactionThreshold: 1000,
      lowBalanceThreshold: 100,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute from persistence
   */
  static reconstitute(
    props: INotificationPreferences,
  ): NotificationPreferences {
    return new NotificationPreferences(props);
  }

  /**
   * Update preferences
   */
  update(props: UpdateNotificationPreferencesProps): void {
    if (props.pushEnabled !== undefined) {
      this.pushEnabled = props.pushEnabled;
      // If push is disabled, disable all push sub-settings
      if (!props.pushEnabled) {
        this.pushTransactions = false;
        this.pushSecurity = false;
        this.pushMarketing = false;
      }
    }
    if (props.pushTransactions !== undefined)
      this.pushTransactions = props.pushTransactions;
    if (props.pushSecurity !== undefined)
      this.pushSecurity = props.pushSecurity;
    if (props.pushMarketing !== undefined)
      this.pushMarketing = props.pushMarketing;

    if (props.emailEnabled !== undefined) {
      this.emailEnabled = props.emailEnabled;
      // If email is disabled, disable all email sub-settings
      if (!props.emailEnabled) {
        this.emailTransactions = false;
        this.emailMonthlyStatement = false;
        this.emailMarketing = false;
      }
    }
    if (props.emailTransactions !== undefined)
      this.emailTransactions = props.emailTransactions;
    if (props.emailMonthlyStatement !== undefined)
      this.emailMonthlyStatement = props.emailMonthlyStatement;
    if (props.emailMarketing !== undefined)
      this.emailMarketing = props.emailMarketing;

    if (props.smsEnabled !== undefined) {
      this.smsEnabled = props.smsEnabled;
      // If SMS is disabled, disable transactions but keep security on
      if (!props.smsEnabled) {
        this.smsTransactions = false;
        // smsSecurity stays true - cannot be disabled
      }
    }
    if (props.smsTransactions !== undefined)
      this.smsTransactions = props.smsTransactions;
    // smsSecurity cannot be disabled for security reasons
    // if (props.smsSecurity !== undefined) this.smsSecurity = props.smsSecurity;

    if (props.largeTransactionThreshold !== undefined) {
      this.largeTransactionThreshold = props.largeTransactionThreshold;
    }
    if (props.lowBalanceThreshold !== undefined) {
      this.lowBalanceThreshold = props.lowBalanceThreshold;
    }

    this.updatedAt = new Date();
  }

  /**
   * Check if user should receive push notification for a given type
   */
  shouldReceivePush(type: 'transaction' | 'security' | 'marketing'): boolean {
    if (!this.pushEnabled) return false;
    switch (type) {
      case 'transaction':
        return this.pushTransactions;
      case 'security':
        return this.pushSecurity;
      case 'marketing':
        return this.pushMarketing;
      default:
        return false;
    }
  }

  /**
   * Check if user should receive email notification for a given type
   */
  shouldReceiveEmail(
    type: 'transaction' | 'monthly_statement' | 'marketing',
  ): boolean {
    if (!this.emailEnabled) return false;
    switch (type) {
      case 'transaction':
        return this.emailTransactions;
      case 'monthly_statement':
        return this.emailMonthlyStatement;
      case 'marketing':
        return this.emailMarketing;
      default:
        return false;
    }
  }

  /**
   * Check if user should receive SMS notification for a given type
   */
  shouldReceiveSms(type: 'transaction' | 'security'): boolean {
    if (!this.smsEnabled) return false;
    switch (type) {
      case 'transaction':
        return this.smsTransactions;
      case 'security':
        return this.smsSecurity; // Always true
      default:
        return false;
    }
  }

  /**
   * Check if a transaction amount exceeds the large transaction threshold
   */
  isLargeTransaction(amount: number): boolean {
    return amount >= this.largeTransactionThreshold;
  }

  /**
   * Check if a balance is below the low balance threshold
   */
  isLowBalance(balance: number): boolean {
    return balance <= this.lowBalanceThreshold;
  }
}
