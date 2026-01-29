import { CookieOptions } from 'express';

/**
 * Cookie Configuration for JoonaPay
 *
 * Implements GDPR and ePrivacy compliant cookie settings with secure defaults.
 *
 * Security Features:
 * - Secure: Only transmitted over HTTPS
 * - HttpOnly: Not accessible via JavaScript (prevents XSS)
 * - SameSite: Protects against CSRF attacks
 * - Encryption: Sensitive data should be encrypted before storing
 */

export interface CookieConfig {
  name: string;
  options: CookieOptions;
  description: string;
  category: CookieCategory;
}

export enum CookieCategory {
  ESSENTIAL = 'essential',
  FUNCTIONAL = 'functional',
  ANALYTICS = 'analytics',
}

/**
 * Environment-aware cookie options
 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Base secure cookie options
 * Used as foundation for all cookies
 */
export const SECURE_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProduction, // Require HTTPS in production
  sameSite: 'strict', // Strict CSRF protection
  path: '/',
};

/**
 * Authentication cookie options
 * Used for session and auth tokens
 */
export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  ...SECURE_COOKIE_OPTIONS,
  httpOnly: true, // Prevent XSS access to auth tokens
  sameSite: 'strict',
  maxAge: 60 * 60 * 1000, // 1 hour for access token
};

/**
 * Refresh token cookie options
 * Longer-lived but still secure
 */
export const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  ...SECURE_COOKIE_OPTIONS,
  httpOnly: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Session cookie options
 * Deleted when browser closes
 */
export const SESSION_COOKIE_OPTIONS: CookieOptions = {
  ...SECURE_COOKIE_OPTIONS,
  httpOnly: true,
  sameSite: 'strict',
  // No maxAge = session cookie
};

/**
 * CSRF token cookie options
 * Read by JavaScript to include in requests
 */
export const CSRF_COOKIE_OPTIONS: CookieOptions = {
  ...SECURE_COOKIE_OPTIONS,
  httpOnly: false, // Must be readable by JS
  sameSite: 'strict',
};

/**
 * Preference cookie options
 * For language, theme, etc.
 */
export const PREFERENCE_COOKIE_OPTIONS: CookieOptions = {
  ...SECURE_COOKIE_OPTIONS,
  httpOnly: false, // May need client-side access
  sameSite: 'lax', // Allow with navigations
  maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
};

/**
 * Cookie consent cookie options
 */
export const CONSENT_COOKIE_OPTIONS: CookieOptions = {
  ...SECURE_COOKIE_OPTIONS,
  httpOnly: false, // Read by consent banner JS
  sameSite: 'lax',
  maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
};

/**
 * All cookies used by JoonaPay
 * Used for documentation and compliance
 */
export const JOONAPAY_COOKIES: CookieConfig[] = [
  // Essential Cookies
  {
    name: 'session_id',
    options: SESSION_COOKIE_OPTIONS,
    description: 'Maintains authenticated session state',
    category: CookieCategory.ESSENTIAL,
  },
  {
    name: 'auth_token',
    options: AUTH_COOKIE_OPTIONS,
    description: 'JWT access token for API authentication',
    category: CookieCategory.ESSENTIAL,
  },
  {
    name: 'refresh_token',
    options: REFRESH_COOKIE_OPTIONS,
    description: 'Token used to refresh expired access tokens',
    category: CookieCategory.ESSENTIAL,
  },
  {
    name: 'csrf_token',
    options: CSRF_COOKIE_OPTIONS,
    description: 'Cross-site request forgery protection token',
    category: CookieCategory.ESSENTIAL,
  },
  {
    name: 'device_id',
    options: {
      ...SECURE_COOKIE_OPTIONS,
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    },
    description: 'Unique device identifier for security verification',
    category: CookieCategory.ESSENTIAL,
  },
  {
    name: 'cookie_consent',
    options: CONSENT_COOKIE_OPTIONS,
    description: 'Stores user cookie consent preferences',
    category: CookieCategory.ESSENTIAL,
  },

  // Security Cookies
  {
    name: 'risk_session',
    options: SESSION_COOKIE_OPTIONS,
    description: 'Risk assessment session for transaction verification',
    category: CookieCategory.ESSENTIAL,
  },
  {
    name: 'step_up_token',
    options: {
      ...SECURE_COOKIE_OPTIONS,
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 5 * 60 * 1000, // 5 minutes
    },
    description: 'Short-lived token for step-up authentication',
    category: CookieCategory.ESSENTIAL,
  },
  {
    name: 'lockout_counter',
    options: {
      ...SECURE_COOKIE_OPTIONS,
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    },
    description: 'Tracks failed login attempts to prevent brute force',
    category: CookieCategory.ESSENTIAL,
  },

  // Functional Cookies
  {
    name: 'locale',
    options: PREFERENCE_COOKIE_OPTIONS,
    description: 'User language preference (en, fr)',
    category: CookieCategory.FUNCTIONAL,
  },
  {
    name: 'theme',
    options: PREFERENCE_COOKIE_OPTIONS,
    description: 'User interface theme preference (light, dark, system)',
    category: CookieCategory.FUNCTIONAL,
  },
  {
    name: 'currency_display',
    options: PREFERENCE_COOKIE_OPTIONS,
    description: 'Reference currency for display (XOF, EUR, USD)',
    category: CookieCategory.FUNCTIONAL,
  },
  {
    name: 'last_recipient',
    options: {
      ...PREFERENCE_COOKIE_OPTIONS,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
    description: 'Recently used recipients for quick access',
    category: CookieCategory.FUNCTIONAL,
  },
];

/**
 * Get cookie options by name
 */
export function getCookieOptions(cookieName: string): CookieOptions {
  const cookie = JOONAPAY_COOKIES.find((c) => c.name === cookieName);
  if (cookie) {
    return cookie.options;
  }
  // Default to secure options
  return SECURE_COOKIE_OPTIONS;
}

/**
 * Get all cookies by category
 */
export function getCookiesByCategory(
  category: CookieCategory,
): CookieConfig[] {
  return JOONAPAY_COOKIES.filter((c) => c.category === category);
}

/**
 * Get essential cookies (always required)
 */
export function getEssentialCookies(): CookieConfig[] {
  return getCookiesByCategory(CookieCategory.ESSENTIAL);
}

/**
 * Get optional cookies (require consent)
 */
export function getOptionalCookies(): CookieConfig[] {
  return JOONAPAY_COOKIES.filter(
    (c) => c.category !== CookieCategory.ESSENTIAL,
  );
}

/**
 * Cookie consent preferences
 */
export interface CookieConsent {
  essential: boolean; // Always true
  functional: boolean;
  analytics: boolean;
  timestamp: string;
}

/**
 * Default consent (essential only)
 */
export const DEFAULT_COOKIE_CONSENT: CookieConsent = {
  essential: true,
  functional: false,
  analytics: false,
  timestamp: new Date().toISOString(),
};

/**
 * Parse cookie consent from cookie value
 */
export function parseCookieConsent(value: string | undefined): CookieConsent {
  if (!value) {
    return DEFAULT_COOKIE_CONSENT;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    return {
      essential: true, // Always true
      functional: Boolean(parsed.functional),
      analytics: Boolean(parsed.analytics),
      timestamp: parsed.timestamp || new Date().toISOString(),
    };
  } catch {
    return DEFAULT_COOKIE_CONSENT;
  }
}

/**
 * Check if a cookie category is allowed based on consent
 */
export function isCookieCategoryAllowed(
  category: CookieCategory,
  consent: CookieConsent,
): boolean {
  switch (category) {
    case CookieCategory.ESSENTIAL:
      return true; // Always allowed
    case CookieCategory.FUNCTIONAL:
      return consent.functional;
    case CookieCategory.ANALYTICS:
      return consent.analytics;
    default:
      return false;
  }
}
