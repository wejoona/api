import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as sharp from 'sharp';

export type DocumentType = 'id_front' | 'id_back' | 'selfie';

export interface UploadDocumentParams {
  userId: string;
  type: DocumentType;
  file: Express.Multer.File;
}

export interface UploadResult {
  key: string;
  url: string;
  contentType: string;
  size: number;
}

/**
 * Upload Service
 *
 * Handles secure document uploads to S3 with image processing.
 * Documents are stored with user-specific keys for easy retrieval.
 */
@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  // Maximum file size: 5MB (for KYC documents)
  private readonly maxFileSize = 5 * 1024 * 1024;

  // Allowed MIME types
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION', 'eu-west-1');
    this.bucket = this.configService.get<string>(
      'AWS_S3_BUCKET',
      'joonapay-kyc-documents',
    );

    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );

    // S3-compatible endpoint (MinIO, SeaweedFS, etc.)
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    const forcePathStyle = this.configService.get<boolean>(
      'S3_FORCE_PATH_STYLE',
      true,
    );

    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn(
        'S3 credentials not configured. Document uploads will fail.',
      );
    }

    if (endpoint) {
      this.logger.log(`Using S3-compatible endpoint: ${endpoint}`);
    }

    this.s3Client = new S3Client({
      region: this.region,
      endpoint: endpoint || undefined,
      forcePathStyle: forcePathStyle, // Required for MinIO/SeaweedFS
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined,
    });
  }

  /**
   * Upload a KYC document
   *
   * Validates, processes (resize/compress), and uploads to S3.
   */
  async uploadDocument(params: UploadDocumentParams): Promise<UploadResult> {
    const { userId, type, file } = params;

    // Validate file
    this.validateFile(file);

    // Generate unique key
    const key = this.generateKey(userId, type);

    // Process image (resize and compress)
    const processedBuffer = await this.processImage(file.buffer);

    // Upload to S3
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: processedBuffer,
        ContentType: 'image/jpeg',
        Metadata: {
          userId,
          documentType: type,
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      }),
    );

    this.logger.log(`Uploaded KYC document: ${key}`);

    // Get signed URL for immediate access
    const url = await this.getSignedUrl(key);

    return {
      key,
      url,
      contentType: 'image/jpeg',
      size: processedBuffer.length,
    };
  }

  /**
   * Get a signed URL for viewing a document
   */
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Delete a document from S3
   */
  async deleteDocument(key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    this.logger.log(`Deleted document: ${key}`);
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File too large. Maximum size is ${this.maxFileSize / (1024 * 1024)}MB`,
      );
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }
  }

  /**
   * Process image - resize and compress
   */
  private async processImage(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(1200, 1200, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 85,
          progressive: true,
        })
        .toBuffer();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Image processing failed: ${errorMessage}`);
      throw new BadRequestException('Failed to process image');
    }
  }

  /**
   * Generate S3 key for document storage
   */
  private generateKey(userId: string, type: DocumentType): string {
    const timestamp = Date.now();
    return `kyc/${userId}/${type}-${timestamp}.jpg`;
  }

  /**
   * Get all document keys for a user
   */
  getDocumentKeys(userId: string): {
    idFront: string;
    idBack: string;
    selfie: string;
  } {
    return {
      idFront: `kyc/${userId}/id_front`,
      idBack: `kyc/${userId}/id_back`,
      selfie: `kyc/${userId}/selfie`,
    };
  }
}
