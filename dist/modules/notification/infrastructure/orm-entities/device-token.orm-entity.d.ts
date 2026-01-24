export type DevicePlatform = 'ios' | 'android' | 'web';
export declare class DeviceTokenOrmEntity {
    id: string;
    userId: string;
    token: string;
    platform: DevicePlatform;
    deviceId: string | null;
    deviceName: string | null;
    isActive: boolean;
    lastUsedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
