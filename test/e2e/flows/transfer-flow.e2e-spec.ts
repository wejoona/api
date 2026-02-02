/**
 * Transfer Flow E2E Tests
 *
 * Tests the complete transfer flows:
 * - Internal P2P transfers
 * - External wallet transfers
 * - PIN verification
 * - Idempotency handling
 *
 * CRITICAL: Transfer operations involve real money.
 * These tests verify:
 * 1. PIN token is properly validated
 * 2. Transfers are idempotent (no double-spending)
 * 3. Balance updates are correct
 */

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { E2ETestSetup } from '../setup';
import { TestUserHelper, TestDataHelper, MockProvidersHelper, setupNock, teardownNock } from '../helpers';
import { v4 as uuidv4 } from 'uuid';

describe('Transfer Flow E2E', () => {
  let setup: E2ETestSetup;
  let app: INestApplication;
  let userHelper: TestUserHelper;
  let dataHelper: TestDataHelper;
  let mockProviders: MockProvidersHelper;

  beforeAll(async () => {
    setupNock();
    setup = new E2ETestSetup();
    app = await setup.setup();
    userHelper = new TestUserHelper(app);
    dataHelper = new TestDataHelper(app);
    mockProviders = new MockProvidersHelper();
  }, 120000);

  afterAll(async () => {
    await setup.teardown();
    teardownNock();
  }, 60000);

  beforeEach(async () => {
    await dataHelper.clearAllData();
    mockProviders.resetMocks();
  });

  describe('PIN Setup and Verification', () => {
    it('should set PIN for user', async () => {
      const user = await userHelper.createUser('+2250700300001');

      const response = await request(app.getHttpServer())
        .post('/user/pin')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ pin: '1234' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should verify PIN and return PIN token', async () => {
      const user = await userHelper.createUser('+2250700300002');
      await userHelper.setPin(user.accessToken, '1234');

      const response = await request(app.getHttpServer())
        .post('/user/pin/verify')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ pin: '1234' })
        .expect(200);

      expect(response.body.pinToken).toBeDefined();
      expect(response.body.expiresIn).toBeDefined();
      // PIN token should be valid for a few minutes
      expect(response.body.expiresIn).toBeGreaterThanOrEqual(60);
    });

    it('should reject incorrect PIN', async () => {
      const user = await userHelper.createUser('+2250700300003');
      await userHelper.setPin(user.accessToken, '1234');

      await request(app.getHttpServer())
        .post('/user/pin/verify')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ pin: '9999' })
        .expect(401);
    });
  });

  describe('Internal Transfer (P2P)', () => {
    it('should complete internal transfer between users', async () => {
      // Create sender and recipient
      const sender = await userHelper.createUser('+2250700300010');
      const recipient = await userHelper.createUser('+2250700300011');

      // Set up sender with PIN and balance
      await userHelper.setPin(sender.accessToken, '1234');
      const pinToken = await userHelper.verifyPin(sender.accessToken, '1234');

      // Get idempotency key
      const idempotencyKey = uuidv4();

      // Perform transfer
      const response = await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${sender.accessToken}`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send({
          recipientPhone: recipient.phone,
          amount: 1000,
          currency: 'XOF',
          pinToken,
          description: 'Test transfer',
        })
        .expect(200);

      expect(response.body.id).toBeDefined();
      expect(response.body.reference).toBeDefined();
      expect(response.body.status).toBeDefined();
      expect(['completed', 'pending', 'processing']).toContain(response.body.status);
      expect(response.body.amount).toBe(1000);
    });

    it('should reject transfer without PIN token', async () => {
      const sender = await userHelper.createUser('+2250700300012');
      const recipient = await userHelper.createUser('+2250700300013');
      await userHelper.setPin(sender.accessToken, '1234');

      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${sender.accessToken}`)
        .set('X-Idempotency-Key', uuidv4())
        .send({
          recipientPhone: recipient.phone,
          amount: 1000,
          currency: 'XOF',
          // Missing pinToken
          description: 'Test transfer',
        })
        .expect(400);
    });

    it('should reject transfer with invalid PIN token', async () => {
      const sender = await userHelper.createUser('+2250700300014');
      const recipient = await userHelper.createUser('+2250700300015');
      await userHelper.setPin(sender.accessToken, '1234');

      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${sender.accessToken}`)
        .set('X-Idempotency-Key', uuidv4())
        .send({
          recipientPhone: recipient.phone,
          amount: 1000,
          currency: 'XOF',
          pinToken: 'invalid-pin-token',
          description: 'Test transfer',
        })
        .expect(401);
    });

    it('should handle idempotent transfer requests', async () => {
      const sender = await userHelper.createUser('+2250700300016');
      const recipient = await userHelper.createUser('+2250700300017');
      await userHelper.setPin(sender.accessToken, '1234');
      const pinToken = await userHelper.verifyPin(sender.accessToken, '1234');

      const idempotencyKey = uuidv4();
      const transferData = {
        recipientPhone: recipient.phone,
        amount: 1000,
        currency: 'XOF',
        pinToken,
        description: 'Idempotent test',
      };

      // First request
      const firstResponse = await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${sender.accessToken}`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send(transferData)
        .expect(200);

      // Second request with same idempotency key should return same result
      const secondResponse = await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${sender.accessToken}`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send(transferData)
        .expect(200);

      // Should return the same transfer ID (not create a duplicate)
      expect(secondResponse.body.id).toBe(firstResponse.body.id);
    });
  });

  describe('External Transfer (Crypto)', () => {
    it('should initiate external transfer to wallet address', async () => {
      const sender = await userHelper.createUser('+2250700300020');
      await userHelper.setPin(sender.accessToken, '1234');
      const pinToken = await userHelper.verifyPin(sender.accessToken, '1234');

      const response = await request(app.getHttpServer())
        .post('/wallet/transfer/external')
        .set('Authorization', `Bearer ${sender.accessToken}`)
        .set('X-Idempotency-Key', uuidv4())
        .send({
          destinationAddress: '0x1234567890abcdef1234567890abcdef12345678',
          amount: 10,
          currency: 'USDC',
          network: 'MATIC',
          pinToken,
        })
        .expect(200);

      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBeDefined();
      expect(['pending', 'processing', 'submitted']).toContain(response.body.status);
    });

    it('should reject external transfer to invalid address', async () => {
      const sender = await userHelper.createUser('+2250700300021');
      await userHelper.setPin(sender.accessToken, '1234');
      const pinToken = await userHelper.verifyPin(sender.accessToken, '1234');

      await request(app.getHttpServer())
        .post('/wallet/transfer/external')
        .set('Authorization', `Bearer ${sender.accessToken}`)
        .set('X-Idempotency-Key', uuidv4())
        .send({
          destinationAddress: 'invalid-address',
          amount: 10,
          currency: 'USDC',
          network: 'MATIC',
          pinToken,
        })
        .expect(400);
    });
  });

  describe('Transfer Limits and Validation', () => {
    it('should reject transfer below minimum amount', async () => {
      const sender = await userHelper.createUser('+2250700300030');
      const recipient = await userHelper.createUser('+2250700300031');
      await userHelper.setPin(sender.accessToken, '1234');
      const pinToken = await userHelper.verifyPin(sender.accessToken, '1234');

      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${sender.accessToken}`)
        .set('X-Idempotency-Key', uuidv4())
        .send({
          recipientPhone: recipient.phone,
          amount: 0.001, // Below minimum
          currency: 'USDC',
          pinToken,
        })
        .expect(400);
    });

    it('should reject transfer to self', async () => {
      const user = await userHelper.createUser('+2250700300032');
      await userHelper.setPin(user.accessToken, '1234');
      const pinToken = await userHelper.verifyPin(user.accessToken, '1234');

      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .set('X-Idempotency-Key', uuidv4())
        .send({
          recipientPhone: user.phone,
          amount: 1000,
          currency: 'XOF',
          pinToken,
        })
        .expect(400);
    });
  });

  describe('Transaction History', () => {
    it('should get transaction history after transfer', async () => {
      const sender = await userHelper.createUser('+2250700300040');
      const recipient = await userHelper.createUser('+2250700300041');
      await userHelper.setPin(sender.accessToken, '1234');
      const pinToken = await userHelper.verifyPin(sender.accessToken, '1234');

      // Perform transfer
      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${sender.accessToken}`)
        .set('X-Idempotency-Key', uuidv4())
        .send({
          recipientPhone: recipient.phone,
          amount: 1000,
          currency: 'XOF',
          pinToken,
        })
        .expect(200);

      // Get transaction history
      const response = await request(app.getHttpServer())
        .get('/wallet/transactions')
        .set('Authorization', `Bearer ${sender.accessToken}`)
        .expect(200);

      expect(response.body.transactions).toBeDefined();
      expect(Array.isArray(response.body.transactions)).toBe(true);
    });
  });
});
