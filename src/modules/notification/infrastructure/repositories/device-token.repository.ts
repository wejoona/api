import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DeviceTokenOrmEntity,
  DevicePlatform,
} from '../orm-entities/device-token.orm-entity';

export const DEVICE_TOKEN_REPOSITORY = Symbol('DEVICE_TOKEN_REPOSITORY');

export interface IDeviceTokenRepository {
  findByUserId(userId: string): Promise<DeviceTokenOrmEntity[]>;
  findActiveByUserId(userId: string): Promise<DeviceTokenOrmEntity[]>;
  findByToken(token: string): Promise<DeviceTokenOrmEntity | null>;
  save(
    deviceToken: Partial<DeviceTokenOrmEntity>,
  ): Promise<DeviceTokenOrmEntity>;
  deactivateToken(token: string): Promise<void>;
  updateLastUsed(token: string): Promise<void>;
}

@Injectable()
export class DeviceTokenRepository implements IDeviceTokenRepository {
  constructor(
    @InjectRepository(DeviceTokenOrmEntity)
    private readonly repository: Repository<DeviceTokenOrmEntity>,
  ) {}

  async findByUserId(userId: string): Promise<DeviceTokenOrmEntity[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findActiveByUserId(userId: string): Promise<DeviceTokenOrmEntity[]> {
    return this.repository.find({
      where: { userId, isActive: true },
      order: { lastUsedAt: 'DESC' },
    });
  }

  async findByToken(token: string): Promise<DeviceTokenOrmEntity | null> {
    return this.repository.findOne({ where: { token } });
  }

  async save(
    deviceToken: Partial<DeviceTokenOrmEntity>,
  ): Promise<DeviceTokenOrmEntity> {
    const entity = this.repository.create(deviceToken);
    return this.repository.save(entity);
  }

  async upsert(
    userId: string,
    token: string,
    platform: DevicePlatform,
    deviceId?: string,
    deviceName?: string,
  ): Promise<DeviceTokenOrmEntity> {
    const existing = await this.repository.findOne({
      where: { userId, token },
    });

    if (existing) {
      existing.isActive = true;
      existing.lastUsedAt = new Date();
      existing.platform = platform;
      if (deviceId) existing.deviceId = deviceId;
      if (deviceName) existing.deviceName = deviceName;
      return this.repository.save(existing);
    }

    return this.save({
      userId,
      token,
      platform,
      deviceId,
      deviceName,
      isActive: true,
      lastUsedAt: new Date(),
    });
  }

  async deactivateToken(token: string): Promise<void> {
    await this.repository.update({ token }, { isActive: false });
  }

  async updateLastUsed(token: string): Promise<void> {
    await this.repository.update({ token }, { lastUsedAt: new Date() });
  }

  async deactivateAllForUser(userId: string): Promise<void> {
    await this.repository.update({ userId }, { isActive: false });
  }
}
