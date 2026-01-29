import {
  maskUserId,
  maskEmail,
  maskPhone,
  maskIpAddress,
  maskDeviceId,
  maskWalletAddress,
  sanitizeForLogging,
} from './pii-sanitizer';

describe('PII Sanitizer', () => {
  describe('maskUserId', () => {
    it('should mask user ID showing first and last character', () => {
      expect(maskUserId('user-12345-abc')).toBe('u***c');
    });

    it('should handle short user IDs', () => {
      expect(maskUserId('abc')).toBe('****');
    });

    it('should handle null/undefined', () => {
      expect(maskUserId(null)).toBe('[none]');
      expect(maskUserId(undefined)).toBe('[none]');
    });
  });

  describe('maskEmail', () => {
    it('should mask email address', () => {
      const result = maskEmail('john.doe@example.com');
      expect(result).toContain('@');
      expect(result).not.toContain('john.doe');
      expect(result).not.toContain('example.com');
    });

    it('should handle emails without @', () => {
      expect(maskEmail('invalid-email')).toBe('i***l');
    });

    it('should handle null/undefined', () => {
      expect(maskEmail(null)).toBe('[none]');
    });
  });

  describe('maskPhone', () => {
    it('should show only last 4 digits', () => {
      expect(maskPhone('+1234567890')).toBe('***7890');
    });

    it('should handle short phone numbers', () => {
      expect(maskPhone('123')).toBe('****');
    });

    it('should handle formatted phone numbers', () => {
      expect(maskPhone('+1 (234) 567-8901')).toBe('***8901');
    });
  });

  describe('maskIpAddress', () => {
    it('should mask IPv4 address', () => {
      expect(maskIpAddress('192.168.1.100')).toBe('192.168.***.***');
    });

    it('should mask IPv6 address', () => {
      const result = maskIpAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
      expect(result).toContain('2001');
      expect(result).toContain('***');
    });

    it('should handle null/undefined', () => {
      expect(maskIpAddress(null)).toBe('[none]');
    });
  });

  describe('maskDeviceId', () => {
    it('should show prefix and suffix', () => {
      expect(maskDeviceId('abc123def456ghi')).toBe('abc***ghi');
    });

    it('should handle short device IDs', () => {
      expect(maskDeviceId('abc')).toBe('******');
    });
  });

  describe('maskWalletAddress', () => {
    it('should mask Ethereum address', () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      expect(maskWalletAddress(address)).toBe('0x1234...5678');
    });

    it('should handle short addresses', () => {
      // Short addresses (<=10 chars) show first 4 chars + ***
      expect(maskWalletAddress('0x12345')).toBe('0x12***');
    });
  });

  describe('sanitizeForLogging', () => {
    it('should mask known PII fields', () => {
      const obj = {
        userId: 'user-12345',
        email: 'test@example.com',
        phone: '+1234567890',
        nonPii: 'safe data',
      };

      const sanitized = sanitizeForLogging(obj);

      expect(sanitized.userId).not.toBe('user-12345');
      expect(sanitized.email).not.toBe('test@example.com');
      expect(sanitized.phone).not.toBe('+1234567890');
      expect(sanitized.nonPii).toBe('safe data');
    });

    it('should redact sensitive fields completely', () => {
      const obj = {
        ipAddress: '192.168.1.1',
        deviceId: 'device-123',
        password: 'secret',
        apiKey: 'key-123',
      };

      const sanitized = sanitizeForLogging(obj);

      expect(sanitized.ipAddress).toBe('[redacted]');
      expect(sanitized.deviceId).toBe('[redacted]');
      expect(sanitized.password).toBe('[redacted]');
      expect(sanitized.apiKey).toBe('[redacted]');
    });

    it('should handle nested objects', () => {
      const obj = {
        user: {
          email: 'nested@example.com',
          profile: {
            phone: '+1234567890',
          },
        },
      };

      const sanitized = sanitizeForLogging(obj) as {
        user: { email: string; profile: { phone: string } };
      };

      expect(sanitized.user.email).not.toBe('nested@example.com');
      expect(sanitized.user.profile.phone).not.toBe('+1234567890');
    });

    it('should handle arrays', () => {
      const obj = {
        users: [{ email: 'user1@example.com' }, { email: 'user2@example.com' }],
      };

      const sanitized = sanitizeForLogging(obj) as {
        users: Array<{ email: string }>;
      };

      expect(sanitized.users[0].email).not.toBe('user1@example.com');
      expect(sanitized.users[1].email).not.toBe('user2@example.com');
    });

    it('should handle null/undefined values', () => {
      const obj = {
        email: null,
        phone: undefined,
        name: 'Test',
      };

      const sanitized = sanitizeForLogging(obj);

      expect(sanitized.email).toBeNull();
      expect(sanitized.phone).toBeUndefined();
      expect(sanitized.name).toBe('Test');
    });

    it('should support additional PII fields', () => {
      const obj = {
        customField: 'sensitive-data',
        normalField: 'safe-data',
      };

      const sanitized = sanitizeForLogging(obj, ['customField']);

      expect(sanitized.customField).not.toBe('sensitive-data');
      expect(sanitized.normalField).toBe('safe-data');
    });
  });
});
