export type SmsProviderType = 'mock' | 'twilio' | 'africas_talking';
export type PushProviderType = 'mock' | 'fcm';
export interface SmsProviderConfig {
    provider: SmsProviderType;
    senderId: string;
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    twilioPhoneNumber?: string;
    atUsername?: string;
    atApiKey?: string;
}
export interface PushProviderConfig {
    provider: PushProviderType;
    fcmProjectId?: string;
    fcmClientEmail?: string;
    fcmPrivateKey?: string;
}
export interface CircleProviderConfig {
    useMock: boolean;
    apiUrl: string;
    apiKey: string;
    entitySecretCipherText: string;
    walletSetId: string;
    defaultBlockchain: string;
    webhookSecret: string;
}
export interface YellowCardProviderConfig {
    useMock: boolean;
    apiUrl: string;
    apiKey: string;
    secretKey: string;
    webhookSecret: string;
}
export interface BlnkProviderConfig {
    url: string;
    apiKey: string;
}
export interface ProvidersConfig {
    sms: SmsProviderConfig;
    push: PushProviderConfig;
    circle: CircleProviderConfig;
    yellowCard: YellowCardProviderConfig;
    blnk: BlnkProviderConfig;
}
export declare function getProvidersConfig(): ProvidersConfig;
export declare const PROVIDERS_CONFIG: unique symbol;
export declare const SMS_GATEWAY: unique symbol;
export declare const PUSH_GATEWAY: unique symbol;
export declare const IDENTITY_PROVIDER: unique symbol;
export declare const WALLET_PROVIDER: unique symbol;
export declare const TRANSFER_PROVIDER: unique symbol;
export declare const ONRAMP_PROVIDER: unique symbol;
export declare const OFFRAMP_PROVIDER: unique symbol;
export declare function isMockMode(provider: 'sms' | 'push' | 'circle' | 'yellowCard'): boolean;
