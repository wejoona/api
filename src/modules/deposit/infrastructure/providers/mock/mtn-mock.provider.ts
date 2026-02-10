import { Injectable, Logger } from '@nestjs/common';
import { IPaymentProvider, InitiateChargeParams, InitiateChargeResult, ConfirmChargeParams, ConfirmChargeResult } from '../../../domain/interfaces/payment-provider.interface';
import { PaymentMethodType } from '../../../domain/enums/payment-method-type.enum';

@Injectable()
export class MtnMockProvider implements IPaymentProvider {
  private readonly logger = new Logger(MtnMockProvider.name);
  private readonly pendingTransactions = new Map<string, boolean>();

  getProviderCode(): string {
    return 'MTNCI';
  }

  getProviderName(): string {
    return 'MTN Mobile Money Côte d\'Ivoire';
  }

  getPaymentMethodType(): PaymentMethodType {
    return PaymentMethodType.PUSH;
  }

  getSupportedCurrencies(): string[] {
    return ['XOF'];
  }

  async initiateCharge(params: InitiateChargeParams): Promise<InitiateChargeResult> {
    this.logger.log(`Initiating MTN charge for ${params.amount} ${params.currency} to ${params.phoneNumber}`);

    // Check for server error mock
    if (params.phoneNumber === '+2250700000099') {
      throw new Error('Provider server error');
    }

    // Generate mock provider transaction ID
    const providerTransactionId = `mtn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Set expiration to 5 minutes for PUSH notifications
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // For timeout mock, mark as pending but never resolve
    if (params.phoneNumber === '+2250700000006') {
      this.pendingTransactions.set(providerTransactionId, true);
    } else {
      // Auto-confirm after 3 seconds for successful scenarios
      setTimeout(() => {
        this.pendingTransactions.set(providerTransactionId, false);
      }, 3000);
    }

    return {
      paymentMethodType: this.getPaymentMethodType(),
      providerTransactionId,
      instructions: 'Vous recevrez une notification MTN Mobile Money. Approuvez avec votre code PIN.',
      expiresAt,
    };
  }

  async confirmCharge(params: ConfirmChargeParams): Promise<ConfirmChargeResult> {
    this.logger.log(`Confirming MTN charge: ${params.providerTransactionId}`);

    // For PUSH, we don't need OTP - user confirms on their phone
    // This is more like polling the status
    
    const isPending = this.pendingTransactions.get(params.providerTransactionId);
    
    if (isPending === undefined) {
      return {
        status: 'failed',
        failureReason: 'Transaction not found',
      };
    }

    if (isPending) {
      return {
        status: 'pending',
      };
    }

    // Transaction has been "confirmed" by user
    return {
      status: 'success',
      providerReference: `mtn_ref_${Date.now()}`,
    };
  }

  async verifyTransaction(providerTransactionId: string): Promise<ConfirmChargeResult> {
    this.logger.log(`Verifying MTN transaction: ${providerTransactionId}`);

    // In mock, use the same logic as confirm
    return this.confirmCharge({ providerTransactionId });
  }
}