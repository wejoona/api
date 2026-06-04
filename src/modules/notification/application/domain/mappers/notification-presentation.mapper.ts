import { NotificationType } from '@modules/notification/infrastructure/orm-entities/notification.orm-entity';

export type NotificationPresentationType =
  | 'transactionComplete'
  | 'transactionFailed'
  | 'securityAlert'
  | 'promotion'
  | 'lowBalance'
  | 'general'
  | 'transfer'
  | 'deposit'
  | 'withdrawal'
  | 'security'
  | 'kyc'
  | 'newDeviceLogin'
  | 'largeTransaction'
  | 'withdrawalPending'
  | 'addressWhitelisted'
  | 'priceAlert'
  | 'weeklySpendingSummary';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'critical';

export interface NotificationPresentation {
  presentationType: NotificationPresentationType;
  severity: NotificationSeverity;
  action: 'open_transaction' | 'open_kyc' | 'open_security' | 'open_wallet' | 'none';
}

const presentationByType: Record<NotificationType, NotificationPresentation> = {
  transfer_received: {
    presentationType: 'transfer',
    severity: 'success',
    action: 'open_transaction',
  },
  transfer_sent: {
    presentationType: 'transfer',
    severity: 'success',
    action: 'open_transaction',
  },
  transfer_complete: {
    presentationType: 'transactionComplete',
    severity: 'success',
    action: 'open_transaction',
  },
  transfer_failed: {
    presentationType: 'transactionFailed',
    severity: 'critical',
    action: 'open_transaction',
  },
  deposit_completed: {
    presentationType: 'deposit',
    severity: 'success',
    action: 'open_transaction',
  },
  deposit_complete: {
    presentationType: 'deposit',
    severity: 'success',
    action: 'open_transaction',
  },
  deposit_failed: {
    presentationType: 'transactionFailed',
    severity: 'critical',
    action: 'open_transaction',
  },
  withdrawal_completed: {
    presentationType: 'withdrawal',
    severity: 'success',
    action: 'open_transaction',
  },
  withdrawal_complete: {
    presentationType: 'withdrawal',
    severity: 'success',
    action: 'open_transaction',
  },
  withdrawal_failed: {
    presentationType: 'transactionFailed',
    severity: 'critical',
    action: 'open_transaction',
  },
  withdrawal_pending: {
    presentationType: 'withdrawalPending',
    severity: 'warning',
    action: 'open_transaction',
  },
  kyc_approved: {
    presentationType: 'kyc',
    severity: 'success',
    action: 'open_kyc',
  },
  kyc_rejected: {
    presentationType: 'kyc',
    severity: 'warning',
    action: 'open_kyc',
  },
  kyc_update: {
    presentationType: 'kyc',
    severity: 'info',
    action: 'open_kyc',
  },
  low_balance: {
    presentationType: 'lowBalance',
    severity: 'warning',
    action: 'open_wallet',
  },
  system: {
    presentationType: 'general',
    severity: 'info',
    action: 'none',
  },
  promotional: {
    presentationType: 'promotion',
    severity: 'info',
    action: 'none',
  },
  new_device_login: {
    presentationType: 'newDeviceLogin',
    severity: 'critical',
    action: 'open_security',
  },
  large_transaction: {
    presentationType: 'largeTransaction',
    severity: 'critical',
    action: 'open_transaction',
  },
  address_whitelisted: {
    presentationType: 'addressWhitelisted',
    severity: 'success',
    action: 'open_security',
  },
  security_alert: {
    presentationType: 'securityAlert',
    severity: 'critical',
    action: 'open_security',
  },
  price_alert: {
    presentationType: 'priceAlert',
    severity: 'info',
    action: 'open_wallet',
  },
  weekly_summary: {
    presentationType: 'weeklySpendingSummary',
    severity: 'info',
    action: 'open_wallet',
  },
};

export function getNotificationPresentation(
  type: NotificationType,
): NotificationPresentation {
  return presentationByType[type] ?? {
    presentationType: 'general',
    severity: 'info',
    action: 'none',
  };
}
