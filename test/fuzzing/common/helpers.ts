/**
 * Helper functions for fuzzing tests
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

/**
 * Extract validation errors from response
 */
export function getValidationErrors(response: request.Response): string[] {
  if (response.body?.message) {
    if (Array.isArray(response.body.message)) {
      return response.body.message;
    }
    return [response.body.message];
  }
  return [];
}

/**
 * Check if response is a proper error response
 */
export function isValidErrorResponse(response: request.Response): boolean {
  return (
    response.status >= 400 &&
    response.status < 600 &&
    response.body !== null &&
    typeof response.body === 'object'
  );
}

/**
 * Check if error message leaks sensitive information
 */
export function leaksSensitiveInfo(message: string): boolean {
  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /api[_-]?key/i,
    /bearer\s+[a-z0-9._-]+/i,
    /access[_-]?token["':\s]/i,
    /refresh[_-]?token["':\s]/i,
    /private/i,
    /credit[_-]?card/i,
    /ssn/i,
    /social[_-]?security/i,
    /database/i,
    /connection[_-]?string/i,
    /stack trace/i,
    /error at/i,
    /\.ts:\d+:\d+/i, // File paths with line numbers
    /\/src\//i, // Source code paths
    /node_modules/i,
  ];

  return sensitivePatterns.some((pattern) => pattern.test(message));
}

/**
 * Check if response contains SQL error
 */
export function containsSqlError(response: request.Response): boolean {
  const message = JSON.stringify(response.body).toLowerCase();
  const sqlPatterns = [
    'sql',
    'syntax error',
    'mysql',
    'postgres',
    'database',
    'query',
    'select',
    'insert',
    'update',
    'delete',
  ];

  return sqlPatterns.some((pattern) => message.includes(pattern));
}

export function isTransientRequestError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /ECONNRESET|EPIPE|ETIMEDOUT|socket hang up|timeout/i.test(message);
}

export async function withTransientRequestRetry(
  requestFactory: () => request.Test,
): Promise<request.Response> {
  try {
    return await requestFactory();
  } catch (error) {
    if (!isTransientRequestError(error)) {
      throw error;
    }

    return requestFactory();
  }
}

/**
 * Create authenticated request helper
 */
export class AuthenticatedClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(private app: INestApplication) {}

  async register(phone: string): Promise<void> {
    const response = await request(this.app.getHttpServer())
      .post('/auth/register')
      .send({ phone, countryCode: 'CI' });

    if (response.status !== 201) {
      throw new Error(`Registration failed: ${response.status}`);
    }
  }

  async verifyOtp(phone: string, otp: string): Promise<void> {
    const response = await request(this.app.getHttpServer())
      .post('/auth/verify-otp')
      .send({ phone, otp });

    if (response.status === 200) {
      this.accessToken = response.body.accessToken;
      this.refreshToken = response.body.refreshToken;
    }
  }

  async login(phone: string): Promise<void> {
    await request(this.app.getHttpServer()).post('/auth/login').send({ phone });
  }

  get(url: string) {
    const req = request(this.app.getHttpServer()).get(url);
    if (this.accessToken) {
      req.set('Authorization', `Bearer ${this.accessToken}`);
    }
    return req;
  }

  post(url: string) {
    const req = request(this.app.getHttpServer()).post(url);
    if (this.accessToken) {
      req.set('Authorization', `Bearer ${this.accessToken}`);
    }
    return req;
  }

  put(url: string) {
    const req = request(this.app.getHttpServer()).put(url);
    if (this.accessToken) {
      req.set('Authorization', `Bearer ${this.accessToken}`);
    }
    return req;
  }

  delete(url: string) {
    const req = request(this.app.getHttpServer()).delete(url);
    if (this.accessToken) {
      req.set('Authorization', `Bearer ${this.accessToken}`);
    }
    return req;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }
}

/**
 * Assertion helpers
 */
export const assertHelpers = {
  /**
   * Assert response is a validation error
   */
  isValidationError(response: request.Response): void {
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('statusCode', 400);
  },

  /**
   * Assert response is unauthorized
   */
  isUnauthorized(response: request.Response): void {
    expect([401, 429]).toContain(response.status);
  },

  /**
   * Assert response is forbidden
   */
  isForbidden(response: request.Response): void {
    expect(response.status).toBe(403);
  },

  /**
   * Assert response doesn't leak sensitive info
   */
  noSensitiveDataLeak(response: request.Response): void {
    const message = JSON.stringify(response.body);
    expect(leaksSensitiveInfo(message)).toBe(false);
  },

  /**
   * Assert response doesn't contain SQL errors
   */
  noSqlErrors(response: request.Response): void {
    expect(containsSqlError(response)).toBe(false);
  },

  /**
   * Assert response has proper error structure
   */
  hasProperErrorStructure(response: request.Response): void {
    expect(response.body).toHaveProperty('statusCode');
    expect(response.body).toHaveProperty('message');
    expect(typeof response.body.statusCode).toBe('number');
    expect(response.body.statusCode).toBeGreaterThanOrEqual(400);
    expect(response.body.statusCode).toBeLessThan(600);
  },

  /**
   * Assert rate limiting works
   */
  isRateLimited(response: request.Response): void {
    expect(response.status).toBe(429);
  },
};

/**
 * Wait helper for rate limit testing
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate random idempotency key
 */
export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Test configuration
 */
export const fuzzConfig = {
  // Number of test runs per property test
  numRuns: parseInt(process.env.FUZZING_RUNS || '100', 10),

  // Timeout for async operations
  timeout: parseInt(process.env.FUZZING_TIMEOUT || '5000', 10),

  // Verbose output
  verbose: process.env.FUZZING_VERBOSE === 'true',

  // Path configuration
  paths: {
    auth: {
      register: '/auth/register',
      verifyOtp: '/auth/verify-otp',
      login: '/auth/login',
      refresh: '/auth/refresh',
      logout: '/auth/logout',
      logoutAll: '/auth/logout-all',
    },
    user: {
      profile: '/user/profile',
      updateProfile: '/user/profile',
      checkUsername: '/user/username/check',
      searchUsername: '/user/username/search',
      findByUsername: '/user/by-username',
      limits: '/user/limits',
    },
    wallet: {
      balance: '/wallet',
      create: '/wallet/create',
      deposit: '/wallet/deposit',
      depositChannels: '/wallet/deposit/channels',
      internalTransfer: '/wallet/transfer/internal',
      externalTransfer: '/wallet/transfer/external',
      withdraw: '/wallet/withdraw',
      rate: '/wallet/rate',
      kycStatus: '/wallet/kyc/status',
      submitKyc: '/wallet/kyc/submit',
      verifyPin: '/wallet/pin/verify',
      setPin: '/wallet/pin/set',
    },
  },
};
