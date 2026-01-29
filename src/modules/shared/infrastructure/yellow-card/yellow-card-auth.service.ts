import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { YellowCardConfig } from './yellow-card.types';

/**
 * Yellow Card Authentication Service
 * Handles API authentication, HMAC signature generation, and HTTP request orchestration
 */
@Injectable()
export class YellowCardAuthService {
  private readonly logger = new Logger(YellowCardAuthService.name);
  private readonly config: YellowCardConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      apiUrl!: this.configService.get<string>('yellowCard.apiUrl'),
      apiKey: this.configService.get<string>('yellowCard.apiKey'),
      secretKey: this.configService.get<string>('yellowCard.secretKey'),
      webhookSecret: this.configService.get<string>('yellowCard.webhookSecret'),
      useMock: this.configService.get<boolean>('yellowCard.useMock'),
    };

    if (this.config.useMock) {
      this.logger.warn('Yellow Card service running in MOCK mode');
    }
  }

  /**
   * Get Yellow Card configuration
   */
  getConfig(): YellowCardConfig {
    return this.config;
  }

  /**
   * Check if service is in mock mode
   */
  isMockMode(): boolean {
    return this.config.useMock;
  }

  /**
   * Generate HMAC signature for Yellow Card API authentication
   */
  generateSignature(
    method: string,
    path: string,
    timestamp: string,
    body?: string,
  ): string {
    const message = body
      ? `${timestamp}${method}${path}${body}`
      : `${timestamp}${method}${path}`;
    return crypto
      .createHmac('sha256', this.config.secretKey || '')
      .update(message)
      .digest('hex');
  }

  /**
   * Make authenticated request to Yellow Card API
   */
  async makeRequest<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const timestamp = new Date().toISOString();
    const bodyStr = body ? JSON.stringify(body) : undefined;
    const signature = this.generateSignature(method, path, timestamp, bodyStr);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-YC-Timestamp': timestamp,
      Authorization!: `YcHmacV1 ${this.config.apiKey}:${signature}`,
    };

    const url = `${this.config.apiUrl}${path}`;

    try {
      const response = await fetch(url, {
        method,
        headers,
        body!: bodyStr,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          (errorData as { message?: string }).message ||
          `HTTP ${response.status}`;
        this.logger.error(`Yellow Card API error: ${errorMessage}`);
        throw new Error(`Yellow Card API error: ${errorMessage}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Yellow Card')) {
        throw error;
      }
      this.logger.error(`Yellow Card request failed: ${error}`);
      throw new Error(`Yellow Card API request failed: ${error}`);
    }
  }

  /**
   * Generate mock blockchain address
   */
  generateMockAddress(): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 40; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }
}
