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
 * SODECI (Societe de Distribution d'Eau de la Cote d'Ivoire) Adapter
 * Water provider for Ivory Coast
 */
@Injectable()
export class SodeciAdapter extends BaseBillAdapter {
  readonly providerId = 'sodeci-ci';

  constructor(private readonly configService: ConfigService) {
    const config: BillProviderConfig = {
      apiBaseUrl: configService.get<string>('SODECI_API_URL', 'https://api.sodeci.ci'),
      apiKey: configService.get<string>('SODECI_API_KEY', ''),
      apiSecret: configService.get<string>('SODECI_API_SECRET'),
      merchantId: configService.get<string>('SODECI_MERCHANT_ID'),
      timeout: 30000,
      retryCount: 3,
    };

    super('SODECI', config);
  }

  protected addAuthentication(config: any): any {
    // SODECI uses Basic Auth
    if (this.config.apiKey && this.config.apiSecret) {
      const credentials = Buffer.from(
        `${this.config.apiKey}:${this.config.apiSecret}`,
      ).toString('base64');
      config.headers['Authorization'] = `Basic ${credentials}`;
    }
    return config;
  }

  async validateAccount(request: AccountValidationRequest): Promise<AccountValidationResult> {
    return this.withRetry(async () => {
      try {
        const response = await this.httpClient.post('/api/v1/subscribers/validate', {
          subscriberNumber: request.accountNumber,
          meterNumber: request.meterNumber,
        });

        const data = response.data;

        if (data.code !== '00' || !data.subscriber) {
          return {
            isValid: false,
            accountNumber: request.accountNumber,
            meterNumber: request.meterNumber,
            message: data.message || 'Subscriber not found',
          };
        }

        return {
          isValid: true,
          customerName: data.subscriber.fullName,
          accountNumber: data.subscriber.subscriberNumber,
          meterNumber: data.subscriber.meterNumber,
          accountType: data.subscriber.category,
          outstandingBalance: parseFloat(data.subscriber.balance) || 0,
          minimumPayment: parseFloat(data.subscriber.minimumDue) || 0,
          metadata: {
            address: data.subscriber.address,
            commune: data.subscriber.commune,
            lastBillDate: data.subscriber.lastBillDate,
            lastBillAmount: data.subscriber.lastBillAmount,
          },
        };
      } catch (error) {
        if (error instanceof BillPaymentError) throw error;
        throw new BillPaymentError(
          'Failed to validate SODECI account',
          BillPaymentErrorCodes.VALIDATION_FAILED,
          true,
        );
      }
    });
  }

  async processPayment(request: BillPaymentRequest): Promise<BillPaymentResult> {
    return this.withRetry(async () => {
      try {
        const reference = this.generateReference('SDC');

        const response = await this.httpClient.post('/api/v1/payments/initiate', {
          subscriberNumber: request.accountNumber,
          meterNumber: request.meterNumber,
          amount: request.amount,
          currency: request.currency || 'XOF',
          externalReference: reference,
          payerName: request.customerName,
          payerPhone: request.phone,
        });

        const data = response.data;

        if (data.code !== '00') {
          throw new BillPaymentError(
            data.message || 'Payment initiation failed',
            BillPaymentErrorCodes.PAYMENT_FAILED,
            false,
          );
        }

        return {
          paymentId: data.payment.id,
          transactionId: reference,
          status: this.mapStatus(data.payment.status),
          receiptNumber: data.payment.receiptNumber,
          providerReference: data.payment.transactionRef,
          amount: request.amount,
          fee: data.payment.fee || 0,
          totalAmount: request.amount + (data.payment.fee || 0),
          currency: request.currency || 'XOF',
          paidAt: data.payment.processedAt ? new Date(data.payment.processedAt) : undefined,
          metadata: {
            subscriberName: data.payment.subscriberName,
            meterNumber: data.payment.meterNumber,
          },
        };
      } catch (error) {
        if (error instanceof BillPaymentError) throw error;
        throw new BillPaymentError(
          'Failed to process SODECI payment',
          BillPaymentErrorCodes.PAYMENT_FAILED,
          true,
        );
      }
    });
  }

  async checkPaymentStatus(paymentId: string): Promise<BillPaymentResult> {
    try {
      const response = await this.httpClient.get(`/api/v1/payments/${paymentId}`);
      const data = response.data;

      if (data.code !== '00') {
        throw new BillPaymentError(
          'Payment not found',
          BillPaymentErrorCodes.PROVIDER_ERROR,
          false,
        );
      }

      return {
        paymentId: data.payment.id,
        transactionId: data.payment.externalReference,
        status: this.mapStatus(data.payment.status),
        receiptNumber: data.payment.receiptNumber,
        providerReference: data.payment.transactionRef,
        amount: parseFloat(data.payment.amount),
        fee: parseFloat(data.payment.fee) || 0,
        totalAmount: parseFloat(data.payment.totalAmount),
        currency: data.payment.currency,
        paidAt: data.payment.processedAt ? new Date(data.payment.processedAt) : undefined,
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
      const response = await this.httpClient.get('/api/v1/status', { timeout: 5000 });
      return response.status === 200 && response.data?.status === 'OK';
    } catch {
      return false;
    }
  }

  private mapStatus(providerStatus: string): 'pending' | 'processing' | 'completed' | 'failed' {
    const statusMap: Record<string, 'pending' | 'processing' | 'completed' | 'failed'> = {
      'INITIATED': 'pending',
      'PENDING': 'pending',
      'IN_PROGRESS': 'processing',
      'SUCCESSFUL': 'completed',
      'COMPLETED': 'completed',
      'FAILED': 'failed',
      'CANCELLED': 'failed',
      'REVERSED': 'failed',
    };
    return statusMap[providerStatus?.toUpperCase()] || 'pending';
  }
}
