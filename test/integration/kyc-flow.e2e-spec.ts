import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('KYC Flow (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
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
    const phone = `+225${Date.now()}`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        phone,
        email: 'kyc-test@example.com',
        name: 'KYC Test User',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone })
      .expect(200);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/verify-otp')
      .send({
        phone,
        otp: '123456',
      })
      .expect(200);

    authToken = loginResponse.body.accessToken;
    userId = loginResponse.body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('KYC Document Upload', () => {
    it('should upload KYC documents successfully', async () => {
      // Create mock image files
      const mockImage = Buffer.from('mock-image-data');

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
      const mockImage = Buffer.from('mock-image-data');

      await request(app.getHttpServer())
        .post('/kyc/documents')
        .attach('idFront', mockImage, 'id_front.jpg')
        .attach('idBack', mockImage, 'id_back.jpg')
        .attach('selfie', mockImage, 'selfie.jpg')
        .expect(401);
    });

    it('should reject upload with missing documents', async () => {
      const mockImage = Buffer.from('mock-image-data');

      // Missing selfie
      await request(app.getHttpServer())
        .post('/kyc/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('idFront', mockImage, 'id_front.jpg')
        .attach('idBack', mockImage, 'id_back.jpg')
        .expect(400);
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
      // Create mock 6MB file (exceeds 5MB limit)
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

    beforeEach(async () => {
      // Upload documents first
      const mockImage = Buffer.from('mock-image-data');
      const uploadResponse = await request(app.getHttpServer())
        .post('/kyc/documents')
        .set('Authorization', `Bearer ${authToken}`)
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
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-15',
          nationality: 'CI',
          documentType: 'passport',
          documentNumber: 'P12345678',
          documentExpiry: '2030-12-31',
          address: {
            street: '123 Main Street',
            city: 'Abidjan',
            state: 'Abidjan',
            postalCode: '00225',
            country: 'CI',
          },
          idFrontKey: documentKeys.idFront,
          idBackKey: documentKeys.idBack,
          selfieKey: documentKeys.selfie,
        })
        .expect(201);

      expect(response.body).toHaveProperty('status', 'pending');
      expect(response.body).toHaveProperty('submittedAt');
    });

    it('should validate required KYC fields', async () => {
      await request(app.getHttpServer())
        .post('/kyc/submit')
        .set('Authorization', `Bearer ${authToken}`)
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
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: 'invalid-date',
          nationality: 'CI',
          documentType: 'passport',
          documentNumber: 'P12345678',
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
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: underageDate.toISOString().split('T')[0],
          nationality: 'CI',
          documentType: 'passport',
          documentNumber: 'P12345678',
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
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-15',
          nationality: 'CI',
          documentType: 'passport',
          documentNumber: 'P12345678',
          idFrontKey: documentKeys.idFront,
          idBackKey: documentKeys.idBack,
          selfieKey: documentKeys.selfie,
        })
        .expect(201);

      // Second submission (duplicate)
      await request(app.getHttpServer())
        .post('/kyc/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-15',
          nationality: 'CI',
          documentType: 'passport',
          documentNumber: 'P12345678',
          idFrontKey: documentKeys.idFront,
          idBackKey: documentKeys.idBack,
          selfieKey: documentKeys.selfie,
        })
        .expect(409); // Conflict
    });
  });

  describe('KYC Status', () => {
    it('should get KYC status', async () => {
      const response = await request(app.getHttpServer())
        .get('/kyc/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(['none', 'pending', 'approved', 'rejected']).toContain(
        response.body.status,
      );
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
        .expect(403); // Forbidden due to KYC requirement
    });

    it('should allow increased limits after KYC approval', async () => {
      // This test would verify that approved KYC users have higher limits
      // Implementation depends on how KYC status affects limits
    });
  });

  describe('Document Re-upload', () => {
    it('should allow document re-upload after rejection', async () => {
      // This assumes KYC was rejected and user needs to re-upload
      const mockImage = Buffer.from('mock-image-data');

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
      const otherUserPhone = `+225${Date.now() + 1}`;
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: otherUserPhone,
          email: 'other@example.com',
          name: 'Other User',
        })
        .expect(201);

      // Try to access their KYC data (should fail)
      await request(app.getHttpServer())
        .get(`/kyc/status/${userId}`) // Explicit user ID in path
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });
});
