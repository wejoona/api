import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { KycVerifyController } from '@modules/kyc/application/controllers/kyc-verify.controller';
import { KycService } from '@modules/kyc/application/services/kyc.service';
import { VerifyHqService } from '@modules/shared/infrastructure/verify-hq';
import { ERROR_CODES } from '@common/constants/error-codes';

const mockVerifyHqService = {
  createLivenessSession: jest.fn(),
  submitChallenge: jest.fn(),
  submitReferenceSelfie: jest.fn(),
  submitDocumentVerification: jest.fn(),
  getUserVerifications: jest.fn(),
  getLivenessCheck: jest.fn(),
};

const mockKycService = {
  getStatus: jest.fn(),
};

describe('KycVerifyController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [KycVerifyController],
      providers: [
        { provide: VerifyHqService, useValue: mockVerifyHqService },
        { provide: KycService, useValue: mockKycService },
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

  it('returns explicit liveness dependency-unavailable state instead of hiding provider failure', async () => {
    mockVerifyHqService.getUserVerifications.mockRejectedValueOnce(
      new Error('verifyhq down'),
    );

    const res = await request(app.getHttpServer())
      .get('/api/v1/kyc/liveness/status')
      .expect(200);

    expect(res.body).toEqual({
      status: 'DEPENDENCY_UNAVAILABLE',
      provider: 'verifyhq',
      retryable: true,
    });
  });

  it('returns mobile-safe 503 when starting liveness and VerifyHQ is unavailable', async () => {
    mockVerifyHqService.createLivenessSession.mockRejectedValueOnce(
      new Error('verifyhq down'),
    );

    const res = await request(app.getHttpServer())
      .post('/api/v1/kyc/liveness/session')
      .expect(503);

    expect(res.body).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: ERROR_CODES.KYC_PROVIDER_UNAVAILABLE,
          message: 'KYC verification provider is temporarily unavailable',
        }),
      }),
    );
  });

  it('includes provider dependency-unavailable in full KYC verification status', async () => {
    mockKycService.getStatus.mockResolvedValueOnce({
      status: 'documents_pending',
      canResubmit: true,
    });
    mockVerifyHqService.getUserVerifications.mockRejectedValueOnce(
      new Error('verifyhq down'),
    );

    const res = await request(app.getHttpServer())
      .get('/api/v1/kyc/verification/status')
      .expect(200);

    expect(res.body).toEqual({
      kyc: {
        status: 'documents_pending',
        canResubmit: true,
      },
      verification: {
        status: 'DEPENDENCY_UNAVAILABLE',
        provider: 'verifyhq',
        retryable: true,
      },
    });
  });
});
