import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { BillPaymentRepository, BillProviderRepository } from '../../infrastructure/repositories';
import { BillPaymentReceipt } from '../../domain/types';

export interface GetReceiptInput {
  userId: string;
  paymentId: string;
}

@Injectable()
export class GetReceiptUseCase {
  private readonly logger = new Logger(GetReceiptUseCase.name);

  constructor(
    private readonly paymentRepository: BillPaymentRepository,
    private readonly providerRepository: BillProviderRepository,
  ) {}

  async execute(input: GetReceiptInput): Promise<BillPaymentReceipt> {
    this.logger.debug(`Getting receipt: paymentId=${input.paymentId}, userId=${input.userId}`);

    const payment = await this.paymentRepository.findById(input.paymentId);

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Verify ownership
    if (payment.userId !== input.userId) {
      throw new ForbiddenException('You do not have access to this receipt');
    }

    // Only completed payments have receipts
    if (payment.status !== 'completed') {
      throw new NotFoundException('Receipt not available for this payment');
    }

    // Get provider details
    const provider = await this.providerRepository.findById(payment.providerId);

    // Generate QR code URL with receipt data
    const qrData = JSON.stringify({
      receiptNumber: payment.receiptNumber,
      provider: provider?.shortName || 'Unknown',
      amount: Number(payment.totalAmount),
      currency: payment.currency,
      date: payment.completedAt?.toISOString(),
    });

    // Use external QR code API for generation
    const qrCode = this.generateQrCodeUrl(qrData);

    return {
      paymentId: payment.id,
      receiptNumber: payment.receiptNumber || `RCP-${payment.id.slice(0, 8).toUpperCase()}`,
      providerName: provider?.name || 'Unknown Provider',
      providerLogo: provider?.logo || '',
      category: payment.category,
      accountNumber: payment.accountNumber,
      customerName: payment.customerName || undefined,
      amount: Number(payment.amount),
      fee: Number(payment.fee),
      totalAmount: Number(payment.totalAmount),
      currency: payment.currency,
      tokenNumber: payment.tokenNumber || undefined,
      units: payment.units || undefined,
      status: payment.status,
      paidAt: payment.completedAt || payment.createdAt,
      providerReference: payment.providerReference || undefined,
      qrCode,
    };
  }

  /**
   * Generate a QR code URL using external API
   */
  private generateQrCodeUrl(data: string, size = 200): string {
    const encoded = encodeURIComponent(data);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
  }
}
