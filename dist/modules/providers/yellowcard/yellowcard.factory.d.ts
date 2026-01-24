import { ConfigService } from '@nestjs/config';
import { IOnRampProvider, IOffRampProvider } from '../interfaces';
export declare class YellowCardProviderFactory {
    private readonly configService;
    private readonly logger;
    private readonly useMock;
    constructor(configService: ConfigService);
    createOnRampProvider(): IOnRampProvider;
    createOffRampProvider(): IOffRampProvider;
    isMockMode(): boolean;
}
export declare function createYellowCardOnRampProvider(factory: YellowCardProviderFactory): IOnRampProvider;
export declare function createYellowCardOffRampProvider(factory: YellowCardProviderFactory): IOffRampProvider;
