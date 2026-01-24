import { Repository } from 'typeorm';
import { DeviceTokenOrmEntity, DevicePlatform } from '../orm-entities/device-token.orm-entity';
export declare const DEVICE_TOKEN_REPOSITORY: unique symbol;
export interface IDeviceTokenRepository {
    findByUserId(userId: string): Promise<DeviceTokenOrmEntity[]>;
    findActiveByUserId(userId: string): Promise<DeviceTokenOrmEntity[]>;
    findByToken(token: string): Promise<DeviceTokenOrmEntity | null>;
    save(deviceToken: Partial<DeviceTokenOrmEntity>): Promise<DeviceTokenOrmEntity>;
    deactivateToken(token: string): Promise<void>;
    updateLastUsed(token: string): Promise<void>;
}
export declare class DeviceTokenRepository implements IDeviceTokenRepository {
    private readonly repository;
    constructor(repository: Repository<DeviceTokenOrmEntity>);
    findByUserId(userId: string): Promise<DeviceTokenOrmEntity[]>;
    findActiveByUserId(userId: string): Promise<DeviceTokenOrmEntity[]>;
    findByToken(token: string): Promise<DeviceTokenOrmEntity | null>;
    save(deviceToken: Partial<DeviceTokenOrmEntity>): Promise<DeviceTokenOrmEntity>;
    upsert(userId: string, token: string, platform: DevicePlatform, deviceId?: string, deviceName?: string): Promise<DeviceTokenOrmEntity>;
    deactivateToken(token: string): Promise<void>;
    updateLastUsed(token: string): Promise<void>;
    deactivateAllForUser(userId: string): Promise<void>;
}
