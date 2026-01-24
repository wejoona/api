export default () => ({
  // Server
  port: parseInt(process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database (PostgreSQL)
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    name: process.env.DATABASE_NAME || 'usdc_wallet',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    synchronize: process.env.DATABASE_SYNCHRONIZE === 'true', // Never true in production!
    logging: process.env.DATABASE_LOGGING === 'true',
  },

  // Cache (Redis)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },

  // Authentication - No fallback secrets for security
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m', // Shorter token lifetime
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Circle Provider (Identity, Wallets, Transfers)
  circle: {
    apiUrl: process.env.CIRCLE_API_URL || 'https://api.circle.com',
    apiKey: process.env.CIRCLE_API_KEY || '',
    entitySecretCipherText: process.env.CIRCLE_ENTITY_SECRET || '',
    walletSetId: process.env.CIRCLE_WALLET_SET_ID || '',
    defaultBlockchain: process.env.CIRCLE_DEFAULT_BLOCKCHAIN || 'MATIC', // Polygon for low fees
    webhookSecret: process.env.CIRCLE_WEBHOOK_SECRET || '',
    useMock:
      process.env.CIRCLE_USE_MOCK === 'true' || !process.env.CIRCLE_API_KEY,
  },

  // Yellow Card Provider (On-ramp/Off-ramp for Africa)
  yellowCard: {
    apiUrl: process.env.YELLOW_CARD_API_URL || 'https://sandbox.yellowcard.io',
    apiKey: process.env.YELLOW_CARD_API_KEY || '',
    secretKey: process.env.YELLOW_CARD_SECRET_KEY || '',
    webhookSecret: process.env.YELLOW_CARD_WEBHOOK_SECRET || '',
    useMock:
      process.env.YELLOW_CARD_USE_MOCK === 'true' ||
      !process.env.YELLOW_CARD_API_KEY,
  },

  // Blnk Finance (Ledger/Accounting)
  blnk: {
    url: process.env.BLNK_URL || 'http://localhost:5001',
    apiKey: process.env.BLNK_API_KEY || '',
  },

  // SMS Provider (for OTP)
  sms: {
    provider: process.env.SMS_PROVIDER || 'mock', // 'mock', 'twilio', 'africas_talking'
    apiKey: process.env.SMS_API_KEY || '',
    apiSecret: process.env.SMS_API_SECRET || '',
    senderId: process.env.SMS_SENDER_ID || 'JoonaPay',
  },

  // OTP Settings
  otp: {
    expiresIn: parseInt(process.env.OTP_EXPIRES_IN, 10) || 300, // 5 minutes
    length: parseInt(process.env.OTP_LENGTH, 10) || 6,
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS, 10) || 3,
  },

  // Rate Limiting
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL, 10) || 60, // seconds
    limit: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100, // requests per ttl
  },

  // Firebase Cloud Messaging (Push Notifications)
  fcm: {
    projectId: process.env.FCM_PROJECT_ID || '',
    clientEmail: process.env.FCM_CLIENT_EMAIL || '',
    privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    useMock: process.env.FCM_USE_MOCK === 'true' || !process.env.FCM_PROJECT_ID,
  },

  // App-specific settings
  app: {
    defaultCountry: process.env.DEFAULT_COUNTRY || 'CI', // Ivory Coast
    defaultCurrency: process.env.DEFAULT_CURRENCY || 'USDC',
    supportedCountries: (
      process.env.SUPPORTED_COUNTRIES || 'CI,SN,ML,BF,BJ,TG,NE,US'
    ).split(','),
    supportedCurrencies: (
      process.env.SUPPORTED_CURRENCIES || 'USDC,XOF,USD'
    ).split(','),
    minDepositAmount: parseFloat(process.env.MIN_DEPOSIT_AMOUNT) || 500, // in XOF
    maxDepositAmount: parseFloat(process.env.MAX_DEPOSIT_AMOUNT) || 1000000, // in XOF
    minTransferAmount: parseFloat(process.env.MIN_TRANSFER_AMOUNT) || 1, // in USDC
    maxTransferAmount: parseFloat(process.env.MAX_TRANSFER_AMOUNT) || 10000, // in USDC
    // P2P Transfer fees
    internalTransferFeePercent:
      parseFloat(process.env.INTERNAL_TRANSFER_FEE_PERCENT) || 0, // Free
    externalTransferFeePercent:
      parseFloat(process.env.EXTERNAL_TRANSFER_FEE_PERCENT) || 0.5,
  },
});
