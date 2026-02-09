import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * KeyVault Service
 *
 * Encrypts/decrypts sensitive data at rest using AES-256-GCM.
 * Used for custodial Stellar secret keys and other secrets.
 *
 * Master key comes from VAULT_MASTER_KEY env var (64-char hex = 32 bytes).
 * In production, this should come from AWS KMS, HashiCorp Vault, or similar.
 *
 * Format: <iv:12bytes>.<tag:16bytes>.<ciphertext> (all base64)
 */
@Injectable()
export class KeyVaultService implements OnModuleInit {
  private readonly logger = new Logger(KeyVaultService.name);
  private masterKey: Buffer | null = null;
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly IV_LENGTH = 12;
  private readonly TAG_LENGTH = 16;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const keyHex = this.configService.get<string>('VAULT_MASTER_KEY');

    if (!keyHex) {
      this.logger.warn(
        'VAULT_MASTER_KEY not configured — encryption disabled. ' +
          'Secret keys will be stored in plaintext. ' +
          'Generate one: openssl rand -hex 32',
      );
      return;
    }

    if (keyHex.length !== 64) {
      throw new Error(
        'VAULT_MASTER_KEY must be 64 hex characters (32 bytes). ' +
          `Got ${keyHex.length} characters.`,
      );
    }

    this.masterKey = Buffer.from(keyHex, 'hex');
    this.logger.log('KeyVault initialized with master key');
  }

  /**
   * Check if encryption is available
   */
  isEnabled(): boolean {
    return this.masterKey !== null;
  }

  /**
   * Encrypt a plaintext string
   * Returns: "iv.tag.ciphertext" (base64-encoded parts)
   */
  encrypt(plaintext: string): string {
    if (!this.masterKey) {
      // Return plaintext with a prefix so we know it's not encrypted
      return `plain:${plaintext}`;
    }

    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.masterKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const tag = cipher.getAuthTag();

    return [
      iv.toString('base64'),
      tag.toString('base64'),
      encrypted.toString('base64'),
    ].join('.');
  }

  /**
   * Decrypt an encrypted string
   * Accepts: "iv.tag.ciphertext" or "plain:plaintext" (unencrypted fallback)
   */
  decrypt(encrypted: string): string {
    // Handle unencrypted values (from before encryption was enabled)
    if (encrypted.startsWith('plain:')) {
      return encrypted.slice(6);
    }

    if (!this.masterKey) {
      throw new Error(
        'Cannot decrypt: VAULT_MASTER_KEY not configured. ' +
          'The data was encrypted but the key is not available.',
      );
    }

    const parts = encrypted.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format: expected iv.tag.ciphertext');
    }

    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[1], 'base64');
    const ciphertext = Buffer.from(parts[2], 'base64');

    if (iv.length !== this.IV_LENGTH) {
      throw new Error(`Invalid IV length: ${iv.length}, expected ${this.IV_LENGTH}`);
    }
    if (tag.length !== this.TAG_LENGTH) {
      throw new Error(`Invalid tag length: ${tag.length}, expected ${this.TAG_LENGTH}`);
    }

    const decipher = crypto.createDecipheriv(
      this.ALGORITHM,
      this.masterKey,
      iv,
    );
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  }

  /**
   * Re-encrypt a value (useful for key rotation)
   */
  reEncrypt(encrypted: string, newKey: Buffer): string {
    const plaintext = this.decrypt(encrypted);

    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, newKey, iv);

    let newEncrypted = cipher.update(plaintext, 'utf8');
    newEncrypted = Buffer.concat([newEncrypted, cipher.final()]);

    const tag = cipher.getAuthTag();

    return [
      iv.toString('base64'),
      tag.toString('base64'),
      newEncrypted.toString('base64'),
    ].join('.');
  }
}
