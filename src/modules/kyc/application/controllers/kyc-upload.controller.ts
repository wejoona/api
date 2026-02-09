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
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBearerAuth,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { UploadService, DocumentType } from '../../../upload/application/services/upload.service';
import { JwtUser } from '../../../../common/guards';

/**
 * KYC Upload Controller
 *
 * Handles document uploads for KYC verification.
 * Users must upload three documents:
 * 1. ID Front (passport, national ID, or driver's license front)
 * 2. ID Back (back side of the document)
 * 3. Selfie (for liveness verification)
 *
 * Flow:
 * 1. User uploads documents via POST /kyc/documents
 * 2. Documents are validated, processed (resized/compressed), and uploaded to S3
 * 3. S3 keys are returned for use in KYC submission via POST /kyc/submit
 */
@ApiTags('KYC')
@Controller('kyc')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KycUploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('documents')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Upload KYC documents',
    description:
      'Upload identity documents for KYC verification. ' +
      'All three documents are required: idFront, idBack, and selfie. ' +
      'Files must be images (JPEG, PNG, WebP) and less than 5MB each. ' +
      'Images are automatically resized and compressed. ' +
      'Returns S3 keys to be used in POST /kyc/submit.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['idFront', 'idBack', 'selfie'],
      properties: {
        idFront: {
          type: 'string',
          format: 'binary',
          description:
            "Front side of identity document (passport, national ID, or driver's license)",
        },
        idBack: {
          type: 'string',
          format: 'binary',
          description: 'Back side of identity document',
        },
        selfie: {
          type: 'string',
          format: 'binary',
          description: 'Selfie photo for liveness verification',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Documents uploaded successfully',
    schema: {
      example: {
        message: 'Documents uploaded successfully',
        documents: {
          idFront: {
            key: 'kyc/user-123/id_front-1706198400000.jpg',
            url: 'https://s3.amazonaws.com/bucket/kyc/user-123/id_front-1706198400000.jpg?...',
            size: 245678,
          },
          idBack: {
            key: 'kyc/user-123/id_back-1706198400000.jpg',
            url: 'https://s3.amazonaws.com/bucket/kyc/user-123/id_back-1706198400000.jpg?...',
            size: 234567,
          },
          selfie: {
            key: 'kyc/user-123/selfie-1706198400000.jpg',
            url: 'https://s3.amazonaws.com/bucket/kyc/user-123/selfie-1706198400000.jpg?...',
            size: 123456,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid request - missing files, file too large, or invalid file type',
    schema: {
      example: {
        statusCode: 400,
        message: 'All documents required: idFront, idBack, selfie',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'idFront', maxCount: 1 },
      { name: 'idBack', maxCount: 1 },
      { name: 'selfie', maxCount: 1 },
      { name: 'video', maxCount: 1 },
    ]),
  )
  async uploadDocuments(
    @CurrentUser() user: JwtUser,
    @UploadedFiles()
    files: {
      idFront?: Express.Multer.File[];
      idBack?: Express.Multer.File[];
      selfie?: Express.Multer.File[];
      video?: Express.Multer.File[];
    },
  ) {
    // Support both batch upload (all at once) and single file upload
    const fileEntries: { name: string; type: DocumentType; file: Express.Multer.File }[] = [];

    if (files.idFront?.[0]) fileEntries.push({ name: 'idFront', type: 'id_front', file: files.idFront[0] });
    if (files.idBack?.[0]) fileEntries.push({ name: 'idBack', type: 'id_back', file: files.idBack[0] });
    if (files.selfie?.[0]) fileEntries.push({ name: 'selfie', type: 'selfie', file: files.selfie[0] });
    if (files.video?.[0]) fileEntries.push({ name: 'video', type: 'video', file: files.video[0] });

    if (fileEntries.length === 0) {
      throw new BadRequestException(
        'At least one file required: idFront, idBack, selfie, or video',
      );
    }

    // Upload all provided documents in parallel
    const results = await Promise.all(
      fileEntries.map((entry) =>
        this.uploadService.uploadDocument({
          userId: user.id,
          type: entry.type,
          file: entry.file,
        }).then((result) => ({ name: entry.name, result })),
      ),
    );

    const documents: Record<string, { key: string; url: string; size: number }> = {};
    for (const { name, result } of results) {
      documents[name] = {
        key: result.key,
        url: result.url,
        size: result.size,
      };
    }

    return {
      message: 'Documents uploaded successfully',
      documents,
    };
  }
}
