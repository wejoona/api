"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => ({
    port: parseInt(process.env.PORT, 10) || 3000,
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    nodeEnv: process.env.NODE_ENV || 'development',
    database: {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
        name: process.env.DATABASE_NAME || 'usdc_wallet',
        user: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
        synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
        logging: process.env.DATABASE_LOGGING === 'true',
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB, 10) || 0,
    },
    jwt: {
        secret: process.env.JWT_SECRET,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    circle: {
        apiUrl: process.env.CIRCLE_API_URL || 'https://api.circle.com',
        apiKey: process.env.CIRCLE_API_KEY || '',
        entitySecretCipherText: process.env.CIRCLE_ENTITY_SECRET || '',
        walletSetId: process.env.CIRCLE_WALLET_SET_ID || '',
        defaultBlockchain: process.env.CIRCLE_DEFAULT_BLOCKCHAIN || 'MATIC',
        webhookSecret: process.env.CIRCLE_WEBHOOK_SECRET || '',
        useMock: process.env.CIRCLE_USE_MOCK === 'true' || !process.env.CIRCLE_API_KEY,
    },
    yellowCard: {
        apiUrl: process.env.YELLOW_CARD_API_URL || 'https://sandbox.yellowcard.io',
        apiKey: process.env.YELLOW_CARD_API_KEY || '',
        secretKey: process.env.YELLOW_CARD_SECRET_KEY || '',
        webhookSecret: process.env.YELLOW_CARD_WEBHOOK_SECRET || '',
        useMock: process.env.YELLOW_CARD_USE_MOCK === 'true' ||
            !process.env.YELLOW_CARD_API_KEY,
    },
    blnk: {
        url: process.env.BLNK_URL || 'http://localhost:5001',
        apiKey: process.env.BLNK_API_KEY || '',
    },
    sms: {
        provider: process.env.SMS_PROVIDER || 'mock',
        apiKey: process.env.SMS_API_KEY || '',
        apiSecret: process.env.SMS_API_SECRET || '',
        senderId: process.env.SMS_SENDER_ID || 'JoonaPay',
    },
    otp: {
        expiresIn: parseInt(process.env.OTP_EXPIRES_IN, 10) || 300,
        length: parseInt(process.env.OTP_LENGTH, 10) || 6,
        maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS, 10) || 3,
    },
    rateLimit: {
        ttl: parseInt(process.env.RATE_LIMIT_TTL, 10) || 60,
        limit: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    },
    fcm: {
        projectId: process.env.FCM_PROJECT_ID || '',
        clientEmail: process.env.FCM_CLIENT_EMAIL || '',
        privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
        useMock: process.env.FCM_USE_MOCK === 'true' || !process.env.FCM_PROJECT_ID,
    },
    app: {
        defaultCountry: process.env.DEFAULT_COUNTRY || 'CI',
        defaultCurrency: process.env.DEFAULT_CURRENCY || 'USDC',
        supportedCountries: (process.env.SUPPORTED_COUNTRIES || 'CI,SN,ML,BF,BJ,TG,NE,US').split(','),
        supportedCurrencies: (process.env.SUPPORTED_CURRENCIES || 'USDC,XOF,USD').split(','),
        minDepositAmount: parseFloat(process.env.MIN_DEPOSIT_AMOUNT) || 500,
        maxDepositAmount: parseFloat(process.env.MAX_DEPOSIT_AMOUNT) || 1000000,
        minTransferAmount: parseFloat(process.env.MIN_TRANSFER_AMOUNT) || 1,
        maxTransferAmount: parseFloat(process.env.MAX_TRANSFER_AMOUNT) || 10000,
        internalTransferFeePercent: parseFloat(process.env.INTERNAL_TRANSFER_FEE_PERCENT) || 0,
        externalTransferFeePercent: parseFloat(process.env.EXTERNAL_TRANSFER_FEE_PERCENT) || 0.5,
    },
});
//# sourceMappingURL=configuration.js.map