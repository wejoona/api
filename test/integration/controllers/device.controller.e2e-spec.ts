/**
 * Device Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockDeviceService = {
  getDevices: jest.fn(),
  registerDevice: jest.fn(),
  removeDevice: jest.fn(),
  trustDevice: jest.fn(),
};

import { DeviceController } from '@modules/device/application/controllers/device.controller';
import { DeviceService } from '@modules/device/application/services/device.service';

describe('DeviceController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [DeviceController],
      providers: [{ provide: DeviceService, useValue: mockDeviceService }],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /api/v1/devices', () => {
    it('should list devices (200)', async () => {
      mockDeviceService.getDevices.mockResolvedValue([]);
      await request(app.getHttpServer()).get('/api/v1/devices').expect(200);
    });
  });

  describe('POST /api/v1/devices', () => {
    it('should register device (201)', async () => {
      mockDeviceService.registerDevice.mockResolvedValue({ id: 'dev_123', name: 'iPhone' });
      await request(app.getHttpServer())
        .post('/api/v1/devices')
        .send({ deviceId: 'dev_123', platform: 'ios', name: 'iPhone' })
        .expect(201);
    });
  });

  describe('DELETE /api/v1/devices/:id', () => {
    it('should remove device (200)', async () => {
      mockDeviceService.removeDevice.mockResolvedValue({ success: true });
      await request(app.getHttpServer()).delete('/api/v1/devices/dev_123').expect(200);
    });
  });
});
