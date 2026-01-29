import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  IBillProviderAdapter,
  AccountValidationRequest,
  AccountValidationResult,
  BillPaymentRequest,
  BillPaymentResult,
  BillPaymentError,
  BillPaymentErrorCodes,
} from '../../domain/types';

interface GenericAdapterConfig {
  providerId: string;
  providerName: string;
  baseUrl: string;
  apiKey: string;
  apiSecret?: string;
  timeout?: number;
  endpoints: {
    validate?: string;
    payment: string;
    status: string;
    health?: string;
  };
  requestMapping: {
    accountNumberField: string;
    amountField: string;
    currencyField: string;
    referenceField: string;
    additionalFields?: Record<string, string>;
  };
  responseMapping: {
    statusField: string;
    paymentIdField: string;
    receiptField?: string;
    tokenField?: string;
    feeField?: string;
    successStatuses: string[];
    pendingStatuses: string[];
    failedStatuses: string[];
  };
  authType: 'bearer' | 'basic' | 'apikey' | 'custom';
  authHeader?: string;
}

/**
 * Generic Bill Payment Adapter
 * Configurable adapter for providers without dedicated implementations
 * Allows quick integration of new providers via configuration
 */
@Injectable()
export class GenericBillAdapter implements IBillProviderAdapter {
  private readonly logger: Logger;
  private readonly httpClient: AxiosInstance;
  private readonly config: GenericAdapterConfig;

  readonly providerId: string;

  constructor(
    config: GenericAdapterConfig,
    private readonly configService: ConfigService,
  ) {
    this.config = config;
    this.providerId = config.providerId;
    this.logger = new Logger(`${config.providerName}Adapter`);

    this.httpClient = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    this.setupAuth();
  }

  private setupAuth(): void {
    this.httpClient.interceptors.request.use((config) => {
      switch (this.config.authType) {
        case 'bearer':
          config.headers['Authorization'] = `Bearer ${this.config.apiKey}`;
          break;
        case 'basic':
          const credentials = Buffer.from(
            `${this.config.apiKey}:${this.config.apiSecret || ''}`,
          ).toString('base64');
          config.headers['Authorization'] = `Basic ${credentials}`;
          break;
        case 'apikey':
          const headerName = this.config.authHeader || 'X-API-Key';
          config.headers[headerName] = this.config.apiKey;
          break;
      }
      return config;
    });
  }

  async validateAccount(
    request: AccountValidationRequest,
  ): Promise<AccountValidationResult> {
    if (!this.config.endpoints.validate) {
      // Provider doesn't support validation
      return {
        isValid: true,
        accountNumber: request.accountNumber,
        message: 'Validation not supported - will verify during payment',
      };
    }

    try {
      const payload: Record<string, any> = {
        [this.config.requestMapping.accountNumberField]: request.accountNumber,
      };

      if (request.meterNumber) {
        payload['meterNumber'] = request.meterNumber;
      }

      const response = await this.httpClient.post(
        this.config.endpoints.validate,
        payload,
      );
      const data = response.data;

      // Map response based on configuration
      const isValid = this.isSuccessStatus(
        data[this.config.responseMapping.statusField],
      );

      return {
        isValid,
        accountNumber: request.accountNumber,
        meterNumber: request.meterNumber,
        customerName: data.customerName || data.name || data.subscriber?.name,
        outstandingBalance: data.balance || data.outstandingAmount,
        message:
          data.message || (isValid ? 'Account validated' : 'Validation failed'),
        metadata: data,
      };
    } catch (error) {
      this.logger.warn(`Validation failed for ${this.providerId}: ${error}`);
      return {
        isValid: true,
        accountNumber: request.accountNumber,
        message: 'Validation skipped - will verify during payment',
      };
    }
  }

  async processPayment(
    request: BillPaymentRequest,
  ): Promise<BillPaymentResult> {
    const reference = this.generateReference();

    try {
      const payload: Record<string, any> = {
        [this.config.requestMapping.accountNumberField]: request.accountNumber,
        [this.config.requestMapping.amountField]: request.amount,
        [this.config.requestMapping.currencyField]: request.currency,
        [this.config.requestMapping.referenceField]: reference,
      };

      // Add additional configured fields
      if (this.config.requestMapping.additionalFields) {
        for (const [key, value] of Object.entries(
          this.config.requestMapping.additionalFields,
        )) {
          payload[key] = (request as any)[value] || value;
        }
      }

      if (request.meterNumber) {
        payload['meterNumber'] = request.meterNumber;
      }

      if (request.customerName) {
        payload['customerName'] = request.customerName;
      }

      if (request.phone) {
        payload['phone'] = request.phone;
      }

      const response = await this.httpClient.post(
        this.config.endpoints.payment,
        payload,
      );
      const data = response.data;

      const status = this.mapStatus(
        data[this.config.responseMapping.statusField],
      );

      return {
        paymentId:
          data[this.config.responseMapping.paymentIdField] || reference,
        transactionId: reference,
        status,
        receiptNumber:
          data[this.config.responseMapping.receiptField || 'receiptNumber'],
        providerReference: data.providerReference || data.transactionId,
        tokenNumber: data[this.config.responseMapping.tokenField || 'token'],
        amount: request.amount,
        fee:
          parseFloat(data[this.config.responseMapping.feeField || 'fee']) || 0,
        totalAmount:
          request.amount +
          (parseFloat(data[this.config.responseMapping.feeField || 'fee']) ||
            0),
        currency: request.currency,
        paidAt: status === 'completed' ? new Date() : undefined,
        estimatedCompletionTime:
          status === 'pending' ? '1-30 minutes' : undefined,
        metadata: data,
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Payment failed';
      throw new BillPaymentError(
        errorMessage,
        BillPaymentErrorCodes.PAYMENT_FAILED,
        this.isRetryableError(error),
      );
    }
  }

  async checkPaymentStatus(paymentId: string): Promise<BillPaymentResult> {
    try {
      const endpoint = this.config.endpoints.status.replace(':id', paymentId);
      const response = await this.httpClient.get(endpoint);
      const data = response.data;

      return {
        paymentId:
          data[this.config.responseMapping.paymentIdField] || paymentId,
        transactionId: data.reference || data.externalId,
        status: this.mapStatus(data[this.config.responseMapping.statusField]),
        receiptNumber:
          data[this.config.responseMapping.receiptField || 'receiptNumber'],
        providerReference: data.providerReference,
        tokenNumber: data[this.config.responseMapping.tokenField || 'token'],
        amount: parseFloat(data.amount),
        fee:
          parseFloat(data[this.config.responseMapping.feeField || 'fee']) || 0,
        totalAmount: parseFloat(data.totalAmount) || parseFloat(data.amount),
        currency: data.currency,
        paidAt: data.completedAt ? new Date(data.completedAt) : undefined,
      };
    } catch (_error) {
      throw new BillPaymentError(
        'Failed to check payment status',
        BillPaymentErrorCodes.PROVIDER_ERROR,
        true,
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.config.endpoints.health) {
      return true; // Assume available if no health endpoint
    }

    try {
      const response = await this.httpClient.get(this.config.endpoints.health, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private isSuccessStatus(status: string): boolean {
    return this.config.responseMapping.successStatuses.includes(
      status?.toUpperCase(),
    );
  }

  private mapStatus(
    status: string,
  ): 'pending' | 'processing' | 'completed' | 'failed' {
    const upperStatus = status?.toUpperCase();

    if (this.config.responseMapping.successStatuses.includes(upperStatus)) {
      return 'completed';
    }
    if (this.config.responseMapping.pendingStatuses.includes(upperStatus)) {
      return 'pending';
    }
    if (this.config.responseMapping.failedStatuses.includes(upperStatus)) {
      return 'failed';
    }

    return 'pending';
  }

  private generateReference(): string {
    const prefix = this.providerId.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  private isRetryableError(error: any): boolean {
    const status = error.response?.status;
    return !status || status >= 500 || status === 429;
  }
}

/**
 * Factory for creating generic adapters from database configuration
 */
export class GenericAdapterFactory {
  static create(
    config: GenericAdapterConfig,
    configService: ConfigService,
  ): GenericBillAdapter {
    return new GenericBillAdapter(config, configService);
  }
}
