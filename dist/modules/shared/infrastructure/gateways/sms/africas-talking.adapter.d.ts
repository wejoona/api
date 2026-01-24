import { ConfigService } from '@nestjs/config';
import { ISmsGateway, SendSmsRequest, SmsResponse } from '../../../domain/gateways/sms.gateway';
export declare class AfricasTalkingSmsAdapter implements ISmsGateway {
    private readonly configService;
    private readonly logger;
    private readonly username;
    private readonly apiKey;
    private readonly senderId;
    private readonly baseUrl;
    readonly providerName = "africas_talking";
    constructor(configService: ConfigService);
    send(request: SendSmsRequest): Promise<SmsResponse>;
    sendOtp(phone: string, otp: string): Promise<SmsResponse>;
    getStatus(messageId: string): Promise<SmsResponse>;
    private mapATStatus;
}
