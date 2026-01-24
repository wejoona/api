declare const _default: () => {
    port: number;
    apiPrefix: string;
    nodeEnv: string;
    database: {
        host: string;
        port: number;
        name: string;
        user: string;
        password: string;
        synchronize: boolean;
        logging: boolean;
    };
    redis: {
        host: string;
        port: number;
        password: string;
        db: number;
    };
    jwt: {
        secret: string;
        refreshSecret: string;
        expiresIn: string;
        refreshExpiresIn: string;
    };
    circle: {
        apiUrl: string;
        apiKey: string;
        entitySecretCipherText: string;
        walletSetId: string;
        defaultBlockchain: string;
        webhookSecret: string;
        useMock: boolean;
    };
    yellowCard: {
        apiUrl: string;
        apiKey: string;
        secretKey: string;
        webhookSecret: string;
        useMock: boolean;
    };
    blnk: {
        url: string;
        apiKey: string;
    };
    sms: {
        provider: string;
        apiKey: string;
        apiSecret: string;
        senderId: string;
    };
    otp: {
        expiresIn: number;
        length: number;
        maxAttempts: number;
    };
    rateLimit: {
        ttl: number;
        limit: number;
    };
    fcm: {
        projectId: string;
        clientEmail: string;
        privateKey: string;
        useMock: boolean;
    };
    app: {
        defaultCountry: string;
        defaultCurrency: string;
        supportedCountries: string[];
        supportedCurrencies: string[];
        minDepositAmount: number;
        maxDepositAmount: number;
        minTransferAmount: number;
        maxTransferAmount: number;
        internalTransferFeePercent: number;
        externalTransferFeePercent: number;
    };
};
export default _default;
