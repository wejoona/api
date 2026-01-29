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
        password: string | undefined;
        db: number;
    };
    jwt: {
        secret: string | undefined;
        refreshSecret: string | undefined;
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
        complianceEnabled: boolean;
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
        useDevOtp: boolean;
        devOtp: string;
        enableDebugLogging: boolean;
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
    novu: {
        apiKey: string;
        appId: string;
        enabled: boolean;
    };
    kyc: {
        autoApprovalEnabled: boolean;
        autoApprovalThreshold: number;
        autoRejectThreshold: number;
        provider: string;
    };
    aws: {
        region: string;
        accessKeyId: string;
        secretAccessKey: string;
        s3Bucket: string;
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
    compliance: {
        bceaoEnabled: boolean;
        largeTransactionThreshold: number;
        dailyReportTime: string;
        reportRetentionDays: number;
        autoFlagVelocityThreshold: number;
        structuringTimeWindow: number;
        crossBorderAlertEnabled: boolean;
        autoGenerateSar: boolean;
        sarAutoGenerationThreshold: number;
        bceaoApiUrl: string;
        bceaoApiKey: string;
        bceaoInstitutionId: string;
        xofToUsdcRate: number;
        pepScreeningEnabled: boolean;
        pepScreeningProvider: string;
    };
};
export default _default;
