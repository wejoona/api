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
    // Compliance Engine - Address & Transaction Screening
    // Requires separate enablement from Circle (enterprise feature)
    // @see https://developers.circle.com/wallets/compliance-engine
    complianceEnabled: process.env.CIRCLE_COMPLIANCE_ENABLED === 'true',
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
    ledgerId: process.env.BLNK_LEDGER_ID || '',
    circleOmnibusBalanceId: process.env.BLNK_CIRCLE_OMNIBUS_BALANCE_ID || '',
    stellarOmnibusBalanceId: process.env.BLNK_STELLAR_OMNIBUS_BALANCE_ID || '',
    platformFeesBalanceId: process.env.BLNK_PLATFORM_FEES_BALANCE_ID || '',
    floatBalanceId: process.env.BLNK_FLOAT_BALANCE_ID || '',
  },

  // SMS Provider (for OTP)
  sms: {
    provider: process.env.SMS_PROVIDER || 'mock', // 'mock', 'twilio', 'africas_talking'
    apiKey: process.env.SMS_API_KEY || '',
    apiSecret: process.env.SMS_API_SECRET || '',
    senderId: process.env.SMS_SENDER_ID || 'JoonaPay',
  },

  // Twilio Configuration (SMS/Voice)
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_FROM_NUMBER || '',
    useMock:
      process.env.TWILIO_USE_MOCK === 'true' || !process.env.TWILIO_ACCOUNT_SID,
  },

  // OTP Settings
  otp: {
    expiresIn: parseInt(process.env.OTP_EXPIRES_IN, 10) || 300, // 5 minutes
    length: parseInt(process.env.OTP_LENGTH, 10) || 6,
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS, 10) || 3,
    // Dev mode: use fixed OTP for testing (default: 123456)
    useDevOtp:
      process.env.OTP_USE_DEV === 'true' ||
      process.env.NODE_ENV === 'development',
    devOtp: process.env.OTP_DEV_CODE || '123456',
    enableDebugLogging: process.env.OTP_DEBUG_LOGGING === 'true',
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

  // KYC Verification Settings
  kyc: {
    autoApprovalEnabled: process.env.KYC_AUTO_APPROVAL_ENABLED !== 'false', // Default true
    autoApprovalThreshold:
      parseInt(process.env.KYC_AUTO_APPROVAL_THRESHOLD, 10) || 80,
    autoRejectThreshold:
      parseInt(process.env.KYC_AUTO_REJECT_THRESHOLD, 10) || 40,
    provider: process.env.KYC_PROVIDER || 'mock', // 'mock', 'onfido', 'jumio', etc.
  },

  // AWS S3 (Document Storage)
  aws: {
    region: process.env.AWS_REGION || 'eu-west-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3Bucket: process.env.AWS_S3_BUCKET || 'joonapay-kyc-documents',
    useMock:
      process.env.AWS_USE_MOCK === 'true' || !process.env.AWS_ACCESS_KEY_ID,
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

  // BCEAO Compliance Engine
  // Central Bank of West African States regulatory compliance
  compliance: {
    // Master switch for BCEAO compliance features
    bceaoEnabled: process.env.BCEAO_COMPLIANCE_ENABLED !== 'false', // Default true for production

    // Large transaction reporting threshold (BCEAO requirement)
    // 1,000,000 XOF ≈ $1,600 USD
    largeTransactionThreshold:
      parseFloat(process.env.LARGE_TRANSACTION_THRESHOLD) || 1_000_000, // XOF

    // Daily report generation time (24-hour format, WAT timezone)
    dailyReportTime: process.env.DAILY_REPORT_TIME || '00:00',

    // Report retention period (BCEAO requires 7 years)
    reportRetentionDays:
      parseInt(process.env.REPORT_RETENTION_DAYS, 10) || 2555, // 7 years

    // AML/CFT velocity threshold (transactions per hour)
    // Exceeding this triggers velocity anomaly alert
    autoFlagVelocityThreshold:
      parseInt(process.env.AUTO_FLAG_VELOCITY_THRESHOLD, 10) || 5,

    // Structuring detection time window (hours)
    // Time period to aggregate transactions for structuring detection
    structuringTimeWindow:
      parseInt(process.env.STRUCTURING_TIME_WINDOW, 10) || 24,

    // Cross-border transaction alerts
    crossBorderAlertEnabled: process.env.CROSS_BORDER_ALERT_ENABLED !== 'false', // Default true

    // Auto-generate SARs for critical risk scores
    autoGenerateSar: process.env.AUTO_GENERATE_SAR === 'true', // Default false (manual review)

    // SAR auto-generation threshold (risk score)
    sarAutoGenerationThreshold:
      parseInt(process.env.SAR_AUTO_GENERATION_THRESHOLD, 10) || 85,

    // BCEAO API configuration (when available)
    bceaoApiUrl: process.env.BCEAO_API_URL || '',
    bceaoApiKey: process.env.BCEAO_API_KEY || '',
    bceaoInstitutionId: process.env.BCEAO_INSTITUTION_ID || '',

    // Exchange rate service (for XOF conversions)
    xofToUsdcRate: parseFloat(process.env.XOF_TO_USDC_RATE) || 600,

    // PEP screening (future integration)
    pepScreeningEnabled: process.env.PEP_SCREENING_ENABLED === 'true',
    pepScreeningProvider: process.env.PEP_SCREENING_PROVIDER || '', // 'world-check', 'dow-jones', etc.
  },

  // Bill Pay Service (standalone proxy)
  billPay: {
    baseUrl: process.env.BILL_PAY_BASE_URL || 'http://billpay:3400',
    apiKey: process.env.BILL_PAY_API_KEY || '',
  },

  // NTM (Notification Template Manager)
  ntm: {
    baseUrl: process.env.NTM_BASE_URL || 'http://ntm:3100',
    apiKey: process.env.NTM_API_KEY || '',
    useMock: process.env.NTM_USE_MOCK !== 'false',
  },

  // APM (Application Performance Monitoring)
  apm: {
    enabled: process.env.APM_ENABLED === 'true',
    provider: process.env.APM_PROVIDER || 'none', // 'newrelic', 'datadog', 'none'
    serviceName: process.env.APM_SERVICE_NAME || 'usdc-wallet',
    version: process.env.APP_VERSION || '1.0.0',
  },

  // Distributed Tracing (OpenTelemetry + Jaeger)
  tracing: {
    // Enable/disable distributed tracing
    enabled: process.env.TRACING_ENABLED !== 'false', // Default true in non-production

    // Service identification
    serviceName: process.env.TRACING_SERVICE_NAME || 'usdc-wallet-api',
    version:
      process.env.TRACING_SERVICE_VERSION || process.env.APP_VERSION || '1.0.0',

    // Jaeger collector endpoint (OTLP HTTP)
    // Default assumes Jaeger all-in-one running locally
    jaegerEndpoint:
      process.env.JAEGER_ENDPOINT || 'http://localhost:4318/v1/traces',

    // Sampling rate: 0.0 (none) to 1.0 (all)
    // In production, consider lower rate (e.g., 0.1 = 10%) to reduce overhead
    sampleRate: parseFloat(process.env.TRACING_SAMPLE_RATE) || 1.0,

    // Export traces to console for debugging (in addition to Jaeger)
    exportConsole: process.env.TRACING_EXPORT_CONSOLE === 'true',

    // Jaeger UI endpoint (for documentation/links)
    jaegerUiUrl: process.env.JAEGER_UI_URL || 'http://localhost:16686',
  },
});
