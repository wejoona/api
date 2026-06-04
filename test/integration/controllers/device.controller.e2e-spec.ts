/**
 * Device Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockDeviceService = {
  getActiveDevices: jest.fn(),
  getUserDevices: jest.fn(),
  registerDevice: jest.fn(),
  updateFcmToken: jest.fn(),
  revokeDevice: jest.fn(),
  revokeAllDevices: jest.fn(),
  trustDevice: jest.fn(),
  untrustDevice: jest.fn(),
  renameDevice: jest.fn(),
  registerPublicKey: jest.fn(),
};

import { DeviceController } from '@modules/device/application/controllers/device.controller';
import { DeviceService } from '@modules/device/application/services/device.service';

const DEVICE_ID = '550e8400-e29b-41d4-a716-446655440321';

function createDevice() {
  return {
    id: DEVICE_ID,
    userId: '550e8400-e29b-41d4-a716-446655440000',
    deviceIdentifier: 'device-123',
    displayName: 'iPhone',
    brand: 'Apple',
    model: 'iPhone 15',
    os: 'iOS',
    osVersion: '17.0',
    appVersion: '1.2.3',
    platform: 'ios',
    isTrusted: false,
    trustedAt: null,
    isActive: true,
    lastLoginAt: null,
    lastIpAddress: null,
    loginCount: 1,
    createdAt: new Date(),
  };
}

describe('DeviceController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [DeviceController],
      providers: [{ provide: DeviceService, useValue: mockDeviceService }],
    });
    app = result.app;
  });

  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/devices', () => {
    it('should list mobile-compatible devices', async () => {
      mockDeviceService.getActiveDevices.mockResolvedValue([createDevice()]);
      const res = await request(app.getHttpServer())
        .get('/api/v1/devices')
        .expect(200);

      expect(res.body).toEqual([
        expect.objectContaining({
          id: DEVICE_ID,
          userId: '550e8400-e29b-41d4-a716-446655440000',
          deviceIdentifier: 'device-123',
          displayName: 'iPhone',
          appVersion: '1.2.3',
          platform: 'ios',
          isTrusted: false,
          isActive: true,
          loginCount: 1,
        }),
      ]);
    });
  });

  describe('POST /api/v1/devices/register', () => {
    it('should register device with app version and return mobile fields', async () => {
      mockDeviceService.registerDevice.mockResolvedValue(createDevice());
      const res = await request(app.getHttpServer())
        .post('/api/v1/devices/register')
        .send({
          deviceIdentifier: 'device-123',
          platform: 'ios',
          deviceName: 'iPhone',
          appVersion: '1.2.3',
        })
        .expect(201);

      expect(mockDeviceService.registerDevice).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '550e8400-e29b-41d4-a716-446655440000',
          deviceIdentifier: 'device-123',
          platform: 'ios',
          deviceName: 'iPhone',
          appVersion: '1.2.3',
        }),
      );
      expect(res.body).toEqual(
        expect.objectContaining({
          id: DEVICE_ID,
          userId: '550e8400-e29b-41d4-a716-446655440000',
          appVersion: '1.2.3',
        }),
      );
    });
  });

  describe('DELETE /api/v1/devices', () => {
    it('should revoke all devices and return action count', async () => {
      mockDeviceService.revokeAllDevices.mockResolvedValue(1);
      const res = await request(app.getHttpServer())
        .delete('/api/v1/devices')
        .expect(200);

      expect(res.body).toEqual({
        success: true,
        message: '1 device(s) revoked successfully',
        count: 1,
      });
    });
  });

  describe('POST /api/v1/devices/:id/rename', () => {
    it('should pass the mobile rename payload through', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/devices/${DEVICE_ID}/rename`)
        .send({ name: 'Ben iPhone' })
        .expect(201);

      expect(mockDeviceService.renameDevice).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        DEVICE_ID,
        'Ben iPhone',
      );
    });
  });
});
