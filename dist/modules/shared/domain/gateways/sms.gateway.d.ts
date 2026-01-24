export interface SendSmsRequest {
    to: string;
    message: string;
    templateId?: string;
    templateData?: Record<string, string>;
}
export interface SmsResponse {
    id: string;
    to: string;
    status: 'queued' | 'sent' | 'delivered' | 'failed';
    provider: string;
    createdAt: Date;
}
export interface ISmsGateway {
    readonly providerName: string;
    send(request: SendSmsRequest): Promise<SmsResponse>;
    sendOtp(phone: string, otp: string): Promise<SmsResponse>;
    getStatus(messageId: string): Promise<SmsResponse>;
}
export declare const SMS_GATEWAY: unique symbol;
