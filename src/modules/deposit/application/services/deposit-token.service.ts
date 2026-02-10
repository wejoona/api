import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { PaymentMethodType } from '../../domain/enums/payment-method-type.enum';

interface DepositTokenPayload {
  depositId: string;
  amount: number;
  currency: string;
  phoneNumber: string;
  providerCode: string;
  providerTransactionId: string;
  paymentMethodType: PaymentMethodType;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

@Injectable()
export class DepositTokenService {
  private readonly logger = new Logger(DepositTokenService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly masterKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    const vaultMasterKey = this.configService.get<string>('VAULT_MASTER_KEY');
    if (!vaultMasterKey) {
      throw new Error('VAULT_MASTER_KEY environment variable is required');
    }
    
    // Use first 32 bytes of the master key for AES-256
    this.masterKey = Buffer.from(vaultMasterKey.slice(0, 64), 'hex');
  }

  encryptToken(payload: DepositTokenPayload): string {
    try {
      const iv = randomBytes(16);
      const cipher = createCipheriv(this.algorithm, this.masterKey, iv);
      
      const data = JSON.stringify(payload);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Combine iv + authTag + encrypted data
      const combined = Buffer.concat([
        iv,
        authTag,
        Buffer.from(encrypted, 'hex'),
      ]);
      
      return combined.toString('base64');
    } catch (error) {
      this.logger.error('Failed to encrypt deposit token:', error);
      throw new Error('Token encryption failed');
    }
  }

  decryptToken(encryptedToken: string): DepositTokenPayload {
    try {
      const combined = Buffer.from(encryptedToken, 'base64');
      
      // Extract iv (16 bytes), authTag (16 bytes), and encrypted data
      const iv = combined.subarray(0, 16);
      const authTag = combined.subarray(16, 32);
      const encrypted = combined.subarray(32);
      
      const decipher = createDecipheriv(this.algorithm, this.masterKey, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');
      
      const payload = JSON.parse(decrypted) as DepositTokenPayload;
      
      // Validate token expiration
      if (Date.now() > payload.expiresAt) {
        throw new Error('Token has expired');
      }
      
      return payload;
    } catch (error) {
      this.logger.error('Failed to decrypt deposit token:', error);
      throw new Error('Invalid or expired token');
    }
  }

  generateToken(
    depositId: string,
    amount: number,
    currency: string,
    phoneNumber: string,
    providerCode: string,
    providerTransactionId: string,
    paymentMethodType: PaymentMethodType,
    userId: string,
    expirationMinutes = 30,
  ): string {
    const now = Date.now();
    const payload: DepositTokenPayload = {
      depositId,
      amount,
      currency,
      phoneNumber,
      providerCode,
      providerTransactionId,
      paymentMethodType,
      userId,
      createdAt: now,
      expiresAt: now + (expirationMinutes * 60 * 1000),
    };
    
    return this.encryptToken(payload);
  }
}