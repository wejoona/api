import { ConfigService } from '@nestjs/config';
import { IPushGateway, SendPushRequest, SendMulticastPushRequest, PushResponse, MulticastPushResponse } from '../../../domain/gateways/push.gateway';
export declare class FcmPushAdapter implements IPushGateway {
    private readonly configService;
    private readonly logger;
    private readonly projectId;
    private readonly clientEmail;
    private readonly privateKey;
    private readonly baseUrl;
    private accessToken;
    private tokenExpiry;
    readonly providerName = "fcm";
    constructor(configService: ConfigService);
    send(request: SendPushRequest): Promise<PushResponse>;
    sendMulticast(request: SendMulticastPushRequest): Promise<MulticastPushResponse>;
    subscribeToTopic(deviceToken: string, topic: string): Promise<boolean>;
    unsubscribeFromTopic(deviceToken: string, topic: string): Promise<boolean>;
    sendToTopic(topic: string, title: string, body: string, data?: Record<string, string>): Promise<{
        messageId: string;
    }>;
    private getAccessToken;
    private signJwt;
}
