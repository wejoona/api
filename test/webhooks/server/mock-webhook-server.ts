import express, { Express, Request, Response } from 'express';
import * as crypto from 'crypto';
import { Server } from 'http';

/**
 * Mock Webhook Server
 *
 * Simulates external webhook providers (Circle, Yellow Card, Twilio)
 * for testing webhook handling, signature verification, and retries.
 *
 * Usage:
 * ```typescript
 * const server = new MockWebhookServer();
 * await server.start(3001);
 *
 * // Send Circle webhook
 * await server.sendCircleWebhook('http://localhost:3000/webhooks/circle', {
 *   notificationType: 'wallets.transfer.complete',
 *   notification: { ... }
 * });
 *
 * await server.stop();
 * ```
 */
export class MockWebhookServer {
  private app: Express;
  private server: Server | null = null;
  private webhookHistory: WebhookRecord[] = [];
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    retryDelays: [1000, 2000, 4000], // ms
    retryOnStatusCodes: [500, 502, 503, 504],
  };

  // Secrets for signature generation
  private secrets = {
    circle: 'circle-webhook-secret-test',
    yellowcard: 'yellowcard-webhook-secret-test',
    twilio: 'twilio-auth-token-test',
  };

  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', webhooksSent: this.webhookHistory.length });
    });

    // Get webhook history
    this.app.get('/history', (req: Request, res: Response) => {
      res.json(this.webhookHistory);
    });

    // Clear history
    this.app.delete('/history', (req: Request, res: Response) => {
      this.webhookHistory = [];
      res.json({ cleared: true });
    });
  }

  /**
   * Start the mock server
   */
  async start(port: number = 3001): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        console.log(`Mock webhook server listening on port ${port}`);
        resolve();
      });
    });
  }

  /**
   * Stop the mock server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Mock webhook server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Set custom secrets for signature generation
   */
  setSecrets(secrets: Partial<typeof this.secrets>): void {
    this.secrets = { ...this.secrets, ...secrets };
  }

  /**
   * Set retry configuration
   */
  setRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
  }

  /**
   * Send Circle webhook
   */
  async sendCircleWebhook(
    targetUrl: string,
    payload: CircleWebhookPayload,
    options: WebhookOptions = {},
  ): Promise<WebhookResponse> {
    const rawBody = JSON.stringify(payload);
    const signature = this.generateCircleSignature(rawBody);

    return this.sendWebhook({
      targetUrl,
      payload,
      headers: {
        'Content-Type': 'application/json',
        'X-Circle-Signature': signature,
        ...options.headers,
      },
      provider: 'circle',
      ...options,
    });
  }

  /**
   * Send Yellow Card webhook
   */
  async sendYellowCardWebhook(
    targetUrl: string,
    payload: YellowCardWebhookPayload,
    options: WebhookOptions = {},
  ): Promise<WebhookResponse> {
    const rawBody = JSON.stringify(payload);
    const signature = this.generateYellowCardSignature(rawBody);

    return this.sendWebhook({
      targetUrl,
      payload,
      headers: {
        'Content-Type': 'application/json',
        'X-YC-Signature': signature,
        ...options.headers,
      },
      provider: 'yellowcard',
      ...options,
    });
  }

  /**
   * Send Twilio webhook
   */
  async sendTwilioWebhook(
    targetUrl: string,
    payload: TwilioWebhookPayload,
    options: WebhookOptions = {},
  ): Promise<WebhookResponse> {
    const signature = this.generateTwilioSignature(targetUrl, payload);

    // Twilio sends form-encoded data
    const urlencoded = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        urlencoded.append(key, String(value));
      }
    });

    return this.sendWebhook({
      targetUrl,
      payload: urlencoded,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Twilio-Signature': signature,
        ...options.headers,
      },
      provider: 'twilio',
      isFormEncoded: true,
      ...options,
    });
  }

  /**
   * Generic webhook sender with retry logic
   */
  private async sendWebhook(config: {
    targetUrl: string;
    payload: any;
    headers: Record<string, string>;
    provider: string;
    skipRetry?: boolean;
    isFormEncoded?: boolean;
  }): Promise<WebhookResponse> {
    const startTime = Date.now();
    let attempt = 0;
    let lastError: Error | null = null;

    const record: WebhookRecord = {
      id: crypto.randomUUID(),
      provider: config.provider,
      targetUrl: config.targetUrl,
      payload: config.payload,
      headers: config.headers,
      attempts: [],
      createdAt: new Date().toISOString(),
    };

    while (attempt <= (config.skipRetry ? 0 : this.retryConfig.maxRetries)) {
      try {
        const response = await this.makeHttpRequest(
          config.targetUrl,
          config.payload,
          config.headers,
          config.isFormEncoded,
        );

        const attemptRecord: WebhookAttempt = {
          attemptNumber: attempt + 1,
          statusCode: response.statusCode,
          responseBody: response.body,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };

        record.attempts.push(attemptRecord);

        // Check if we should retry
        if (
          this.retryConfig.retryOnStatusCodes.includes(response.statusCode) &&
          attempt < this.retryConfig.maxRetries &&
          !config.skipRetry
        ) {
          const delay = this.retryConfig.retryDelays[attempt] || 5000;
          console.log(
            `Webhook attempt ${attempt + 1} failed with status ${response.statusCode}. Retrying in ${delay}ms...`,
          );
          await this.sleep(delay);
          attempt++;
          continue;
        }

        // Success or non-retryable error
        this.webhookHistory.push(record);
        return {
          success: response.statusCode >= 200 && response.statusCode < 300,
          statusCode: response.statusCode,
          responseBody: response.body,
          attempts: attempt + 1,
          duration: Date.now() - startTime,
          record,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const attemptRecord: WebhookAttempt = {
          attemptNumber: attempt + 1,
          statusCode: 0,
          error: lastError.message,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };

        record.attempts.push(attemptRecord);

        if (attempt < this.retryConfig.maxRetries && !config.skipRetry) {
          const delay = this.retryConfig.retryDelays[attempt] || 5000;
          console.log(
            `Webhook attempt ${attempt + 1} failed with error: ${lastError.message}. Retrying in ${delay}ms...`,
          );
          await this.sleep(delay);
          attempt++;
          continue;
        }

        // All retries exhausted
        this.webhookHistory.push(record);
        return {
          success: false,
          statusCode: 0,
          error: lastError.message,
          attempts: attempt + 1,
          duration: Date.now() - startTime,
          record,
        };
      }
    }

    // Should never reach here
    this.webhookHistory.push(record);
    return {
      success: false,
      statusCode: 0,
      error: lastError?.message || 'Unknown error',
      attempts: attempt,
      duration: Date.now() - startTime,
      record,
    };
  }

  /**
   * Make HTTP request using fetch
   */
  private async makeHttpRequest(
    url: string,
    payload: any,
    headers: Record<string, string>,
    isFormEncoded: boolean = false,
  ): Promise<{ statusCode: number; body: any }> {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: isFormEncoded ? payload.toString() : JSON.stringify(payload),
    });

    let body: any;
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    return {
      statusCode: response.status,
      body,
    };
  }

  /**
   * Generate Circle signature
   * Circle uses HMAC SHA256
   */
  private generateCircleSignature(rawBody: string): string {
    return crypto
      .createHmac('sha256', this.secrets.circle)
      .update(rawBody)
      .digest('hex');
  }

  /**
   * Generate Yellow Card signature
   * Yellow Card uses HMAC SHA256
   */
  private generateYellowCardSignature(rawBody: string): string {
    return crypto
      .createHmac('sha256', this.secrets.yellowcard)
      .update(rawBody)
      .digest('hex');
  }

  /**
   * Generate Twilio signature
   * Twilio uses HMAC SHA1 with URL + sorted params
   */
  private generateTwilioSignature(
    url: string,
    payload: Record<string, any>,
  ): string {
    const sortedKeys = Object.keys(payload).sort();
    let data = url;

    for (const key of sortedKeys) {
      data += key + payload[key];
    }

    return crypto
      .createHmac('sha1', this.secrets.twilio)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64');
  }

  /**
   * Get webhook history
   */
  getHistory(): WebhookRecord[] {
    return this.webhookHistory;
  }

  /**
   * Clear webhook history
   */
  clearHistory(): void {
    this.webhookHistory = [];
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================
// Types
// ============================================

export interface RetryConfig {
  maxRetries: number;
  retryDelays: number[];
  retryOnStatusCodes: number[];
}

export interface WebhookOptions {
  headers?: Record<string, string>;
  skipRetry?: boolean;
}

export interface WebhookResponse {
  success: boolean;
  statusCode: number;
  responseBody?: any;
  error?: string;
  attempts: number;
  duration: number;
  record: WebhookRecord;
}

export interface WebhookRecord {
  id: string;
  provider: string;
  targetUrl: string;
  payload: any;
  headers: Record<string, string>;
  attempts: WebhookAttempt[];
  createdAt: string;
}

export interface WebhookAttempt {
  attemptNumber: number;
  statusCode: number;
  responseBody?: any;
  error?: string;
  duration: number;
  timestamp: string;
}

// Provider-specific payload types
export interface CircleWebhookPayload {
  subscriptionId?: string;
  notificationId?: string;
  notificationType: string;
  notification: any;
}

export interface YellowCardWebhookPayload {
  id: string;
  type: string;
  data: any;
  createdAt: string;
}

export interface TwilioWebhookPayload {
  MessageSid: string;
  MessageStatus: string;
  To: string;
  From: string;
  Body?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  SmsSid?: string;
  SmsStatus?: string;
  AccountSid?: string;
}
