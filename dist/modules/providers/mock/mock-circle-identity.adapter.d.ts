import { IIdentityProvider, CreateUserData, KycData, KycResult, IdentityProviderUser } from '../interfaces';
export declare class MockCircleIdentityAdapter implements IIdentityProvider {
    private readonly logger;
    private readonly mockData;
    readonly providerName = "circle_mock";
    constructor();
    private loadMockData;
    createUser(data: CreateUserData): Promise<IdentityProviderUser>;
    getUser(providerId: string): Promise<IdentityProviderUser | null>;
    submitKyc(_providerId: string, data: KycData): Promise<KycResult>;
    getKycStatus(_providerId: string): Promise<KycResult>;
    updateUser(providerId: string, _data: Partial<CreateUserData>): Promise<IdentityProviderUser>;
}
