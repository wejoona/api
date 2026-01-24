import { DeviceTokenRepository } from '@modules/notification/infrastructure/repositories/device-token.repository';
export interface RegisterDeviceTokenParams {
    userId: string;
    token: string;
    platform: 'ios' | 'android' | 'web';
    deviceId?: string;
    deviceName?: string;
}
export declare class RegisterDeviceTokenUseCase {
    private readonly deviceTokenRepository;
    private readonly logger;
    constructor(deviceTokenRepository: DeviceTokenRepository);
    execute(params: RegisterDeviceTokenParams): Promise<void>;
}
