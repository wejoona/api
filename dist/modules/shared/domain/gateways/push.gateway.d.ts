export interface SendPushRequest {
    deviceToken: string;
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
    sound?: string;
    badge?: number;
    priority?: 'high' | 'normal';
}
export interface SendMulticastPushRequest {
    deviceTokens: string[];
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
    sound?: string;
    priority?: 'high' | 'normal';
}
export interface PushResponse {
    id: string;
    success: boolean;
    deviceToken: string;
    failureReason?: string;
    provider: string;
    createdAt: Date;
}
export interface MulticastPushResponse {
    successCount: number;
    failureCount: number;
    responses: PushResponse[];
}
export interface IPushGateway {
    readonly providerName: string;
    send(request: SendPushRequest): Promise<PushResponse>;
    sendMulticast(request: SendMulticastPushRequest): Promise<MulticastPushResponse>;
    subscribeToTopic(deviceToken: string, topic: string): Promise<boolean>;
    unsubscribeFromTopic(deviceToken: string, topic: string): Promise<boolean>;
    sendToTopic(topic: string, title: string, body: string, data?: Record<string, string>): Promise<{
        messageId: string;
    }>;
}
export declare const PUSH_GATEWAY: unique symbol;
