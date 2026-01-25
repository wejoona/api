import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
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
 * Orange Money Airtime/Credits Adapter
 * Phone credits for Orange in West Africa (CI, SN, ML, BF, etc.)
 */
@Injectable()
export class OrangeMoneyAdapter extends BaseBillAdapter {
  readonly providerId = 'orange-airtime';

  constructor(private readonly configService: ConfigService) {
    const config: BillProviderConfig = {
      apiBaseUrl: configService.get<string>('ORANGE_API_URL', 'https://api.orange.com'),
      apiKey: configService.get<string>('ORANGE_CLIENT_ID', ''),
      apiSecret: configService.get<string>('ORANGE_CLIENT_SECRET'),
      timeout: 30000,
      retryCount: 3,
    };

    super('OrangeMoney', config);
  }

  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  protected async addAuthentication(config: any): Promise<any> {
    const token = await this.getAccessToken();
    config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const credentials = Buffer.from(
        `${this.config.apiKey}:${this.config.apiSecret}`,
      ).toString('base64');

      const response = await this.httpClient.post(
        '/oauth/v3/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 60) * 1000);

      return this.accessToken!;
    } catch (error) {
      throw new BillPaymentError(
        'Failed to authenticate with Orange API',
        BillPaymentErrorCodes.PROVIDER_UNAVAILABLE,
        true,
      );
    }
  }

  async validateAccount(request: AccountValidationRequest): Promise<AccountValidationResult> {
    return this.withRetry(async () => {
      try {
        // Orange airtime doesn't require validation, just verify phone format
        const phoneNumber = request.accountNumber.replace(/\s+/g, '');

        // Check if it's a valid Orange number (simplified validation)
        const isValidOrangeNumber = this.isValidOrangeNumber(phoneNumber);

        if (!isValidOrangeNumber) {
          return {
            isValid: false,
            accountNumber: phoneNumber,
            message: 'Invalid Orange phone number format',
          };
        }

        // For airtime, we can optionally check subscriber status
        const response = await this.httpClient.get(
          `/sms/admin/v1/contracts?subscriberPhoneNumber=${encodeURIComponent(phoneNumber)}`,
        );

        const isActive = response.data?.partnerContracts?.length > 0;

        return {
          isValid: isActive,
          accountNumber: phoneNumber,
          customerName: isActive ? 'Orange Subscriber' : undefined,
          message: isActive ? 'Valid Orange subscriber' : 'Subscriber not found or inactive',
        };
      } catch (error) {
        // For airtime, we can proceed even if validation fails
        // The actual top-up will fail if the number is invalid
        return {
          isValid: true,
          accountNumber: request.accountNumber,
          message: 'Validation skipped - will verify during top-up',
        };
      }
    });
  }

  private isValidOrangeNumber(phone: string): boolean {
    // Orange number patterns for West African countries
    const patterns = [
      /^225(0[7-9]|[4-5][0-9])\d{7}$/, // Ivory Coast
      /^221(7[0-9])\d{7}$/, // Senegal
      /^223(7[0-9]|9[0-9])\d{6}$/, // Mali
      /^226(5[4-9]|6[0-9]|7[0-9])\d{6}$/, // Burkina Faso
    ];

    return patterns.some(pattern => pattern.test(phone));
  }

  async processPayment(request: BillPaymentRequest): Promise<BillPaymentResult> {
    return this.withRetry(async () => {
      try {
        const reference = this.generateReference('ONG');
        const phoneNumber = request.accountNumber.replace(/\s+/g, '');

        // Determine country from phone number
        const country = this.getCountryFromPhone(phoneNumber);

        const response = await this.httpClient.post(
          `/orange-money-webpay/${country}/v1/top-up`,
          {
            msisdn: phoneNumber,
            amount: request.amount,
            currency: request.currency || 'XOF',
            orderId: reference,
            description: `Airtime top-up for ${phoneNumber}`,
            notificationUrl: this.configService.get<string>('BILL_PAYMENT_WEBHOOK_URL'),
          },
        );

        const data = response.data;

        if (data.status !== 'SUCCESS' && data.status !== 'PENDING') {
          throw new BillPaymentError(
            data.message || 'Top-up failed',
            BillPaymentErrorCodes.PAYMENT_FAILED,
            false,
          );
        }

        return {
          paymentId: data.paymentId || data.transactionId,
          transactionId: reference,
          status: this.mapStatus(data.status),
          receiptNumber: data.receiptNumber || reference,
          providerReference: data.transactionId,
          amount: request.amount,
          fee: data.fee || 0,
          totalAmount: request.amount + (data.fee || 0),
          currency: request.currency || 'XOF',
          paidAt: data.status === 'SUCCESS' ? new Date() : undefined,
          estimatedCompletionTime: data.status === 'PENDING' ? '1-5 minutes' : undefined,
          metadata: {
            msisdn: phoneNumber,
            country: country,
          },
        };
      } catch (error) {
        if (error instanceof BillPaymentError) throw error;
        throw new BillPaymentError(
          'Failed to process Orange airtime top-up',
          BillPaymentErrorCodes.PAYMENT_FAILED,
          true,
        );
      }
    });
  }

  private getCountryFromPhone(phone: string): string {
    if (phone.startsWith('225')) return 'ci';
    if (phone.startsWith('221')) return 'sn';
    if (phone.startsWith('223')) return 'ml';
    if (phone.startsWith('226')) return 'bf';
    return 'ci'; // Default to Ivory Coast
  }

  async checkPaymentStatus(paymentId: string): Promise<BillPaymentResult> {
    try {
      const response = await this.httpClient.get(
        `/orange-money-webpay/v1/transactions/${paymentId}`,
      );

      const data = response.data;

      return {
        paymentId: data.paymentId,
        transactionId: data.orderId,
        status: this.mapStatus(data.status),
        receiptNumber: data.receiptNumber,
        providerReference: data.transactionId,
        amount: parseFloat(data.amount),
        fee: parseFloat(data.fee) || 0,
        totalAmount: parseFloat(data.totalAmount),
        currency: data.currency,
        paidAt: data.completedAt ? new Date(data.completedAt) : undefined,
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
      await this.getAccessToken();
      return true;
    } catch {
      return false;
    }
  }

  private mapStatus(providerStatus: string): 'pending' | 'processing' | 'completed' | 'failed' {
    const statusMap: Record<string, 'pending' | 'processing' | 'completed' | 'failed'> = {
      'PENDING': 'pending',
      'INITIATED': 'pending',
      'PROCESSING': 'processing',
      'SUCCESS': 'completed',
      'SUCCESSFUL': 'completed',
      'FAILED': 'failed',
      'CANCELLED': 'failed',
      'EXPIRED': 'failed',
    };
    return statusMap[providerStatus?.toUpperCase()] || 'pending';
  }
}
