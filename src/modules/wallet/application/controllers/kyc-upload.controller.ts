import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard, JwtUser } from '../../../../common/guards';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { UploadService, DocumentType } from '../../../upload';

interface KycFiles {
  idFront?: Express.Multer.File[];
  idBack?: Express.Multer.File[];
  selfie?: Express.Multer.File[];
}

/**
 * KYC Document Upload Controller
 *
 * Handles secure upload of KYC verification documents.
 * Documents are processed, validated, and stored in S3.
 */
@ApiTags('KYC')
@Controller('kyc')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KycUploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('documents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload KYC documents' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        idFront: {
          type: 'string',
          format: 'binary',
          description: 'Front of ID document (JPEG/PNG, max 5MB)',
        },
        idBack: {
          type: 'string',
          format: 'binary',
          description: 'Back of ID document (JPEG/PNG, max 5MB)',
        },
        selfie: {
          type: 'string',
          format: 'binary',
          description: 'Selfie photo (JPEG/PNG, max 5MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Documents uploaded successfully',
    schema: {
      example: {
        success: true,
        documents: {
          idFront: {
            key: 'kyc/user-123/id_front-1234567890.jpg',
            uploaded: true,
          },
          idBack: {
            key: 'kyc/user-123/id_back-1234567890.jpg',
            uploaded: true,
          },
          selfie: {
            key: 'kyc/user-123/selfie-1234567890.jpg',
            uploaded: true,
          },
        },
        message: 'All documents uploaded successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type, size, or missing documents',
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'idFront', maxCount: 1 },
        { name: 'idBack', maxCount: 1 },
        { name: 'selfie', maxCount: 1 },
      ],
      {
        limits: {
          fileSize: 5 * 1024 * 1024, // 5MB
        },
      },
    ),
  )
  async uploadDocuments(
    @CurrentUser() user: JwtUser,
    @UploadedFiles() files: KycFiles,
  ) {
    // Validate that all required documents are provided
    if (!files.idFront?.[0] || !files.idBack?.[0] || !files.selfie?.[0]) {
      const missing: string[] = [];
      if (!files.idFront?.[0]) missing.push('idFront');
      if (!files.idBack?.[0]) missing.push('idBack');
      if (!files.selfie?.[0]) missing.push('selfie');

      throw new BadRequestException(
        `Missing required documents: ${missing.join(', ')}`,
      );
    }

    const userId = user.id;

    // Upload all documents in parallel
    const [idFrontResult, idBackResult, selfieResult] = await Promise.all([
      this.uploadService.uploadDocument({
        userId,
        type: 'id_front' as DocumentType,
        file: files.idFront[0],
      }),
      this.uploadService.uploadDocument({
        userId,
        type: 'id_back' as DocumentType,
        file: files.idBack[0],
      }),
      this.uploadService.uploadDocument({
        userId,
        type: 'selfie' as DocumentType,
        file: files.selfie[0],
      }),
    ]);

    return {
      success: true,
      documents: {
        idFront: {
          key: idFrontResult.key,
          uploaded: true,
        },
        idBack: {
          key: idBackResult.key,
          uploaded: true,
        },
        selfie: {
          key: selfieResult.key,
          uploaded: true,
        },
      },
      message: 'All documents uploaded successfully',
    };
  }

  @Post('documents/single')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload a single KYC document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['document', 'type'],
      properties: {
        document: {
          type: 'string',
          format: 'binary',
          description: 'Document image (JPEG/PNG, max 5MB)',
        },
        type: {
          type: 'string',
          enum: ['id_front', 'id_back', 'selfie'],
          description: 'Type of document being uploaded',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded successfully',
    schema: {
      example: {
        success: true,
        document: {
          key: 'kyc/user-123/id_front-1234567890.jpg',
          type: 'id_front',
          url: 'https://s3.eu-west-1.amazonaws.com/...',
        },
        message: 'Document uploaded successfully',
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'document', maxCount: 1 }], {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadSingleDocument(
    @CurrentUser() user: JwtUser,
    @UploadedFiles() files: { document?: Express.Multer.File[] },
  ) {
    if (!files.document?.[0]) {
      throw new BadRequestException('No document provided');
    }

    // Get document type from form field or filename
    const file = files.document[0];
    const _fieldName = file.fieldname;
    let docType: DocumentType;

    // Try to extract type from original filename or use default
    if (file.originalname.toLowerCase().includes('front')) {
      docType = 'id_front';
    } else if (file.originalname.toLowerCase().includes('back')) {
      docType = 'id_back';
    } else if (file.originalname.toLowerCase().includes('selfie')) {
      docType = 'selfie';
    } else {
      // Default based on field name pattern
      docType = 'id_front';
    }

    const result = await this.uploadService.uploadDocument({
      userId: user.id,
      type: docType,
      file,
    });

    return {
      success: true,
      document: {
        key: result.key,
        type: docType,
        url: result.url,
      },
      message: 'Document uploaded successfully',
    };
  }
}
