import { ConfigService } from '@nestjs/config';
import { IIdentityProvider, IWalletProvider, ITransferProvider } from '../interfaces';
export declare class CircleProviderFactory {
    private readonly configService;
    private readonly logger;
    private readonly useMock;
    constructor(configService: ConfigService);
    createIdentityProvider(): IIdentityProvider;
    createWalletProvider(): IWalletProvider;
    createTransferProvider(): ITransferProvider;
    isMockMode(): boolean;
}
export declare function createCircleIdentityProvider(factory: CircleProviderFactory): IIdentityProvider;
export declare function createCircleWalletProvider(factory: CircleProviderFactory): IWalletProvider;
export declare function createCircleTransferProvider(factory: CircleProviderFactory): ITransferProvider;
