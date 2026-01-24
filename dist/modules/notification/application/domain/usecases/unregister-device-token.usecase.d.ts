import { DeviceTokenRepository } from '@modules/notification/infrastructure/repositories/device-token.repository';
export interface UnregisterDeviceTokenParams {
    token: string;
}
export declare class UnregisterDeviceTokenUseCase {
    private readonly deviceTokenRepository;
    private readonly logger;
    constructor(deviceTokenRepository: DeviceTokenRepository);
    execute(params: UnregisterDeviceTokenParams): Promise<void>;
}
