/** Domain event types for the event bus */

export const EVENTS = {
  // User events
  USER_REGISTERED: 'user.registered',
  USER_PROFILE_UPDATED: 'user.profile.updated',
  USER_DEACTIVATED: 'user.deactivated',
  
  // KYC events
  KYC_SUBMITTED: 'kyc.submitted',
  KYC_APPROVED: 'kyc.approved',
  KYC_REJECTED: 'kyc.rejected',
  
  // Transaction events
  TRANSACTION_CREATED: 'transaction.created',
  TRANSACTION_COMPLETED: 'transaction.completed',
  TRANSACTION_FAILED: 'transaction.failed',
  
  // Deposit events
  DEPOSIT_INITIATED: 'deposit.initiated',
  DEPOSIT_CONFIRMED: 'deposit.confirmed',
  DEPOSIT_COMPLETED: 'deposit.completed',
  DEPOSIT_FAILED: 'deposit.failed',
  
  // Transfer events
  TRANSFER_SENT: 'transaction.transfer.sent',
  TRANSFER_RECEIVED: 'transaction.transfer.received',
  
  // Notification events
  NOTIFICATION_SENT: 'notification.sent',
  CONTACT_INVITED: 'contact.invited',
  
  // System events
  HEALTH_DEGRADED: 'health.degraded',
  BULK_PAYMENT_SUBMITTED: 'bulk-payment.submitted',
  RECONCILIATION_COMPLETED: 'reconciliation.daily.completed',
  STUCK_TRANSACTIONS: 'alert.stuck_transactions',
} as const;

export type EventType = typeof EVENTS[keyof typeof EVENTS];
