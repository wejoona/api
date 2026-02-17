import { Injectable, Logger } from '@nestjs/common';
import { IPayoutProvider, InitiatePayoutParams, InitiatePayoutResult, VerifyPayoutResult } from '../../../domain/interfaces/payout-provider.interface';
import { PaymentMethodType } from '../../../../deposit/domain/enums/payment-method-type.enum';

@Injectable()
export class WavePayoutMockProvider implements IPayoutProvider {
  private readonly logger = new Logger(WavePayoutMockProvider.name);

  getProviderCode(): string { return 'WAVECI'; }
  getProviderName(): string { return 'Wave Côte d\'Ivoire'; }
  getPaymentMethodType(): PaymentMethodType { return PaymentMethodType.PUSH; }
  getSupportedCurrencies(): string[] { return ['XOF']; }

  async initiatePayout(params: InitiatePayoutParams): Promise<InitiatePayoutResult> {
    this.logger.log(`Initiating Wave payout: ${params.amount} ${params.currency} to ${params.phoneNumber}`);
    await this.delay(1200);

    return {
      providerTransactionId: `wave_payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'completed',
      providerReference: `wave_ref_${Date.now()}`,
    };
  }

  async verifyPayout(providerTransactionId: string): Promise<VerifyPayoutResult> {
    return { status: 'completed', providerReference: `wave_ref_${Date.now()}` };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
