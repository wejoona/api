import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Device, DevicePlatform } from '../../domain/entities/device.entity';
import { DeviceRepository } from '../../domain/repositories/device.repository';
import { SessionService } from '../../../session/application/services';
import { DeviceService } from './device.service';

describe('DeviceService', () => {
  let service: DeviceService;
  let repository: jest.Mocked<DeviceRepository>;
  let sessionService: jest.Mocked<
    Pick<
      SessionService,
      | 'attachLatestActiveSessionToDevice'
      | 'revokeSessionsByDevice'
      | 'revokeAllSessions'
    >
  >;

  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const otherUserId = '550e8400-e29b-41d4-a716-446655440001';
  const deviceId = '550e8400-e29b-41d4-a716-446655440321';

  function createDevice(
    overrides: Partial<Parameters<typeof Device.reconstitute>[0]> = {},
  ) {
    return Device.reconstitute({
      id: deviceId,
      userId,
      deviceIdentifier: 'device-123',
      brand: 'Apple',
      model: 'iPhone 17',
      os: 'iOS',
      osVersion: '18.0',
      appVersion: '1.0.0',
      platform: DevicePlatform.IOS,
      fcmToken: null,
      isTrusted: false,
      trustedAt: null,
      isActive: true,
      lastLoginAt: new Date('2026-06-04T09:00:00.000Z'),
      lastIpAddress: '127.0.0.1',
      loginCount: 1,
      publicKeyJwk: null,
      deviceName: null,
      metadata: null,
      createdAt: new Date('2026-06-04T08:00:00.000Z'),
      updatedAt: new Date('2026-06-04T09:00:00.000Z'),
      ...overrides,
    });
  }

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByUserIdAndIdentifier: jest.fn(),
      findByUserId: jest.fn(),
      findActiveByUserId: jest.fn(),
      findByFcmToken: jest.fn(),
      save: jest.fn(async (device) => device),
      delete: jest.fn(),
      deactivateAllForUser: jest.fn(),
      countActiveDevices: jest.fn(),
    } as unknown as jest.Mocked<DeviceRepository>;

    sessionService = {
      attachLatestActiveSessionToDevice: jest.fn().mockResolvedValue(true),
      revokeSessionsByDevice: jest.fn().mockResolvedValue(1),
      revokeAllSessions: jest.fn().mockResolvedValue(2),
    };

    service = new DeviceService(
      repository,
      sessionService as unknown as SessionService,
    );
  });

  it('registers a new device once and links the current session', async () => {
    repository.findByUserIdAndIdentifier.mockResolvedValue(null);

    const result = await service.registerDevice({
      userId,
      deviceIdentifier: 'device-123',
      brand: 'Apple',
      model: 'iPhone 17',
      platform: DevicePlatform.IOS,
      appVersion: '1.2.3',
      ipAddress: '127.0.0.1',
    });

    expect(result.id).toBeDefined();
    expect(result.loginCount).toBe(1);
    expect(result.isActive).toBe(true);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(
      sessionService.attachLatestActiveSessionToDevice,
    ).toHaveBeenCalledWith(userId, result.id);
  });

  it('updates an existing device instead of creating a duplicate', async () => {
    const existing = createDevice({ isActive: false });
    repository.findByUserIdAndIdentifier.mockResolvedValue(existing);

    const result = await service.registerDevice({
      userId,
      deviceIdentifier: 'device-123',
      appVersion: '1.2.3',
      fcmToken: 'fcm-token-123',
      publicKeyJwk: { kty: 'EC', crv: 'P-256' },
      deviceName: 'Ben iPhone',
      ipAddress: '10.0.0.1',
    });

    expect(result.id).toBe(deviceId);
    expect(result.isActive).toBe(true);
    expect(result.loginCount).toBe(2);
    expect(result.lastIpAddress).toBe('10.0.0.1');
    expect(result.appVersion).toBe('1.2.3');
    expect(result.fcmToken).toBe('fcm-token-123');
    expect(result.publicKeyJwk).toEqual({ kty: 'EC', crv: 'P-256' });
    expect(result.deviceName).toBe('Ben iPhone');
    expect(repository.save).toHaveBeenCalledWith(existing);
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('does not save when revoking another user device', async () => {
    repository.findById.mockResolvedValue(
      createDevice({ userId: otherUserId }),
    );

    await expect(service.revokeDevice(userId, deviceId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(repository.save).not.toHaveBeenCalled();
    expect(sessionService.revokeSessionsByDevice).not.toHaveBeenCalled();
  });

  it('returns not found when revoking a missing device', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.revokeDevice(userId, deviceId)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(repository.save).not.toHaveBeenCalled();
    expect(sessionService.revokeSessionsByDevice).not.toHaveBeenCalled();
  });

  it('keeps repeated revocation stable for an already inactive device', async () => {
    const inactive = createDevice({ isActive: false });
    repository.findById.mockResolvedValue(inactive);

    await service.revokeDevice(userId, deviceId);

    expect(inactive.isActive).toBe(false);
    expect(repository.save).toHaveBeenCalledWith(inactive);
    expect(sessionService.revokeSessionsByDevice).toHaveBeenCalledWith(
      deviceId,
      'device_revoked',
    );
  });

  it('revokes all sessions when revoking all devices', async () => {
    repository.deactivateAllForUser.mockResolvedValue(3);

    const count = await service.revokeAllDevices(userId);

    expect(count).toBe(3);
    expect(repository.deactivateAllForUser).toHaveBeenCalledWith(userId);
    expect(sessionService.revokeAllSessions).toHaveBeenCalledWith(
      userId,
      'devices_revoked',
    );
  });
});
