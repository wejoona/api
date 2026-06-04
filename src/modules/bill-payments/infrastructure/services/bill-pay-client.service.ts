import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { ERROR_CODES } from '../../../../common/constants/error-codes';
import { AppException } from '../../../../common/exceptions';

@Injectable()
export class BillPayClientService {
  private readonly logger = new Logger(BillPayClientService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('billPay.baseUrl') ||
      'http://billpay:3400';
    this.apiKey = this.configService.get<string>('billPay.apiKey') || '';
  }

  private getHeaders(userId?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    if (userId) {
      headers['X-User-Id'] = userId;
    }
    return headers;
  }

  private handleError(error: unknown, context: string): never {
    if (error instanceof AxiosError) {
      const status = error.response?.status || HttpStatus.BAD_GATEWAY;
      if (!error.response || status >= 500) {
        this.logger.error(
          `Bill Pay ${context} unavailable: ${status} - ${JSON.stringify(error.response?.data)}`,
        );
        throw AppException.badRequest(
          ERROR_CODES.BILL_PAYMENTS_UNAVAILABLE,
          'Bill payments are not available right now',
          undefined,
          {
            reason: 'provider_or_feature_disabled',
            featureReason: 'bill_pay_unavailable',
            provider: 'bill-pay',
            retryable: true,
            supportReviewRequired: false,
          },
        );
      }

      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        `Bill Pay service error: ${context}`;
      this.logger.error(
        `Bill Pay ${context} failed: ${status} - ${JSON.stringify(error.response?.data)}`,
      );
      throw new HttpException(
        { statusCode: status, message, error: context },
        status,
      );
    }
    this.logger.error(`Bill Pay ${context} unexpected error: ${error}`);
    throw AppException.badRequest(
      ERROR_CODES.BILL_PAYMENTS_UNAVAILABLE,
      'Bill payments are not available right now',
      undefined,
      {
        reason: 'provider_or_feature_disabled',
        featureReason: 'bill_pay_unavailable',
        provider: 'bill-pay',
        retryable: true,
        supportReviewRequired: false,
      },
    );
  }

  async getProviders(params?: {
    country?: string;
    category?: string;
  }): Promise<any> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/v1/bills/providers`, {
          headers: this.getHeaders(),
          params,
        }),
      );
      return data;
    } catch (error) {
      this.handleError(error, 'getProviders');
    }
  }

  async getCategories(country?: string): Promise<any> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/v1/bills/categories`, {
          headers: this.getHeaders(),
          params: country ? { country } : undefined,
        }),
      );
      return data;
    } catch (error) {
      this.handleError(error, 'getCategories');
    }
  }

  async lookupBill(body: {
    providerId: string;
    accountNumber: string;
    meterNumber?: string;
  }): Promise<any> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/v1/bills/lookup`, body, {
          headers: this.getHeaders(),
        }),
      );
      return data;
    } catch (error) {
      this.handleError(error, 'lookupBill');
    }
  }

  async payBill(
    userId: string,
    body: Record<string, any>,
    idempotencyKey?: string,
  ): Promise<any> {
    try {
      const headers = this.getHeaders(userId);
      if (idempotencyKey) {
        headers['X-Idempotency-Key'] = idempotencyKey;
      }
      const { data } = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/v1/bills/pay`, body, {
          headers,
        }),
      );
      return data;
    } catch (error) {
      this.handleError(error, 'payBill');
    }
  }

  async listPayments(
    userId: string,
    params?: Record<string, any>,
  ): Promise<any> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/v1/bills/payments`, {
          headers: this.getHeaders(userId),
          params: { ...params, userId },
        }),
      );
      return data;
    } catch (error) {
      this.handleError(error, 'listPayments');
    }
  }

  async getPayment(userId: string, paymentId: string): Promise<any> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/v1/bills/payments/${paymentId}`,
          {
            headers: this.getHeaders(userId),
          },
        ),
      );
      return data;
    } catch (error) {
      this.handleError(error, 'getPayment');
    }
  }
}
