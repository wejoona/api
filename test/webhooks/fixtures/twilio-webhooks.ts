/**
 * Twilio Webhook Fixtures
 *
 * Sample webhook payloads from Twilio SMS status callbacks.
 * Used for testing SMS delivery tracking.
 */

export const twilioWebhookFixtures = {
  // ============================================
  // Successful Delivery Events
  // ============================================

  deliveredIvoryCoast: {
    MessageSid: 'SM1234567890abcdef1234567890abcdef',
    SmsSid: 'SM1234567890abcdef1234567890abcdef',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    MessagingServiceSid: 'MGabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+2250701234567', // Ivory Coast Orange
    Body: 'Your JoonaPay verification code is: 123456',
    MessageStatus: 'delivered',
    SmsStatus: 'delivered',
    NumSegments: '1',
    NumMedia: '0',
    ApiVersion: '2010-04-01',
  },

  deliveredSenegal: {
    MessageSid: 'SM2222222222222222222222222222222222',
    SmsSid: 'SM2222222222222222222222222222222222',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+221701234567', // Senegal
    Body: 'Your withdrawal of 50,000 XOF has been completed.',
    MessageStatus: 'delivered',
    SmsStatus: 'delivered',
    NumSegments: '1',
  },

  deliveredMTN: {
    MessageSid: 'SM3333333333333333333333333333333333',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+2250501234567', // Ivory Coast MTN
    Body: 'Transfer successful: 10 USDC sent to Koné Yacouba',
    MessageStatus: 'delivered',
    NumSegments: '1',
  },

  deliveredLongMessage: {
    MessageSid: 'SM4444444444444444444444444444444444',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+2250701234567',
    Body: 'Your deposit is being processed. You will receive 50 USDC once we confirm receipt of 50,000 XOF via Orange Money. This may take 5-10 minutes. Thank you for using JoonaPay!',
    MessageStatus: 'delivered',
    NumSegments: '2', // Multi-segment message
  },

  // ============================================
  // Intermediate States
  // ============================================

  queued: {
    MessageSid: 'SM5555555555555555555555555555555555',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+2250701234567',
    Body: 'Your verification code is: 789012',
    MessageStatus: 'queued',
    SmsStatus: 'queued',
  },

  sending: {
    MessageSid: 'SM6666666666666666666666666666666666',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+2250701234567',
    Body: 'Your deposit has been confirmed!',
    MessageStatus: 'sending',
    SmsStatus: 'sending',
  },

  sent: {
    MessageSid: 'SM7777777777777777777777777777777777',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+2250701234567',
    Body: 'Welcome to JoonaPay!',
    MessageStatus: 'sent',
    SmsStatus: 'sent',
  },

  // ============================================
  // Failed Delivery Events
  // ============================================

  undelivered: {
    MessageSid: 'SM8888888888888888888888888888888888',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+2250701111111', // Invalid number
    Body: 'Your verification code is: 456789',
    MessageStatus: 'undelivered',
    SmsStatus: 'undelivered',
    ErrorCode: '30004',
    ErrorMessage: 'Message blocked: Destination number is invalid',
  },

  failedInvalidNumber: {
    MessageSid: 'SM9999999999999999999999999999999999',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+2250709999999',
    Body: 'Your withdrawal has been processed',
    MessageStatus: 'failed',
    SmsStatus: 'failed',
    ErrorCode: '21211',
    ErrorMessage: 'Invalid "To" Phone Number',
  },

  failedUnknownError: {
    MessageSid: 'SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+2250701234567',
    Body: 'Test message',
    MessageStatus: 'failed',
    SmsStatus: 'failed',
    ErrorCode: '30008',
    ErrorMessage: 'Unknown error',
  },

  failedCarrierViolation: {
    MessageSid: 'SMbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+2250701234567',
    Body: 'URGENT: Click this link now!',
    MessageStatus: 'failed',
    SmsStatus: 'failed',
    ErrorCode: '30007',
    ErrorMessage: 'Message filtered by carrier',
  },

  failedQueueOverflow: {
    MessageSid: 'SMcccccccccccccccccccccccccccccccccc',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+2250701234567',
    Body: 'Your code: 111111',
    MessageStatus: 'failed',
    SmsStatus: 'failed',
    ErrorCode: '30006',
    ErrorMessage: 'Landline or unreachable carrier',
  },

  // ============================================
  // Edge Cases
  // ============================================

  unicodeCharacters: {
    MessageSid: 'SMdddddddddddddddddddddddddddddddddd',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+2250701234567',
    Body: 'Bienvenue à JoonaPay! Votre code: 123456 🎉',
    MessageStatus: 'delivered',
    NumSegments: '1',
  },

  frenchAccents: {
    MessageSid: 'SMeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+2250701234567',
    Body: 'Votre retrait de 50 000 XOF a été traité avec succès.',
    MessageStatus: 'delivered',
    NumSegments: '1',
  },

  emptyBody: {
    MessageSid: 'SMffffffffffffffffffffffffffffffff',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+2250701234567',
    Body: '',
    MessageStatus: 'delivered',
  },

  maximumSegments: {
    MessageSid: 'SM0000000000000000000000000000000000',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+2250701234567',
    Body:
      'This is a very long message that will be split into multiple segments. ' +
      'Each segment can contain up to 160 characters for standard GSM encoding, ' +
      'or 70 characters for Unicode encoding. This message should be split into ' +
      'several segments to test multi-part message handling in our system.',
    MessageStatus: 'delivered',
    NumSegments: '3',
  },

  // ============================================
  // Real-World Use Cases
  // ============================================

  verificationCodeOTP: {
    MessageSid: 'SM1111111111111111111111111111111111',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+2250701234567',
    Body: 'Your JoonaPay verification code is: 987654. Valid for 10 minutes.',
    MessageStatus: 'delivered',
    NumSegments: '1',
  },

  depositConfirmation: {
    MessageSid: 'SM2222222222222222222222222222222222',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+2250701234567',
    Body: 'Deposit confirmed! 100 USDC added to your wallet. Balance: 150 USDC',
    MessageStatus: 'delivered',
    NumSegments: '1',
  },

  withdrawalAlert: {
    MessageSid: 'SM3333333333333333333333333333333333',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+2250701234567',
    Body: 'Withdrawal initiated: 50,000 XOF to Orange Money +225 07 01 23 45 67',
    MessageStatus: 'delivered',
    NumSegments: '1',
  },

  transferNotification: {
    MessageSid: 'SM4444444444444444444444444444444444',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+2250701234567',
    Body: 'You received 25 USDC from Koné Yacouba. New balance: 125 USDC',
    MessageStatus: 'delivered',
    NumSegments: '1',
  },

  securityAlert: {
    MessageSid: 'SM5555555555555555555555555555555555',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+2250701234567',
    Body: 'New device logged in to your JoonaPay account. Contact support if not you.',
    MessageStatus: 'delivered',
    NumSegments: '1',
  },

  kycReminderEnglish: {
    MessageSid: 'SM6666666666666666666666666666666666',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+2250701234567',
    Body: 'Complete your KYC verification to unlock higher limits on JoonaPay',
    MessageStatus: 'delivered',
    NumSegments: '1',
  },

  kycReminderFrench: {
    MessageSid: 'SM7777777777777777777777777777777777',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+2250701234567',
    Body: 'Complétez votre vérification KYC pour débloquer des limites plus élevées',
    MessageStatus: 'delivered',
    NumSegments: '1',
  },

  // ============================================
  // Multiple Carriers
  // ============================================

  deliveredOrange: {
    MessageSid: 'SMorangeorangeorangeorangeorangeoran',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+2250707777777', // Orange CI
    Body: 'Test message to Orange',
    MessageStatus: 'delivered',
  },

  deliveredMTNMali: {
    MessageSid: 'SMmtnmtnmtnmtnmtnmtnmtnmtnmtnmtnmt',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+2237777777', // Mali MTN
    Body: 'Test message to Mali MTN',
    MessageStatus: 'delivered',
  },

  deliveredWaveSenegal: {
    MessageSid: 'SMwavewavewavewavewavewavewavewavew',
    AccountSid: 'ACabcdef1234567890abcdef1234567890',
    From: '+14155551234',
    To: '+221707777777', // Senegal Wave
    Body: 'Test message to Wave Senegal',
    MessageStatus: 'delivered',
  },
};

// Helper to get all fixture names
export const twilioWebhookFixtureNames = Object.keys(twilioWebhookFixtures);

// Helper to get fixtures by status
export function getTwilioFixturesByStatus(
  status: 'delivered' | 'failed' | 'undelivered' | 'pending',
): any[] {
  const filters = {
    delivered: (fixture: any) => fixture.MessageStatus === 'delivered',
    failed: (fixture: any) => fixture.MessageStatus === 'failed',
    undelivered: (fixture: any) => fixture.MessageStatus === 'undelivered',
    pending: (fixture: any) =>
      ['queued', 'sending', 'sent'].includes(fixture.MessageStatus),
  };

  return Object.values(twilioWebhookFixtures).filter(filters[status]);
}

// Helper to get fixtures by country
export function getTwilioFixturesByCountry(country: 'CI' | 'SN' | 'ML'): any[] {
  const countryPrefixes = {
    CI: '+225',
    SN: '+221',
    ML: '+223',
  };

  return Object.values(twilioWebhookFixtures).filter((fixture) =>
    fixture.To?.startsWith(countryPrefixes[country]),
  );
}

// Helper to get fixtures with errors
export function getTwilioFixturesWithErrors(): any[] {
  return Object.values(twilioWebhookFixtures).filter(
    (fixture) => fixture.ErrorCode,
  );
}
