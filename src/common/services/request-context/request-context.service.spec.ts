import { Test, TestingModule } from '@nestjs/testing';
import { RequestContextService } from './request-context.service';
import { RequestContext } from './request-context.interface';

describe('RequestContextService', () => {
  let service: RequestContextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestContextService],
    }).compile();

    service = module.get<RequestContextService>(RequestContextService);
  });

  afterEach(() => {
    // Ensure context is cleaned up between tests
    expect(service.getContext()).toBeUndefined();
  });

  describe('Context Management', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should return undefined when not in context', () => {
      expect(service.getContext()).toBeUndefined();
      expect(service.hasContext()).toBe(false);
    });

    it('should throw when getting context outside of scope', () => {
      expect(() => service.getContextOrThrow()).toThrow(
        'Request context not found',
      );
    });

    it('should run callback with context', async () => {
      const mockContext: RequestContext = {
        correlationId: 'test-123',
        requestId: 'test-123',
        timestamp: new Date(),
        method: 'GET',
        path: '/test',
        url: '/test',
        metadata: {
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        },
      };

      await service.run(mockContext, () => {
        expect(service.hasContext()).toBe(true);
        expect(service.getContext()).toEqual(mockContext);
      });
    });

    it('should return value from callback', () => {
      const mockContext: RequestContext = {
        correlationId: 'test-123',
        requestId: 'test-123',
        timestamp: new Date(),
        method: 'GET',
        path: '/test',
        url: '/test',
        metadata: {
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        },
      };

      const result = service.run(mockContext, () => {
        return 'test-value';
      });

      expect(result).toBe('test-value');
    });
  });

  describe('Correlation ID', () => {
    it('should return correlation ID', () => {
      const mockContext: RequestContext = {
        correlationId: 'correlation-123',
        requestId: 'request-123',
        timestamp: new Date(),
        method: 'GET',
        path: '/test',
        url: '/test',
        metadata: {
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        },
      };

      service.run(mockContext, () => {
        expect(service.getCorrelationId()).toBe('correlation-123');
        expect(service.getRequestId()).toBe('request-123');
      });
    });

    it('should return "unknown" when no context', () => {
      expect(service.getCorrelationId()).toBe('unknown');
      expect(service.getRequestId()).toBe('unknown');
    });
  });

  describe('User Information', () => {
    it('should get user information', () => {
      const mockContext: RequestContext = {
        correlationId: 'test-123',
        requestId: 'test-123',
        timestamp: new Date(),
        method: 'GET',
        path: '/test',
        url: '/test',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'admin',
          permissions: ['read', 'write'],
        },
        metadata: {
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        },
      };

      service.run(mockContext, () => {
        expect(service.getUserId()).toBe('user-123');
        expect(service.getUserEmail()).toBe('test@example.com');
        expect(service.getUserRole()).toBe('admin');
        expect(service.getUserPermissions()).toEqual(['read', 'write']);
        expect(service.isAuthenticated()).toBe(true);
      });
    });

    it('should return undefined for user when not authenticated', () => {
      const mockContext: RequestContext = {
        correlationId: 'test-123',
        requestId: 'test-123',
        timestamp: new Date(),
        method: 'GET',
        path: '/test',
        url: '/test',
        metadata: {
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        },
      };

      service.run(mockContext, () => {
        expect(service.getUserId()).toBeUndefined();
        expect(service.getUserEmail()).toBeUndefined();
        expect(service.isAuthenticated()).toBe(false);
      });
    });
  });

  describe('Device Information', () => {
    it('should get device information', () => {
      const mockContext: RequestContext = {
        correlationId: 'test-123',
        requestId: 'test-123',
        timestamp: new Date(),
        method: 'GET',
        path: '/test',
        url: '/test',
        device: {
          id: 'device-123',
          fingerprint: 'fp-123',
          platform: 'iOS',
          isRooted: false,
          isTrusted: true,
        },
        metadata: {
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        },
      };

      service.run(mockContext, () => {
        expect(service.getDeviceId()).toBe('device-123');
        expect(service.getDeviceFingerprint()).toBe('fp-123');
        expect(service.isDeviceTrusted()).toBe(true);
        expect(service.isDeviceRooted()).toBe(false);
      });
    });

    it('should return false for device checks when no device', () => {
      const mockContext: RequestContext = {
        correlationId: 'test-123',
        requestId: 'test-123',
        timestamp: new Date(),
        method: 'GET',
        path: '/test',
        url: '/test',
        metadata: {
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        },
      };

      service.run(mockContext, () => {
        expect(service.isDeviceTrusted()).toBe(false);
        expect(service.isDeviceRooted()).toBe(false);
      });
    });
  });

  describe('Request Metadata', () => {
    it('should get request metadata', () => {
      const mockContext: RequestContext = {
        correlationId: 'test-123',
        requestId: 'test-123',
        timestamp: new Date(),
        method: 'POST',
        path: '/api/v1/users',
        url: '/api/v1/users',
        metadata: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          origin: 'https://example.com',
          referer: 'https://example.com/home',
          acceptLanguage: 'en-US,fr;q=0.9',
          country: 'CI',
          region: 'Abidjan',
        },
      };

      service.run(mockContext, () => {
        expect(service.getIp()).toBe('192.168.1.1');
        expect(service.getUserAgent()).toBe('Mozilla/5.0');
        expect(service.getOrigin()).toBe('https://example.com');
        expect(service.getReferer()).toBe('https://example.com/home');
        expect(service.getAcceptLanguage()).toBe('en-US,fr;q=0.9');
        expect(service.getCountry()).toBe('CI');
        expect(service.getRegion()).toBe('Abidjan');
        expect(service.getMethod()).toBe('POST');
        expect(service.getPath()).toBe('/api/v1/users');
        expect(service.getUrl()).toBe('/api/v1/users');
      });
    });
  });

  describe('Permissions', () => {
    it('should check role', () => {
      const mockContext: RequestContext = {
        correlationId: 'test-123',
        requestId: 'test-123',
        timestamp: new Date(),
        method: 'GET',
        path: '/test',
        url: '/test',
        user: {
          id: 'user-123',
          role: 'admin',
        },
        metadata: {
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        },
      };

      service.run(mockContext, () => {
        expect(service.hasRole('admin')).toBe(true);
        expect(service.hasRole('user')).toBe(false);
      });
    });

    it('should check permission', () => {
      const mockContext: RequestContext = {
        correlationId: 'test-123',
        requestId: 'test-123',
        timestamp: new Date(),
        method: 'GET',
        path: '/test',
        url: '/test',
        user: {
          id: 'user-123',
          permissions: ['read', 'write', 'delete'],
        },
        metadata: {
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        },
      };

      service.run(mockContext, () => {
        expect(service.hasPermission('read')).toBe(true);
        expect(service.hasPermission('admin')).toBe(false);
      });
    });

    it('should check any permission', () => {
      const mockContext: RequestContext = {
        correlationId: 'test-123',
        requestId: 'test-123',
        timestamp: new Date(),
        method: 'GET',
        path: '/test',
        url: '/test',
        user: {
          id: 'user-123',
          permissions: ['read', 'write'],
        },
        metadata: {
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        },
      };

      service.run(mockContext, () => {
        expect(service.hasAnyPermission(['read', 'admin'])).toBe(true);
        expect(service.hasAnyPermission(['admin', 'super'])).toBe(false);
      });
    });

    it('should check all permissions', () => {
      const mockContext: RequestContext = {
        correlationId: 'test-123',
        requestId: 'test-123',
        timestamp: new Date(),
        method: 'GET',
        path: '/test',
        url: '/test',
        user: {
          id: 'user-123',
          permissions: ['read', 'write', 'delete'],
        },
        metadata: {
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        },
      };

      service.run(mockContext, () => {
        expect(service.hasAllPermissions(['read', 'write'])).toBe(true);
        expect(service.hasAllPermissions(['read', 'admin'])).toBe(false);
      });
    });
  });

  describe('Custom Data', () => {
    it('should set and get custom data', () => {
      const mockContext: RequestContext = {
        correlationId: 'test-123',
        requestId: 'test-123',
        timestamp: new Date(),
        method: 'GET',
        path: '/test',
        url: '/test',
        metadata: {
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        },
      };

      service.run(mockContext, () => {
        service.setCustom('tenantId', 'tenant-123');
        service.setCustom('sessionToken', 'token-456');

        expect(service.getCustom('tenantId')).toBe('tenant-123');
        expect(service.getCustom('sessionToken')).toBe('token-456');
        expect(service.getCustom('nonexistent')).toBeUndefined();
      });
    });
  });

  describe('Update Context', () => {
    it('should update context with partial data', () => {
      const mockContext: RequestContext = {
        correlationId: 'test-123',
        requestId: 'test-123',
        timestamp: new Date(),
        method: 'GET',
        path: '/test',
        url: '/test',
        metadata: {
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        },
      };

      service.run(mockContext, () => {
        expect(service.getUserId()).toBeUndefined();

        service.updateContext({
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        });

        expect(service.getUserId()).toBe('user-123');
        expect(service.getUserEmail()).toBe('test@example.com');
      });
    });
  });

  describe('Utility Methods', () => {
    it('should calculate request duration', (done) => {
      const mockContext: RequestContext = {
        correlationId: 'test-123',
        requestId: 'test-123',
        timestamp: new Date(),
        method: 'GET',
        path: '/test',
        url: '/test',
        metadata: {
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        },
      };

      service.run(mockContext, () => {
        setTimeout(() => {
          const duration = service.getRequestDuration();
          expect(duration).toBeGreaterThanOrEqual(100);
          expect(duration).toBeLessThan(200);
          done();
        }, 100);
      });
    });

    it('should create log context', () => {
      const mockContext: RequestContext = {
        correlationId: 'test-123',
        requestId: 'test-123',
        timestamp: new Date(),
        method: 'POST',
        path: '/api/v1/users',
        url: '/api/v1/users',
        user: {
          id: 'user-123',
          deviceId: 'device-123',
          sessionId: 'session-123',
        },
        metadata: {
          ip: '192.168.1.1',
          userAgent: 'test-agent',
        },
      };

      service.run(mockContext, () => {
        const logContext = service.getLogContext();

        expect(logContext).toEqual({
          correlationId: 'test-123',
          userId: 'user-123',
          deviceId: 'device-123',
          sessionId: 'session-123',
          ip: '192.168.1.1',
          path: '/api/v1/users',
          method: 'POST',
        });
      });
    });

    it('should create audit context', () => {
      const timestamp = new Date();
      const mockContext: RequestContext = {
        correlationId: 'test-123',
        requestId: 'test-123',
        timestamp,
        method: 'DELETE',
        path: '/api/v1/users/123',
        url: '/api/v1/users/123',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          deviceId: 'device-123',
          sessionId: 'session-123',
        },
        device: {
          fingerprint: 'fp-123',
        },
        metadata: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          country: 'CI',
        },
      };

      service.run(mockContext, () => {
        const auditContext = service.getAuditContext();

        expect(auditContext).toEqual({
          correlationId: 'test-123',
          timestamp: timestamp.toISOString(),
          userId: 'user-123',
          userEmail: 'test@example.com',
          deviceId: 'device-123',
          deviceFingerprint: 'fp-123',
          sessionId: 'session-123',
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          country: 'CI',
          path: '/api/v1/users/123',
          method: 'DELETE',
        });
      });
    });
  });

  describe('Async Operations', () => {
    it('should maintain context across async operations', async () => {
      const mockContext: RequestContext = {
        correlationId: 'test-123',
        requestId: 'test-123',
        timestamp: new Date(),
        method: 'GET',
        path: '/test',
        url: '/test',
        user: {
          id: 'user-123',
        },
        metadata: {
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        },
      };

      await service.run(mockContext, async () => {
        expect(service.getUserId()).toBe('user-123');

        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(service.getUserId()).toBe('user-123');

        await Promise.resolve();

        expect(service.getUserId()).toBe('user-123');
      });
    });

    it('should isolate contexts between concurrent requests', async () => {
      const context1: RequestContext = {
        correlationId: 'request-1',
        requestId: 'request-1',
        timestamp: new Date(),
        method: 'GET',
        path: '/test1',
        url: '/test1',
        user: { id: 'user-1' },
        metadata: { ip: '127.0.0.1', userAgent: 'test-agent' },
      };

      const context2: RequestContext = {
        correlationId: 'request-2',
        requestId: 'request-2',
        timestamp: new Date(),
        method: 'GET',
        path: '/test2',
        url: '/test2',
        user: { id: 'user-2' },
        metadata: { ip: '127.0.0.2', userAgent: 'test-agent' },
      };

      const promise1 = service.run(context1, async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(service.getUserId()).toBe('user-1');
        expect(service.getCorrelationId()).toBe('request-1');
      });

      const promise2 = service.run(context2, async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
        expect(service.getUserId()).toBe('user-2');
        expect(service.getCorrelationId()).toBe('request-2');
      });

      await Promise.all([promise1, promise2]);
    });
  });
});
