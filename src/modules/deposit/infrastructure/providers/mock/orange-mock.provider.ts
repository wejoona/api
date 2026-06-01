import { Injectable, Logger } from '@nestjs/common';
import { IPaymentProvider, InitiateChargeParams, InitiateChargeResult, ConfirmChargeParams, ConfirmChargeResult } from '../../../domain/interfaces/payment-provider.interface';
import { PaymentMethodType } from '../../../domain/enums/payment-method-type.enum';

@Injectable()
export class OrangeMockProvider implements IPaymentProvider {
  private readonly logger = new Logger(OrangeMockProvider.name);

  getProviderCode(): string {
    return 'OMCI';
  }

  getProviderName(): string {
    return 'Orange Money Côte d\'Ivoire';
  }

  getPaymentMethodType(): PaymentMethodType {
    return PaymentMethodType.OTP;
  }

  getSupportedCurrencies(): string[] {
    return ['XOF'];
  }

  async initiateCharge(params: InitiateChargeParams): Promise<InitiateChargeResult> {
    this.logger.log(`Initiating Orange charge for ${params.amount} ${params.currency} to ${params.phoneNumber}`);

    // Check for server error mock
    if (params.phoneNumber === '+2250700000099') {
      throw new Error('Provider server error');
    }

    // Generate mock provider transaction ID. Keep failure cases explicit so
    // timestamps/random suffixes do not accidentally trigger failure paths.
    const failureMarker = params.phoneNumber === '+2250700000005' ? '_fail' : '';
    const providerTransactionId = `om${failureMarker}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Set expiration to 15 minutes from now
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    return {
      paymentMethodType: this.getPaymentMethodType(),
      providerTransactionId,
      instructions: 'Composez #144*82# pour obtenir votre code OTP',
      expiresAt,
    };
  }

  async confirmCharge(params: ConfirmChargeParams): Promise<ConfirmChargeResult> {
    this.logger.log(`Confirming Orange charge: ${params.providerTransactionId} with OTP: ${params.otp}`);

    if (!params.otp) {
      return {
        status: 'failed',
        failureReason: 'OTP is required for Orange Money transactions',
      };
    }

    // Simulate processing delay
    await this.delay(1000);

    // Extract phone number from transaction ID pattern to determine outcome
    // In real implementation, this would be stored separately
    const txId = params.providerTransactionId;
    
    // Mock failure for insufficient funds
    if (txId.includes('_fail_')) {
      return {
        status: 'failed',
        failureReason: 'Solde insuffisant',
      };
    }

    return {
      status: 'success',
      providerReference: `om_ref_${Date.now()}`,
    };
  }

  async verifyTransaction(providerTransactionId: string): Promise<ConfirmChargeResult> {
    this.logger.log(`Verifying Orange transaction: ${providerTransactionId}`);

    // In mock, assume all transactions that were successfully confirmed remain successful
    return {
      status: 'success',
      providerReference: `om_ref_${Date.now()}`,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
