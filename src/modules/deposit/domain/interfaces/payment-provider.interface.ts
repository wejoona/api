import { PaymentMethodType } from '../enums/payment-method-type.enum';

export interface InitiateChargeParams {
  amount: number;
  currency: string;
  phoneNumber: string;
  userId: string;
  transactionId: string;
  metadata?: Record<string, unknown>;
}

export interface InitiateChargeResult {
  paymentMethodType: PaymentMethodType;
  providerTransactionId: string;
  instructions: string;
  qrCodeData?: string;
  deepLinkUrl?: string;
  expiresAt: Date;
}

export interface ConfirmChargeParams {
  providerTransactionId: string;
  otp?: string;
}

export interface ConfirmChargeResult {
  status: 'success' | 'pending' | 'failed';
  providerReference?: string;
  failureReason?: string;
}

export interface IPaymentProvider {
  getProviderCode(): string;
  getProviderName(): string;
  getPaymentMethodType(): PaymentMethodType;
  getSupportedCurrencies(): string[];
  initiateCharge(params: InitiateChargeParams): Promise<InitiateChargeResult>;
  confirmCharge(params: ConfirmChargeParams): Promise<ConfirmChargeResult>;
  verifyTransaction(providerTransactionId: string): Promise<ConfirmChargeResult>;
}