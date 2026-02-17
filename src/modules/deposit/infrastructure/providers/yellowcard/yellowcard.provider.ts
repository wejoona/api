import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import {
  IPaymentProvider,
  InitiateChargeParams,
  InitiateChargeResult,
  ConfirmChargeParams,
  ConfirmChargeResult,
} from '../../../domain/interfaces/payment-provider.interface';
import { PaymentMethodType } from '../../../domain/enums/payment-method-type.enum';

@Injectable()
export class YellowCardProvider implements IPaymentProvider {
  private readonly logger = new Logger(YellowCardProvider.name);
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly http: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('YELLOWCARD_API_KEY', '');
    this.secretKey = this.configService.get<string>('YELLOWCARD_SECRET_KEY', '');

    if (!this.apiKey || !this.secretKey) {
      this.logger.warn('Yellow Card provider created without full config — will fail on use');
    }

    const baseURL = this.configService.get<string>(
      'YELLOWCARD_API_URL',
      'https://sandbox.api.yellowcard.io',
    );

    this.http = axios.create({
      baseURL,
      timeout: 30_000,
      headers: {
        'Content-Type': 'application/json',
        YcKey: this.apiKey,
        YcSecret: this.secretKey,
      },
    });
  }

  getProviderCode(): string {
    return 'YELLOWCARD';
  }

  getProviderName(): string {
    return 'Yellow Card USDC On-Ramp';
  }

  getPaymentMethodType(): PaymentMethodType {
    return PaymentMethodType.REDIRECT;
  }

  getSupportedCurrencies(): string[] {
    return ['XOF'];
  }

  async initiateCharge(params: InitiateChargeParams): Promise<InitiateChargeResult> {
    this.logger.log(
      `Initiating Yellow Card payment: ${params.amount} ${params.currency} for tx ${params.transactionId}`,
    );

    const body = {
      amount: params.amount,
      currency: params.currency || 'XOF',
      cryptoCurrency: 'USDC',
      network: 'stellar', // or solana, depending on config
      reason: 'deposit',
      customerName: params.metadata?.customerName || 'Korido User',
      customerPhone: params.phoneNumber,
      reference: params.transactionId,
      metadata: {
        userId: params.userId,
        depositId: params.transactionId,
      },
    };

    const response = await this.callWithRetry(() =>
      this.http.post('/business/payments', body),
    );

    const data = response.data;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    this.logger.log(`Yellow Card payment created: id=${data.id}, status=${data.status}`);

    return {
      paymentMethodType: PaymentMethodType.REDIRECT,
      providerTransactionId: data.id,
      instructions: data.instructions || 'Follow the payment link to complete your USDC purchase.',
      deepLinkUrl: data.redirectUrl || data.paymentUrl,
      expiresAt,
    };
  }

  async confirmCharge(params: ConfirmChargeParams): Promise<ConfirmChargeResult> {
    return this.verifyTransaction(params.providerTransactionId);
  }

  async verifyTransaction(providerTransactionId: string): Promise<ConfirmChargeResult> {
    this.logger.log(`Verifying Yellow Card transaction: ${providerTransactionId}`);

    const response = await this.callWithRetry(() =>
      this.http.get(`/business/payments/${providerTransactionId}`),
    );

    const data = response.data;

    switch (data.status?.toLowerCase()) {
      case 'completed':
      case 'settled':
        return {
          status: 'success',
          providerReference: data.id,
        };
      case 'failed':
      case 'cancelled':
      case 'expired':
        return {
          status: 'failed',
          failureReason: data.statusMessage || `Payment ${data.status}`,
        };
      default:
        return { status: 'pending' };
    }
  }

  /**
   * Verify Yellow Card webhook HMAC signature.
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const expected = crypto
      .createHmac('sha256', this.secretKey)
      .update(rawBody)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected),
      );
    } catch {
      return false;
    }
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
            `Yellow Card API call failed after ${attempt + 1} attempt(s): ${error.message}`,
          );
          throw error;
        }

        const delay = 1000 * (attempt + 1);
        this.logger.warn(`Yellow Card retry ${attempt + 1}/${retries} in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw new Error('Unreachable');
  }
}
