/**
 * PII Sanitization Utilities
 *
 * Provides functions to safely sanitize Personally Identifiable Information (PII)
 * before logging. Prevents accidental exposure of sensitive user data in logs.
 *
 * Security Benefits:
 * - Prevents PII leakage in log files
 * - Supports GDPR/CCPA compliance
 * - Reduces data breach impact
 *
 * @see OWASP Logging Cheat Sheet
 * @see CWE-532: Insertion of Sensitive Information into Log File
 */

/**
 * Mask a user ID, showing only first and last characters
 * Example: "user-12345-abc" -> "u***c"
 */
export function maskUserId(userId: string | undefined | null): string {
  if (!userId) {
    return '[none]';
  }

  if (userId.length <= 4) {
    return '****';
  }

  const first = userId.charAt(0);
  const last = userId.charAt(userId.length - 1);
  return `${first}***${last}`;
}

/**
 * Mask an email address
 * Example: "john.doe@example.com" -> "j***e@e***m"
 */
export function maskEmail(email: string | undefined | null): string {
  if (!email) {
    return '[none]';
  }

  const atIndex = email.indexOf('@');
  if (atIndex === -1) {
    return maskGeneric(email);
  }

  const localPart = email.substring(0, atIndex);
  const domainPart = email.substring(atIndex + 1);

  const maskedLocal = maskGeneric(localPart);
  const maskedDomain = maskGeneric(domainPart);

  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Mask a phone number, keeping only last 4 digits
 * Example: "+1234567890" -> "***7890"
 */
export function maskPhone(phone: string | undefined | null): string {
  if (!phone) {
    return '[none]';
  }

  // Remove non-digits for consistent masking
  const digits = phone.replace(/\D/g, '');

  if (digits.length <= 4) {
    return '****';
  }

  return `***${digits.slice(-4)}`;
}

/**
 * Mask an IP address
 * IPv4: "192.168.1.100" -> "192.168.***"
 * IPv6: Masks last segments
 */
export function maskIpAddress(ip: string | undefined | null): string {
  if (!ip) {
    return '[none]';
  }

  // IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***`;
    }
  }

  // IPv6
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 4) {
      return `${parts[0]}:${parts[1]}:***:***`;
    }
  }

  return '***';
}

/**
 * Mask a device ID or fingerprint
 * Example: "abc123def456" -> "abc***456"
 */
export function maskDeviceId(deviceId: string | undefined | null): string {
  if (!deviceId) {
    return '[none]';
  }

  if (deviceId.length <= 6) {
    return '******';
  }

  const prefix = deviceId.substring(0, 3);
  const suffix = deviceId.substring(deviceId.length - 3);
  return `${prefix}***${suffix}`;
}

/**
 * Mask a wallet address, showing prefix and suffix
 * Example: "0x1234567890abcdef1234567890abcdef12345678" -> "0x123...5678"
 */
export function maskWalletAddress(address: string | undefined | null): string {
  if (!address) {
    return '[none]';
  }

  if (address.length <= 10) {
    return `${address.substring(0, 4)}***`;
  }

  const prefix = address.substring(0, 6);
  const suffix = address.substring(address.length - 4);
  return `${prefix}...${suffix}`;
}

/**
 * Generic string masking, showing first and last character
 */
export function maskGeneric(value: string | undefined | null): string {
  if (!value) {
    return '[none]';
  }

  if (value.length <= 2) {
    return '**';
  }

  const first = value.charAt(0);
  const last = value.charAt(value.length - 1);
  return `${first}***${last}`;
}

/**
 * Sanitize an object for logging by masking known PII fields
 * Recursively processes nested objects
 */
export function sanitizeForLogging<T extends Record<string, unknown>>(
  obj: T,
  additionalPiiFields: string[] = [],
): Record<string, unknown> {
  const piiFields: Record<string, (value: unknown) => string> = {
    userId: (v) => maskUserId(String(v)),
    user_id: (v) => maskUserId(String(v)),
    email: (v) => maskEmail(String(v)),
    email_address: (v) => maskEmail(String(v)),
    emailAddress: (v) => maskEmail(String(v)),
    phone: (v) => maskPhone(String(v)),
    phone_number: (v) => maskPhone(String(v)),
    phoneNumber: (v) => maskPhone(String(v)),
    ipAddress: () => '[redacted]',
    ip_address: () => '[redacted]',
    ip: () => '[redacted]',
    deviceId: () => '[redacted]',
    device_id: () => '[redacted]',
    fingerprint: () => '[redacted]',
    ssn: () => '[redacted]',
    social_security: () => '[redacted]',
    password: () => '[redacted]',
    secret: () => '[redacted]',
    token: () => '[redacted]',
    apiKey: () => '[redacted]',
    api_key: () => '[redacted]',
    walletAddress: (v) => maskWalletAddress(String(v)),
    wallet_address: (v) => maskWalletAddress(String(v)),
    address: (v) => {
      // Only mask if it looks like a crypto address
      const str = String(v);
      if (str.startsWith('0x') || str.length > 30) {
        return maskWalletAddress(str);
      }
      return str;
    },
  };

  // Add any additional PII fields with generic masking
  for (const field of additionalPiiFields) {
    if (!piiFields[field]) {
      piiFields[field] = (v) => maskGeneric(String(v));
    }
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      result[key] = value;
      continue;
    }

    // Check if this is a PII field
    const lowerKey = key.toLowerCase();
    const maskFn = Object.entries(piiFields).find(
      ([piiKey]) => piiKey.toLowerCase() === lowerKey,
    )?.[1];

    if (maskFn) {
      result[key] = maskFn(value);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      result[key] = sanitizeForLogging(
        value as Record<string, unknown>,
        additionalPiiFields,
      );
    } else if (Array.isArray(value)) {
      // Sanitize arrays
      result[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? sanitizeForLogging(
              item as Record<string, unknown>,
              additionalPiiFields,
            )
          : item,
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}
