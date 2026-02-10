import { Injectable, Logger } from '@nestjs/common';
import { IPaymentProvider, InitiateChargeParams, InitiateChargeResult, ConfirmChargeParams, ConfirmChargeResult } from '../../../domain/interfaces/payment-provider.interface';
import { PaymentMethodType } from '../../../domain/enums/payment-method-type.enum';

@Injectable()
export class WaveMockProvider implements IPaymentProvider {
  private readonly logger = new Logger(WaveMockProvider.name);

  getProviderCode(): string {
    return 'WAVECI';
  }

  getProviderName(): string {
    return 'Wave Côte d\'Ivoire';
  }

  getPaymentMethodType(): PaymentMethodType {
    return PaymentMethodType.QR_LINK;
  }

  getSupportedCurrencies(): string[] {
    return ['XOF'];
  }

  async initiateCharge(params: InitiateChargeParams): Promise<InitiateChargeResult> {
    this.logger.log(`Initiating Wave charge for ${params.amount} ${params.currency} to ${params.phoneNumber}`);

    // Check for server error mock
    if (params.phoneNumber === '+2250700000099') {
      throw new Error('Provider server error');
    }

    // Generate mock provider transaction ID
    const providerTransactionId = `wave_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Set expiration to 10 minutes for QR/Link payments
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Generate mock QR code data and deep link
    const qrCodeData = `wave://pay?amount=${params.amount}&currency=${params.currency}&ref=${providerTransactionId}&phone=${encodeURIComponent(params.phoneNumber)}`;
    const deepLinkUrl = `https://wave.com/pay?amount=${params.amount}&currency=${params.currency}&ref=${providerTransactionId}&phone=${encodeURIComponent(params.phoneNumber)}`;

    return {
      paymentMethodType: this.getPaymentMethodType(),
      providerTransactionId,
      instructions: 'Scannez le QR code ou appuyez sur le lien pour ouvrir Wave',
      qrCodeData,
      deepLinkUrl,
      expiresAt,
    };
  }

  async confirmCharge(params: ConfirmChargeParams): Promise<ConfirmChargeResult> {
    this.logger.log(`Confirming Wave charge: ${params.providerTransactionId}`);

    // For QR_LINK, confirmation happens via webhook when user pays
    // This method is mainly for status checking
    
    // Simulate immediate success for mock
    // In real implementation, this would check the payment status
    return {
      status: 'success',
      providerReference: `wave_ref_${Date.now()}`,
    };
  }

  async verifyTransaction(providerTransactionId: string): Promise<ConfirmChargeResult> {
    this.logger.log(`Verifying Wave transaction: ${providerTransactionId}`);

    // In mock, simulate successful payment
    return {
      status: 'success',
      providerReference: `wave_ref_${Date.now()}`,
    };
  }
}