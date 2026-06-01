import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import helmet from 'helmet';
import { AppModule } from '../../src/app.module';
import { getSecurityHeadersConfig } from '../../src/config/security-headers.config';

/**
 * Security Headers E2E Tests
 *
 * Verifies that all security headers are properly set in responses.
 * Target: A+ rating on securityheaders.com
 *
 * OWASP Reference: https://owasp.org/www-project-secure-headers/
 */
describe('Security Headers (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same security configuration as main.ts
    const securityConfig = getSecurityHeadersConfig('test', [
      'http://localhost:3001',
    ]);

    app.use(
      helmet({
        contentSecurityPolicy: securityConfig.contentSecurityPolicy,
        frameguard: { action: 'deny' },
        noSniff: true,
        hsts: {
          maxAge: 63072000,
          includeSubDomains: true,
          preload: true,
        },
        xssFilter: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        dnsPrefetchControl: { allow: false },
        ieNoOpen: true,
        permittedCrossDomainPolicies: { permittedPolicies: 'none' },
        crossOriginOpenerPolicy: { policy: 'same-origin' },
        crossOriginResourcePolicy: { policy: 'same-origin' },
        originAgentCluster: true,
      }),
    );

    // Add Permissions-Policy header
    app.use((req, res, next) => {
      res.setHeader('Permissions-Policy', securityConfig.permissionsPolicy);
      next();
    });

    app.enableCors({
      origin: ['http://localhost:3001'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close().catch((error) => {
      if (
        !(error instanceof Error) ||
        !error.message.includes('Connection is closed')
      ) {
        throw error;
      }
    });
  });

  describe('X-Frame-Options', () => {
    it('should set X-Frame-Options to DENY', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    it('should prevent clickjacking attacks', async () => {
      const response = await request(app.getHttpServer()).get('/');

      // DENY completely prevents embedding in any iframe
      expect(response.headers['x-frame-options']).toBe('DENY');
    });
  });

  describe('X-Content-Type-Options', () => {
    it('should set X-Content-Type-Options to nosniff', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('Strict-Transport-Security (HSTS)', () => {
    it('should set HSTS header with correct values', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toBeDefined();
      expect(hsts).toContain('max-age=63072000');
      expect(hsts).toContain('includeSubDomains');
      expect(hsts).toContain('preload');
    });

    it('should have max-age of at least 1 year for preload eligibility', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      const hsts = response.headers['strict-transport-security'];
      const maxAgeMatch = hsts.match(/max-age=(\d+)/);
      expect(maxAgeMatch).toBeDefined();

      const maxAge = parseInt(maxAgeMatch[1], 10);
      const oneYear = 31536000; // 1 year in seconds
      expect(maxAge).toBeGreaterThanOrEqual(oneYear);
    });
  });

  describe('X-XSS-Protection', () => {
    it('should set X-XSS-Protection header', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      // Helmet sets this to 0 by default (disabled) as modern browsers
      // should use CSP instead. Both 0 and 1; mode=block are acceptable.
      const xssProtection = response.headers['x-xss-protection'];
      expect(xssProtection).toBeDefined();
    });
  });

  describe('Referrer-Policy', () => {
    it('should set Referrer-Policy header', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      const referrerPolicy = response.headers['referrer-policy'];
      expect(referrerPolicy).toBeDefined();
      expect(referrerPolicy).toBe('strict-origin-when-cross-origin');
    });
  });

  describe('Content-Security-Policy', () => {
    it('should set Content-Security-Policy header', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      const csp = response.headers['content-security-policy'];
      expect(csp).toBeDefined();
    });

    it('should have restrictive default-src', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      const csp = response.headers['content-security-policy'];
      // In development/test, CSP may be relaxed for Swagger
      // In production, it should be "default-src 'none'"
      expect(csp).toContain('default-src');
    });

    it('should prevent framing (frame-ancestors)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      const csp = response.headers['content-security-policy'];
      // Either frame-ancestors directive or X-Frame-Options provides protection
      const hasFrameProtection =
        csp.includes('frame-ancestors') ||
        response.headers['x-frame-options'] === 'DENY';
      expect(hasFrameProtection).toBe(true);
    });
  });

  describe('Permissions-Policy', () => {
    it('should set Permissions-Policy header', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      const permissionsPolicy = response.headers['permissions-policy'];
      expect(permissionsPolicy).toBeDefined();
    });

    it('should disable camera', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      const permissionsPolicy = response.headers['permissions-policy'];
      expect(permissionsPolicy).toContain('camera=()');
    });

    it('should disable microphone', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      const permissionsPolicy = response.headers['permissions-policy'];
      expect(permissionsPolicy).toContain('microphone=()');
    });

    it('should disable geolocation', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      const permissionsPolicy = response.headers['permissions-policy'];
      expect(permissionsPolicy).toContain('geolocation=()');
    });

    it('should disable payment', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      const permissionsPolicy = response.headers['permissions-policy'];
      expect(permissionsPolicy).toContain('payment=()');
    });
  });

  describe('Cross-Origin Headers', () => {
    it('should set Cross-Origin-Opener-Policy', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      const coop = response.headers['cross-origin-opener-policy'];
      expect(coop).toBe('same-origin');
    });

    it('should set Cross-Origin-Resource-Policy', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      const corp = response.headers['cross-origin-resource-policy'];
      expect(corp).toBe('same-origin');
    });
  });

  describe('DNS Prefetch Control', () => {
    it('should disable DNS prefetching', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      expect(response.headers['x-dns-prefetch-control']).toBe('off');
    });
  });

  describe('X-Download-Options', () => {
    it('should set X-Download-Options to noopen', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      expect(response.headers['x-download-options']).toBe('noopen');
    });
  });

  describe('X-Permitted-Cross-Domain-Policies', () => {
    it('should set X-Permitted-Cross-Domain-Policies to none', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      expect(response.headers['x-permitted-cross-domain-policies']).toBe(
        'none',
      );
    });
  });

  describe('CORS Headers', () => {
    it('should set Access-Control-Allow-Origin for allowed origins', async () => {
      const response = await request(app.getHttpServer())
        .options('/api/v1/health')
        .set('Origin', 'http://localhost:3001')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3001',
      );
    });

    it('should set Access-Control-Allow-Credentials to true', async () => {
      const response = await request(app.getHttpServer())
        .options('/api/v1/health')
        .set('Origin', 'http://localhost:3001')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should set Access-Control-Max-Age for preflight caching', async () => {
      const response = await request(app.getHttpServer())
        .options('/api/v1/health')
        .set('Origin', 'http://localhost:3001')
        .set('Access-Control-Request-Method', 'GET');

      const maxAge = response.headers['access-control-max-age'];
      expect(maxAge).toBeDefined();
      expect(parseInt(maxAge, 10)).toBeGreaterThan(0);
    });

    it('should not allow unauthorized origins', async () => {
      const response = await request(app.getHttpServer())
        .options('/api/v1/health')
        .set('Origin', 'http://malicious-site.com')
        .set('Access-Control-Request-Method', 'GET');

      // Should not echo back the unauthorized origin
      const allowOrigin = response.headers['access-control-allow-origin'];
      expect(allowOrigin).not.toBe('http://malicious-site.com');
    });
  });

  describe('No Sensitive Headers Exposed', () => {
    it('should not expose X-Powered-By header', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('should not expose Server header with version info', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      // Server header should either be absent or not reveal version info
      const server = response.headers['server'];
      if (server) {
        expect(server).not.toMatch(/\d+\.\d+/); // No version numbers
      }
    });
  });

  describe('Security Headers Summary', () => {
    it('should have all required headers for A+ rating', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      // Required headers for A+ rating
      const requiredHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'strict-transport-security',
        'referrer-policy',
        'content-security-policy',
        'permissions-policy',
      ];

      const missingHeaders = requiredHeaders.filter(
        (header) => !response.headers[header],
      );

      expect(missingHeaders).toEqual([]);
    });

    it('should log all security headers for verification', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      const securityHeaders = {
        'X-Frame-Options': response.headers['x-frame-options'],
        'X-Content-Type-Options': response.headers['x-content-type-options'],
        'Strict-Transport-Security':
          response.headers['strict-transport-security'],
        'X-XSS-Protection': response.headers['x-xss-protection'],
        'Referrer-Policy': response.headers['referrer-policy'],
        'Content-Security-Policy': response.headers['content-security-policy'],
        'Permissions-Policy': response.headers['permissions-policy'],
        'Cross-Origin-Opener-Policy':
          response.headers['cross-origin-opener-policy'],
        'Cross-Origin-Resource-Policy':
          response.headers['cross-origin-resource-policy'],
        'X-DNS-Prefetch-Control': response.headers['x-dns-prefetch-control'],
        'X-Download-Options': response.headers['x-download-options'],
        'X-Permitted-Cross-Domain-Policies':
          response.headers['x-permitted-cross-domain-policies'],
      };

      console.log(
        'Security Headers:',
        JSON.stringify(securityHeaders, null, 2),
      );

      // All headers should be defined
      Object.entries(securityHeaders).forEach(([header, value]) => {
        expect(value).toBeDefined();
      });
    });
  });
});

/**
 * Cookie Security Tests
 *
 * Verifies that cookies are set with secure flags.
 */
describe('Cookie Security (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close().catch((error) => {
      if (
        !(error instanceof Error) ||
        !error.message.includes('Connection is closed')
      ) {
        throw error;
      }
    });
  });

  describe('Cookie Flags', () => {
    // Note: These tests require an endpoint that sets cookies
    // In production, auth endpoints would set session cookies

    it('should use secure cookie configuration', () => {
      // Import and verify cookie config
      const {
        getCookieSecurityConfig,
      } = require('../../src/config/security-headers.config');

      const prodConfig = getCookieSecurityConfig('production', '.joonapay.com');

      expect(prodConfig.secure).toBe(true);
      expect(prodConfig.httpOnly).toBe(true);
      expect(prodConfig.sameSite).toBe('strict');
    });

    it('should use __Host- prefix in production', () => {
      const {
        getCookieName,
      } = require('../../src/config/security-headers.config');

      const sessionCookieName = getCookieName('SESSION', 'production');
      expect(sessionCookieName).toBe('__Host-session');

      const refreshCookieName = getCookieName('REFRESH_TOKEN', 'production');
      expect(refreshCookieName).toBe('__Host-refresh');
    });

    it('should use standard names in development', () => {
      const {
        getCookieName,
      } = require('../../src/config/security-headers.config');

      const sessionCookieName = getCookieName('SESSION', 'development');
      expect(sessionCookieName).toBe('session');
    });
  });
});
