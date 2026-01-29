/**
 * Development Environment Configuration
 *
 * This configuration is used for local development and testing.
 * Enables verbose logging, mock providers, and relaxed security settings.
 */

export const developmentConfig = {
  // Server Settings
  server: {
    port: 3000,
    apiPrefix: 'api/v1',
    corsOrigins: [
      'http://localhost:3001',
      'http://localhost:8080',
      'http://localhost:5173',
    ],
    enableSwagger: true,
    enableDebugRoutes: true,
  },

  // Database Settings
  database: {
    type: 'postgres' as const,
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    database: process.env.DATABASE_NAME || 'usdc_wallet',
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    synchronize: false, // Use migrations even in dev
    logging: true,
    poolSize: 10,
    ssl: false,
  },

  // Redis Settings
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    tls: false,
  },

  // JWT Settings
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      'dev_jwt_refresh_secret_change_in_production',
    expiresIn: '1h', // Longer expiry for dev convenience
    refreshExpiresIn: '30d',
  },

  // Rate Limiting (relaxed for development)
  rateLimit: {
    ttl: 60,
    max: 1000, // High limit for testing
  },

  // Providers
  providers: {
    circle: {
      useMock: true,
      apiUrl: 'https://api.circle.com',
    },
    yellowCard: {
      useMock: true,
      apiUrl: 'https://sandbox.yellowcard.io',
    },
    sms: {
      provider: 'mock',
    },
    fcm: {
      useMock: true,
    },
  },

  // Logging
  logging: {
    level: 'debug',
    format: 'pretty',
    includeTimestamp: true,
    includeContext: true,
  },

  // Security (relaxed for development)
  security: {
    helmet: {
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    },
    hsts: false,
  },

  // Feature Flags
  features: {
    enableEmailVerification: false,
    enableSmsVerification: false,
    enableKycVerification: false,
    enableWebhookVerification: false,
  },
};

export default developmentConfig;
