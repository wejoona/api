import { Injectable, Logger } from '@nestjs/common';
import { IPayoutProvider, InitiatePayoutParams, InitiatePayoutResult, VerifyPayoutResult } from '../../../domain/interfaces/payout-provider.interface';
import { PaymentMethodType } from '../../../../deposit/domain/enums/payment-method-type.enum';

@Injectable()
export class MtnPayoutMockProvider implements IPayoutProvider {
  private readonly logger = new Logger(MtnPayoutMockProvider.name);

  getProviderCode(): string { return 'MTNCI'; }
  getProviderName(): string { return 'MTN Mobile Money Côte d\'Ivoire'; }
  getPaymentMethodType(): PaymentMethodType { return PaymentMethodType.PUSH; }
  getSupportedCurrencies(): string[] { return ['XOF']; }

  async initiatePayout(params: InitiatePayoutParams): Promise<InitiatePayoutResult> {
    this.logger.log(`Initiating MTN payout: ${params.amount} ${params.currency} to ${params.phoneNumber}`);
    await this.delay(2000);

    return {
      providerTransactionId: `mtn_payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'completed',
      providerReference: `mtn_ref_${Date.now()}`,
    };
  }

  async verifyPayout(providerTransactionId: string): Promise<VerifyPayoutResult> {
    return { status: 'completed', providerReference: `mtn_ref_${Date.now()}` };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
