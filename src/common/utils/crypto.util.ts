import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Cryptographic utility functions used across the application.
 */

/** Generate a secure random token (hex encoded) */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

/** SHA-256 hash a string */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Timing-safe string comparison (prevents timing attacks) */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Generate a short alphanumeric code (for payment links, referrals) */
export function generateShortCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/** Mask a phone number for display: +225****1234 */
export function maskPhone(phone: string): string {
  if (phone.length <= 6) return phone;
  const prefix = phone.slice(0, 4);
  const suffix = phone.slice(-4);
  return `${prefix}${'*'.repeat(phone.length - 8)}${suffix}`;
}

/** Mask an email: b***@gmail.com */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const masked = local[0] + '***';
  return `${masked}@${domain}`;
}
