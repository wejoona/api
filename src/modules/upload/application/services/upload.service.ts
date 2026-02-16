import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

// ── Document types ──

export type DocumentType = 'id_front' | 'id_back' | 'selfie' | 'video';

export type UploadCategory =
  | 'avatar'       // {userId}/avatar.jpg
  | 'kyc'          // {userId}/kyc/{type}-{date}.jpg
  | 'receipt'      // {userId}/receipts/{txId}-{date}.pdf
  | 'export'       // {userId}/exports/{name}-{date}.{ext}
  | 'document';    // {userId}/documents/{name}-{date}.{ext}

// ── Bucket names ──

const BUCKETS = {
  users: 'korido-users',       // All user files (private, signed URLs)
  assets: 'korido-assets',     // Public app assets
  platform: 'korido-platform', // Audit logs, reports
  backups: 'korido-backups',   // DB dumps
} as const;

// ── Interfaces ──

export interface UploadDocumentParams {
  userId: string;
  type: DocumentType;
  file: Express.Multer.File;
}

export interface UploadAvatarParams {
  userId: string;
  file: Express.Multer.File;
}

export interface UploadReceiptParams {
  userId: string;
  transactionId: string;
  file: Express.Multer.File;
}

export interface UploadResult {
  key: string;
  bucket: string;
  url: string;
  publicUrl?: string; // For publicly accessible files (avatars)
  contentType: string;
  size: number;
}

export interface UserFile {
  key: string;
  size: number;
  lastModified: Date;
  category: string;
}

/**
 * Upload Service
 *
 * User-centric file storage on MinIO (S3-compatible).
 *
 * Bucket structure:
 *   korido-users/{userId}/
 *     ├── avatar.jpg
 *     ├── kyc/id_front-2026-02-09.jpg
 *     ├── kyc/selfie-2026-02-09.jpg
 *     ├── receipts/tx_abc-2026-03-15.pdf
 *     ├── exports/transactions-2026-Q1.csv
 *     └── documents/bank-statement.pdf
 *
 * Open a user folder → see their entire file history.
 */
@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly s3Client: S3Client | null;
  private readonly endpoint: string;
  private readonly useMock: boolean;
  private readonly mockStoragePath: string;

  private mockStorage = new Map<string, Buffer>();

  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly maxAvatarSize = 5 * 1024 * 1024; // 5MB

  private readonly allowedImageTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  private readonly allowedDocTypes = [
    ...['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    'application/pdf',
  ];

  constructor(private readonly configService: ConfigService) {
    this.endpoint = this.configService.get<string>('S3_ENDPOINT', '');
    this.useMock = this.configService.get<boolean>('AWS_USE_MOCK', false);
    this.mockStoragePath = this.configService.get<string>(
      'MOCK_STORAGE_PATH',
      '/tmp/korido-mock-storage',
    );

    if (this.useMock) {
      this.logger.log('Running in MOCK mode — files stored locally');
      this.s3Client = null;
      this._ensureDir(this.mockStoragePath);
      return;
    }

    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const forcePathStyle = this.configService.get<boolean>('S3_FORCE_PATH_STYLE', true);

    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn('S3 credentials missing — falling back to mock mode');
      (this as any).useMock = true;
      this.s3Client = null;
      this._ensureDir(this.mockStoragePath);
      return;
    }

    if (this.endpoint) {
      this.logger.log(`S3 endpoint: ${this.endpoint}`);
    }

    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      endpoint: this.endpoint || undefined,
      forcePathStyle,
      credentials: { accessKeyId, secretAccessKey },
    });

    this.logger.log(`Buckets: users=${BUCKETS.users}, assets=${BUCKETS.assets}, platform=${BUCKETS.platform}`);
  }

  // ══════════════════════════════════════════════
  //  PUBLIC API
  // ══════════════════════════════════════════════

  /**
   * Upload a KYC document (id_front, id_back, selfie, video)
   * Stored at: korido-users/{userId}/kyc/{type}-{date}.jpg
   */
  async uploadDocument(params: UploadDocumentParams): Promise<UploadResult> {
    const { userId, type, file } = params;
    this.validateFile(file, this.allowedImageTypes, this.maxFileSize);

    const date = this._dateStamp();
    const key = `${userId}/kyc/${type}-${date}.jpg`;
    const processedBuffer = await this.processImage(file.buffer);

    return this._upload(BUCKETS.users, key, processedBuffer, 'image/jpeg', {
      userId,
      documentType: type,
      originalName: file.originalname,
      uploadedAt: new Date().toISOString(),
    });
  }

  /**
   * Upload user avatar
   * Stored at: korido-users/{userId}/avatar.jpg (overwritten each time)
   */
  async uploadAvatar(params: UploadAvatarParams): Promise<UploadResult> {
    const { userId, file } = params;
    this.validateFile(file, this.allowedImageTypes, this.maxAvatarSize);

    const key = `${userId}/avatar.jpg`;

    // Process to square crop + smaller size for avatars
    const processedBuffer = await this._processAvatar(file.buffer);

    const result = await this._upload(BUCKETS.users, key, processedBuffer, 'image/jpeg', {
      userId,
      documentType: 'avatar',
      uploadedAt: new Date().toISOString(),
    });

    // Avatar gets a permanent public URL (bucket has public download policy)
    // For MinIO with path-style: {endpoint}/{bucket}/{key}
    if (this.endpoint) {
      result.publicUrl = `${this.endpoint}/${BUCKETS.users}/${key}`;
    }

    return result;
  }

  /**
   * Upload a transaction receipt
   * Stored at: korido-users/{userId}/receipts/{txId}-{date}.pdf
   */
  async uploadReceipt(params: UploadReceiptParams): Promise<UploadResult> {
    const { userId, transactionId, file } = params;
    this.validateFile(file, this.allowedDocTypes, this.maxFileSize);

    const date = this._dateStamp();
    const ext = file.mimetype === 'application/pdf' ? 'pdf' : 'jpg';
    const key = `${userId}/receipts/${transactionId}-${date}.${ext}`;

    const buffer = ext === 'jpg' ? await this.processImage(file.buffer) : file.buffer;
    const contentType = ext === 'pdf' ? 'application/pdf' : 'image/jpeg';

    return this._upload(BUCKETS.users, key, buffer, contentType, {
      userId,
      transactionId,
      documentType: 'receipt',
      uploadedAt: new Date().toISOString(),
    });
  }

  /**
   * Upload a generic user document (bank statement, proof of address, etc.)
   * Stored at: korido-users/{userId}/documents/{name}-{date}.{ext}
   */
  async uploadUserDocument(params: {
    userId: string;
    name: string;
    file: Express.Multer.File;
  }): Promise<UploadResult> {
    const { userId, name, file } = params;
    this.validateFile(file, this.allowedDocTypes, this.maxFileSize);

    const date = this._dateStamp();
    const ext = file.mimetype === 'application/pdf' ? 'pdf' : 'jpg';
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const key = `${userId}/documents/${safeName}-${date}.${ext}`;

    const buffer = ext === 'jpg' ? await this.processImage(file.buffer) : file.buffer;
    const contentType = ext === 'pdf' ? 'application/pdf' : 'image/jpeg';

    return this._upload(BUCKETS.users, key, buffer, contentType, {
      userId,
      documentType: name,
      uploadedAt: new Date().toISOString(),
    });
  }

  /**
   * Store a GDPR/data export
   * Stored at: korido-users/{userId}/exports/{name}-{date}.json
   */
  async uploadExport(params: {
    userId: string;
    name: string;
    data: Buffer;
    contentType: string;
  }): Promise<UploadResult> {
    const { userId, name, data, contentType } = params;
    const date = this._dateStamp();
    const ext = contentType.includes('csv') ? 'csv' : 'json';
    const key = `${userId}/exports/${name}-${date}.${ext}`;

    return this._upload(BUCKETS.users, key, data, contentType, {
      userId,
      documentType: 'export',
      uploadedAt: new Date().toISOString(),
    });
  }

  /**
   * Write a platform audit event
   * Stored at: korido-platform/audit/{date}/{service}/{event}.json
   */
  async writeAuditLog(params: {
    service: string;
    event: string;
    data: Record<string, unknown>;
  }): Promise<void> {
    const { service, event, data } = params;
    const date = this._dateStamp();
    const ts = Date.now();
    const key = `audit/${date}/${service}/${event}-${ts}.json`;
    const buffer = Buffer.from(JSON.stringify(data, null, 2));

    await this._upload(BUCKETS.platform, key, buffer, 'application/json', {});
  }

  // ══════════════════════════════════════════════
  //  QUERY: List all files for a user
  // ══════════════════════════════════════════════

  /**
   * List ALL files for a user — open their folder, see everything.
   * 20 years of history in one call.
   */
  async listUserFiles(userId: string): Promise<UserFile[]> {
    const prefix = `${userId}/`;

    if (this.useMock) {
      return this._mockListFiles(prefix);
    }

    const files: UserFile[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.s3Client!.send(
        new ListObjectsV2Command({
          Bucket: BUCKETS.users,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );

      for (const obj of response.Contents ?? []) {
        if (!obj.Key) continue;
        const relativePath = obj.Key.replace(prefix, '');
        const category = relativePath.split('/')[0] || 'root';

        files.push({
          key: obj.Key,
          size: obj.Size ?? 0,
          lastModified: obj.LastModified ?? new Date(),
          category, // 'kyc', 'receipts', 'documents', 'exports', or 'root' (avatar)
        });
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return files;
  }

  /**
   * Get signed URL for viewing any file
   */
  async getSignedUrl(key: string, bucketOrExpiry?: string | number, expiresIn = 3600): Promise<string> {
    // Backward compat: getSignedUrl(key, 3600) or getSignedUrl(key, bucket, 3600)
    let bucket: string = BUCKETS.users;
    if (typeof bucketOrExpiry === 'number') {
      expiresIn = bucketOrExpiry;
    } else if (typeof bucketOrExpiry === 'string') {
      bucket = bucketOrExpiry;
    }
    if (this.useMock) {
      const filePath = path.join(this.mockStoragePath, bucket, key.replace(/\//g, '_'));
      return `file://${filePath}?expires=${Date.now() + expiresIn * 1000}`;
    }

    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(this.s3Client!, command, { expiresIn });
  }

  /**
   * Delete a file
   */
  async deleteFile(key: string, bucket = BUCKETS.users): Promise<void> {
    if (this.useMock) {
      this.mockStorage.delete(`${bucket}/${key}`);
      const filePath = path.join(this.mockStoragePath, bucket, key.replace(/\//g, '_'));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      this.logger.log(`[MOCK] Deleted: ${bucket}/${key}`);
      return;
    }

    await this.s3Client!.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    this.logger.log(`Deleted: ${bucket}/${key}`);
  }

  /**
   * Copy KYC selfie as user avatar (after KYC approval)
   */
  async copyKycSelfieToAvatar(userId: string, selfieKey: string): Promise<string> {
    if (this.useMock) {
      const buf = this.mockStorage.get(`${BUCKETS.users}/${selfieKey}`);
      if (!buf) throw new BadRequestException('Selfie not found');
      const avatarKey = `${userId}/avatar.jpg`;
      this.mockStorage.set(`${BUCKETS.users}/${avatarKey}`, buf);
      return `mock://localhost/${BUCKETS.users}/${avatarKey}`;
    }

    // Download selfie, process as avatar, re-upload
    const response = await this.s3Client!.send(
      new GetObjectCommand({ Bucket: BUCKETS.users, Key: selfieKey }),
    );
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const selfieBuffer = Buffer.concat(chunks);
    const avatarBuffer = await this._processAvatar(selfieBuffer);
    const avatarKey = `${userId}/avatar.jpg`;

    await this.s3Client!.send(
      new PutObjectCommand({
        Bucket: BUCKETS.users,
        Key: avatarKey,
        Body: avatarBuffer,
        ContentType: 'image/jpeg',
        Metadata: {
          userId,
          documentType: 'avatar',
          source: 'kyc-selfie',
          uploadedAt: new Date().toISOString(),
        },
      }),
    );

    this.logger.log(`Copied KYC selfie → avatar for user ${userId}`);

    // Return permanent URL
    if (this.endpoint) {
      return `${this.endpoint}/${BUCKETS.users}/${avatarKey}`;
    }
    return this.getSignedUrl(avatarKey);
  }

  // ══════════════════════════════════════════════
  //  LEGACY COMPAT (for existing callers)
  // ══════════════════════════════════════════════

  /**
   * @deprecated Use specific upload methods. Kept for backward compat.
   */
  getDocumentKeys(userId: string) {
    return {
      idFront: `${userId}/kyc/id_front`,
      idBack: `${userId}/kyc/id_back`,
      selfie: `${userId}/kyc/selfie`,
    };
  }

  // ══════════════════════════════════════════════
  //  INTERNALS
  // ══════════════════════════════════════════════

  private async _upload(
    bucket: string,
    key: string,
    buffer: Buffer,
    contentType: string,
    metadata: Record<string, string>,
  ): Promise<UploadResult> {
    if (this.useMock) {
      this.mockStorage.set(`${bucket}/${key}`, buffer);
      const filePath = path.join(this.mockStoragePath, bucket, key.replace(/\//g, '_'));
      const dir = path.dirname(filePath);
      this._ensureDir(dir);
      fs.writeFileSync(filePath, buffer);
      this.logger.log(`[MOCK] Uploaded: ${bucket}/${key} (${buffer.length} bytes)`);

      return {
        key,
        bucket,
        url: `mock://localhost/${bucket}/${key}`,
        contentType,
        size: buffer.length,
      };
    }

    await this.s3Client!.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: metadata,
      }),
    );

    this.logger.log(`Uploaded: ${bucket}/${key} (${buffer.length} bytes)`);

    const url = await this.getSignedUrl(key, bucket);

    return { key, bucket, url, contentType, size: buffer.length };
  }

  private validateFile(
    file: Express.Multer.File,
    allowedTypes: string[],
    maxSize: number,
  ): void {
    if (!file) throw new BadRequestException('No file provided');
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File too large. Maximum: ${Math.round(maxSize / (1024 * 1024))}MB`,
      );
    }
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type "${file.mimetype}". Allowed: ${allowedTypes.join(', ')}`,
      );
    }
  }

  private async processImage(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Image processing failed, using raw buffer: ${msg}`);
      return buffer;
    }
  }

  private async _processAvatar(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(512, 512, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 90, progressive: true })
        .toBuffer();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Avatar processing failed, using raw buffer: ${msg}`);
      return buffer;
    }
  }

  private _dateStamp(): string {
    return new Date().toISOString().split('T')[0]; // 2026-02-15
  }

  private _ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private _mockListFiles(prefix: string): UserFile[] {
    const files: UserFile[] = [];
    for (const [key] of this.mockStorage) {
      const stripped = key.replace(`${BUCKETS.users}/`, '');
      if (stripped.startsWith(prefix)) {
        const relativePath = stripped.replace(prefix, '');
        const category = relativePath.split('/')[0] || 'root';
        files.push({
          key: stripped,
          size: this.mockStorage.get(key)?.length ?? 0,
          lastModified: new Date(),
          category,
        });
      }
    }
    return files;
  }
}
