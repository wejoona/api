/**
 * Provider Configuration
 *
 * Centralized configuration for all third-party providers.
 * Supports environment-based switching between mock and real implementations.
 */

export type SmsProviderType = 'mock' | 'twilio' | 'africas_talking';
export type PushProviderType = 'mock' | 'fcm';

export interface SmsProviderConfig {
  provider: SmsProviderType;
  senderId: string;
  // Twilio-specific
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  // Africa's Talking-specific
  atUsername?: string;
  atApiKey?: string;
}

export interface PushProviderConfig {
  provider: PushProviderType;
  // FCM-specific
  fcmProjectId?: string;
  fcmClientEmail?: string;
  fcmPrivateKey?: string;
}

export interface CircleProviderConfig {
  useMock: boolean;
  apiUrl: string;
  apiKey: string;
  entitySecretCipherText: string;
  walletSetId: string;
  defaultBlockchain: string;
  webhookSecret: string;
}

export interface YellowCardProviderConfig {
  useMock: boolean;
  apiUrl: string;
  apiKey: string;
  secretKey: string;
  webhookSecret: string;
}

export interface BlnkProviderConfig {
  url: string;
  apiKey: string;
}

export interface ProvidersConfig {
  sms: SmsProviderConfig;
  push: PushProviderConfig;
  circle: CircleProviderConfig;
  yellowCard: YellowCardProviderConfig;
  blnk: BlnkProviderConfig;
}

/**
 * Get the providers configuration from environment variables
 */
export function getProvidersConfig(): ProvidersConfig {
  return {
    sms: {
      provider: (process.env.SMS_PROVIDER as SmsProviderType) || 'mock',
      senderId: process.env.SMS_SENDER_ID || 'JoonaPay',
      // Twilio
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
      twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
      // Africa's Talking
      atUsername: process.env.AT_USERNAME,
      atApiKey: process.env.AT_API_KEY,
    },
    push: {
      provider: determinePushProvider(),
      fcmProjectId: process.env.FCM_PROJECT_ID,
      fcmClientEmail: process.env.FCM_CLIENT_EMAIL,
      fcmPrivateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    circle: {
      useMock:
        process.env.CIRCLE_USE_MOCK === 'true' || !process.env.CIRCLE_API_KEY,
      apiUrl: process.env.CIRCLE_API_URL || 'https://api.circle.com',
      apiKey: process.env.CIRCLE_API_KEY || '',
      entitySecretCipherText: process.env.CIRCLE_ENTITY_SECRET || '',
      walletSetId: process.env.CIRCLE_WALLET_SET_ID || '',
      defaultBlockchain: process.env.CIRCLE_DEFAULT_BLOCKCHAIN || 'MATIC',
      webhookSecret: process.env.CIRCLE_WEBHOOK_SECRET || '',
    },
    yellowCard: {
      useMock:
        process.env.YELLOW_CARD_USE_MOCK === 'true' ||
        !process.env.YELLOW_CARD_API_KEY,
      apiUrl:
        process.env.YELLOW_CARD_API_URL || 'https://sandbox.yellowcard.io',
      apiKey: process.env.YELLOW_CARD_API_KEY || '',
      secretKey: process.env.YELLOW_CARD_SECRET_KEY || '',
      webhookSecret: process.env.YELLOW_CARD_WEBHOOK_SECRET || '',
    },
    blnk: {
      url: process.env.BLNK_URL || 'http://localhost:5001',
      apiKey: process.env.BLNK_API_KEY || '',
    },
  };
}

function determinePushProvider(): PushProviderType {
  if (process.env.FCM_USE_MOCK === 'true') {
    return 'mock';
  }
  if (process.env.FCM_PROJECT_ID) {
    return 'fcm';
  }
  return 'mock';
}

/**
 * Provider injection tokens
 */
export const PROVIDERS_CONFIG = Symbol('PROVIDERS_CONFIG');

/**
 * Helper to check if we're in mock mode for a given provider
 */
export function isMockMode(provider: 'sms' | 'push' | 'circle' | 'yellowCard'): boolean {
  const config = getProvidersConfig();

  switch (provider) {
    case 'sms':
      return config.sms.provider === 'mock';
    case 'push':
      return config.push.provider === 'mock';
    case 'circle':
      return config.circle.useMock;
    case 'yellowCard':
      return config.yellowCard.useMock;
    default:
      return true;
  }
}
