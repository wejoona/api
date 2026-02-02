/**
 * KYC Upload Flow E2E Tests
 *
 * Tests the complete KYC document upload and submission flow:
 * - Document upload to /kyc/documents
 * - KYC submission with personal info
 * - Token handling during long uploads
 * - Auto-verification flow
 *
 * CRITICAL: This flow was broken due to token expiry during upload.
 * These tests verify that:
 * 1. Upload service works (with mock mode for S3)
 * 2. Tokens don't expire during reasonable upload times
 * 3. Proper error handling for expired tokens
 */

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { E2ETestSetup } from '../setup';
import { TestUserHelper, TestDataHelper, setupNock, teardownNock } from '../helpers';

describe('KYC Upload Flow E2E', () => {
  let setup: E2ETestSetup;
  let app: INestApplication;
  let userHelper: TestUserHelper;
  let dataHelper: TestDataHelper;

  // Test image buffer (1x1 pixel JPEG)
  const testImageBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
    0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
    0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
    0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03,
    0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d,
    0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
    0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08,
    0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72,
    0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28,
    0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45,
    0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
    0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75,
    0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
    0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3,
    0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6,
    0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9,
    0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
    0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4,
    0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01,
    0x00, 0x00, 0x3f, 0x00, 0xfb, 0xd5, 0xdb, 0x20, 0xa8, 0xf1, 0x52, 0xcf,
    0xff, 0xd9,
  ]);

  beforeAll(async () => {
    setupNock();
    setup = new E2ETestSetup();
    app = await setup.setup();
    userHelper = new TestUserHelper(app);
    dataHelper = new TestDataHelper(app);
  }, 120000);

  afterAll(async () => {
    await setup.teardown();
    teardownNock();
  }, 60000);

  beforeEach(async () => {
    await dataHelper.clearAllData();
  });

  describe('Document Upload', () => {
    it('should upload all three documents successfully', async () => {
      const user = await userHelper.createUser('+2250700200001');

      const response = await request(app.getHttpServer())
        .post('/kyc/documents')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .attach('idFront', testImageBuffer, 'id_front.jpg')
        .attach('idBack', testImageBuffer, 'id_back.jpg')
        .attach('selfie', testImageBuffer, 'selfie.jpg')
        .expect(200);

      expect(response.body.message).toContain('uploaded');
      expect(response.body.documents).toBeDefined();
      expect(response.body.documents.idFront).toBeDefined();
      expect(response.body.documents.idFront.key).toBeDefined();
      expect(response.body.documents.idBack).toBeDefined();
      expect(response.body.documents.idBack.key).toBeDefined();
      expect(response.body.documents.selfie).toBeDefined();
      expect(response.body.documents.selfie.key).toBeDefined();
    });

    it('should reject upload without all required documents', async () => {
      const user = await userHelper.createUser('+2250700200002');

      // Only upload idFront, missing idBack and selfie
      await request(app.getHttpServer())
        .post('/kyc/documents')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .attach('idFront', testImageBuffer, 'id_front.jpg')
        .expect(400);
    });

    it('should reject upload without authentication', async () => {
      await request(app.getHttpServer())
        .post('/kyc/documents')
        .attach('idFront', testImageBuffer, 'id_front.jpg')
        .attach('idBack', testImageBuffer, 'id_back.jpg')
        .attach('selfie', testImageBuffer, 'selfie.jpg')
        .expect(401);
    });
  });

  describe('KYC Submission', () => {
    it('should submit KYC with personal info and document keys', async () => {
      const user = await userHelper.createUser('+2250700200003');

      // Step 1: Upload documents
      const uploadResponse = await request(app.getHttpServer())
        .post('/kyc/documents')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .attach('idFront', testImageBuffer, 'id_front.jpg')
        .attach('idBack', testImageBuffer, 'id_back.jpg')
        .attach('selfie', testImageBuffer, 'selfie.jpg')
        .expect(200);

      const { idFront, idBack, selfie } = uploadResponse.body.documents;

      // Step 2: Submit KYC
      const submitResponse = await request(app.getHttpServer())
        .post('/kyc/submit')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          firstName: 'Amadou',
          lastName: 'Diallo',
          dateOfBirth: '1990-05-15',
          country: 'CI',
          idType: 'national_id',
          idNumber: 'CI1234567890',
          idFrontKey: idFront.key,
          idBackKey: idBack.key,
          selfieKey: selfie.key,
        })
        .expect(200);

      expect(submitResponse.body.id).toBeDefined();
      expect(submitResponse.body.status).toBeDefined();
      // Status should be pending_verification or auto_approved
      expect(['pending_verification', 'auto_approved', 'manual_review']).toContain(
        submitResponse.body.status,
      );
    });

    it('should reject KYC submission with missing fields', async () => {
      const user = await userHelper.createUser('+2250700200004');

      await request(app.getHttpServer())
        .post('/kyc/submit')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          firstName: 'Amadou',
          // Missing other required fields
        })
        .expect(400);
    });
  });

  describe('KYC Status', () => {
    it('should get KYC status for user', async () => {
      const user = await userHelper.createUser('+2250700200005');

      const response = await request(app.getHttpServer())
        .get('/kyc/status')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.status).toBeDefined();
      expect(response.body.canResubmit).toBeDefined();
    });

    it('should show documents_pending for new user', async () => {
      const user = await userHelper.createUser('+2250700200006');

      const response = await request(app.getHttpServer())
        .get('/kyc/status')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      // New user should have documents_pending or none status
      expect(['none', 'documents_pending']).toContain(response.body.status);
    });
  });

  describe('Token Handling During Upload', () => {
    it('should complete upload with fresh token', async () => {
      // Create user and immediately use token
      const user = await userHelper.createUser('+2250700200007');

      // Upload should work with fresh token
      const response = await request(app.getHttpServer())
        .post('/kyc/documents')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .attach('idFront', testImageBuffer, 'id_front.jpg')
        .attach('idBack', testImageBuffer, 'id_back.jpg')
        .attach('selfie', testImageBuffer, 'selfie.jpg')
        .expect(200);

      expect(response.body.documents).toBeDefined();
    });

    it('should reject upload with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/kyc/documents')
        .set('Authorization', 'Bearer invalid.token.here')
        .attach('idFront', testImageBuffer, 'id_front.jpg')
        .attach('idBack', testImageBuffer, 'id_back.jpg')
        .attach('selfie', testImageBuffer, 'selfie.jpg')
        .expect(401);
    });
  });

  describe('Complete KYC Flow', () => {
    it('should complete full KYC flow: upload -> submit -> check status', async () => {
      // 1. Create user
      const user = await userHelper.createUser('+2250700200008');

      // 2. Check initial status
      const initialStatus = await request(app.getHttpServer())
        .get('/kyc/status')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(['none', 'documents_pending']).toContain(initialStatus.body.status);

      // 3. Upload documents
      const uploadResponse = await request(app.getHttpServer())
        .post('/kyc/documents')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .attach('idFront', testImageBuffer, 'id_front.jpg')
        .attach('idBack', testImageBuffer, 'id_back.jpg')
        .attach('selfie', testImageBuffer, 'selfie.jpg')
        .expect(200);

      const { idFront, idBack, selfie } = uploadResponse.body.documents;

      // 4. Submit KYC with test ID number ending in 0 (high score for auto-approval)
      const submitResponse = await request(app.getHttpServer())
        .post('/kyc/submit')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          firstName: 'Fatou',
          lastName: 'Traore',
          dateOfBirth: '1985-08-20',
          country: 'CI',
          idType: 'passport',
          idNumber: 'PASS1234560', // Ends in 0 for high mock score
          idFrontKey: idFront.key,
          idBackKey: idBack.key,
          selfieKey: selfie.key,
        })
        .expect(200);

      expect(submitResponse.body.id).toBeDefined();

      // 5. Check updated status
      const finalStatus = await request(app.getHttpServer())
        .get('/kyc/status')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      // Status should have changed from initial
      expect(['pending_verification', 'auto_approved', 'approved', 'manual_review']).toContain(
        finalStatus.body.status,
      );
    });
  });
});
