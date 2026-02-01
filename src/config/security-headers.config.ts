/**
 * Security Headers Configuration
 *
 * Environment-specific security headers configuration following OWASP guidelines.
 * Target: A+ rating on securityheaders.com
 *
 * References:
 * - OWASP Secure Headers: https://owasp.org/www-project-secure-headers/
 * - MDN Security Headers: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers
 * - Security Headers Scanner: https://securityheaders.com/
 */

export interface SecurityHeadersConfig {
  contentSecurityPolicy: ContentSecurityPolicyOptions | false;
  permissionsPolicy: string;
}

export interface ContentSecurityPolicyOptions {
  directives: {
    defaultSrc: string[];
    scriptSrc: string[];
    styleSrc: string[];
    imgSrc: string[];
    fontSrc: string[];
    connectSrc: string[];
    frameSrc: string[];
    frameAncestors: string[];
    objectSrc: string[];
    baseUri: string[];
    formAction: string[];
    upgradeInsecureRequests?: string[];
    blockAllMixedContent?: string[];
    reportUri?: string[];
  };
}

/**
 * Get Content-Security-Policy directives for production API
 *
 * SECURITY: Strict CSP for API-only backend
 * - No inline scripts/styles needed (API returns JSON)
 * - No external resources needed
 * - Blocks all framing (API should not be iframed)
 */
function getProductionCSP(
  allowedOrigins: string[],
): ContentSecurityPolicyOptions {
  return {
    directives: {
      // Default: deny all resources
      defaultSrc: ["'none'"],

      // Scripts: none needed for API
      scriptSrc: ["'none'"],

      // Styles: none needed for API
      styleSrc: ["'none'"],

      // Images: none needed for API
      imgSrc: ["'none'"],

      // Fonts: none needed for API
      fontSrc: ["'none'"],

      // Connect: allow XHR/fetch to self and allowed origins
      connectSrc: ["'self'", ...allowedOrigins],

      // Frames: none allowed
      frameSrc: ["'none'"],

      // Frame ancestors: prevent framing entirely (clickjacking protection)
      frameAncestors: ["'none'"],

      // Objects: none (Flash, Java applets - all deprecated)
      objectSrc: ["'none'"],

      // Base URI: only allow self (prevents base tag injection)
      baseUri: ["'self'"],

      // Form actions: only allow self (prevents form hijacking)
      formAction: ["'self'"],

      // Force HTTPS for all resources
      upgradeInsecureRequests: [],

      // Block any HTTP content on HTTPS pages
      blockAllMixedContent: [],
    },
  };
}

/**
 * Get Content-Security-Policy directives for development with Swagger
 *
 * SECURITY: Relaxed CSP to allow Swagger UI to function
 * - Swagger needs inline scripts and styles
 * - Swagger loads external resources (fonts, etc.)
 * - Only used in development/staging environments
 */
function getDevelopmentCSP(): ContentSecurityPolicyOptions {
  return {
    directives: {
      // Default: self only
      defaultSrc: ["'self'"],

      // Scripts: allow inline for Swagger UI
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],

      // Styles: allow inline for Swagger UI
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],

      // Images: allow data URIs for Swagger icons
      imgSrc: ["'self'", 'data:', 'https:'],

      // Fonts: Google Fonts for Swagger
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],

      // Connect: allow API calls
      connectSrc: ["'self'", 'http://localhost:*', 'https://localhost:*'],

      // Frames: none allowed
      frameSrc: ["'none'"],

      // Frame ancestors: allow self for Swagger "Try it out"
      frameAncestors: ["'self'"],

      // Objects: none
      objectSrc: ["'none'"],

      // Base URI: self only
      baseUri: ["'self'"],

      // Form actions: self only
      formAction: ["'self'"],
    },
  };
}

/**
 * Get Permissions-Policy header value
 *
 * SECURITY: Disables browser features not needed by the API
 * This reduces attack surface by preventing access to sensitive APIs
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy
 */
function getPermissionsPolicy(_isProduction: boolean): string {
  // Features to completely disable (empty parentheses = disabled for all)
  const disabledFeatures = [
    'accelerometer=()',
    'ambient-light-sensor=()',
    'autoplay=()',
    'battery=()',
    'camera=()',
    'display-capture=()',
    'document-domain=()',
    'encrypted-media=()',
    'execution-while-not-rendered=()',
    'execution-while-out-of-viewport=()',
    'fullscreen=()',
    'gamepad=()',
    'geolocation=()',
    'gyroscope=()',
    'hid=()',
    'identity-credentials-get=()',
    'idle-detection=()',
    'local-fonts=()',
    'magnetometer=()',
    'microphone=()',
    'midi=()',
    'otp-credentials=()',
    'payment=()',
    'picture-in-picture=()',
    'publickey-credentials-create=()',
    'publickey-credentials-get=()',
    'screen-wake-lock=()',
    'serial=()',
    'speaker-selection=()',
    'usb=()',
    'web-share=()',
    'xr-spatial-tracking=()',
  ];

  return disabledFeatures.join(', ');
}

/**
 * Get complete security headers configuration for environment
 *
 * @param environment - Current environment (development, staging, production)
 * @param allowedOrigins - List of allowed CORS origins
 * @returns SecurityHeadersConfig object
 */
export function getSecurityHeadersConfig(
  environment: string,
  allowedOrigins: string[] = [],
): SecurityHeadersConfig {
  const isProduction = environment === 'production';

  return {
    // CSP: Strict in production, relaxed in development for Swagger
    contentSecurityPolicy: isProduction
      ? getProductionCSP(allowedOrigins)
      : getDevelopmentCSP(),

    // Permissions-Policy: Always strict (no browser features needed for API)
    permissionsPolicy: getPermissionsPolicy(isProduction),
  };
}

/**
 * Cookie security configuration
 *
 * OWASP Reference: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
 */
export interface CookieSecurityConfig {
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  domain?: string;
  path: string;
  maxAge: number;
}

/**
 * Get secure cookie configuration
 *
 * @param environment - Current environment
 * @param domain - Cookie domain (optional, defaults to current domain)
 * @returns CookieSecurityConfig object
 */
export function getCookieSecurityConfig(
  environment: string,
  domain?: string,
): CookieSecurityConfig {
  const isProduction = environment === 'production';

  return {
    // SECURITY: Only send cookie over HTTPS in production
    secure: isProduction,

    // SECURITY: Prevent JavaScript access to cookie (XSS protection)
    httpOnly: true,

    // SECURITY: Strict SameSite prevents CSRF attacks
    // Use 'lax' if you need cookies on top-level navigation from external sites
    sameSite: 'strict',

    // SECURITY: Scope cookie to specific domain in production
    domain: isProduction ? domain : undefined,

    // SECURITY: Limit cookie to API path
    path: '/',

    // SECURITY: Session cookies expire after 24 hours
    // Refresh tokens should have longer expiry but stored securely
    maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  };
}

/**
 * Session cookie name constants
 * Using __Host- prefix for additional security (requires Secure, no Domain, Path=/)
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#cookie_prefixes
 */
export const COOKIE_NAMES = {
  // __Host- prefix requires: Secure=true, no Domain attribute, Path=/
  SESSION: '__Host-session',
  REFRESH_TOKEN: '__Host-refresh',

  // __Secure- prefix requires: Secure=true (allows Domain attribute)
  CSRF_TOKEN: '__Secure-csrf',

  // Standard cookie names for development (no prefix requirements)
  DEV_SESSION: 'session',
  DEV_REFRESH_TOKEN: 'refresh_token',
  DEV_CSRF_TOKEN: 'csrf_token',
} as const;

/**
 * Get appropriate cookie name based on environment
 *
 * @param cookieType - Type of cookie (SESSION, REFRESH_TOKEN, CSRF_TOKEN)
 * @param environment - Current environment
 * @returns Cookie name with appropriate prefix
 */
export function getCookieName(
  cookieType: 'SESSION' | 'REFRESH_TOKEN' | 'CSRF_TOKEN',
  environment: string,
): string {
  const isProduction = environment === 'production';

  if (isProduction) {
    return COOKIE_NAMES[cookieType];
  }

  return COOKIE_NAMES[`DEV_${cookieType}` as keyof typeof COOKIE_NAMES];
}
