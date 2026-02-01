export enum NotificationEventType {
  TRANSACTION_CREATED = 'transaction.created',
  TRANSACTION_COMPLETED = 'transaction.completed',
  TRANSACTION_FAILED = 'transaction.failed',
  BALANCE_UPDATED = 'balance.updated',
  TRANSFER_RECEIVED = 'transfer.received',
  TRANSFER_SENT = 'transfer.sent',
  DEPOSIT_COMPLETED = 'deposit.completed',
  WITHDRAWAL_COMPLETED = 'withdrawal.completed',
  KYC_STATUS_UPDATED = 'kyc.status_updated',
  ACCOUNT_SUSPENDED = 'account.suspended',
  ACCOUNT_UNSUSPENDED = 'account.unsuspended',
  SESSION_EXPIRED = 'session.expired',
  DEVICE_VERIFIED = 'device.verified',
  SECURITY_ALERT = 'security.alert',
}

export interface NotificationEvent {
  type: NotificationEventType;
  userId: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export class TransactionNotificationEvent implements NotificationEvent {
  readonly type: NotificationEventType;
  readonly userId: string;
  readonly data: {
    transactionId: string;
    amount: number;
    currency: string;
    status: string;
    direction: 'inbound' | 'outbound';
    recipientName?: string;
    senderName?: string;
  };
  readonly timestamp: Date;

  constructor(props: {
    type: NotificationEventType;
    userId: string;
    transactionId: string;
    amount: number;
    currency: string;
    status: string;
    direction: 'inbound' | 'outbound';
    recipientName?: string;
    senderName?: string;
  }) {
    this.type = props.type;
    this.userId = props.userId;
    this.data = {
      transactionId: props.transactionId,
      amount: props.amount,
      currency: props.currency,
      status: props.status,
      direction: props.direction,
      recipientName: props.recipientName,
      senderName: props.senderName,
    };
    this.timestamp = new Date();
  }
}

export class BalanceNotificationEvent implements NotificationEvent {
  readonly type: NotificationEventType.BALANCE_UPDATED;
  readonly userId: string;
  readonly data: {
    balance: number;
    currency: string;
    previousBalance?: number;
    change?: number;
  };
  readonly timestamp: Date;

  constructor(props: {
    userId: string;
    balance: number;
    currency: string;
    previousBalance?: number;
  }) {
    this.type = NotificationEventType.BALANCE_UPDATED;
    this.userId = props.userId;
    this.data = {
      balance: props.balance,
      currency: props.currency,
      previousBalance: props.previousBalance,
      change:
        props.previousBalance !== undefined
          ? props.balance - props.previousBalance
          : undefined,
    };
    this.timestamp = new Date();
  }
}

export class SecurityNotificationEvent implements NotificationEvent {
  readonly type: NotificationEventType;
  readonly userId: string;
  readonly data: {
    alertType: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    requiresAction: boolean;
  };
  readonly timestamp: Date;

  constructor(props: {
    type: NotificationEventType;
    userId: string;
    alertType: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    requiresAction: boolean;
  }) {
    this.type = props.type;
    this.userId = props.userId;
    this.data = {
      alertType: props.alertType,
      message: props.message,
      severity: props.severity,
      requiresAction: props.requiresAction,
    };
    this.timestamp = new Date();
  }
}

export class KycStatusNotificationEvent implements NotificationEvent {
  readonly type: NotificationEventType.KYC_STATUS_UPDATED;
  readonly userId: string;
  readonly data: {
    status: string;
    previousStatus?: string;
    message?: string;
  };
  readonly timestamp: Date;

  constructor(props: {
    userId: string;
    status: string;
    previousStatus?: string;
    message?: string;
  }) {
    this.type = NotificationEventType.KYC_STATUS_UPDATED;
    this.userId = props.userId;
    this.data = {
      status: props.status,
      previousStatus: props.previousStatus,
      message: props.message,
    };
    this.timestamp = new Date();
  }
}
