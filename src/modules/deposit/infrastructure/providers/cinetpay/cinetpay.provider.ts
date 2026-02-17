import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  IPaymentProvider,
  InitiateChargeParams,
  InitiateChargeResult,
  ConfirmChargeParams,
  ConfirmChargeResult,
} from '../../../domain/interfaces/payment-provider.interface';
import { PaymentMethodType } from '../../../domain/enums/payment-method-type.enum';

@Injectable()
export class CinetPayProvider implements IPaymentProvider {
  private readonly logger = new Logger(CinetPayProvider.name);
  private readonly apiKey: string;
  private readonly siteId: string;
  private readonly secretKey: string;
  private readonly notifyUrl: string;
  private readonly http: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('CINETPAY_API_KEY', '');
    this.siteId = this.configService.get<string>('CINETPAY_SITE_ID', '');
    this.secretKey = this.configService.get<string>('CINETPAY_SECRET_KEY', '');
    this.notifyUrl = this.configService.get<string>('CINETPAY_NOTIFY_URL', '');

    if (!this.apiKey || !this.siteId || !this.secretKey) {
      this.logger.warn('CinetPay provider created without full config — will fail on use');
    }

    this.http = axios.create({
      baseURL: 'https://api-checkout.cinetpay.com/v2',
      timeout: 30_000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  getProviderCode(): string {
    return 'CINETPAY';
  }

  getProviderName(): string {
    return 'CinetPay Mobile Money';
  }

  getPaymentMethodType(): PaymentMethodType {
    return PaymentMethodType.REDIRECT;
  }

  getSupportedCurrencies(): string[] {
    return ['XOF'];
  }

  async initiateCharge(params: InitiateChargeParams): Promise<InitiateChargeResult> {
    this.logger.log(
      `Initiating CinetPay charge: ${params.amount} ${params.currency} for tx ${params.transactionId}`,
    );

    const body = {
      apikey: this.apiKey,
      site_id: this.siteId,
      transaction_id: params.transactionId,
      amount: params.amount,
      currency: params.currency || 'XOF',
      description: 'Dépôt Korido',
      notify_url: this.notifyUrl,
      return_url: 'https://korido.app/deposit/success',
      channels: 'MOBILE_MONEY',
      customer_name: params.metadata?.customerName || params.userId,
      customer_phone_number: params.phoneNumber,
      customer_country: (params.metadata?.country as string) || 'CI',
    };

    const response = await this.callWithRetry(() => this.http.post('/payment', body));

    const data = response.data;
    if (data.code !== '201') {
      this.logger.error(`CinetPay initiation failed: ${JSON.stringify(data)}`);
      throw new Error(`CinetPay error: ${data.message || 'Unknown error'}`);
    }

    const paymentData = data.data;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    this.logger.log(`CinetPay charge initiated: payment_token=${paymentData.payment_token}`);

    return {
      paymentMethodType: PaymentMethodType.REDIRECT,
      providerTransactionId: params.transactionId,
      instructions: `Veuillez compléter votre paiement via le lien fourni.`,
      deepLinkUrl: paymentData.payment_url,
      expiresAt,
    };
  }

  async confirmCharge(params: ConfirmChargeParams): Promise<ConfirmChargeResult> {
    // For REDIRECT flows, confirmation comes via webhook. Use verifyTransaction instead.
    return this.verifyTransaction(params.providerTransactionId);
  }

  async verifyTransaction(providerTransactionId: string): Promise<ConfirmChargeResult> {
    this.logger.log(`Verifying CinetPay transaction: ${providerTransactionId}`);

    const body = {
      apikey: this.apiKey,
      site_id: this.siteId,
      transaction_id: providerTransactionId,
    };

    const response = await this.callWithRetry(() =>
      this.http.post('/payment/check', body),
    );

    const data = response.data;
    if (data.code === '00' && data.data?.status === 'ACCEPTED') {
      return {
        status: 'success',
        providerReference: data.data.payment_id || providerTransactionId,
      };
    }

    if (data.data?.status === 'REFUSED' || data.data?.status === 'CANCELLED') {
      return {
        status: 'failed',
        failureReason: data.data?.description || data.message || 'Payment refused',
      };
    }

    return { status: 'pending' };
  }

  /**
   * Verify CinetPay webhook signature by re-checking the transaction status.
   * CinetPay doesn't use HMAC; the recommended approach is to call /payment/check
   * with the transaction_id from the webhook to confirm legitimacy.
   */
  async verifyWebhookAndGetStatus(
    transactionId: string,
  ): Promise<{ verified: boolean; result: ConfirmChargeResult }> {
    const result = await this.verifyTransaction(transactionId);
    return { verified: true, result };
  }

  private async callWithRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        const isLast = attempt === retries;
        const isRetryable =
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT' ||
          error.response?.status >= 500;

        if (isLast || !isRetryable) {
          this.logger.error(
            `CinetPay API call failed after ${attempt + 1} attempt(s): ${error.message}`,
          );
          throw error;
        }

        const delay = 1000 * (attempt + 1);
        this.logger.warn(`CinetPay retry ${attempt + 1}/${retries} in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw new Error('Unreachable');
  }
}
