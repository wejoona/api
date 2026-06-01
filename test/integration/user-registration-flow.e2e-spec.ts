import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { E2ETestSetup } from '../e2e/setup';
import {
  TestDataHelper,
  TestUserHelper,
  setupNock,
  teardownNock,
} from '../e2e/helpers';

describe('User Registration Flow (Integration)', () => {
  let setup: E2ETestSetup;
  let app: INestApplication;
  let dataHelper: TestDataHelper;
  let userHelper: TestUserHelper;

  const otp = '123456';

  jest.setTimeout(120000);

  beforeAll(async () => {
    setupNock();
    setup = new E2ETestSetup();
    app = await setup.setup();
    dataHelper = new TestDataHelper(app);
    userHelper = new TestUserHelper(app);
  }, 120000);

  afterAll(async () => {
    await setup.teardown();
    teardownNock();
  }, 60000);

  beforeEach(async () => {
    await dataHelper.clearAllData();
  });

  const uniquePhone = () => `+22507${Date.now().toString().slice(-8)}`;

  async function registerAndVerify(phone = uniquePhone()) {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ phone, countryCode: 'CI' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/verify-otp')
      .send({ phone, otp })
      .expect(200);

    return {
      phone,
      accessToken: response.body.accessToken as string,
      refreshToken: response.body.refreshToken as string,
      user: response.body.user,
    };
  }

  describe('Complete Registration Flow', () => {
    it('should complete the current registration journey', async () => {
      const { accessToken, user, phone } = await registerAndVerify();

      const profileResponse = await request(app.getHttpServer())
        .put('/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'Jean',
          lastName: 'Kouassi',
          email: 'jean.kouassi@example.com',
          username: `jean${Date.now().toString().slice(-6)}`,
        })
        .expect(200);

      expect(profileResponse.body.firstName).toBe('Jean');
      expect(profileResponse.body.lastName).toBe('Kouassi');
      expect(profileResponse.body.email).toBe('jean.kouassi@example.com');

      const walletResponse = await request(app.getHttpServer())
        .post('/wallet/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect((response) => {
          expect([200, 201]).toContain(response.status);
        });

      expect(walletResponse.body.userId).toBe(user.id);
      expect(walletResponse.body.status).toBe('active');

      await request(app.getHttpServer())
        .post('/wallet/pin/set')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ pin: '6829', confirmPin: '6829' })
        .expect(200);

      const verifyPinResponse = await request(app.getHttpServer())
        .post('/wallet/pin/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ pin: '6829' })
        .expect(200);

      expect(verifyPinResponse.body.pinToken).toBeDefined();
      expect(user.phone).toBe(phone);
    });

    it('should return an enumeration-safe response for duplicate phone registration', async () => {
      const phone = uniquePhone();

      await registerAndVerify(phone);

      const duplicateResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ phone, countryCode: 'CI' })
        .expect(201);

      expect(duplicateResponse.body.success).toBe(true);
      expect(duplicateResponse.body.expiresIn).toBeDefined();
    });

    it('should validate phone number format', async () => {
      for (const phone of ['12345', 'invalid', '+1', '', '00000000000000000000']) {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ phone, countryCode: 'CI' })
          .expect(400);
      }
    });

    it('should reject invalid OTP', async () => {
      const phone = uniquePhone();

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ phone, countryCode: 'CI' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({ phone, otp: '000000' })
        .expect(401);
    });
  });

  describe('Profile Completion', () => {
    it('should update profile fields', async () => {
      const { accessToken } = await registerAndVerify();

      const response = await request(app.getHttpServer())
        .put('/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'Aminata',
          lastName: 'Diallo',
          email: 'aminata@example.com',
        })
        .expect(200);

      expect(response.body.firstName).toBe('Aminata');
      expect(response.body.lastName).toBe('Diallo');
      expect(response.body.email).toBe('aminata@example.com');
    });

    it('should validate email and username format', async () => {
      const { accessToken } = await registerAndVerify();

      await request(app.getHttpServer())
        .put('/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'invalid-email' })
        .expect(400);

      for (const username of ['ab', 'a'.repeat(31), 'user@name']) {
        await request(app.getHttpServer())
          .put('/user/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ username })
          .expect(400);
      }
    });

    it('should reject duplicate username', async () => {
      const first = await registerAndVerify();
      const second = await registerAndVerify();
      const username = `unique${Date.now().toString().slice(-6)}`;

      await request(app.getHttpServer())
        .put('/user/profile')
        .set('Authorization', `Bearer ${first.accessToken}`)
        .send({ username })
        .expect(200);

      await request(app.getHttpServer())
        .put('/user/profile')
        .set('Authorization', `Bearer ${second.accessToken}`)
        .send({ username })
        .expect(409);
    });
  });

  describe('PIN Management', () => {
    it('should set and verify PIN', async () => {
      const { accessToken } = await registerAndVerify();

      await request(app.getHttpServer())
        .post('/wallet/pin/set')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ pin: '6829', confirmPin: '6829' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/wallet/pin/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ pin: '6829' })
        .expect(200);

      const verifyResponse = await request(app.getHttpServer())
        .post('/wallet/pin/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ pin: '6829' })
        .expect(200);

      expect(verifyResponse.body.pinToken).toBeDefined();
    });

    it('should reject invalid PIN payloads', async () => {
      const { accessToken } = await registerAndVerify();

      await request(app.getHttpServer())
        .post('/wallet/pin/set')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ pin: '6829', confirmPin: '7391' })
        .expect(400);

      for (const pin of ['123', '12345', 'abcd', '1a2b', '']) {
        await request(app.getHttpServer())
          .post('/wallet/pin/set')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ pin, confirmPin: pin })
          .expect(400);
      }
    });
  });

  describe('Token Management', () => {
    it('should refresh and revoke tokens', async () => {
      const user = await userHelper.createUser(uniquePhone());

      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: user.refreshToken })
        .expect(200);

      expect(refreshResponse.body.accessToken).toBeDefined();
      expect(refreshResponse.body.refreshToken).toBeDefined();

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ refreshToken: user.refreshToken })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: user.refreshToken })
        .expect(401);
    });
  });
});
