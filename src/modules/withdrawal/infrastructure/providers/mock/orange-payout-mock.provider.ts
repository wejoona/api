import { Injectable, Logger } from '@nestjs/common';
import { IPayoutProvider, InitiatePayoutParams, InitiatePayoutResult, VerifyPayoutResult } from '../../../domain/interfaces/payout-provider.interface';
import { PaymentMethodType } from '../../../../deposit/domain/enums/payment-method-type.enum';

@Injectable()
export class OrangePayoutMockProvider implements IPayoutProvider {
  private readonly logger = new Logger(OrangePayoutMockProvider.name);

  getProviderCode(): string { return 'OMCI'; }
  getProviderName(): string { return 'Orange Money Côte d\'Ivoire'; }
  getPaymentMethodType(): PaymentMethodType { return PaymentMethodType.PUSH; }
  getSupportedCurrencies(): string[] { return ['XOF']; }

  async initiatePayout(params: InitiatePayoutParams): Promise<InitiatePayoutResult> {
    this.logger.log(`Initiating Orange payout: ${params.amount} ${params.currency} to ${params.phoneNumber}`);

    // Simulate processing delay
    await this.delay(1500);

    const providerTransactionId = `om_payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      providerTransactionId,
      status: 'completed',
      providerReference: `om_ref_${Date.now()}`,
    };
  }

  async verifyPayout(providerTransactionId: string): Promise<VerifyPayoutResult> {
    this.logger.log(`Verifying Orange payout: ${providerTransactionId}`);
    return { status: 'completed', providerReference: `om_ref_${Date.now()}` };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
