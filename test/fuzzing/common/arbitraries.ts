/**
 * Custom arbitraries for property-based testing
 * Generates random but structured test data
 */

import * as fc from 'fast-check';

const validDate = (date: Date): boolean => !Number.isNaN(date.getTime());

const toIsoDate = (date: Date): string => date.toISOString().split('T')[0];

/**
 * Phone number arbitraries
 */
export const phoneArbitraries = {
  // Valid international phone number
  valid: () =>
    fc
      .tuple(
        fc.constantFrom('+225', '+221', '+223', '+1', '+44', '+33'),
        fc.string({
          unit: fc.integer({ min: 0, max: 9 }).map(String),
          minLength: 8,
          maxLength: 12,
        }),
      )
      .map(([code, number]) => `${code}${number}`),

  // Invalid formats
  invalid: () =>
    fc.oneof(
      fc.string(), // Random string
      fc.integer().map(String), // Just numbers
      fc.constant(''), // Empty
      fc.constant('+'), // Just plus
      fc.constant('++22501234567'), // Double plus
      fc.constant('+0001234567'), // Starts with 0
      fc.constant('225701234567'), // Missing plus
      fc.constant('+225 70 12 34 56'), // With spaces
      fc.constant('+225-70-12-34-56'), // With dashes
      fc.string({ minLength: 1, maxLength: 5 }), // Too short
      fc.string({ minLength: 20, maxLength: 50 }), // Too long
    ),

  // West African specific
  westAfrican: () =>
    fc
      .tuple(
        fc.constantFrom('+225', '+221', '+223'), // CI, SN, ML
        fc.string({
          unit: fc.integer({ min: 0, max: 9 }).map(String),
          minLength: 8,
          maxLength: 10,
        }),
      )
      .map(([code, number]) => `${code}${number}`),
};

/**
 * Amount arbitraries
 */
export const amountArbitraries = {
  // Valid positive amounts
  valid: () =>
    fc.double({
      min: 0.01,
      max: 1000000,
      noNaN: true,
      noDefaultInfinity: true,
    }),

  // Small valid amounts
  small: () =>
    fc.double({ min: 0.01, max: 10, noNaN: true, noDefaultInfinity: true }),

  // Large valid amounts
  large: () =>
    fc.double({
      min: 10000,
      max: 10000000,
      noNaN: true,
      noDefaultInfinity: true,
    }),

  // Boundary values
  boundary: () =>
    fc.oneof(
      fc.constant(0), // Zero
      fc.constant(0.001), // Below minimum
      fc.constant(0.01), // Minimum
      fc.constant(0.02), // Just above minimum
      fc.constant(999999.99), // Just below max
      fc.constant(1000000), // Maximum
      fc.constant(1000000.01), // Just above max
      fc.constant(Number.MAX_SAFE_INTEGER), // Very large
      fc.constant(Number.MIN_VALUE), // Very small
    ),

  // Invalid amounts
  invalid: () =>
    fc.oneof(
      fc.constant(-1), // Negative
      fc.constant(-100), // Large negative
      fc.constant(NaN), // NaN
      fc.constant(Infinity), // Infinity
      fc.constant(-Infinity), // Negative infinity
      fc.constant('100' as any), // String
      fc.constant(null as any), // Null
      fc.constant(undefined as any), // Undefined
      fc.array(fc.integer()).map(() => [] as any), // Array
      fc.object().map(() => ({}) as any), // Object
    ),
};

/**
 * Currency arbitraries
 */
export const currencyArbitraries = {
  // Valid currencies
  valid: () => fc.constantFrom('USD', 'XOF', 'EUR', 'GBP'),

  // West African
  westAfrican: () => fc.constant('XOF'),

  // Invalid currencies
  invalid: () =>
    fc.oneof(
      fc.string({ minLength: 1, maxLength: 2 }), // Too short
      fc.string({ minLength: 4, maxLength: 10 }), // Too long
      fc.constant(''), // Empty
      fc.constant('usd'), // Lowercase
      fc.constant('XXX'), // Invalid code
      fc.constant('USDC'), // Crypto (not supported)
      fc.integer().map(String), // Number
      fc.constant(null as any), // Null
    ),
};

/**
 * Username arbitraries
 */
export const usernameArbitraries = {
  // Valid usernames (alphanumeric + underscore, 3-30 chars)
  valid: () =>
    fc.string({
      unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'),
      minLength: 3,
      maxLength: 30,
    }),

  // With @ prefix
  withAt: () =>
    fc
      .string({
        unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'),
        minLength: 3,
        maxLength: 30,
      })
      .map((s) => `@${s}`),

  // Invalid usernames
  invalid: () =>
    fc.oneof(
      fc.string({ minLength: 1, maxLength: 2 }), // Too short
      fc.string({ minLength: 31, maxLength: 100 }), // Too long
      fc.constant(''), // Empty
      fc.constant('ab'), // Too short
      fc.constant('user name'), // Space
      fc.constant('user-name'), // Dash
      fc.constant('user.name'), // Dot
      fc.constant('user@name'), // @ in middle
      fc.constant('@@user'), // Double @
      fc.constant('123'), // Only numbers (edge case)
      sqlInjectionStrings(), // SQL injection
      xssStrings(), // XSS
    ),
};

/**
 * OTP arbitraries
 */
export const otpArbitraries = {
  // Valid 6-digit OTP
  valid: () =>
    fc
      .integer({ min: 0, max: 999999 })
      .map((n) => n.toString().padStart(6, '0')),

  // Invalid OTPs
  invalid: () =>
    fc.oneof(
      fc.string({ minLength: 1, maxLength: 5 }), // Too short
      fc.string({ minLength: 7, maxLength: 10 }), // Too long
      fc.constant(''), // Empty
      fc.constant('12345'), // 5 digits
      fc.constant('1234567'), // 7 digits
      fc.constant('abcdef'), // Letters
      fc.constant('12-45-78'), // With dashes
      fc.constant('123 456'), // With space
      fc.constant(null as any), // Null
    ),
};

/**
 * Wallet address arbitraries
 */
export const addressArbitraries = {
  // Valid Ethereum-like address (0x + 40 hex chars)
  valid: () =>
    fc
      .string({
        unit: fc.constantFrom(...'0123456789abcdef'),
        minLength: 40,
        maxLength: 40,
      })
      .map((s) => `0x${s}`),

  // Invalid addresses
  invalid: () =>
    fc.oneof(
      fc.string(), // Random string
      fc.constant(''), // Empty
      fc.constant('0x'), // No address
      fc.constant('0x123'), // Too short
      fc.string({ minLength: 42, maxLength: 100 }), // Too long
      fc.constant('1234567890abcdef1234567890abcdef12345678'), // Missing 0x
      fc.constant('0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG'), // Invalid hex
      sqlInjectionStrings(), // SQL injection
      xssStrings(), // XSS
    ),
};

/**
 * PIN arbitraries
 */
export const pinArbitraries = {
  // Valid 4-6 digit PIN
  valid: () => fc.integer({ min: 1000, max: 999999 }).map((n) => n.toString()),

  // Weak PINs (sequential, repeated)
  weak: () =>
    fc.constantFrom(
      '1234',
      '0000',
      '1111',
      '123456',
      '111111',
      '000000',
      '987654',
    ),

  // Invalid PINs
  invalid: () =>
    fc.oneof(
      fc.string({ minLength: 1, maxLength: 3 }), // Too short
      fc.string({ minLength: 7, maxLength: 20 }), // Too long
      fc.constant(''), // Empty
      fc.constant('abc'), // Letters
      fc.constant('12-34'), // With dash
      fc.constant(null as any), // Null
    ),
};

/**
 * Date arbitraries
 */
export const dateArbitraries = {
  // Past dates
  past: () =>
    fc.date({ max: new Date() }).filter(validDate).map(toIsoDate),

  // Future dates
  future: () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 20);

    return fc
      .date({ min: tomorrow, max: maxDate })
      .filter(validDate)
      .map(toIsoDate);
  },

  // Valid birth dates (18-100 years ago)
  birthDate: () => {
    const today = new Date();
    const minDate = new Date(
      today.getFullYear() - 100,
      today.getMonth(),
      today.getDate(),
    );
    const maxDate = new Date(
      today.getFullYear() - 18,
      today.getMonth(),
      today.getDate(),
    );
    return fc
      .date({ min: minDate, max: maxDate })
      .filter(validDate)
      .map(toIsoDate);
  },

  // Invalid dates
  invalid: () =>
    fc.oneof(
      fc.constant(''), // Empty
      fc.constant('not-a-date'), // Invalid format
      fc.constant('2024-13-01'), // Invalid month
      fc.constant('2024-01-32'), // Invalid day
      fc.constant('2024/01/01'), // Wrong separator
      fc.constant('01-01-2024'), // Wrong order
      fc.date().filter(validDate).map((d) => d.toISOString()), // With time
    ),
};

/**
 * SQL Injection strings
 */
export function sqlInjectionStrings() {
  return fc.constantFrom(
    "' OR '1'='1",
    "'; DROP TABLE users--",
    "' OR 1=1--",
    "admin' --",
    "' UNION SELECT * FROM users--",
    "1' OR '1' = '1')) /*",
    "' AND 1=0 UNION ALL SELECT 'admin', '81dc9bdb52d04dc20036dbd8313ed055",
  );
}

/**
 * XSS strings
 */
export function xssStrings() {
  return fc.constantFrom(
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    '<svg onload=alert("XSS")>',
    'javascript:alert("XSS")',
    '<iframe src="javascript:alert(`XSS`)">',
    '"><script>alert(String.fromCharCode(88,83,83))</script>',
    '<body onload=alert("XSS")>',
  );
}

/**
 * Path traversal strings
 */
export function pathTraversalStrings() {
  return fc.constantFrom(
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '/etc/passwd',
    'C:\\windows\\system32\\config\\sam',
    '....//....//....//etc/passwd',
  );
}

/**
 * Command injection strings
 */
export function commandInjectionStrings() {
  return fc.constantFrom(
    '; ls -la',
    '| cat /etc/passwd',
    '`whoami`',
    '$(whoami)',
    '; rm -rf /',
    '|| cat /etc/passwd',
  );
}

/**
 * Buffer overflow strings
 */
export function bufferOverflowStrings() {
  return fc.oneof(
    fc.constant('A'.repeat(10000)),
    fc.constant('A'.repeat(50000)),
    fc.constant('A'.repeat(90000)),
  );
}

/**
 * Unicode edge cases
 */
export function unicodeEdgeCases() {
  return fc.constantFrom(
    '🔥💰🚀', // Emojis
    '你好世界', // Chinese
    'مرحبا', // Arabic
    '🏳️‍🌈', // Complex emoji
    '\u0000', // Null byte
    '\uFEFF', // Zero-width no-break space
    'test\u0000test', // Null in middle
    '﷽', // Arabic ligature
  );
}

/**
 * Network arbitraries
 */
export const networkArbitraries = {
  valid: () => fc.constantFrom('ethereum', 'polygon', 'arbitrum', 'optimism'),
  invalid: () =>
    fc.oneof(
      fc.constant(''),
      fc.constant('bitcoin'),
      fc.constant('POLYGON'),
      fc.constant('eth'),
      fc.string({ minLength: 1, maxLength: 5 }),
    ),
};

/**
 * Country code arbitraries
 */
export const countryCodeArbitraries = {
  valid: () => fc.constantFrom('CI', 'SN', 'ML', 'US', 'GB', 'FR'),
  westAfrican: () => fc.constantFrom('CI', 'SN', 'ML'),
  invalid: () =>
    fc.oneof(
      fc.constant(''),
      fc.constant('X'),
      fc.constant('XXX'),
      fc.constant('ci'),
      fc.constant('123'),
      fc.string({ minLength: 3, maxLength: 10 }),
    ),
};

/**
 * Email arbitraries
 */
export const emailArbitraries = {
  valid: () =>
    fc
      .tuple(
        fc.string({
          unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'),
          minLength: 1,
          maxLength: 20,
        }),
        fc.constantFrom('gmail.com', 'yahoo.com', 'outlook.com', 'example.com'),
      )
      .map(([user, domain]) => `${user}@${domain}`),

  invalid: () =>
    fc.oneof(
      fc.constant(''), // Empty
      fc.constant('notanemail'), // No @
      fc.constant('@example.com'), // No user
      fc.constant('user@'), // No domain
      fc.constant('user@@example.com'), // Double @
      fc.constant('user name@example.com'), // Space
      sqlInjectionStrings(),
      xssStrings(),
    ),
};

/**
 * ID arbitraries (UUID-like)
 */
export const idArbitraries = {
  uuid: () => fc.uuid(),
  invalid: () =>
    fc.oneof(
      fc.constant(''),
      fc.constant('not-a-uuid'),
      fc.constant('123'),
      fc.integer().map(String),
      sqlInjectionStrings(),
    ),
};
