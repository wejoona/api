/**
 * Staging Environment Configuration
 *
 * This configuration is used for staging/pre-production deployments.
 * Uses sandbox APIs and has moderate security settings.
 */

export const stagingConfig = {
  // Server Settings
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    corsOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
    enableSwagger: true, // Enabled for QA testing
    enableDebugRoutes: false,
  },

  // Database Settings
  database: {
    type: 'postgres' as const,
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    database: process.env.DATABASE_NAME,
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    synchronize: false,
    logging: true, // Enable for debugging
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
    ssl:
      process.env.DATABASE_SSL === 'true'
        ? {
            rejectUnauthorized:
              process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
          }
        : false,
  },

  // Redis Settings
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    tls: process.env.REDIS_TLS === 'true',
  },

  // JWT Settings
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '30m', // Slightly longer for testing
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Rate Limiting (moderate for staging)
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  // Providers (using sandbox APIs)
  providers: {
    circle: {
      useMock: process.env.CIRCLE_USE_MOCK === 'true',
      apiUrl: process.env.CIRCLE_API_URL || 'https://api-sandbox.circle.com',
      apiKey: process.env.CIRCLE_API_KEY,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET,
      walletSetId: process.env.CIRCLE_WALLET_SET_ID,
      webhookSecret: process.env.CIRCLE_WEBHOOK_SECRET,
    },
    yellowCard: {
      useMock: process.env.YELLOW_CARD_USE_MOCK === 'true',
      apiUrl:
        process.env.YELLOW_CARD_API_URL || 'https://sandbox.yellowcard.io',
      apiKey: process.env.YELLOW_CARD_API_KEY,
      secretKey: process.env.YELLOW_CARD_SECRET_KEY,
      webhookSecret: process.env.YELLOW_CARD_WEBHOOK_SECRET,
    },
    sms: {
      provider: process.env.SMS_PROVIDER || 'mock',
    },
    fcm: {
      useMock: process.env.FCM_USE_MOCK === 'true',
      projectId: process.env.FCM_PROJECT_ID,
      clientEmail: process.env.FCM_CLIENT_EMAIL,
      privateKey: process.env.FCM_PRIVATE_KEY,
    },
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    format: 'json',
    includeTimestamp: true,
    includeContext: true,
  },

  // Security (moderate for staging)
  security: {
    helmet: {
      contentSecurityPolicy: true,
      crossOriginEmbedderPolicy: false,
    },
    hsts: {
      maxAge: 86400, // 1 day for staging
      includeSubDomains: true,
      preload: false,
    },
  },

  // Monitoring
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
    sentryEnvironment: 'staging',
  },

  // Feature Flags
  features: {
    enableEmailVerification: true,
    enableSmsVerification: process.env.SMS_PROVIDER !== 'mock',
    enableKycVerification: true,
    enableWebhookVerification: true,
  },
};

export default stagingConfig;
