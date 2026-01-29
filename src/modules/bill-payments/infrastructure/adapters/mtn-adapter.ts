import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
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
 * MTN Mobile Money Airtime Adapter
 * Phone credits for MTN in West Africa (CI, GH, NG, CM, etc.)
 */
@Injectable()
export class MtnAdapter extends BaseBillAdapter {
  readonly providerId = 'mtn-airtime';

  constructor(private readonly configService: ConfigService) {
    const config: BillProviderConfig = {
      apiBaseUrl: configService.get<string>(
        'MTN_API_URL',
        'https://sandbox.momodeveloper.mtn.com',
      ),
      apiKey: configService.get<string>('MTN_SUBSCRIPTION_KEY', ''),
      apiSecret: configService.get<string>('MTN_API_KEY'),
      timeout: 30000,
      retryCount: 3,
    };

    super('MTN', config);
  }

  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  protected async addAuthentication(config: any): Promise<any> {
    const token = await this.getAccessToken();
    config.headers['Authorization'] = `Bearer ${token}`;
    config.headers['Ocp-Apim-Subscription-Key'] = this.config.apiKey;
    config.headers['X-Target-Environment'] = this.configService.get<string>(
      'MTN_ENVIRONMENT',
      'sandbox',
    );
    return config;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const apiUserId = this.configService.get<string>('MTN_API_USER_ID');
      const credentials = Buffer.from(
        `${apiUserId}:${this.config.apiSecret}`,
      ).toString('base64');

      const response = await this.httpClient.post(
        '/disbursement/token/',
        {},
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Ocp-Apim-Subscription-Key': this.config.apiKey,
          },
        },
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(
        Date.now() + (response.data.expires_in - 60) * 1000,
      );

      return this.accessToken;
    } catch (_error) {
      throw new BillPaymentError(
        'Failed to authenticate with MTN API',
        BillPaymentErrorCodes.PROVIDER_UNAVAILABLE,
        true,
      );
    }
  }

  async validateAccount(
    request: AccountValidationRequest,
  ): Promise<AccountValidationResult> {
    return this.withRetry(async () => {
      try {
        const phoneNumber = this.formatPhoneNumber(request.accountNumber);

        // MTN provides account holder info endpoint
        const response = await this.httpClient.get(
          `/disbursement/v1_0/accountholder/msisdn/${phoneNumber}/basicuserinfo`,
        );

        const data = response.data;

        return {
          isValid: true,
          customerName: data.name || data.given_name || 'MTN Subscriber',
          accountNumber: phoneNumber,
          accountType: data.account_type,
          message: 'Valid MTN subscriber',
          metadata: {
            gender: data.gender,
            locale: data.locale,
            status: data.status,
          },
        };
      } catch (error: any) {
        if (error.response?.status === 404) {
          return {
            isValid: false,
            accountNumber: request.accountNumber,
            message: 'MTN subscriber not found',
          };
        }

        // For airtime, we can proceed even if validation fails
        return {
          isValid: true,
          accountNumber: request.accountNumber,
          message: 'Validation skipped - will verify during top-up',
        };
      }
    });
  }

  private formatPhoneNumber(phone: string): string {
    // Remove spaces and non-numeric characters except +
    let formatted = phone.replace(/[^\d+]/g, '');

    // Remove leading + if present
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
        const referenceId = uuidv4();
        const phoneNumber = this.formatPhoneNumber(request.accountNumber);
        const country = this.getCountryFromPhone(phoneNumber);

        // MTN uses disbursement API for airtime
        const response = await this.httpClient.post(
          '/disbursement/v1_0/transfer',
          {
            amount: request.amount.toString(),
            currency: request.currency || 'XOF',
            externalId: referenceId,
            payee: {
              partyIdType: 'MSISDN',
              partyId: phoneNumber,
            },
            payerMessage: `Airtime top-up`,
            payeeNote: `Airtime credit for ${phoneNumber}`,
          },
          {
            headers: {
              'X-Reference-Id': referenceId,
            },
          },
        );

        // MTN returns 202 Accepted for async processing
        if (response.status === 202) {
          return {
            paymentId: referenceId,
            transactionId: referenceId,
            status: 'processing',
            amount: request.amount,
            fee: 0,
            totalAmount: request.amount,
            currency: request.currency || 'XOF',
            estimatedCompletionTime: '1-5 minutes',
            metadata: {
              msisdn: phoneNumber,
              country: country,
            },
          };
        }

        throw new BillPaymentError(
          'Unexpected response from MTN',
          BillPaymentErrorCodes.PAYMENT_FAILED,
          true,
        );
      } catch (error) {
        if (error instanceof BillPaymentError) throw error;
        throw new BillPaymentError(
          'Failed to process MTN airtime top-up',
          BillPaymentErrorCodes.PAYMENT_FAILED,
          true,
        );
      }
    });
  }

  private getCountryFromPhone(phone: string): string {
    if (phone.startsWith('225')) return 'CI';
    if (phone.startsWith('233')) return 'GH';
    if (phone.startsWith('234')) return 'NG';
    if (phone.startsWith('237')) return 'CM';
    if (phone.startsWith('256')) return 'UG';
    return 'CI';
  }

  async checkPaymentStatus(paymentId: string): Promise<BillPaymentResult> {
    try {
      const response = await this.httpClient.get(
        `/disbursement/v1_0/transfer/${paymentId}`,
      );

      const data = response.data;

      return {
        paymentId: paymentId,
        transactionId: data.externalId,
        status: this.mapStatus(data.status),
        receiptNumber: data.financialTransactionId,
        providerReference: data.financialTransactionId,
        amount: parseFloat(data.amount),
        fee: 0,
        totalAmount: parseFloat(data.amount),
        currency: data.currency,
        paidAt: data.status === 'SUCCESSFUL' ? new Date() : undefined,
        metadata: {
          payeeNote: data.payeeNote,
          reason: data.reason,
        },
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

  private mapStatus(
    providerStatus: string,
  ): 'pending' | 'processing' | 'completed' | 'failed' {
    const statusMap: Record<
      string,
      'pending' | 'processing' | 'completed' | 'failed'
    > = {
      PENDING: 'pending',
      PROCESSING: 'processing',
      SUCCESSFUL: 'completed',
      FAILED: 'failed',
    };
    return statusMap[providerStatus?.toUpperCase()] || 'pending';
  }
}
