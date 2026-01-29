import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PaymentRequestEntity } from '../../domain/entities/payment-request.entity';
import { MerchantRepository } from '../../infrastructure/repositories/merchant.repository';
import { PaymentRequestRepository } from '../../infrastructure/repositories/payment-request.repository';
import { QrCodeService } from './qr-code.service';

export interface CreatePaymentRequestInput {
  userId: string;
  merchantId: string;
  amount: number;
  currency?: string;
  description?: string;
  reference?: string;
  expiresInMinutes?: number;
}

export interface CreatePaymentRequestOutput {
  requestId: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  currency: string;
  description?: string;
  qrData: string;
  qrCodeUrl: string;
  expiresAt: Date;
  expiresInSeconds: number;
}

/**
 * Create Payment Request Use Case
 * Creates a dynamic payment request with a specific amount
 */
@Injectable()
export class CreatePaymentRequestUseCase {
  private readonly logger = new Logger(CreatePaymentRequestUseCase.name);

  constructor(
    private readonly merchantRepository: MerchantRepository,
    private readonly paymentRequestRepository: PaymentRequestRepository,
    private readonly qrCodeService: QrCodeService,
  ) {}

  async execute(
    input: CreatePaymentRequestInput,
  ): Promise<CreatePaymentRequestOutput> {
    const {
      userId,
      merchantId,
      amount,
      currency,
      description,
      reference,
      expiresInMinutes,
    } = input;

    this.logger.log(`Creating payment request for merchant ${merchantId}`);

    // 1. Validate amount
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    if (amount > 10000) {
      throw new BadRequestException(
        'Amount exceeds maximum allowed (10,000 USDC)',
      );
    }

    // 2. Find and validate merchant
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    // 3. Verify ownership
    if (merchant.ownerId !== userId) {
      throw new ForbiddenException(
        'You are not authorized to create payment requests for this merchant',
      );
    }

    // 4. Validate merchant status
    if (!merchant.isActive) {
      throw new BadRequestException('Merchant account is not active');
    }

    if (!merchant.isVerified) {
      throw new BadRequestException('Merchant account is not verified');
    }

    // 5. Check if merchant can accept this amount
    const canAccept = merchant.canAcceptPayment(amount);
    if (!canAccept.allowed) {
      throw new BadRequestException(canAccept.reason);
    }

    // 6. Create payment request entity (without QR first to get requestId)
    const paymentRequest = PaymentRequestEntity.create(
      {
        merchantId,
        amount,
        currency: currency || 'USDC',
        description,
        reference,
        expiresInMinutes: expiresInMinutes || 15,
      },
      '', // Temporary QR data
    );

    // 7. Generate dynamic QR code
    const qrData = this.qrCodeService.generateDynamicQr(
      merchantId,
      amount,
      paymentRequest.requestId,
      currency || 'USDC',
      description,
    );

    // Update the payment request with the QR data
    // We need to create a new entity with the correct QR data
    const finalPaymentRequest = PaymentRequestEntity.reconstitute({
      ...paymentRequest,
      qrData,
    });

    // 8. Save payment request
    const savedRequest =
      await this.paymentRequestRepository.save(finalPaymentRequest);

    const qrCodeUrl = this.qrCodeService.generateQrCodeUrl(qrData);

    this.logger.log(
      `Payment request ${savedRequest.requestId} created successfully`,
    );

    return {
      requestId: savedRequest.requestId,
      merchantId: savedRequest.merchantId,
      merchantName: merchant.displayName,
      amount: savedRequest.amount,
      currency: savedRequest.currency,
      description: savedRequest.description,
      qrData: savedRequest.qrData,
      qrCodeUrl,
      expiresAt: savedRequest.expiresAt,
      expiresInSeconds: savedRequest.timeRemainingSeconds,
    };
  }
}
