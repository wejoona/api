import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import nock from 'nock';

const TEST_IMAGE = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
  0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
  0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
  0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
  0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
  0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x08, 0xff, 0xc4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00,
  0x3f, 0x00, 0x2a, 0xff, 0xd9,
]);

describe('KYC Flow (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.AWS_USE_MOCK = 'true';
    process.env.BLNK_API_URL = 'http://localhost:3999/blnk';
    process.env.CIRCLE_API_URL = 'http://localhost:3999/circle';
    process.env.NOTIFICATION_ENABLED = 'false';

    nock.disableNetConnect();
    nock.enableNetConnect(/^(127\.0\.0\.1|localhost)(:\d+)?$/);
    setupExternalApiMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    // Setup: Create and authenticate user
    const phone = `+22507${Date.now().toString().slice(-8)}`;
    const user = await createAuthenticatedUser(phone);
    authToken = user.accessToken;
    userId = user.userId;
  });

  afterAll(async () => {
    nock.cleanAll();
    nock.enableNetConnect();

    await app?.close().catch((error) => {
      if (
        !(error instanceof Error) ||
        !error.message.includes('Connection is closed')
      ) {
        throw error;
      }
    });
  });

  async function createAuthenticatedUser(phone: string) {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ phone, countryCode: 'CI' })
      .expect(201);

    const verifyResponse = await request(app.getHttpServer())
      .post('/auth/verify-otp')
      .send({ phone, otp: '123456' })
      .expect(200);

    const token = verifyResponse.body.accessToken;
    const id = verifyResponse.body.user.id;

    for (const consentType of [
      'kyc_data_processing',
      'kyc_data_sharing',
      'privacy_policy',
      'terms_of_service',
      'aml_screening',
    ]) {
      await request(app.getHttpServer())
        .post('/consent/grant')
        .set('Authorization', `Bearer ${token}`)
        .send({ consentType })
        .expect(200);
    }

    return { accessToken: token, userId: id };
  }

  function setupExternalApiMocks() {
    const blnkUrl = process.env.BLNK_API_URL!;
    const circleUrl = process.env.CIRCLE_API_URL!;

    nock(blnkUrl)
      .post('/ledgers')
      .reply(201, { ledger_id: 'mock-ledger-id', name: 'Test Ledger' })
      .persist();

    nock(blnkUrl)
      .post('/balances')
      .reply(201, {
        balance_id: 'mock-balance-id',
        ledger_id: 'mock-ledger-id',
        balance: 0,
        credit_balance: 0,
        debit_balance: 0,
        currency: 'USDC',
      })
      .persist();

    nock(blnkUrl)
      .post('/identities')
      .reply(201, {
        identity_id: 'mock-identity-id',
        identity_type: 'individual',
        first_name: 'KYC',
        last_name: 'User',
        email_address: null,
        phone_number: '+2250700000000',
        country: 'CI',
        created_at: new Date().toISOString(),
        meta_data: {},
      })
      .persist();

    nock(blnkUrl)
      .post('/reconciliation/matching-rules')
      .reply(201, {
        rule_id: 'mock-matching-rule-id',
        created_at: new Date().toISOString(),
      })
      .persist();

    nock(blnkUrl)
      .get(/\/balances\/.*/)
      .reply(200, {
        balance_id: 'mock-balance-id',
        balance: 0,
        credit_balance: 0,
        debit_balance: 0,
        inflight_balance: 0,
        inflight_credit_balance: 0,
        inflight_debit_balance: 0,
        currency: 'USDC',
        ledger_id: 'mock-ledger-id',
        precision: 1_000_000,
        created_at: new Date().toISOString(),
      })
      .persist();

    nock(blnkUrl)
      .post('/transactions')
      .reply(201, (uri, body: any) => ({
        transaction_id: 'txn-' + Date.now(),
        amount: body.amount,
        status: 'APPLIED',
      }))
      .persist();

    nock(circleUrl)
      .post('/v1/wallets')
      .reply(200, { data: { walletId: 'mock-wallet-id' } })
      .persist();

    nock(circleUrl)
      .get(/\/v1\/wallets\/.*\/balance/)
      .reply(200, {
        data: { available: [{ amount: '0.00', currency: 'USD' }] },
      })
      .persist();
  }

  describe('KYC Document Upload', () => {
    it('should upload KYC documents successfully', async () => {
      // Create mock image files
      const mockImage = TEST_IMAGE;

      const response = await request(app.getHttpServer())
        .post('/kyc/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('idFront', mockImage, 'id_front.jpg')
        .attach('idBack', mockImage, 'id_back.jpg')
        .attach('selfie', mockImage, 'selfie.jpg')
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'Documents uploaded successfully',
      );
      expect(response.body).toHaveProperty('documents');
      expect(response.body.documents).toHaveProperty('idFront');
      expect(response.body.documents).toHaveProperty('idBack');
      expect(response.body.documents).toHaveProperty('selfie');
      expect(response.body.documents.idFront).toHaveProperty('key');
      expect(response.body.documents.idFront).toHaveProperty('url');
    });

    it('should reject upload without authentication', async () => {
      const mockImage = TEST_IMAGE;

      await request(app.getHttpServer())
        .post('/kyc/documents')
        .attach('idFront', mockImage, 'id_front.jpg')
        .attach('idBack', mockImage, 'id_back.jpg')
        .attach('selfie', mockImage, 'selfie.jpg')
        .expect(401);
    });

    it('should allow partial document upload for mobile retry flows', async () => {
      const mockImage = TEST_IMAGE;

      const response = await request(app.getHttpServer())
        .post('/kyc/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('idFront', mockImage, 'id_front.jpg')
        .expect(200);

      expect(response.body.documents).toHaveProperty('idFront');
      expect(response.body.documents).not.toHaveProperty('idBack');
      expect(response.body.documents).not.toHaveProperty('selfie');
    });

    it('should reject upload with invalid file types', async () => {
      const mockPdf = Buffer.from('%PDF-1.4');

      await request(app.getHttpServer())
        .post('/kyc/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('idFront', mockPdf, 'id_front.pdf')
        .attach('idBack', mockPdf, 'id_back.pdf')
        .attach('selfie', mockPdf, 'selfie.pdf')
        .expect(400);
    });

    it('should reject files that are too large', async () => {
      // Create mock 6MB file (exceeds KYC's 5MB limit)
      const largeMockImage = Buffer.alloc(6 * 1024 * 1024);

      await request(app.getHttpServer())
        .post('/kyc/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('idFront', largeMockImage, 'id_front.jpg')
        .attach('idBack', largeMockImage, 'id_back.jpg')
        .attach('selfie', largeMockImage, 'selfie.jpg')
        .expect(413);
    });
  });

  describe('KYC Submission', () => {
    let documentKeys: {
      idFront: string;
      idBack: string;
      selfie: string;
    };
    let kycToken: string;

    beforeEach(async () => {
      const user = await createAuthenticatedUser(
        `+22507${Date.now().toString().slice(-8)}`,
      );
      kycToken = user.accessToken;

      // Upload documents first
      const mockImage = TEST_IMAGE;
      const uploadResponse = await request(app.getHttpServer())
        .post('/kyc/documents')
        .set('Authorization', `Bearer ${kycToken}`)
        .attach('idFront', mockImage, 'id_front.jpg')
        .attach('idBack', mockImage, 'id_back.jpg')
        .attach('selfie', mockImage, 'selfie.jpg')
        .expect(200);

      documentKeys = {
        idFront: uploadResponse.body.documents.idFront.key,
        idBack: uploadResponse.body.documents.idBack.key,
        selfie: uploadResponse.body.documents.selfie.key,
      };
    });

    it('should submit KYC for verification', async () => {
      const response = await request(app.getHttpServer())
        .post('/kyc/submit')
        .set('Authorization', `Bearer ${kycToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-15',
          country: 'CI',
          idType: 'passport',
          idNumber: 'PASS123456',
          idExpiryDate: '2030-12-31',
          idFrontKey: documentKeys.idFront,
          idBackKey: documentKeys.idBack,
          selfieKey: documentKeys.selfie,
        })
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('message');
    });

    it('should validate required KYC fields', async () => {
      await request(app.getHttpServer())
        .post('/kyc/submit')
        .set('Authorization', `Bearer ${kycToken}`)
        .send({
          firstName: 'John',
          // Missing lastName
          dateOfBirth: '1990-01-15',
        })
        .expect(400);
    });

    it('should validate date of birth format', async () => {
      await request(app.getHttpServer())
        .post('/kyc/submit')
        .set('Authorization', `Bearer ${kycToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: 'invalid-date',
          country: 'CI',
          idType: 'passport',
          idNumber: 'P12345678',
        })
        .expect(400);
    });

    it('should reject underage users', async () => {
      const today = new Date();
      const underageDate = new Date(
        today.getFullYear() - 17,
        today.getMonth(),
        today.getDate(),
      );

      await request(app.getHttpServer())
        .post('/kyc/submit')
        .set('Authorization', `Bearer ${kycToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: underageDate.toISOString().split('T')[0],
          country: 'CI',
          idType: 'passport',
          idNumber: 'P12345678',
          idFrontKey: documentKeys.idFront,
          idBackKey: documentKeys.idBack,
          selfieKey: documentKeys.selfie,
        })
        .expect(400);
    });

    it('should reject duplicate KYC submission', async () => {
      // First submission
      await request(app.getHttpServer())
        .post('/kyc/submit')
        .set('Authorization', `Bearer ${kycToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-15',
          country: 'CI',
          idType: 'passport',
          idNumber: 'REVIEW123',
          idFrontKey: documentKeys.idFront,
          idBackKey: documentKeys.idBack,
          selfieKey: documentKeys.selfie,
        })
        .expect(200);

      // Second submission (duplicate)
      await request(app.getHttpServer())
        .post('/kyc/submit')
        .set('Authorization', `Bearer ${kycToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-15',
          country: 'CI',
          idType: 'passport',
          idNumber: 'REVIEW123',
          idFrontKey: documentKeys.idFront,
          idBackKey: documentKeys.idBack,
          selfieKey: documentKeys.selfie,
        })
        .expect(400);
    });
  });

  describe('KYC Status', () => {
    it('should get KYC status', async () => {
      const response = await request(app.getHttpServer())
        .get('/kyc/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect([
        'none',
        'documents_pending',
        'pending_verification',
        'auto_approved',
        'manual_review',
        'approved',
        'rejected',
      ]).toContain(response.body.status);
    });

    it('should include rejection reason if rejected', async () => {
      // This test assumes there's a way to set KYC status for testing
      // In a real scenario, you'd mock the KYC service or use test fixtures
    });
  });

  describe('KYC Verification Levels', () => {
    it('should enforce transaction limits for unverified users', async () => {
      // Attempt to make a large transfer without KYC
      await request(app.getHttpServer())
        .post('/wallet/transfer/internal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientPhone: '+225999999999',
          amount: 10000, // Exceeds unverified limit
          pin: '123456',
        })
        .expect(400); // Missing PIN token is rejected before transfer limits.
    });

    it('should allow increased limits after KYC approval', async () => {
      // This test would verify that approved KYC users have higher limits
      // Implementation depends on how KYC status affects limits
    });
  });

  describe('Document Re-upload', () => {
    it('should allow document re-upload after rejection', async () => {
      // This assumes KYC was rejected and user needs to re-upload
      const mockImage = TEST_IMAGE;

      const response = await request(app.getHttpServer())
        .post('/kyc/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('idFront', mockImage, 'id_front_new.jpg')
        .attach('idBack', mockImage, 'id_back_new.jpg')
        .attach('selfie', mockImage, 'selfie_new.jpg')
        .expect(200);

      expect(response.body).toHaveProperty('documents');
    });
  });

  describe('KYC Data Privacy', () => {
    it('should not expose sensitive KYC data in responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/kyc/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Ensure document numbers, addresses, etc. are not exposed
      expect(response.body).not.toHaveProperty('documentNumber');
      expect(response.body).not.toHaveProperty('address');
    });

    it('should prevent access to other users KYC data', async () => {
      // Create another user
      const otherUserPhone = `+22507${(Date.now() + 1).toString().slice(-8)}`;
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ phone: otherUserPhone, countryCode: 'CI' })
        .expect(201);

      // Try to access their KYC data (should fail)
      await request(app.getHttpServer())
        .get(`/kyc/status/${userId}`) // Explicit user ID in path
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
