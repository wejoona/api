import { ConfigService } from '@nestjs/config';
import { ISmsGateway, SendSmsRequest, SmsResponse } from '../../../domain/gateways/sms.gateway';
export declare class TwilioSmsAdapter implements ISmsGateway {
    private readonly configService;
    private readonly logger;
    private readonly accountSid;
    private readonly authToken;
    private readonly fromNumber;
    private readonly baseUrl;
    readonly providerName = "twilio";
    constructor(configService: ConfigService);
    send(request: SendSmsRequest): Promise<SmsResponse>;
    sendOtp(phone: string, otp: string): Promise<SmsResponse>;
    getStatus(messageId: string): Promise<SmsResponse>;
    private mapTwilioStatus;
}
