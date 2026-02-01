/**
 * EXAMPLE: How to propagate Correlation ID to external services
 *
 * This file demonstrates best practices for including correlation IDs
 * when calling external APIs and microservices.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { CorrelationService } from '../correlation.service';
import {
  withCorrelationId,
  createCorrelatedHttpClient,
} from '../http-client.helper';

/**
 * Example 1: Using withCorrelationId helper for single requests
 */
@Injectable()
export class BlnkLedgerAdapterExample {
  private readonly logger = new Logger(BlnkLedgerAdapterExample.name);
  private readonly baseURL: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly correlationService: CorrelationService,
  ) {
    this.baseURL = this.configService.get<string>('blnk.apiUrl');
  }

  async recordTransaction(transaction: any): Promise<any> {
    const correlationId = this.correlationService.getCorrelationId();

    this.logger.log(`[${correlationId}] Recording transaction in Blnk ledger`);

    try {
      // Use helper to add correlation ID to request
      const config = withCorrelationId(correlationId, {
        timeout: 5000,
      });

      const response = await axios.post(
        `${this.baseURL}/transactions`,
        transaction,
        config,
      );

      this.logger.log(
        `[${correlationId}] Transaction recorded: ${response.data.id}`,
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `[${correlationId}] Failed to record transaction: ${error.message}`,
      );
      throw error;
    }
  }

  async getBalance(accountId: string): Promise<number> {
    const correlationId = this.correlationService.getCorrelationId();

    this.logger.log(
      `[${correlationId}] Fetching balance from Blnk for account ${accountId}`,
    );

    const config = withCorrelationId(correlationId);

    const response = await axios.get(
      `${this.baseURL}/accounts/${accountId}/balance`,
      config,
    );

    return response.data.balance;
  }
}

/**
 * Example 2: Using createCorrelatedHttpClient for multiple requests
 */
@Injectable()
export class YellowCardAdapterExample {
  private readonly logger = new Logger(YellowCardAdapterExample.name);
  private readonly baseURL: string;
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly correlationService: CorrelationService,
  ) {
    this.baseURL = this.configService.get<string>('yellowCard.apiUrl');
    this.apiKey = this.configService.get<string>('yellowCard.apiKey');
  }

  async initiateDeposit(data: any): Promise<any> {
    const correlationId = this.correlationService.getCorrelationId();

    this.logger.log(
      `[${correlationId}] Initiating Yellow Card deposit for amount ${data.amount}`,
    );

    // Create HTTP client with automatic correlation ID injection
    const client = createCorrelatedHttpClient(correlationId, {
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    try {
      // All requests will automatically include X-Correlation-ID
      const response = await client.post('/deposits', data);

      this.logger.log(
        `[${correlationId}] Deposit initiated: ${response.data.id}`,
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `[${correlationId}] Deposit initiation failed: ${error.message}`,
      );
      throw error;
    }
  }

  async checkDepositStatus(depositId: string): Promise<any> {
    const correlationId = this.correlationService.getCorrelationId();

    this.logger.log(`[${correlationId}] Checking deposit status: ${depositId}`);

    const client = createCorrelatedHttpClient(correlationId, {
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    const response = await client.get(`/deposits/${depositId}`);

    return response.data;
  }
}

/**
 * Example 3: Using correlation ID with caching
 */
@Injectable()
export class CircleAdapterExample {
  private readonly logger = new Logger(CircleAdapterExample.name);
  private readonly baseURL: string;
  private readonly apiKey: string;
  private httpClient: AxiosInstance;

  constructor(
    private readonly configService: ConfigService,
    private readonly correlationService: CorrelationService,
  ) {
    this.baseURL = this.configService.get<string>('circle.apiUrl');
    this.apiKey = this.configService.get<string>('circle.apiKey');

    // Create base HTTP client
    this.httpClient = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    // Add request interceptor to inject correlation ID dynamically
    this.httpClient.interceptors.request.use((config) => {
      // Get correlation ID from current request context
      if (this.correlationService.hasCorrelationId()) {
        const correlationId = this.correlationService.getCorrelationId();
        config.headers['X-Correlation-ID'] = correlationId;

        this.logger.debug(
          `[${correlationId}] Outgoing request to Circle: ${config.method?.toUpperCase()} ${config.url}`,
        );
      }

      return config;
    });

    // Add response interceptor to log with correlation ID
    this.httpClient.interceptors.response.use(
      (response) => {
        if (this.correlationService.hasCorrelationId()) {
          const correlationId = this.correlationService.getCorrelationId();
          this.logger.debug(
            `[${correlationId}] Circle response: ${response.status} ${response.config.url}`,
          );
        }
        return response;
      },
      (error) => {
        if (this.correlationService.hasCorrelationId()) {
          const correlationId = this.correlationService.getCorrelationId();
          this.logger.error(
            `[${correlationId}] Circle request failed: ${error.message}`,
          );
        }
        return Promise.reject(error);
      },
    );
  }

  async createWallet(userId: string): Promise<any> {
    const correlationId = this.correlationService.getCorrelationId();

    this.logger.log(
      `[${correlationId}] Creating Circle wallet for user ${userId}`,
    );

    // HTTP client will automatically inject correlation ID via interceptor
    const response = await this.httpClient.post('/wallets', {
      userId,
    });

    this.logger.log(
      `[${correlationId}] Circle wallet created: ${response.data.walletId}`,
    );

    return response.data;
  }

  async getWalletBalance(walletId: string): Promise<number> {
    const correlationId = this.correlationService.getCorrelationId();

    this.logger.log(
      `[${correlationId}] Fetching Circle wallet balance: ${walletId}`,
    );

    const response = await this.httpClient.get(`/wallets/${walletId}/balance`);

    return response.data.balance;
  }
}

/**
 * Example 4: Handling correlation ID in webhook handlers
 */
@Injectable()
export class WebhookHandlerExample {
  private readonly logger = new Logger(WebhookHandlerExample.name);

  constructor(
    private readonly correlationService: CorrelationService,
    private readonly transferRepository: any,
  ) {}

  async handleYellowCardWebhook(payload: any): Promise<void> {
    // Webhooks might not have correlation ID in request scope
    // Generate or use webhook ID for tracking
    const correlationId = this.correlationService.hasCorrelationId()
      ? this.correlationService.getCorrelationId()
      : `webhook-${payload.id || Date.now()}`;

    this.logger.log(
      `[${correlationId}] Processing Yellow Card webhook: ${payload.event}`,
    );

    try {
      switch (payload.event) {
        case 'deposit.completed':
          await this.handleDepositCompleted(payload, correlationId);
          break;
        case 'deposit.failed':
          await this.handleDepositFailed(payload, correlationId);
          break;
        default:
          this.logger.warn(
            `[${correlationId}] Unknown webhook event: ${payload.event}`,
          );
      }

      this.logger.log(`[${correlationId}] Webhook processed successfully`);
    } catch (error) {
      this.logger.error(
        `[${correlationId}] Webhook processing failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async handleDepositCompleted(
    payload: any,
    correlationId: string,
  ): Promise<void> {
    this.logger.log(
      `[${correlationId}] Deposit completed: ${payload.depositId}`,
    );

    // Update transfer status
    await this.transferRepository.update(payload.transferId, {
      status: 'completed',
      externalId: payload.depositId,
    });
  }

  private async handleDepositFailed(
    payload: any,
    correlationId: string,
  ): Promise<void> {
    this.logger.error(
      `[${correlationId}] Deposit failed: ${payload.depositId}, reason: ${payload.reason}`,
    );

    await this.transferRepository.update(payload.transferId, {
      status: 'failed',
      failureReason: payload.reason,
    });
  }
}
