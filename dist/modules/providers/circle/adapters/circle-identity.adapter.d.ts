import { ConfigService } from '@nestjs/config';
import { IIdentityProvider, CreateUserData, KycData, KycResult, IdentityProviderUser } from '../../interfaces';
export declare class CircleIdentityAdapter implements IIdentityProvider {
    private readonly configService;
    private readonly logger;
    private readonly config;
    readonly providerName = "circle";
    constructor(configService: ConfigService);
    createUser(data: CreateUserData): Promise<IdentityProviderUser>;
    getUser(providerId: string): Promise<IdentityProviderUser | null>;
    submitKyc(_providerId: string, _data: KycData): Promise<KycResult>;
    getKycStatus(_providerId: string): Promise<KycResult>;
    updateUser(providerId: string, _data: Partial<CreateUserData>): Promise<IdentityProviderUser>;
    updateUserStatus(providerId: string, status: 'ENABLED' | 'DISABLED'): Promise<IdentityProviderUser>;
}
