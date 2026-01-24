import { ConfigService } from '@nestjs/config';
import { ISmsGateway } from '../../../domain/gateways/sms.gateway';
import { SmsProviderType } from '../../../../../config/providers.config';
export declare class SmsFactory {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
    create(): ISmsGateway;
    getProviderType(): SmsProviderType;
    isMockMode(): boolean;
}
export declare function createSmsGateway(factory: SmsFactory): ISmsGateway;
