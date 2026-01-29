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
 * CIE (Compagnie Ivoirienne d'Electricite) Adapter
 * Electricity provider for Ivory Coast
 */
@Injectable()
export class CieAdapter extends BaseBillAdapter {
  readonly providerId = 'cie-ci';

  constructor(private readonly configService: ConfigService) {
    const config: BillProviderConfig = {
      apiBaseUrl: configService.get<string>(
        'CIE_API_URL',
        'https://api.cie.ci',
      ),
      apiKey: configService.get<string>('CIE_API_KEY', ''),
      apiSecret: configService.get<string>('CIE_API_SECRET'),
      merchantId: configService.get<string>('CIE_MERCHANT_ID'),
      timeout: 30000,
      retryCount: 3,
    };

    super('CIE', config);
  }

  protected addAuthentication(config: any): any {
    config.headers['X-API-Key'] = this.config.apiKey;
    if (this.config.merchantId) {
      config.headers['X-Merchant-ID'] = this.config.merchantId;
    }
    return config;
  }

  async validateAccount(
    request: AccountValidationRequest,
  ): Promise<AccountValidationResult> {
    return this.withRetry(async () => {
      try {
        const response = await this.httpClient.post('/v1/customer/lookup', {
          meterNumber: request.meterNumber || request.accountNumber,
          contractNumber: request.accountNumber,
        });

        const data = response.data;

        if (!data.success || !data.customer) {
          return {
            isValid: false,
            accountNumber: request.accountNumber,
            meterNumber: request.meterNumber,
            message: data.message || 'Account not found',
          };
        }

        return {
          isValid: true,
          customerName: data.customer.name,
          accountNumber: data.customer.contractNumber,
          meterNumber: data.customer.meterNumber,
          accountType: data.customer.tariffType,
          outstandingBalance: data.customer.outstandingAmount,
          minimumPayment: data.customer.minimumPayment,
          metadata: {
            address: data.customer.address,
            zone: data.customer.zone,
            lastPaymentDate: data.customer.lastPaymentDate,
          },
        };
      } catch (error) {
        if (error instanceof BillPaymentError) throw error;
        throw new BillPaymentError(
          'Failed to validate CIE account',
          BillPaymentErrorCodes.VALIDATION_FAILED,
          true,
        );
      }
    });
  }

  async processPayment(
    request: BillPaymentRequest,
  ): Promise<BillPaymentResult> {
    return this.withRetry(async () => {
      try {
        const reference = this.generateReference('CIE');

        const response = await this.httpClient.post('/v1/payments', {
          contractNumber: request.accountNumber,
          meterNumber: request.meterNumber,
          amount: request.amount,
          currency: request.currency || 'XOF',
          reference: reference,
          customerName: request.customerName,
          customerPhone: request.phone,
          customerEmail: request.email,
        });

        const data = response.data;

        if (!data.success) {
          throw new BillPaymentError(
            data.message || 'Payment failed',
            BillPaymentErrorCodes.PAYMENT_FAILED,
            false,
          );
        }

        return {
          paymentId: data.paymentId,
          transactionId: data.transactionId || reference,
          status: this.mapStatus(data.status),
          receiptNumber: data.receiptNumber,
          providerReference: data.providerReference,
          tokenNumber: data.tokenNumber,
          units: data.units ? `${data.units} kWh` : undefined,
          amount: request.amount,
          fee: data.fee || 0,
          totalAmount: request.amount + (data.fee || 0),
          currency: request.currency || 'XOF',
          paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
          metadata: {
            customerName: data.customerName,
            meterNumber: data.meterNumber,
          },
        };
      } catch (error) {
        if (error instanceof BillPaymentError) throw error;
        throw new BillPaymentError(
          'Failed to process CIE payment',
          BillPaymentErrorCodes.PAYMENT_FAILED,
          true,
        );
      }
    });
  }

  async checkPaymentStatus(paymentId: string): Promise<BillPaymentResult> {
    try {
      const response = await this.httpClient.get(
        `/v1/payments/${paymentId}/status`,
      );
      const data = response.data;

      return {
        paymentId: data.paymentId,
        transactionId: data.transactionId,
        status: this.mapStatus(data.status),
        receiptNumber: data.receiptNumber,
        providerReference: data.providerReference,
        tokenNumber: data.tokenNumber,
        units: data.units ? `${data.units} kWh` : undefined,
        amount: data.amount,
        fee: data.fee || 0,
        totalAmount: data.totalAmount,
        currency: data.currency,
        paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
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
      return response.status === 200;
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
      PROCESSING: 'processing',
      SUCCESS: 'completed',
      COMPLETED: 'completed',
      FAILED: 'failed',
      REJECTED: 'failed',
      CANCELLED: 'failed',
    };
    return statusMap[providerStatus?.toUpperCase()] || 'pending';
  }
}
