import { Injectable } from '@nestjs/common';
import {
  Device,
  DevicePlatform,
} from '../../domain/entities/device.entity';
import {
  DeviceOrmEntity,
  DevicePlatform as OrmPlatform,
} from '../orm-entities/device.orm-entity';

@Injectable()
export class DeviceMapper {
  toDomain(entity: DeviceOrmEntity): Device {
    return Device.reconstitute({
      id: entity.id,
      userId: entity.userId,
      deviceIdentifier: entity.deviceIdentifier,
      brand: entity.brand,
      model: entity.model,
      os: entity.os,
      osVersion: entity.osVersion,
      appVersion: entity.appVersion,
      platform: entity.platform as unknown as DevicePlatform,
      fcmToken: entity.fcmToken,
      isTrusted: entity.isTrusted,
      trustedAt: entity.trustedAt,
      isActive: entity.isActive,
      lastLoginAt: entity.lastLoginAt,
      lastIpAddress: entity.lastIpAddress,
      loginCount: entity.loginCount,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toOrmEntity(device: Device): DeviceOrmEntity {
    const entity = new DeviceOrmEntity();
    entity.id = device.id;
    entity.userId = device.userId;
    entity.deviceIdentifier = device.deviceIdentifier;
    entity.brand = device.brand;
    entity.model = device.model;
    entity.os = device.os;
    entity.osVersion = device.osVersion;
    entity.appVersion = device.appVersion;
    entity.platform = device.platform as unknown as OrmPlatform;
    entity.fcmToken = device.fcmToken;
    entity.isTrusted = device.isTrusted;
    entity.trustedAt = device.trustedAt;
    entity.isActive = device.isActive;
    entity.lastLoginAt = device.lastLoginAt;
    entity.lastIpAddress = device.lastIpAddress;
    entity.loginCount = device.loginCount;
    entity.metadata = device.metadata;
    return entity;
  }
}
