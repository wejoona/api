import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  IQrCodePayload,
  QrCodeType,
} from '../../domain/entities/merchant.types';

/**
 * QR Code Service
 * Handles generation and validation of merchant QR codes
 *
 * QR Format: joonapay://pay?m={merchantId}&a={amount}&r={requestId}&s={signature}
 *
 * For static QR (no amount):
 *   joonapay://pay?v=1&t=static&m={merchantId}&ts={timestamp}&s={signature}
 *
 * For dynamic QR (with amount):
 *   joonapay://pay?v=1&t=dynamic&m={merchantId}&a={amount}&r={requestId}&c={currency}&ts={timestamp}&s={signature}
 */
@Injectable()
export class QrCodeService {
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.secretKey =
      configService.get<string>('QR_SECRET_KEY') ||
      'joonapay-qr-secret-key-2024';
    this.baseUrl = 'joonapay://pay';
  }

  /**
   * Generate a static merchant QR code (no amount specified)
   */
  generateStaticQr(merchantId: string): string {
    const timestamp = Date.now();
    const payload: IQrCodePayload = {
      version: 1,
      type: 'static',
      merchantId,
      timestamp,
      signature: '', // Will be set below
    };

    const signature = this.generateSignature(payload);
    payload.signature = signature;

    return this.encodePayload(payload);
  }

  /**
   * Generate a dynamic payment QR code (with amount and request ID)
   */
  generateDynamicQr(
    merchantId: string,
    amount: number,
    requestId: string,
    currency = 'USDC',
    description?: string,
  ): string {
    const timestamp = Date.now();
    const payload: IQrCodePayload = {
      version: 1,
      type: 'dynamic',
      merchantId,
      amount,
      requestId,
      currency,
      description,
      timestamp,
      signature: '', // Will be set below
    };

    const signature = this.generateSignature(payload);
    payload.signature = signature;

    return this.encodePayload(payload);
  }

  /**
   * Decode and validate a QR code payload
   */
  decodeQr(qrData: string): IQrCodePayload {
    try {
      const payload = this.decodePayload(qrData);

      // Validate signature
      const providedSignature = payload.signature;
      payload.signature = '';
      const expectedSignature = this.generateSignature(payload);
      payload.signature = providedSignature;

      if (providedSignature !== expectedSignature) {
        throw new BadRequestException('Invalid QR code signature');
      }

      // Validate version
      if (payload.version !== 1) {
        throw new BadRequestException('Unsupported QR code version');
      }

      // Validate timestamp (QR codes expire after 24 hours for security)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - payload.timestamp > maxAge) {
        throw new BadRequestException('QR code has expired');
      }

      return payload;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid QR code format');
    }
  }

  /**
   * Validate a QR code without decoding (just checks format and signature)
   */
  validateQr(qrData: string): boolean {
    try {
      this.decodeQr(qrData);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a QR code is static (merchant-only, no amount)
   */
  isStaticQr(qrData: string): boolean {
    try {
      const payload = this.decodeQr(qrData);
      return payload.type === 'static';
    } catch {
      return false;
    }
  }

  /**
   * Check if a QR code is dynamic (with amount)
   */
  isDynamicQr(qrData: string): boolean {
    try {
      const payload = this.decodeQr(qrData);
      return payload.type === 'dynamic';
    } catch {
      return false;
    }
  }

  /**
   * Generate HMAC signature for payload
   */
  private generateSignature(payload: IQrCodePayload): string {
    const data = this.serializeForSignature(payload);
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(data);
    return hmac.digest('hex').substring(0, 16); // Use first 16 chars for shorter QR
  }

  /**
   * Serialize payload for signature generation (deterministic)
   */
  private serializeForSignature(payload: IQrCodePayload): string {
    const parts = [
      `v=${payload.version}`,
      `t=${payload.type}`,
      `m=${payload.merchantId}`,
      `ts=${payload.timestamp}`,
    ];

    if (payload.amount !== undefined) {
      parts.push(`a=${payload.amount}`);
    }
    if (payload.requestId) {
      parts.push(`r=${payload.requestId}`);
    }
    if (payload.currency) {
      parts.push(`c=${payload.currency}`);
    }

    return parts.sort().join('&');
  }

  /**
   * Encode payload to QR string format
   */
  private encodePayload(payload: IQrCodePayload): string {
    const params = new URLSearchParams();
    params.set('v', payload.version.toString());
    params.set('t', payload.type);
    params.set('m', payload.merchantId);
    params.set('ts', payload.timestamp.toString());
    params.set('s', payload.signature);

    if (payload.amount !== undefined) {
      params.set('a', payload.amount.toString());
    }
    if (payload.requestId) {
      params.set('r', payload.requestId);
    }
    if (payload.currency) {
      params.set('c', payload.currency);
    }
    if (payload.description) {
      params.set('d', payload.description);
    }

    return `${this.baseUrl}?${params.toString()}`;
  }

  /**
   * Decode QR string to payload object
   */
  private decodePayload(qrData: string): IQrCodePayload {
    // Check for valid URL format
    if (!qrData.startsWith(this.baseUrl)) {
      throw new BadRequestException('Invalid QR code format');
    }

    const url = new URL(qrData);
    const params = url.searchParams;

    const version = parseInt(params.get('v') || '0', 10);
    const type = (params.get('t') || '') as QrCodeType;
    const merchantId = params.get('m') || '';
    const timestamp = parseInt(params.get('ts') || '0', 10);
    const signature = params.get('s') || '';

    if (!version || !type || !merchantId || !timestamp || !signature) {
      throw new BadRequestException('Missing required QR code parameters');
    }

    const payload: IQrCodePayload = {
      version,
      type,
      merchantId,
      timestamp,
      signature,
    };

    const amountStr = params.get('a');
    if (amountStr) {
      payload.amount = parseFloat(amountStr);
    }

    const requestId = params.get('r');
    if (requestId) {
      payload.requestId = requestId;
    }

    const currency = params.get('c');
    if (currency) {
      payload.currency = currency;
    }

    const description = params.get('d');
    if (description) {
      payload.description = description;
    }

    return payload;
  }

  /**
   * Generate a QR code URL for external display
   * This can be used with a QR code generation API
   */
  generateQrCodeUrl(qrData: string, size = 300): string {
    const encoded = encodeURIComponent(qrData);
    // Using a common QR code API endpoint format
    // In production, you'd use your own QR generation service
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
  }
}
