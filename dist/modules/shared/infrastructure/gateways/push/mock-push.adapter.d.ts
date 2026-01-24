import { IPushGateway, SendPushRequest, SendMulticastPushRequest, PushResponse, MulticastPushResponse } from '../../../domain/gateways/push.gateway';
export declare class MockPushAdapter implements IPushGateway {
    private readonly logger;
    private readonly mockData;
    readonly providerName = "mock";
    constructor();
    private loadMockData;
    send(request: SendPushRequest): Promise<PushResponse>;
    sendMulticast(request: SendMulticastPushRequest): Promise<MulticastPushResponse>;
    subscribeToTopic(deviceToken: string, topic: string): Promise<boolean>;
    unsubscribeFromTopic(deviceToken: string, topic: string): Promise<boolean>;
    sendToTopic(topic: string, title: string, body: string, data?: Record<string, string>): Promise<{
        messageId: string;
    }>;
    getTemplate(templateName: string, variables?: Record<string, string>): {
        title: string;
        body: string;
        data: Record<string, string>;
    } | null;
}
