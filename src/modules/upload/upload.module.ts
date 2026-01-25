import { Module } from '@nestjs/common';
import { UploadService } from './application/services/upload.service';

/**
 * Upload Module
 *
 * Provides document upload capabilities with S3 storage.
 * Used primarily for KYC document uploads.
 */
@Module({
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
