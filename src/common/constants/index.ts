/** Application-wide constants */

export const APP_NAME = 'Korido';
export const APP_VERSION = process.env.npm_package_version || '1.2.3';

/** Token TTLs (milliseconds) */
export const TOKEN_TTL = {
  ACCESS: 15 * 60 * 1000,        // 15 minutes
  REFRESH: 7 * 24 * 60 * 60 * 1000,  // 7 days
  PIN_VERIFICATION: 5 * 60 * 1000,   // 5 minutes
  OTP: 5 * 60 * 1000,               // 5 minutes
  SESSION: 30 * 60 * 1000,          // 30 minutes
} as const;

/** Rate limits (requests per minute) */
export const RATE_LIMITS = {
  GLOBAL: 100,
  AUTH: 10,
  TRANSFER: 10,
  DEPOSIT: 5,
  PIN_VERIFY: 5,
  AVATAR_UPLOAD: 3,
} as const;

/** Supported currencies */
export const CURRENCIES = ['USDC', 'XOF', 'USD', 'EUR'] as const;
export type Currency = typeof CURRENCIES[number];

/** Supported locales */
export const LOCALES = ['en', 'fr', 'pt', 'ar'] as const;
export type Locale = typeof LOCALES[number];

/** UEMOA country codes */
export const UEMOA_COUNTRIES = ['CI', 'SN', 'ML', 'BF', 'BJ', 'TG', 'NE', 'GW'] as const;
export type UemoaCountry = typeof UEMOA_COUNTRIES[number];

/** Mobile money provider codes */
export const MOBILE_MONEY_PROVIDERS = {
  ORANGE_CI: 'orange_ci',
  MTN_CI: 'mtn_ci',
  MOOV_CI: 'moov_ci',
  WAVE_CI: 'wave_ci',
} as const;
