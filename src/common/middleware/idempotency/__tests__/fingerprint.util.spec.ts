import { FingerprintUtil } from '../utils/fingerprint.util';
import { Request } from 'express';

describe('FingerprintUtil', () => {
  const createMockRequest = (overrides = {}): Partial<Request> => {
    return {
      method: 'POST',
      path: '/api/v1/transfers',
      body: {
        amount: 100,
        recipientId: 'user-123',
        note: 'Test transfer',
      },
      user: { id: 'user-456' },
      ...overrides,
    } as Partial<Request>;
  };

  describe('generate', () => {
    it('should generate consistent fingerprint for same request', () => {
      const req1 = createMockRequest();
      const req2 = createMockRequest();

      const fp1 = FingerprintUtil.generate(req1 as Request);
      const fp2 = FingerprintUtil.generate(req2 as Request);

      expect(fp1).toBe(fp2);
      expect(fp1).toHaveLength(64); // SHA-256 hash length
    });

    it('should generate different fingerprint for different methods', () => {
      const req1 = createMockRequest({ method: 'POST' });
      const req2 = createMockRequest({ method: 'PUT' });

      const fp1 = FingerprintUtil.generate(req1 as Request);
      const fp2 = FingerprintUtil.generate(req2 as Request);

      expect(fp1).not.toBe(fp2);
    });

    it('should generate different fingerprint for different paths', () => {
      const req1 = createMockRequest({ path: '/api/v1/transfers' });
      const req2 = createMockRequest({ path: '/api/v1/withdrawals' });

      const fp1 = FingerprintUtil.generate(req1 as Request);
      const fp2 = FingerprintUtil.generate(req2 as Request);

      expect(fp1).not.toBe(fp2);
    });

    it('should generate different fingerprint for different users', () => {
      const req1 = createMockRequest({ user: { id: 'user-1' } });
      const req2 = createMockRequest({ user: { id: 'user-2' } });

      const fp1 = FingerprintUtil.generate(req1 as Request);
      const fp2 = FingerprintUtil.generate(req2 as Request);

      expect(fp1).not.toBe(fp2);
    });

    it('should generate different fingerprint for different body content', () => {
      const req1 = createMockRequest({
        body: { amount: 100, recipientId: 'user-1' },
      });
      const req2 = createMockRequest({
        body: { amount: 200, recipientId: 'user-2' },
      });

      const fp1 = FingerprintUtil.generate(req1 as Request);
      const fp2 = FingerprintUtil.generate(req2 as Request);

      expect(fp1).not.toBe(fp2);
    });

    it('should ignore timestamp fields in body', () => {
      const req1 = createMockRequest({
        body: {
          amount: 100,
          recipientId: 'user-1',
          timestamp: '2024-01-01T00:00:00Z',
        },
      });
      const req2 = createMockRequest({
        body: {
          amount: 100,
          recipientId: 'user-1',
          timestamp: '2024-01-02T00:00:00Z',
        },
      });

      const fp1 = FingerprintUtil.generate(req1 as Request);
      const fp2 = FingerprintUtil.generate(req2 as Request);

      expect(fp1).toBe(fp2);
    });

    it('should handle requests without user', () => {
      const req = createMockRequest({ user: undefined });

      const fp = FingerprintUtil.generate(req as Request);

      expect(fp).toBeTruthy();
      expect(fp).toHaveLength(64);
    });

    it('should handle requests without body', () => {
      const req = createMockRequest({ body: undefined });

      const fp = FingerprintUtil.generate(req as Request);

      expect(fp).toBeTruthy();
      expect(fp).toHaveLength(64);
    });

    it('should handle GET requests (no body)', () => {
      const req = createMockRequest({
        method: 'GET',
        body: undefined,
      });

      const fp = FingerprintUtil.generate(req as Request);

      expect(fp).toBeTruthy();
      expect(fp).toHaveLength(64);
    });
  });

  describe('validate', () => {
    it('should return true for matching fingerprints', () => {
      const req = createMockRequest();
      const fingerprint = FingerprintUtil.generate(req as Request);

      const isValid = FingerprintUtil.validate(req as Request, fingerprint);

      expect(isValid).toBe(true);
    });

    it('should return false for non-matching fingerprints', () => {
      const req1 = createMockRequest({ body: { amount: 100 } });
      const req2 = createMockRequest({ body: { amount: 200 } });

      const fingerprint1 = FingerprintUtil.generate(req1 as Request);

      const isValid = FingerprintUtil.validate(req2 as Request, fingerprint1);

      expect(isValid).toBe(false);
    });

    it('should return false for different users', () => {
      const req1 = createMockRequest({ user: { id: 'user-1' } });
      const req2 = createMockRequest({ user: { id: 'user-2' } });

      const fingerprint1 = FingerprintUtil.generate(req1 as Request);

      const isValid = FingerprintUtil.validate(req2 as Request, fingerprint1);

      expect(isValid).toBe(false);
    });
  });

  describe('Security', () => {
    it('should prevent replay attacks with same key but different body', () => {
      const originalReq = createMockRequest({
        body: {
          amount: 100,
          recipientId: 'user-123',
        },
      });

      const replayReq = createMockRequest({
        body: {
          amount: 10000, // Attacker changes amount
          recipientId: 'attacker-456',
        },
      });

      const originalFingerprint = FingerprintUtil.generate(
        originalReq as Request,
      );
      const isValid = FingerprintUtil.validate(
        replayReq as Request,
        originalFingerprint,
      );

      expect(isValid).toBe(false);
    });

    it('should prevent replay attacks with different user', () => {
      const originalReq = createMockRequest({
        user: { id: 'user-123' },
      });

      const replayReq = createMockRequest({
        user: { id: 'attacker-456' },
      });

      const originalFingerprint = FingerprintUtil.generate(
        originalReq as Request,
      );
      const isValid = FingerprintUtil.validate(
        replayReq as Request,
        originalFingerprint,
      );

      expect(isValid).toBe(false);
    });
  });
});
