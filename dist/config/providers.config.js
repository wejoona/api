"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OFFRAMP_PROVIDER = exports.ONRAMP_PROVIDER = exports.TRANSFER_PROVIDER = exports.WALLET_PROVIDER = exports.IDENTITY_PROVIDER = exports.PUSH_GATEWAY = exports.SMS_GATEWAY = exports.PROVIDERS_CONFIG = void 0;
exports.getProvidersConfig = getProvidersConfig;
exports.isMockMode = isMockMode;
function getProvidersConfig() {
    return {
        sms: {
            provider: process.env.SMS_PROVIDER || 'mock',
            senderId: process.env.SMS_SENDER_ID || 'JoonaPay',
            twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
            twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
            twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
            atUsername: process.env.AT_USERNAME,
            atApiKey: process.env.AT_API_KEY,
        },
        push: {
            provider: determinePushProvider(),
            fcmProjectId: process.env.FCM_PROJECT_ID,
            fcmClientEmail: process.env.FCM_CLIENT_EMAIL,
            fcmPrivateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        circle: {
            useMock: process.env.CIRCLE_USE_MOCK === 'true' || !process.env.CIRCLE_API_KEY,
            apiUrl: process.env.CIRCLE_API_URL || 'https://api.circle.com',
            apiKey: process.env.CIRCLE_API_KEY || '',
            entitySecretCipherText: process.env.CIRCLE_ENTITY_SECRET || '',
            walletSetId: process.env.CIRCLE_WALLET_SET_ID || '',
            defaultBlockchain: process.env.CIRCLE_DEFAULT_BLOCKCHAIN || 'MATIC',
            webhookSecret: process.env.CIRCLE_WEBHOOK_SECRET || '',
        },
        yellowCard: {
            useMock: process.env.YELLOW_CARD_USE_MOCK === 'true' ||
                !process.env.YELLOW_CARD_API_KEY,
            apiUrl: process.env.YELLOW_CARD_API_URL || 'https://sandbox.yellowcard.io',
            apiKey: process.env.YELLOW_CARD_API_KEY || '',
            secretKey: process.env.YELLOW_CARD_SECRET_KEY || '',
            webhookSecret: process.env.YELLOW_CARD_WEBHOOK_SECRET || '',
        },
        blnk: {
            url: process.env.BLNK_URL || 'http://localhost:5001',
            apiKey: process.env.BLNK_API_KEY || '',
        },
    };
}
function determinePushProvider() {
    if (process.env.FCM_USE_MOCK === 'true') {
        return 'mock';
    }
    if (process.env.FCM_PROJECT_ID) {
        return 'fcm';
    }
    return 'mock';
}
exports.PROVIDERS_CONFIG = Symbol('PROVIDERS_CONFIG');
exports.SMS_GATEWAY = Symbol('SMS_GATEWAY');
exports.PUSH_GATEWAY = Symbol('PUSH_GATEWAY');
exports.IDENTITY_PROVIDER = Symbol('IDENTITY_PROVIDER');
exports.WALLET_PROVIDER = Symbol('WALLET_PROVIDER');
exports.TRANSFER_PROVIDER = Symbol('TRANSFER_PROVIDER');
exports.ONRAMP_PROVIDER = Symbol('ONRAMP_PROVIDER');
exports.OFFRAMP_PROVIDER = Symbol('OFFRAMP_PROVIDER');
function isMockMode(provider) {
    const config = getProvidersConfig();
    switch (provider) {
        case 'sms':
            return config.sms.provider === 'mock';
        case 'push':
            return config.push.provider === 'mock';
        case 'circle':
            return config.circle.useMock;
        case 'yellowCard':
            return config.yellowCard.useMock;
        default:
            return true;
    }
}
//# sourceMappingURL=providers.config.js.map