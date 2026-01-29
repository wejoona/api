/**
 * Load test configuration
 */

export const config = {
  // Base URLs
  baseUrl: {
    dev: 'https://api-dev.joonapay.com',
    staging: 'https://api-staging.joonapay.com',
    prod: 'https://api.joonapay.com',
  },

  // Performance thresholds
  thresholds: {
    http: {
      p95: 500,  // 95th percentile < 500ms
      p99: 1000, // 99th percentile < 1000ms
      errorRate: 0.01, // < 1% errors
    },
    auth: {
      otpVerifyP95: 600,
      tokenRefreshP95: 300,
      successRate: 0.99,
    },
    wallet: {
      balanceP95: 400,
      balanceP99: 800,
      historyP95: 600,
      historyP99: 1200,
      successRate: 0.99,
      targetRps: 1000,
    },
    transfer: {
      internalP95: 1000,
      internalP99: 2000,
      externalP95: 1500,
      externalP99: 3000,
      successRate: 0.95, // Lower due to business logic failures
    },
    kyc: {
      submissionP95: 1500,
      uploadP95: 5000,
      uploadP99: 10000,
      uploadSuccessRate: 0.95,
      submissionSuccessRate: 0.98,
    },
  },

  // Test stages
  stages: {
    smoke: [
      { duration: '30s', target: 5 },
      { duration: '1m', target: 5 },
      { duration: '30s', target: 0 },
    ],
    load: [
      { duration: '2m', target: 100 },
      { duration: '5m', target: 100 },
      { duration: '2m', target: 0 },
    ],
    stress: [
      { duration: '2m', target: 100 },
      { duration: '5m', target: 500 },
      { duration: '3m', target: 1000 },
      { duration: '2m', target: 0 },
    ],
    ramp: [
      { duration: '1m', target: 50 },
      { duration: '2m', target: 100 },
      { duration: '2m', target: 200 },
      { duration: '2m', target: 100 },
      { duration: '1m', target: 0 },
    ],
    spike: [
      { duration: '2m', target: 100 },
      { duration: '2m', target: 100 },
      { duration: '10s', target: 1000 },
      { duration: '1m', target: 1000 },
      { duration: '10s', target: 100 },
      { duration: '3m', target: 100 },
    ],
  },

  // Test data
  testData: {
    countryCodes: ['CI', 'SN', 'ML', 'BF', 'NE', 'TG', 'BJ'],
    mobileMoneyProviders: ['orange_money', 'mtn', 'wave'],
    networks: ['base', 'ethereum', 'polygon'],
    documentTypes: ['national_id', 'passport', 'driver_license'],
    currencies: {
      crypto: 'USDC',
      fiat: {
        CI: 'XOF',
        SN: 'XOF',
        ML: 'XOF',
        BF: 'XOF',
        NE: 'XOF',
        TG: 'XOF',
        BJ: 'XOF',
      },
    },
  },

  // Rate limits
  rateLimits: {
    auth: {
      otpRequests: 5, // per phone per 15 min
      otpAttempts: 3, // per OTP
      loginAttempts: 5, // per phone per hour
    },
    transfers: {
      perMinute: 10,
      perHour: 100,
      perDay: 1000,
    },
    kyc: {
      submissionsPerDay: 3,
      documentUploadsPerDay: 5,
    },
  },

  // Realistic user behavior
  userBehavior: {
    thinkTime: {
      min: 1000,  // 1 second
      max: 5000,  // 5 seconds
    },
    sessionLength: {
      min: 60,    // 1 minute
      max: 600,   // 10 minutes
    },
    operationWeights: {
      checkBalance: 0.5,      // 50%
      viewTransactions: 0.25, // 25%
      sendMoney: 0.15,        // 15%
      viewProfile: 0.1,       // 10%
    },
  },

  // Timeouts
  timeouts: {
    http: 30000,      // 30 seconds
    upload: 120000,   // 2 minutes
    transfer: 60000,  // 1 minute
  },

  // Report settings
  reports: {
    directory: 'load-tests/reports',
    formats: ['html', 'json'],
    retention: 30, // days
  },
};

/**
 * Get base URL from environment or default to dev
 */
export function getBaseUrl() {
  const env = __ENV.ENVIRONMENT || 'dev';
  return __ENV.BASE_URL || config.baseUrl[env];
}

/**
 * Get test stages profile
 */
export function getStages(profile = 'ramp') {
  return config.stages[profile] || config.stages.ramp;
}

/**
 * Get thresholds for specific test type
 */
export function getThresholds(testType) {
  const common = {
    http_req_duration: [
      `p(95)<${config.thresholds.http.p95}`,
      `p(99)<${config.thresholds.http.p99}`,
    ],
    http_req_failed: [`rate<${config.thresholds.http.errorRate}`],
  };

  const specific = config.thresholds[testType] || {};

  return { ...common, ...specific };
}

export default config;
