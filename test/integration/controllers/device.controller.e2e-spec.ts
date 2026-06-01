/**
 * Device Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockDeviceService = {
  getActiveDevices: jest.fn(),
  registerDevice: jest.fn(),
  revokeDevice: jest.fn(),
  revokeAllDevices: jest.fn(),
  trustDevice: jest.fn(),
};

import { DeviceController } from '@modules/device/application/controllers/device.controller';
import { DeviceService } from '@modules/device/application/services/device.service';

const DEVICE_ID = '550e8400-e29b-41d4-a716-446655440321';

function createDevice() {
  return {
    id: DEVICE_ID,
    deviceIdentifier: 'device-123',
    displayName: 'iPhone',
    brand: 'Apple',
    model: 'iPhone 15',
    os: 'iOS',
    osVersion: '17.0',
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
    it('should list devices (200)', async () => {
      mockDeviceService.getActiveDevices.mockResolvedValue([]);
      await request(app.getHttpServer()).get('/api/v1/devices').expect(200);
    });
  });

  describe('POST /api/v1/devices/register', () => {
    it('should register device (201)', async () => {
      mockDeviceService.registerDevice.mockResolvedValue(createDevice());
      await request(app.getHttpServer())
        .post('/api/v1/devices/register')
        .send({
          deviceIdentifier: 'device-123',
          platform: 'ios',
          deviceName: 'iPhone',
        })
        .expect(201);
    });
  });

  describe('DELETE /api/v1/devices', () => {
    it('should revoke all devices (200)', async () => {
      mockDeviceService.revokeAllDevices.mockResolvedValue(1);
      await request(app.getHttpServer()).delete('/api/v1/devices').expect(200);
    });
  });
});
