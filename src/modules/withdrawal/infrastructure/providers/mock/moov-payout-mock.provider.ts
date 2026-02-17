import { Injectable, Logger } from '@nestjs/common';
import { IPayoutProvider, InitiatePayoutParams, InitiatePayoutResult, VerifyPayoutResult } from '../../../domain/interfaces/payout-provider.interface';
import { PaymentMethodType } from '../../../../deposit/domain/enums/payment-method-type.enum';

@Injectable()
export class MoovPayoutMockProvider implements IPayoutProvider {
  private readonly logger = new Logger(MoovPayoutMockProvider.name);

  getProviderCode(): string { return 'MOOVCI'; }
  getProviderName(): string { return 'Moov Money Côte d\'Ivoire'; }
  getPaymentMethodType(): PaymentMethodType { return PaymentMethodType.PUSH; }
  getSupportedCurrencies(): string[] { return ['XOF']; }

  async initiatePayout(params: InitiatePayoutParams): Promise<InitiatePayoutResult> {
    this.logger.log(`Initiating Moov payout: ${params.amount} ${params.currency} to ${params.phoneNumber}`);
    await this.delay(1800);

    return {
      providerTransactionId: `moov_payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'completed',
      providerReference: `moov_ref_${Date.now()}`,
    };
  }

  async verifyPayout(providerTransactionId: string): Promise<VerifyPayoutResult> {
    return { status: 'completed', providerReference: `moov_ref_${Date.now()}` };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
