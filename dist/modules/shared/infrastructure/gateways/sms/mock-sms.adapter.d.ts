import { ISmsGateway, SendSmsRequest, SmsResponse } from '../../../domain/gateways/sms.gateway';
export declare class MockSmsAdapter implements ISmsGateway {
    private readonly logger;
    private readonly mockData;
    readonly providerName = "mock";
    constructor();
    private loadMockData;
    send(request: SendSmsRequest): Promise<SmsResponse>;
    sendOtp(phone: string, otp: string): Promise<SmsResponse>;
    getStatus(messageId: string): Promise<SmsResponse>;
    getTemplate(templateName: string, variables?: Record<string, string>): string;
}
