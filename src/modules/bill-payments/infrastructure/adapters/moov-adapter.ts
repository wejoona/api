import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseBillAdapter } from './base-bill-adapter';
import {
  AccountValidationRequest,
  AccountValidationResult,
  BillPaymentRequest,
  BillPaymentResult,
  BillPaymentError,
  BillPaymentErrorCodes,
  BillProviderConfig,
} from '../../domain/types';

/**
 * Moov Africa Airtime Adapter
 * Phone credits for Moov/Flooz in West Africa (CI, BJ, TG, NE, etc.)
 */
@Injectable()
export class MoovAdapter extends BaseBillAdapter {
  readonly providerId = 'moov-airtime';

  constructor(private readonly configService: ConfigService) {
    const config: BillProviderConfig = {
      apiBaseUrl: configService.get<string>(
        'MOOV_API_URL',
        'https://api.moov-africa.com',
      ),
      apiKey: configService.get<string>('MOOV_API_KEY', ''),
      apiSecret: configService.get<string>('MOOV_API_SECRET'),
      merchantId: configService.get<string>('MOOV_MERCHANT_ID'),
      timeout: 30000,
      retryCount: 3,
    };

    super('Moov', config);
  }

  protected addAuthentication(config: any): any {
    config.headers['X-API-Key'] = this.config.apiKey;
    config.headers['X-Merchant-Id'] = this.config.merchantId;

    // Add signature for request integrity
    if (config.data) {
      const timestamp = Date.now().toString();
      const signature = this.generateSignature(config.data, timestamp);
      config.headers['X-Timestamp'] = timestamp;
      config.headers['X-Signature'] = signature;
    }

    return config;
  }

  private generateSignature(data: any, timestamp: string): string {
    const crypto = require('crypto');
    const payload = JSON.stringify(data) + timestamp + this.config.apiSecret;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  async validateAccount(
    request: AccountValidationRequest,
  ): Promise<AccountValidationResult> {
    return this.withRetry(async () => {
      try {
        const phoneNumber = this.formatPhoneNumber(request.accountNumber);

        const response = await this.httpClient.post('/v1/subscriber/check', {
          msisdn: phoneNumber,
          type: 'AIRTIME',
        });

        const data = response.data;

        if (data.code !== '200' || !data.subscriber) {
          return {
            isValid: false,
            accountNumber: phoneNumber,
            message: data.message || 'Subscriber not found',
          };
        }

        return {
          isValid: true,
          customerName: data.subscriber.name || 'Moov Subscriber',
          accountNumber: phoneNumber,
          accountType: data.subscriber.type,
          message: 'Valid Moov subscriber',
          metadata: {
            status: data.subscriber.status,
            country: data.subscriber.country,
          },
        };
      } catch (_error) {
        // For airtime, allow proceeding even if validation fails
        return {
          isValid: true,
          accountNumber: request.accountNumber,
          message: 'Validation skipped - will verify during top-up',
        };
      }
    });
  }

  private formatPhoneNumber(phone: string): string {
    let formatted = phone.replace(/[^\d+]/g, '');
    if (formatted.startsWith('+')) {
      formatted = formatted.substring(1);
    }
    return formatted;
  }

  async processPayment(
    request: BillPaymentRequest,
  ): Promise<BillPaymentResult> {
    return this.withRetry(async () => {
      try {
        const reference = this.generateReference('MOV');
        const phoneNumber = this.formatPhoneNumber(request.accountNumber);
        const country = this.getCountryFromPhone(phoneNumber);

        const response = await this.httpClient.post('/v1/airtime/topup', {
          msisdn: phoneNumber,
          amount: request.amount,
          currency: request.currency || 'XOF',
          reference: reference,
          country: country,
          description: `Airtime top-up for ${phoneNumber}`,
          notifyUrl: this.configService.get<string>('BILL_PAYMENT_WEBHOOK_URL'),
        });

        const data = response.data;

        if (data.code !== '200' && data.code !== '201') {
          throw new BillPaymentError(
            data.message || 'Top-up failed',
            BillPaymentErrorCodes.PAYMENT_FAILED,
            false,
          );
        }

        return {
          paymentId: data.transaction.id,
          transactionId: reference,
          status: this.mapStatus(data.transaction.status),
          receiptNumber: data.transaction.receipt,
          providerReference: data.transaction.providerRef,
          amount: request.amount,
          fee: data.transaction.fee || 0,
          totalAmount: request.amount + (data.transaction.fee || 0),
          currency: request.currency || 'XOF',
          paidAt:
            data.transaction.status === 'COMPLETED' ? new Date() : undefined,
          estimatedCompletionTime:
            data.transaction.status === 'PENDING' ? '1-5 minutes' : undefined,
          metadata: {
            msisdn: phoneNumber,
            country: country,
            operator: 'Moov',
          },
        };
      } catch (error) {
        if (error instanceof BillPaymentError) throw error;
        throw new BillPaymentError(
          'Failed to process Moov airtime top-up',
          BillPaymentErrorCodes.PAYMENT_FAILED,
          true,
        );
      }
    });
  }

  private getCountryFromPhone(phone: string): string {
    if (phone.startsWith('225')) return 'CI';
    if (phone.startsWith('229')) return 'BJ';
    if (phone.startsWith('228')) return 'TG';
    if (phone.startsWith('227')) return 'NE';
    if (phone.startsWith('226')) return 'BF';
    return 'CI';
  }

  async checkPaymentStatus(paymentId: string): Promise<BillPaymentResult> {
    try {
      const response = await this.httpClient.get(
        `/v1/airtime/status/${paymentId}`,
      );
      const data = response.data;

      if (data.code !== '200') {
        throw new BillPaymentError(
          'Transaction not found',
          BillPaymentErrorCodes.PROVIDER_ERROR,
          false,
        );
      }

      return {
        paymentId: data.transaction.id,
        transactionId: data.transaction.reference,
        status: this.mapStatus(data.transaction.status),
        receiptNumber: data.transaction.receipt,
        providerReference: data.transaction.providerRef,
        amount: parseFloat(data.transaction.amount),
        fee: parseFloat(data.transaction.fee) || 0,
        totalAmount: parseFloat(data.transaction.totalAmount),
        currency: data.transaction.currency,
        paidAt: data.transaction.completedAt
          ? new Date(data.transaction.completedAt)
          : undefined,
      };
    } catch (error) {
      if (error instanceof BillPaymentError) throw error;
      throw new BillPaymentError(
        'Failed to check payment status',
        BillPaymentErrorCodes.PROVIDER_ERROR,
        true,
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/v1/health', {
        timeout: 5000,
      });
      return response.status === 200 && response.data?.status === 'UP';
    } catch {
      return false;
    }
  }

  private mapStatus(
    providerStatus: string,
  ): 'pending' | 'processing' | 'completed' | 'failed' {
    const statusMap: Record<
      string,
      'pending' | 'processing' | 'completed' | 'failed'
    > = {
      PENDING: 'pending',
      INITIATED: 'pending',
      PROCESSING: 'processing',
      IN_PROGRESS: 'processing',
      COMPLETED: 'completed',
      SUCCESS: 'completed',
      SUCCESSFUL: 'completed',
      FAILED: 'failed',
      REJECTED: 'failed',
      CANCELLED: 'failed',
    };
    return statusMap[providerStatus?.toUpperCase()] || 'pending';
  }
}
