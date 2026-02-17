import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { MetricsInterceptor, LoggingInterceptor } from './common/interceptors';
import { MetricsService } from './modules/metrics/metrics.service';
import { getSecurityHeadersConfig } from './config/security-headers.config';
import { SentryService, SentryExceptionFilter } from './common/services/sentry.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3000;
  const apiPrefix = configService.get<string>('apiPrefix') || 'api/v1';
  const nodeEnv = configService.get<string>('nodeEnv') || 'development';
  const allowedOrigins = configService
    .get<string>(
      'ALLOWED_ORIGINS',
      'http://localhost:3001,http://localhost:8080',
    )
    .split(',')
    .map((origin) => origin.trim());

  // Get environment-specific security headers configuration
  const securityConfig = getSecurityHeadersConfig(nodeEnv, allowedOrigins);

  // ===================================================================
  // SECURITY HEADERS - OWASP Best Practices
  // Reference: https://owasp.org/www-project-secure-headers/
  // Target: A+ rating on securityheaders.com
  // ===================================================================
  app.use(
    helmet({
      // Content-Security-Policy: Prevents XSS, clickjacking, and other code injection attacks
      // OWASP Reference: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
      contentSecurityPolicy: securityConfig.contentSecurityPolicy,

      // X-Frame-Options: DENY - Prevents clickjacking attacks
      // OWASP Reference: https://owasp.org/www-community/attacks/Clickjacking
      frameguard: { action: 'deny' },

      // X-Content-Type-Options: nosniff - Prevents MIME type sniffing
      // OWASP Reference: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
      noSniff: true,

      // Strict-Transport-Security (HSTS): Forces HTTPS connections
      // OWASP Reference: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html
      // 2 years max-age, includeSubDomains, and preload for HSTS preload list eligibility
      hsts: {
        maxAge: 63072000, // 2 years (recommended for preload list)
        includeSubDomains: true,
        preload: true,
      },

      // X-XSS-Protection: Deprecated but still set for legacy browser support
      // Modern browsers use CSP instead, but this doesn't hurt
      xssFilter: true,

      // Referrer-Policy: Controls information sent in Referer header
      // 'strict-origin-when-cross-origin' balances privacy with functionality
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

      // X-DNS-Prefetch-Control: Prevents DNS prefetching to protect privacy
      dnsPrefetchControl: { allow: false },

      // X-Download-Options: IE-specific header to prevent automatic execution of downloads
      ieNoOpen: true,

      // X-Permitted-Cross-Domain-Policies: Prevents Adobe Flash/Acrobat from loading content
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },

      // Cross-Origin-Embedder-Policy: Required for SharedArrayBuffer and cross-origin isolation
      crossOriginEmbedderPolicy: nodeEnv === 'production',

      // Cross-Origin-Opener-Policy: Protects against Spectre-like attacks
      crossOriginOpenerPolicy: { policy: 'same-origin' },

      // Cross-Origin-Resource-Policy: Controls which origins can load resources
      crossOriginResourcePolicy: { policy: 'same-origin' },

      // Origin-Agent-Cluster: Enables origin-keyed agent clusters for isolation
      originAgentCluster: true,
    }),
  );

  // Custom Permissions-Policy header (not included in Helmet by default)
  // Controls which browser features the page can use
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy
  app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', securityConfig.permissionsPolicy);
    // Additional security header: Cache-Control for API responses (prevent caching sensitive data)
    if (req.path.startsWith(`/${apiPrefix}`)) {
      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate',
      );
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }
    next();
  });

  // Cookie parser with secure defaults
  app.use(cookieParser());

  // Request logging with response time
  const { RequestLoggerMiddleware } = require("./common/middleware/request-logger.middleware");
  const requestLogger = new RequestLoggerMiddleware();
  app.use(requestLogger.use.bind(requestLogger));

  logger.log(`Security headers configured for environment: ${nodeEnv}`);

  // Request body size limits (prevent DoS)
  app.use(json({ limit: '10kb' }));
  app.use(urlencoded({ extended: true, limit: '10kb' }));

  // ===================================================================
  // CORS CONFIGURATION - OWASP Best Practices
  // Reference: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
  // ===================================================================
  app.enableCors({
    // SECURITY: Always use explicit origin whitelist in production
    // Never use wildcard (*) with credentials: true
    origin: nodeEnv === 'production' ? allowedOrigins : true,

    // SECURITY: Enable credentials for cookie-based auth
    // Requires explicit origin (not wildcard) when true
    credentials: true,

    // SECURITY: Restrict to necessary HTTP methods only
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

    // SECURITY: Whitelist only required headers
    // Avoid exposing internal headers or accepting arbitrary headers
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Idempotency-Key',
      'X-Request-ID',
      'X-Correlation-ID',
      'X-Pin-Token',
      'X-Device-ID',
      'Accept',
      'Accept-Language',
      'Origin',
    ],

    // SECURITY: Only expose headers that clients need
    exposedHeaders: [
      'X-Idempotency-Key',
      'X-Request-ID',
      'X-Correlation-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'Retry-After',
    ],

    // PERFORMANCE: Cache preflight requests for 24 hours
    // Reduces OPTIONS requests for better performance
    maxAge: 86400,

    // SECURITY: Allow preflight for all methods with body
    preflightContinue: false,

    // SECURITY: Return 204 for successful OPTIONS (some legacy proxies expect this)
    optionsSuccessStatus: 204,
  });

  logger.log(
    `CORS configured: ${nodeEnv === 'production' ? allowedOrigins.join(', ') : 'all origins (development)'}`,
  );

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // Initialize Sentry error tracking
  try {
    const sentryService = app.get(SentryService);
    SentryExceptionFilter.initialize(sentryService);
    const httpAdapter = app.getHttpAdapter();
    app.useGlobalFilters(new SentryExceptionFilter(httpAdapter));
    logger.log('Sentry exception filter registered');
  } catch (e) {
    logger.warn('Sentry service not available — error tracking disabled');
  }

  // Global interceptors for monitoring and logging
  const metricsService = app.get(MetricsService);
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new MetricsInterceptor(metricsService),
  );

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // SECURITY: Only enable Swagger documentation in non-production environments
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('USDC Wallet API')
      .setDescription(
        `
        JoonaPay USDC Wallet - Cross-Border Remittance Platform

        **Ivory Coast → USA Corridor**

        This API enables money transfers from Ivory Coast to the USA using USDC as the settlement currency.
        Users see a simple USD wallet experience while the underlying infrastructure handles stablecoin conversions automatically.

        ## Features
        - User registration with phone verification (OTP)
        - USD wallet management
        - Deposits via Mobile Money (Orange Money, Wave, MTN)
        - Internal transfers (phone-to-phone)
        - External transfers (to USDC wallet address)
        - KYC verification for higher limits
        - Real-time exchange rates

        ## Authentication
        All authenticated endpoints require a Bearer token in the Authorization header.
        Obtain a token by verifying OTP after registration/login.

        ## Payment Provider
        Currently integrated with Yellow Card for stablecoin infrastructure.
        The API is designed with provider abstraction for easy switching.
        `,
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Authentication', 'User registration and login via phone OTP')
      .addTag('User', 'User profile management')
      .addTag('Wallet', 'Wallet balance, deposits, transfers, and KYC')
      .addTag('Transactions', 'Transaction history and status tracking')
      .addTag('Webhooks', 'Payment provider webhook endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
    logger.log(`Swagger documentation: http://localhost:${port}/docs`);
  } else {
    logger.log('Swagger documentation disabled in production');
  }

  await app.listen(port);

  logger.log(`Application running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`Health check: http://localhost:${port}/${apiPrefix}/health`);
}

void bootstrap();
