import { Injectable, Logger } from '@nestjs/common';
import { PaymentMethodType, ProviderCode } from '../entities/deposit.entity';
import { ConfirmResult, DepositProviderInfo, IDepositProvider, InitiateResult } from './deposit-provider.interface';

const PROVIDER_MAP: Record<ProviderCode, { name: string; type: PaymentMethodType }> = {
  [ProviderCode.OMCI]: { name: 'Orange Money', type: PaymentMethodType.OTP },
  [ProviderCode.MTNCI]: { name: 'MTN MoMo', type: PaymentMethodType.PUSH },
  [ProviderCode.MOOVCI]: { name: 'Moov Money', type: PaymentMethodType.PUSH },
  [ProviderCode.WAVECI]: { name: 'Wave', type: PaymentMethodType.QR_LINK },
};

@Injectable()
export class MockDepositProvider implements IDepositProvider {
  private readonly logger = new Logger(MockDepositProvider.name);

  async initiate(params: { depositId: string; amount: number; phoneNumber: string; provider: ProviderCode }): Promise<InitiateResult> {
    const { depositId, amount, phoneNumber, provider } = params;
    const providerInfo = PROVIDER_MAP[provider];
    const ref = `mock_${depositId.slice(0, 8)}_${Date.now()}`;

    this.logger.log(`[Mock] Initiate: ${provider} ${amount} XOF, phone=${phoneNumber}`);

    if (phoneNumber === '+2250700000099') throw new Error('Mock: Provider server error');

    const result: InitiateResult = { providerReference: ref, paymentMethodType: providerInfo.type };

    switch (providerInfo.type) {
      case PaymentMethodType.OTP:
        result.instructions = 'Dial #144*82# on your phone to receive your OTP code, then enter it below.';
        this.logger.log(`[Mock] OTP for ${phoneNumber}: 123456`);
        break;
      case PaymentMethodType.PUSH:
        result.instructions = 'A payment request has been sent to your phone. Please approve it by entering your MoMo PIN.';
        break;
      case PaymentMethodType.QR_LINK:
        result.qrCodeData = `https://pay.wave.com/mock/${ref}`;
        result.deepLinkUrl = `wave://pay?ref=${ref}&amount=${amount}`;
        result.instructions = 'Scan the QR code with your Wave app or tap the link below to pay.';
        break;
    }

    return result;
  }

  async confirm(params: { depositId: string; providerReference: string; otp?: string }): Promise<ConfirmResult> {
    const { providerReference, otp } = params;
    if (otp && otp !== '123456') {
      return { success: false, providerReference, failureReason: 'Invalid OTP code' };
    }
    return { success: true, providerReference };
  }

  async getStatus(providerReference: string): Promise<'pending' | 'success' | 'failed' | 'timeout'> {
    this.logger.log(`[Mock] Status check: ref=${providerReference}`);
    return 'success';
  }

  getSupportedProviders(): DepositProviderInfo[] {
    return Object.entries(PROVIDER_MAP).map(([code, info]) => ({
      code: code as ProviderCode,
      name: info.name,
      paymentMethodType: info.type,
      available: true,
    }));
  }
}
