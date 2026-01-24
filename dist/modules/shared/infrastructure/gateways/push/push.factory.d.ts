import { ConfigService } from '@nestjs/config';
import { IPushGateway } from '../../../domain/gateways/push.gateway';
import { PushProviderType } from '../../../../../config/providers.config';
export declare class PushFactory {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
    create(): IPushGateway;
    getProviderType(): PushProviderType;
    isMockMode(): boolean;
}
export declare function createPushGateway(factory: PushFactory): IPushGateway;
