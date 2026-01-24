export declare class RegisterDeviceTokenRequest {
    token: string;
    platform: 'ios' | 'android' | 'web';
    deviceId?: string;
    deviceName?: string;
}
