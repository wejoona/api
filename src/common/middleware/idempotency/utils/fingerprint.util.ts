import { createHash } from 'crypto';
import { Request } from 'express';
import { RequestFingerprint } from '../types/idempotency.types';

interface User {
  id?: string;
  sub?: string;
}

/**
 * Generate a request fingerprint for replay attack detection
 *
 * The fingerprint includes:
 * - HTTP method
 * - Request path
 * - User ID (if authenticated)
 * - Request body hash (for POST/PUT/PATCH)
 *
 * This ensures that the same idempotency key cannot be reused
 * for different requests (replay attack prevention).
 */
export class FingerprintUtil {
  /**
   * Generate a fingerprint from a request
   */
  static generate(req: Request): string {
    const fingerprint: RequestFingerprint = {
      method: req.method,
      path: req.path,
      userId: this.extractUserId(req),
      bodyHash: this.hashBody(req.body),
    };

    return this.hash(JSON.stringify(fingerprint));
  }

  /**
   * Validate that a request matches a stored fingerprint
   */
  static validate(req: Request, storedFingerprint: string): boolean {
    const currentFingerprint = this.generate(req);
    return currentFingerprint === storedFingerprint;
  }

  /**
   * Extract user ID from request (supports various auth patterns)
   */
  private static extractUserId(req: Request): string | undefined {
    // Check for user in request (set by auth middleware)
    const user = (req as any).user as User | undefined;
    if (user?.id) {
      return user.id;
    }

    // Check for user ID in JWT payload
    if (user?.sub) {
      return user.sub;
    }

    return undefined;
  }

  /**
   * Hash the request body for fingerprinting
   *
   * Only hash if body exists and method is POST/PUT/PATCH
   */
  private static hashBody(body: any): string | undefined {
    if (!body || typeof body !== 'object') {
      return undefined;
    }

    // Exclude certain fields from fingerprint (e.g., timestamps)
    const sanitized = this.sanitizeBody(body);

    if (Object.keys(sanitized).length === 0) {
      return undefined;
    }

    return this.hash(JSON.stringify(sanitized));
  }

  /**
   * Remove fields that shouldn't be part of fingerprint
   */
  private static sanitizeBody(body: any): any {
    const excluded = new Set([
      'timestamp',
      'nonce',
      'requestId',
      'clientTimestamp',
    ]);

    const sanitized: any = {};

    for (const [key, value] of Object.entries(body)) {
      if (!excluded.has(key)) {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Generate a SHA-256 hash
   */
  private static hash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }
}
