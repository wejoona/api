import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { KycUploadController } from './kyc-upload.controller';
import { UploadService } from '../../../upload/application/services/upload.service';
import { JwtUser } from '../../../../common/guards';

describe('KycUploadController', () => {
  let controller: KycUploadController;
  let uploadService: jest.Mocked<Pick<UploadService, 'uploadDocument'>>;

  const mockUser: JwtUser = {
    id: 'test-user-id',
    phone: '+2250700000000',
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'idFront',
    originalname: 'id_front.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024 * 500,
    buffer: Buffer.from('mock-file-content'),
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  };

  const mockUploadResult = {
    key: 'kyc/test-user-id/id_front-1706198400000.jpg',
    bucket: 'korido-test-uploads',
    url: 'https://s3.amazonaws.com/bucket/kyc/test-user-id/id_front-1706198400000.jpg',
    contentType: 'image/jpeg',
    size: 245678,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KycUploadController],
      providers: [
        {
          provide: UploadService,
          useValue: {
            uploadDocument: jest.fn().mockResolvedValue(mockUploadResult),
          },
        },
      ],
    }).compile();

    controller = module.get<KycUploadController>(KycUploadController);
    uploadService = module.get(UploadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('uploads all provided KYC documents in one request', async () => {
    const idFrontFile = { ...mockFile, fieldname: 'idFront' };
    const idBackFile = { ...mockFile, fieldname: 'idBack' };
    const selfieFile = { ...mockFile, fieldname: 'selfie' };

    uploadService.uploadDocument
      .mockResolvedValueOnce({
        ...mockUploadResult,
        key: 'kyc/test-user-id/id_front-1706198400000.jpg',
      })
      .mockResolvedValueOnce({
        ...mockUploadResult,
        key: 'kyc/test-user-id/id_back-1706198400000.jpg',
      })
      .mockResolvedValueOnce({
        ...mockUploadResult,
        key: 'kyc/test-user-id/selfie-1706198400000.jpg',
      });

    const result = await controller.uploadDocuments(mockUser, {
      idFront: [idFrontFile],
      idBack: [idBackFile],
      selfie: [selfieFile],
    });

    expect(result.message).toBe('Documents uploaded successfully');
    expect(result.documents).toEqual({
      idFront: expect.objectContaining({
        key: 'kyc/test-user-id/id_front-1706198400000.jpg',
      }),
      idBack: expect.objectContaining({
        key: 'kyc/test-user-id/id_back-1706198400000.jpg',
      }),
      selfie: expect.objectContaining({
        key: 'kyc/test-user-id/selfie-1706198400000.jpg',
      }),
    });
    expect(uploadService.uploadDocument).toHaveBeenCalledWith({
      userId: mockUser.id,
      type: 'id_front',
      file: idFrontFile,
    });
    expect(uploadService.uploadDocument).toHaveBeenCalledWith({
      userId: mockUser.id,
      type: 'id_back',
      file: idBackFile,
    });
    expect(uploadService.uploadDocument).toHaveBeenCalledWith({
      userId: mockUser.id,
      type: 'selfie',
      file: selfieFile,
    });
  });

  it('allows incremental single-document upload', async () => {
    const result = await controller.uploadDocuments(mockUser, {
      idFront: [mockFile],
    });

    expect(result.documents).toEqual({
      idFront: {
        key: mockUploadResult.key,
        url: mockUploadResult.url,
        size: mockUploadResult.size,
      },
    });
    expect(uploadService.uploadDocument).toHaveBeenCalledTimes(1);
  });

  it('supports optional liveness video upload', async () => {
    const videoFile = {
      ...mockFile,
      fieldname: 'video',
      originalname: 'liveness.mp4',
      mimetype: 'video/mp4',
    };

    const result = await controller.uploadDocuments(mockUser, {
      video: [videoFile],
    });

    expect(result.documents).toHaveProperty('video');
    expect(uploadService.uploadDocument).toHaveBeenCalledWith({
      userId: mockUser.id,
      type: 'video',
      file: videoFile,
    });
  });

  it('throws when no supported files are present', async () => {
    await expect(controller.uploadDocuments(mockUser, {})).rejects.toThrow(
      BadRequestException,
    );
    expect(uploadService.uploadDocument).not.toHaveBeenCalled();
  });

  it('uploads documents in parallel', async () => {
    uploadService.uploadDocument.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(mockUploadResult), 100);
        }),
    );

    const startTime = Date.now();
    await controller.uploadDocuments(mockUser, {
      idFront: [mockFile],
      idBack: [mockFile],
      selfie: [mockFile],
    });
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(250);
    expect(uploadService.uploadDocument).toHaveBeenCalledTimes(3);
  });

  it('propagates upload service errors', async () => {
    uploadService.uploadDocument.mockRejectedValue(
      new BadRequestException('File too large'),
    );

    await expect(
      controller.uploadDocuments(mockUser, {
        idFront: [mockFile],
      }),
    ).rejects.toThrow('File too large');
  });
});
