"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envValidationSchema = void 0;
const Joi = require("joi");
exports.envValidationSchema = Joi.object({
    NODE_ENV: Joi.string()
        .valid('development', 'production', 'test')
        .default('development'),
    PORT: Joi.number().port().default(3000),
    API_PREFIX: Joi.string().default('api/v1'),
    DATABASE_HOST: Joi.string().default('localhost'),
    DATABASE_PORT: Joi.number().port().default(5432),
    DATABASE_NAME: Joi.string().default('usdc_wallet'),
    DATABASE_USER: Joi.string().default('postgres'),
    DATABASE_PASSWORD: Joi.string().default('postgres'),
    DATABASE_SYNCHRONIZE: Joi.boolean().default(false),
    DATABASE_LOGGING: Joi.boolean().default(true),
    REDIS_HOST: Joi.string().default('localhost'),
    REDIS_PORT: Joi.number().port().default(6379),
    REDIS_PASSWORD: Joi.string().allow('').optional(),
    REDIS_DB: Joi.number().integer().min(0).default(0),
    JWT_SECRET: Joi.string().required().messages({
        'any.required': 'JWT_SECRET is required for authentication',
    }),
    JWT_EXPIRES_IN: Joi.string().default('7d'),
    JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
    CIRCLE_API_URL: Joi.string().uri().default('https://api.circle.com'),
    CIRCLE_API_KEY: Joi.string().allow('').optional(),
    CIRCLE_ENTITY_SECRET: Joi.string().allow('').optional(),
    CIRCLE_WALLET_SET_ID: Joi.string().allow('').optional(),
    CIRCLE_DEFAULT_BLOCKCHAIN: Joi.string()
        .valid('MATIC', 'ETH', 'SOL', 'AVAX')
        .default('MATIC'),
    CIRCLE_WEBHOOK_SECRET: Joi.string().allow('').optional(),
    CIRCLE_USE_MOCK: Joi.boolean().default(true),
    YELLOW_CARD_API_URL: Joi.string()
        .uri()
        .default('https://sandbox.yellowcard.io'),
    YELLOW_CARD_API_KEY: Joi.string().allow('').optional(),
    YELLOW_CARD_SECRET_KEY: Joi.string().allow('').optional(),
    YELLOW_CARD_WEBHOOK_SECRET: Joi.string().allow('').optional(),
    YELLOW_CARD_USE_MOCK: Joi.boolean().default(true),
    BLNK_URL: Joi.string().uri().default('http://localhost:5001'),
    BLNK_API_KEY: Joi.string().allow('').optional(),
    SMS_PROVIDER: Joi.string()
        .valid('mock', 'twilio', 'africas_talking')
        .default('mock'),
    SMS_API_KEY: Joi.string().allow('').optional(),
    SMS_API_SECRET: Joi.string().allow('').optional(),
    SMS_SENDER_ID: Joi.string().default('JoonaPay'),
    OTP_EXPIRES_IN: Joi.number().integer().positive().default(300),
    OTP_LENGTH: Joi.number().integer().min(4).max(8).default(6),
    OTP_MAX_ATTEMPTS: Joi.number().integer().positive().default(3),
    RATE_LIMIT_TTL: Joi.number().integer().positive().default(60),
    RATE_LIMIT_MAX: Joi.number().integer().positive().default(100),
    FCM_PROJECT_ID: Joi.string().allow('').optional(),
    FCM_CLIENT_EMAIL: Joi.string().email().allow('').optional(),
    FCM_PRIVATE_KEY: Joi.string().allow('').optional(),
    FCM_USE_MOCK: Joi.boolean().default(true),
    DEFAULT_COUNTRY: Joi.string().length(2).default('CI'),
    DEFAULT_CURRENCY: Joi.string().default('USDC'),
    SUPPORTED_COUNTRIES: Joi.string().default('CI,SN,ML,BF,BJ,TG,NE,US'),
    SUPPORTED_CURRENCIES: Joi.string().default('USDC,XOF,USD'),
    MIN_DEPOSIT_AMOUNT: Joi.number().positive().default(500),
    MAX_DEPOSIT_AMOUNT: Joi.number().positive().default(1000000),
    MIN_TRANSFER_AMOUNT: Joi.number().positive().default(1),
    MAX_TRANSFER_AMOUNT: Joi.number().positive().default(10000),
    INTERNAL_TRANSFER_FEE_PERCENT: Joi.number().min(0).max(100).default(0),
    EXTERNAL_TRANSFER_FEE_PERCENT: Joi.number().min(0).max(100).default(0.5),
});
//# sourceMappingURL=env.validation.js.map