/**
 * Production Environment Configuration
 *
 * This configuration is used for production deployments.
 * Enforces strict security settings and requires all credentials.
 */

export const productionConfig = {
  // Server Settings
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    corsOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
    enableSwagger: false, // Disabled in production
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
    synchronize: false, // Never use synchronize in production
    logging: false,
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '20', 10),
    ssl:
      process.env.DATABASE_SSL === 'true'
        ? {
            rejectUnauthorized:
              process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
          }
        : false,
    connectionTimeout: parseInt(
      process.env.DATABASE_CONNECTION_TIMEOUT || '10000',
      10,
    ),
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
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Rate Limiting (strict for production)
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '60', 10),
  },

  // Providers
  providers: {
    circle: {
      useMock: false,
      apiUrl: process.env.CIRCLE_API_URL || 'https://api.circle.com',
      apiKey: process.env.CIRCLE_API_KEY,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET,
      walletSetId: process.env.CIRCLE_WALLET_SET_ID,
      webhookSecret: process.env.CIRCLE_WEBHOOK_SECRET,
    },
    yellowCard: {
      useMock: false,
      apiUrl: process.env.YELLOW_CARD_API_URL || 'https://api.yellowcard.io',
      apiKey: process.env.YELLOW_CARD_API_KEY,
      secretKey: process.env.YELLOW_CARD_SECRET_KEY,
      webhookSecret: process.env.YELLOW_CARD_WEBHOOK_SECRET,
    },
    sms: {
      provider: process.env.SMS_PROVIDER || 'twilio',
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
      twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
    },
    fcm: {
      useMock: false,
      projectId: process.env.FCM_PROJECT_ID,
      clientEmail: process.env.FCM_CLIENT_EMAIL,
      privateKey: process.env.FCM_PRIVATE_KEY,
    },
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    includeTimestamp: true,
    includeContext: true,
  },

  // Security (strict for production)
  security: {
    helmet: {
      contentSecurityPolicy: true,
      crossOriginEmbedderPolicy: true,
    },
    hsts: {
      maxAge: parseInt(process.env.HSTS_MAX_AGE || '31536000', 10),
      includeSubDomains: true,
      preload: true,
    },
  },

  // Monitoring
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
    sentryEnvironment: 'production',
  },

  // Feature Flags
  features: {
    enableEmailVerification: true,
    enableSmsVerification: true,
    enableKycVerification: true,
    enableWebhookVerification: true,
  },
};

export default productionConfig;
