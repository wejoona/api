import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DeviceRepository } from '../../domain/repositories/device.repository';
import { Device, DevicePlatform } from '../../domain/entities/device.entity';
import { SessionService } from '../../../session/application/services';

export interface RegisterDeviceParams {
  userId: string;
  deviceIdentifier: string;
  brand?: string;
  model?: string;
  os?: string;
  osVersion?: string;
  appVersion?: string;
  platform?: DevicePlatform;
  fcmToken?: string;
  ipAddress?: string;
  publicKeyJwk?: Record<string, unknown>;
  deviceName?: string;
  metadata?: Record<string, unknown>;
}

export interface DeviceResponse {
  id: string;
  userId: string;
  deviceIdentifier: string;
  displayName: string;
  brand: string | null;
  model: string | null;
  os: string | null;
  osVersion: string | null;
  appVersion: string | null;
  platform: DevicePlatform;
  isTrusted: boolean;
  trustedAt: Date | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  lastIpAddress: string | null;
  loginCount: number;
  createdAt: Date;
}

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);

  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * Register or update a device for a user.
   * If device already exists, updates it and records the login.
   */
  async registerDevice(params: RegisterDeviceParams): Promise<Device> {
    const { userId, deviceIdentifier, ipAddress, ...deviceInfo } = params;

    // Check if device already exists for this user
    let device = await this.deviceRepository.findByUserIdAndIdentifier(
      userId,
      deviceIdentifier,
    );

    if (device) {
      // Update existing device
      device.recordLogin(ipAddress);
      if (deviceInfo.fcmToken) {
        device.updateFcmToken(deviceInfo.fcmToken);
      }
      if (deviceInfo.appVersion) {
        device.updateAppVersion(deviceInfo.appVersion);
      }
      if (deviceInfo.publicKeyJwk) {
        device.setPublicKey(deviceInfo.publicKeyJwk);
      }
      if (deviceInfo.deviceName) {
        device.rename(deviceInfo.deviceName);
      }
      device.activate(); // Re-activate if was deactivated

      const saved = await this.deviceRepository.save(device);
      await this.linkCurrentSession(userId, saved.id);
      this.logger.log(
        `Device ${saved.id} updated for user ${userId}, login #${saved.loginCount}`,
      );
      return saved;
    }

    // Create new device
    device = Device.create({
      userId,
      deviceIdentifier,
      ipAddress,
      ...deviceInfo,
    });

    const saved = await this.deviceRepository.save(device);
    await this.linkCurrentSession(userId, saved.id);
    this.logger.log(`New device ${saved.id} registered for user ${userId}`);
    return saved;
  }

  /**
   * Get all devices for a user.
   */
  async getUserDevices(userId: string): Promise<DeviceResponse[]> {
    const devices = await this.deviceRepository.findByUserId(userId);
    return devices.map(this.toResponse);
  }

  /**
   * Get active devices for a user.
   */
  async getActiveDevices(userId: string): Promise<DeviceResponse[]> {
    const devices = await this.deviceRepository.findActiveByUserId(userId);
    return devices.map(this.toResponse);
  }

  /**
   * Trust a device for a user.
   */
  async trustDevice(userId: string, deviceId: string): Promise<Device> {
    const device = await this.deviceRepository.findById(deviceId);

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (device.userId !== userId) {
      throw new ForbiddenException('Device does not belong to user');
    }

    device.trust();
    const saved = await this.deviceRepository.save(device);
    this.logger.log(`Device ${deviceId} trusted for user ${userId}`);
    return saved;
  }

  /**
   * Untrust a device.
   */
  async untrustDevice(userId: string, deviceId: string): Promise<Device> {
    const device = await this.deviceRepository.findById(deviceId);

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (device.userId !== userId) {
      throw new ForbiddenException('Device does not belong to user');
    }

    device.untrust();
    const saved = await this.deviceRepository.save(device);
    this.logger.log(`Device ${deviceId} untrusted for user ${userId}`);
    return saved;
  }

  /**
   * Revoke (deactivate) a device.
   */
  async revokeDevice(userId: string, deviceId: string): Promise<void> {
    const device = await this.deviceRepository.findById(deviceId);

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (device.userId !== userId) {
      throw new ForbiddenException('Device does not belong to user');
    }

    device.deactivate();
    await this.deviceRepository.save(device);
    await this.sessionService.revokeSessionsByDevice(
      deviceId,
      'device_revoked',
    );
    this.logger.log(`Device ${deviceId} revoked for user ${userId}`);
  }

  /**
   * Revoke all devices for a user (logout from all devices).
   */
  async revokeAllDevices(userId: string): Promise<number> {
    const count = await this.deviceRepository.deactivateAllForUser(userId);
    await this.sessionService.revokeAllSessions(userId, 'devices_revoked');
    this.logger.log(`Revoked ${count} devices for user ${userId}`);
    return count;
  }

  /**
   * Update FCM token for a device.
   */
  async updateFcmToken(
    userId: string,
    deviceIdentifier: string,
    fcmToken: string,
  ): Promise<Device | null> {
    const device = await this.deviceRepository.findByUserIdAndIdentifier(
      userId,
      deviceIdentifier,
    );

    if (!device) {
      return null;
    }

    device.updateFcmToken(fcmToken);
    return this.deviceRepository.save(device);
  }

  /**
   * Find device by FCM token (for push notifications).
   */
  async findByFcmToken(fcmToken: string): Promise<Device | null> {
    return this.deviceRepository.findByFcmToken(fcmToken);
  }

  /**
   * Count active devices for a user.
   */
  async countActiveDevices(userId: string): Promise<number> {
    return this.deviceRepository.countActiveDevices(userId);
  }

  /**
   * Register a public key (JWK) for a device.
   */
  async registerPublicKey(
    userId: string,
    deviceId: string,
    publicKeyJwk: Record<string, unknown>,
  ): Promise<Device> {
    const device = await this.deviceRepository.findById(deviceId);

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (device.userId !== userId) {
      throw new ForbiddenException('Device does not belong to user');
    }

    device.setPublicKey(publicKeyJwk);
    const saved = await this.deviceRepository.save(device);
    this.logger.log(`Public key registered for device ${deviceId}`);
    return saved;
  }

  /**
   * Rename a device.
   */
  async renameDevice(
    userId: string,
    deviceId: string,
    name: string,
  ): Promise<Device> {
    const device = await this.deviceRepository.findById(deviceId);

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (device.userId !== userId) {
      throw new ForbiddenException('Device does not belong to user');
    }

    device.rename(name);
    const saved = await this.deviceRepository.save(device);
    this.logger.log(`Device ${deviceId} renamed to "${name}"`);
    return saved;
  }

  private toResponse(device: Device): DeviceResponse {
    return {
      id: device.id,
      userId: device.userId,
      deviceIdentifier: device.deviceIdentifier,
      displayName: device.displayName,
      brand: device.brand,
      model: device.model,
      os: device.os,
      osVersion: device.osVersion,
      appVersion: device.appVersion,
      platform: device.platform,
      isTrusted: device.isTrusted,
      trustedAt: device.trustedAt,
      isActive: device.isActive,
      lastLoginAt: device.lastLoginAt,
      lastIpAddress: device.lastIpAddress,
      loginCount: device.loginCount,
      createdAt: device.createdAt,
    };
  }

  private async linkCurrentSession(
    userId: string,
    deviceId: string,
  ): Promise<void> {
    try {
      await this.sessionService.attachLatestActiveSessionToDevice(
        userId,
        deviceId,
      );
    } catch (error) {
      this.logger.warn(
        `Unable to link current session to device ${deviceId}: ${error.message}`,
      );
    }
  }
}
