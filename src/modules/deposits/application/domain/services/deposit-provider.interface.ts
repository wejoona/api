import { PaymentMethodType, ProviderCode } from '../entities/deposit.entity';

export interface InitiateResult {
  providerReference: string;
  paymentMethodType: PaymentMethodType;
  instructions?: string;
  qrCodeData?: string;
  deepLinkUrl?: string;
}

export interface ConfirmResult {
  success: boolean;
  providerReference: string;
  failureReason?: string;
}

export interface DepositProviderInfo {
  code: ProviderCode;
  name: string;
  paymentMethodType: PaymentMethodType;
  available: boolean;
}

export interface IDepositProvider {
  initiate(params: { depositId: string; amount: number; phoneNumber: string; provider: ProviderCode }): Promise<InitiateResult>;
  confirm(params: { depositId: string; providerReference: string; otp?: string }): Promise<ConfirmResult>;
  getStatus(providerReference: string): Promise<'pending' | 'success' | 'failed' | 'timeout'>;
  getSupportedProviders(): DepositProviderInfo[];
}

export const DEPOSIT_PROVIDER = Symbol('DEPOSIT_PROVIDER');
