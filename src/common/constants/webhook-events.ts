/**
 * Webhook event types that can be sent to merchant/partner endpoints.
 */
export const WEBHOOK_EVENTS = {
  // Payment events
  'payment.created': { description: 'Payment link payment initiated' },
  'payment.completed': { description: 'Payment successfully processed' },
  'payment.failed': { description: 'Payment failed' },
  
  // Deposit events
  'deposit.completed': { description: 'Mobile money deposit confirmed' },
  'deposit.failed': { description: 'Deposit failed or expired' },
  
  // Transfer events
  'transfer.sent': { description: 'Outgoing transfer completed' },
  'transfer.received': { description: 'Incoming transfer received' },
  
  // Account events
  'account.kyc.approved': { description: 'KYC verification approved' },
  'account.kyc.rejected': { description: 'KYC verification rejected' },
} as const;

export type WebhookEvent = keyof typeof WEBHOOK_EVENTS;
