/**
 * Whitelisted Address Controller Integration Tests
 *
 * Covers active mobile security/address routes.
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, TEST_USER } from '../setup/test-app';

const mockWhitelistedAddressService = {
  addAddress: jest.fn(),
  verifyAddress: jest.fn(),
  getAddresses: jest.fn(),
  getActiveAddresses: jest.fn(),
  checkAddress: jest.fn(),
  getAddressById: jest.fn(),
  updateLabel: jest.fn(),
  revokeAddress: jest.fn(),
  deleteAddress: jest.fn(),
};

import { WhitelistedAddressController } from '@modules/security/application/controllers/whitelisted-address.controller';
import { WhitelistedAddressService } from '@modules/security/application/services';
import { WhitelistedAddress } from '@modules/security/domain/entities';

describe('WhitelistedAddressController (e2e)', () => {
  let app: INestApplication;
  const addressValue = '0x1234567890abcdef1234567890abcdef12345678';
  const whitelistedAddress = WhitelistedAddress.create({
    userId: TEST_USER.id,
    address: addressValue,
    label: 'Hardware Wallet',
    addressType: 'external',
    network: 'ethereum',
  });

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [WhitelistedAddressController],
      providers: [
        {
          provide: WhitelistedAddressService,
          useValue: mockWhitelistedAddressService,
        },
      ],
    });
    app = result.app;
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/security/addresses', () => {
    it('should list whitelisted addresses (200)', async () => {
      mockWhitelistedAddressService.getAddresses.mockResolvedValue([
        whitelistedAddress,
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/security/addresses')
        .expect(200);

      expect(res.body.total).toBe(1);
      expect(res.body.addresses[0]).toMatchObject({
        address: addressValue,
        label: 'Hardware Wallet',
        addressType: 'external',
        network: 'ethereum',
      });
      expect(mockWhitelistedAddressService.getAddresses).toHaveBeenCalledWith(
        TEST_USER.id,
      );
    });
  });

  describe('POST /api/v1/security/addresses', () => {
    it('should add a whitelisted address (201)', async () => {
      mockWhitelistedAddressService.addAddress.mockResolvedValue(
        whitelistedAddress,
      );

      await request(app.getHttpServer())
        .post('/api/v1/security/addresses')
        .send({
          address: addressValue,
          label: 'Hardware Wallet',
          addressType: 'external',
          network: 'ethereum',
        })
        .expect(201);

      expect(mockWhitelistedAddressService.addAddress).toHaveBeenCalledWith({
        userId: TEST_USER.id,
        address: addressValue,
        label: 'Hardware Wallet',
        addressType: 'external',
        network: 'ethereum',
      });
    });

    it('should reject invalid address payloads', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/security/addresses')
        .send({ address: '0x1', label: '' })
        .expect(400);
    });
  });

  describe('GET /api/v1/security/addresses/check', () => {
    it('should check address whitelist status before id route matching (200)', async () => {
      mockWhitelistedAddressService.checkAddress.mockResolvedValue({
        isWhitelisted: true,
        isNew: false,
        hoursUntilTrusted: 0,
        requiresDelay: false,
        instantLimit: 1000,
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/security/addresses/check?address=${addressValue}`)
        .expect(200);

      expect(res.body).toMatchObject({
        isWhitelisted: true,
        requiresDelay: false,
      });
      expect(mockWhitelistedAddressService.checkAddress).toHaveBeenCalledWith(
        TEST_USER.id,
        addressValue,
      );
    });
  });

  describe('POST /api/v1/security/addresses/:id/revoke', () => {
    it('should revoke a whitelisted address (200)', async () => {
      mockWhitelistedAddressService.revokeAddress.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer())
        .post('/api/v1/security/addresses/address-123/revoke')
        .expect(200);

      expect(res.body).toEqual({
        success: true,
        message: 'Address revoked successfully',
      });
      expect(mockWhitelistedAddressService.revokeAddress).toHaveBeenCalledWith(
        'address-123',
        TEST_USER.id,
      );
    });
  });
});
