import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { KycUploadController } from './kyc-upload.controller';
import { UploadService } from '../../../upload/application/services/upload.service';
import { JwtUser } from '../../../../common/guards';

describe('KycUploadController', () => {
  let controller: KycUploadController;
  let uploadService: jest.Mocked<UploadService>;

  const mockUser: JwtUser = {
    id: 'test-user-id',
    phone: '+2250700000000',
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'idFront',
    originalname: 'id_front.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024 * 500, // 500KB
    buffer: Buffer.from('mock-file-content'),
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  };

  const mockUploadResult = {
    key: 'kyc/test-user-id/id_front-1706198400000.jpg',
    url: 'https://s3.amazonaws.com/bucket/kyc/test-user-id/id_front-1706198400000.jpg',
    contentType: 'image/jpeg',
    size: 245678,
  };

  beforeEach(async () => {
    const mockUploadService = {
      uploadDocument: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KycUploadController],
      providers: [
        {
          provide: UploadService,
          useValue: mockUploadService,
        },
      ],
    }).compile();

    controller = module.get<KycUploadController>(KycUploadController);
    uploadService = module.get(UploadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadDocuments', () => {
    it('should successfully upload all three documents', async () => {
      const idFrontFile = { ...mockFile, fieldname: 'idFront' };
      const idBackFile = { ...mockFile, fieldname: 'idBack' };
      const selfieFile = { ...mockFile, fieldname: 'selfie' };

      const files = {
        idFront: [idFrontFile],
        idBack: [idBackFile],
        selfie: [selfieFile],
      };

      const idFrontResult = {
        ...mockUploadResult,
        key: 'kyc/test-user-id/id_front-1706198400000.jpg',
      };
      const idBackResult = {
        ...mockUploadResult,
        key: 'kyc/test-user-id/id_back-1706198400000.jpg',
      };
      const selfieResult = {
        ...mockUploadResult,
        key: 'kyc/test-user-id/selfie-1706198400000.jpg',
      };

      uploadService.uploadDocument
        .mockResolvedValueOnce(idFrontResult)
        .mockResolvedValueOnce(idBackResult)
        .mockResolvedValueOnce(selfieResult);

      const result = await controller.uploadDocuments(mockUser, files);

      expect(result).toEqual({
        message: 'Documents uploaded successfully',
        documents: {
          idFront: {
            key: idFrontResult.key,
            url: idFrontResult.url,
            size: idFrontResult.size,
          },
          idBack: {
            key: idBackResult.key,
            url: idBackResult.url,
            size: idBackResult.size,
          },
          selfie: {
            key: selfieResult.key,
            url: selfieResult.url,
            size: selfieResult.size,
          },
        },
      });

      expect(uploadService.uploadDocument).toHaveBeenCalledTimes(3);
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

    it('should throw BadRequestException when idFront is missing', async () => {
      const files = {
        idBack: [mockFile],
        selfie: [mockFile],
      };

      await expect(controller.uploadDocuments(mockUser, files)).rejects.toThrow(
        BadRequestException,
      );

      await expect(controller.uploadDocuments(mockUser, files)).rejects.toThrow(
        'All documents required: idFront, idBack, selfie',
      );

      expect(uploadService.uploadDocument).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when idBack is missing', async () => {
      const files = {
        idFront: [mockFile],
        selfie: [mockFile],
      };

      await expect(controller.uploadDocuments(mockUser, files)).rejects.toThrow(
        BadRequestException,
      );

      expect(uploadService.uploadDocument).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when selfie is missing', async () => {
      const files = {
        idFront: [mockFile],
        idBack: [mockFile],
      };

      await expect(controller.uploadDocuments(mockUser, files)).rejects.toThrow(
        BadRequestException,
      );

      expect(uploadService.uploadDocument).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when all files are missing', async () => {
      const files = {};

      await expect(controller.uploadDocuments(mockUser, files)).rejects.toThrow(
        BadRequestException,
      );

      expect(uploadService.uploadDocument).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when files array is empty', async () => {
      const files = {
        idFront: [],
        idBack: [mockFile],
        selfie: [mockFile],
      };

      await expect(controller.uploadDocuments(mockUser, files)).rejects.toThrow(
        BadRequestException,
      );

      expect(uploadService.uploadDocument).not.toHaveBeenCalled();
    });

    it('should upload documents in parallel for better performance', async () => {
      const files = {
        idFront: [mockFile],
        idBack: [mockFile],
        selfie: [mockFile],
      };

      const uploadPromises: Array<Promise<any>> = [];
      uploadService.uploadDocument.mockImplementation((): Promise<any> => {
        const promise = new Promise((resolve) => {
          setTimeout(() => resolve(mockUploadResult), 100);
        });
        uploadPromises.push(promise);
        return promise;
      });

      const startTime = Date.now();
      await controller.uploadDocuments(mockUser, files);
      const endTime = Date.now();

      // If executed sequentially, would take ~300ms (3 * 100ms)
      // If executed in parallel, should take ~100ms
      // Allow some margin for test execution overhead
      expect(endTime - startTime).toBeLessThan(250);
      expect(uploadService.uploadDocument).toHaveBeenCalledTimes(3);
    });

    it('should propagate upload service errors', async () => {
      const files = {
        idFront: [mockFile],
        idBack: [mockFile],
        selfie: [mockFile],
      };

      const error = new BadRequestException('File too large');
      uploadService.uploadDocument.mockRejectedValueOnce(error);

      await expect(controller.uploadDocuments(mockUser, files)).rejects.toThrow(
        error,
      );
    });

    it('should handle upload service failure for any document', async () => {
      const files = {
        idFront: [mockFile],
        idBack: [mockFile],
        selfie: [mockFile],
      };

      uploadService.uploadDocument
        .mockResolvedValueOnce(mockUploadResult)
        .mockRejectedValueOnce(new Error('S3 upload failed'))
        .mockResolvedValueOnce(mockUploadResult);

      await expect(controller.uploadDocuments(mockUser, files)).rejects.toThrow(
        'S3 upload failed',
      );
    });
  });
});
