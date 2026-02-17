import { PaymentMethodType } from '../../../deposit/domain/enums/payment-method-type.enum';

export interface InitiatePayoutParams {
  amount: number; // fiat amount
  currency: string;
  phoneNumber: string;
  userId: string;
  transactionId: string;
  metadata?: Record<string, unknown>;
}

export interface InitiatePayoutResult {
  providerTransactionId: string;
  status: 'pending' | 'completed' | 'failed';
  providerReference?: string;
  failureReason?: string;
  estimatedCompletionMs?: number;
}

export interface VerifyPayoutResult {
  status: 'pending' | 'completed' | 'failed';
  providerReference?: string;
  failureReason?: string;
}

export interface IPayoutProvider {
  getProviderCode(): string;
  getProviderName(): string;
  getPaymentMethodType(): PaymentMethodType;
  getSupportedCurrencies(): string[];
  initiatePayout(params: InitiatePayoutParams): Promise<InitiatePayoutResult>;
  verifyPayout(providerTransactionId: string): Promise<VerifyPayoutResult>;
}
