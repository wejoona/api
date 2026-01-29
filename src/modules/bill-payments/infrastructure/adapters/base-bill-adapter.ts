import { Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  IBillProviderAdapter,
  AccountValidationRequest,
  AccountValidationResult,
  BillPaymentRequest,
  BillPaymentResult,
  BillProviderConfig,
  BillPaymentError,
  BillPaymentErrorCodes,
} from '../../domain/types';

/**
 * Base adapter for bill payment providers
 * Provides common functionality for all provider adapters
 */
export abstract class BaseBillAdapter implements IBillProviderAdapter {
  protected readonly logger: Logger;
  protected readonly httpClient: AxiosInstance;
  protected readonly config: BillProviderConfig;

  abstract readonly providerId: string;

  constructor(providerName: string, config: BillProviderConfig) {
    this.logger = new Logger(`${providerName}Adapter`);
    this.config = config;

    this.httpClient = axios.create({
      baseURL: config.apiBaseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup request/response interceptors for logging and error handling
   */
  private setupInterceptors(): void {
    // Request interceptor - add authentication
    this.httpClient.interceptors.request.use(
      (config) => {
        this.logger.debug(
          `Request: ${config.method?.toUpperCase()} ${config.url}`,
        );
        return this.addAuthentication(config);
      },
      (error) => {
        this.logger.error(`Request error: ${error.message}`);
        return Promise.reject(error);
      },
    );

    // Response interceptor - handle errors
    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.debug(
          `Response: ${response.status} ${response.config.url}`,
        );
        return response;
      },
      (error: AxiosError) => {
        return this.handleError(error);
      },
    );
  }

  /**
   * Add authentication headers to request
   * Override in specific adapters if needed
   */
  protected addAuthentication(config: any): any {
    if (this.config.apiKey) {
      config.headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    return config;
  }

  /**
   * Handle API errors with proper mapping
   */
  protected handleError(error: AxiosError): Promise<never> {
    const status = error.response?.status;
    const data = error.response?.data as any;

    this.logger.error(
      `API Error: ${status} - ${JSON.stringify(data)}`,
      error.stack,
    );

    // Map HTTP errors to bill payment errors
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new BillPaymentError(
        'Provider request timed out. Please try again.',
        BillPaymentErrorCodes.PAYMENT_TIMEOUT,
        true,
      );
    }

    if (!error.response) {
      throw new BillPaymentError(
        'Unable to reach provider. Please try again later.',
        BillPaymentErrorCodes.PROVIDER_UNAVAILABLE,
        true,
      );
    }

    // Parse provider-specific error
    const errorMessage = this.parseProviderError(data);

    if (status === 400) {
      throw new BillPaymentError(
        errorMessage || 'Invalid request to provider',
        BillPaymentErrorCodes.VALIDATION_FAILED,
        false,
      );
    }

    if (status === 404) {
      throw new BillPaymentError(
        errorMessage || 'Account not found',
        BillPaymentErrorCodes.INVALID_ACCOUNT,
        false,
      );
    }

    if (status === 503 || status === 502) {
      throw new BillPaymentError(
        'Provider temporarily unavailable',
        BillPaymentErrorCodes.PROVIDER_UNAVAILABLE,
        true,
      );
    }

    throw new BillPaymentError(
      errorMessage || 'Provider error occurred',
      BillPaymentErrorCodes.PROVIDER_ERROR,
      status === 500,
      { status, response: data },
    );
  }

  /**
   * Parse provider-specific error response
   * Override in specific adapters
   */
  protected parseProviderError(data: any): string | null {
    if (typeof data === 'string') return data;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (data?.errorMessage) return data.errorMessage;
    return null;
  }

  /**
   * Retry logic for transient failures
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.retryCount || 3,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (error instanceof BillPaymentError && !error.isRetryable) {
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          this.logger.warn(
            `Attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Generate unique reference for tracking
   */
  protected generateReference(prefix: string = 'BP'): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  // Abstract methods to be implemented by specific adapters
  abstract validateAccount(
    request: AccountValidationRequest,
  ): Promise<AccountValidationResult>;
  abstract processPayment(
    request: BillPaymentRequest,
  ): Promise<BillPaymentResult>;
  abstract checkPaymentStatus(paymentId: string): Promise<BillPaymentResult>;
  abstract isAvailable(): Promise<boolean>;
}
