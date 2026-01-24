import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISmsGateway } from '../../../../shared/domain/gateways/sms.gateway';
export declare class OtpService implements OnModuleDestroy {
    private readonly configService;
    private readonly smsGateway;
    private readonly logger;
    private readonly redis;
    private readonly otpExpiry;
    private readonly otpLength;
    private isRedisConnected;
    constructor(configService: ConfigService, smsGateway: ISmsGateway);
    onModuleDestroy(): Promise<void>;
    private ensureConnection;
    sendOtp(phone: string): Promise<void>;
    verifyOtp(phone: string, otp: string): Promise<boolean>;
    resendOtp(phone: string): Promise<void>;
    private generateOtp;
    private getKey;
}
