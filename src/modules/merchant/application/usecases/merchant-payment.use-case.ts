import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  Inject,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MerchantPaymentEntity } from '../../domain/entities/merchant-payment.entity';
import { MerchantRepository } from '../../infrastructure/repositories/merchant.repository';
import { PaymentRequestRepository } from '../../infrastructure/repositories/payment-request.repository';
import { MerchantPaymentRepository } from '../../infrastructure/repositories/merchant-payment.repository';
import { WalletRepository } from '../../../wallet/infrastructure/repositories/wallet.repository';
import { QrCodeService } from './qr-code.service';
import {
  LEDGER_PROVIDER,
  ILedgerProvider,
} from '../../../providers/interfaces';

export interface ProcessMerchantPaymentInput {
  customerId: string;
  qrData: string;
  amount?: number; // Required for static QR, optional for dynamic QR
  pin?: string; // PIN verification handled by guard
}

export interface ProcessMerchantPaymentOutput {
  paymentId: string;
  reference: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  status: string;
  createdAt: Date;
  receipt: {
    transactionId: string;
    merchantName: string;
    merchantCategory: string;
    amount: number;
    fee: number;
    total: number;
    timestamp: Date;
    reference: string;
  };
}

/**
 * Process Merchant Payment Use Case
 * Handles customer payments to merchants via QR code
 */
@Injectable()
export class ProcessMerchantPaymentUseCase {
  private readonly logger = new Logger(ProcessMerchantPaymentUseCase.name);

  constructor(
    private readonly merchantRepository: MerchantRepository,
    private readonly paymentRequestRepository: PaymentRequestRepository,
    private readonly merchantPaymentRepository: MerchantPaymentRepository,
    private readonly walletRepository: WalletRepository,
    private readonly qrCodeService: QrCodeService,
    @Inject(LEDGER_PROVIDER)
    private readonly ledgerProvider: ILedgerProvider,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    input: ProcessMerchantPaymentInput,
  ): Promise<ProcessMerchantPaymentOutput> {
    const { customerId, qrData, amount: inputAmount } = input;

    this.logger.log(`Processing merchant payment from customer ${customerId}`);

    // 1. Decode and validate QR code
    const qrPayload = this.qrCodeService.decodeQr(qrData);

    // 2. Find and validate merchant
    const merchant = await this.merchantRepository.findById(
      qrPayload.merchantId,
    );
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    if (!merchant.isActive) {
      throw new BadRequestException('Merchant is not accepting payments');
    }

    if (!merchant.isVerified) {
      throw new BadRequestException('Merchant is not verified');
    }

    // 3. Determine payment amount
    let amount: number;
    let paymentRequestId: string | undefined;

    if (qrPayload.type === 'dynamic') {
      // Dynamic QR - amount is in the QR code
      if (!qrPayload.amount || !qrPayload.requestId) {
        throw new BadRequestException('Invalid dynamic QR code');
      }

      // Find and validate payment request
      const paymentRequest =
        await this.paymentRequestRepository.findByRequestId(
          qrPayload.requestId,
        );
      if (!paymentRequest) {
        throw new NotFoundException('Payment request not found');
      }

      if (!paymentRequest.isValidForPayment) {
        if (paymentRequest.isExpired) {
          paymentRequest.markAsExpired();
          await this.paymentRequestRepository.save(paymentRequest);
          throw new BadRequestException('Payment request has expired');
        }
        throw new BadRequestException(
          `Payment request is ${paymentRequest.status}`,
        );
      }

      amount = paymentRequest.amount;
      paymentRequestId = paymentRequest.id;
    } else {
      // Static QR - customer must provide amount
      if (!inputAmount || inputAmount <= 0) {
        throw new BadRequestException(
          'Amount is required for static QR payments',
        );
      }
      amount = inputAmount;
    }

    // 4. Validate amount limits
    if (amount > 10000) {
      throw new BadRequestException(
        'Amount exceeds maximum allowed (10,000 USDC)',
      );
    }

    const canAccept = merchant.canAcceptPayment(amount);
    if (!canAccept.allowed) {
      throw new BadRequestException(canAccept.reason);
    }

    // 5. Get customer and merchant wallets
    const customerWallet = await this.walletRepository.findByUserId(customerId);
    if (!customerWallet) {
      throw new NotFoundException('Customer wallet not found');
    }

    const merchantWallet = await this.walletRepository.findById(
      merchant.walletId,
    );
    if (!merchantWallet) {
      throw new NotFoundException('Merchant wallet not found');
    }

    // 6. Check customer balance
    const customerBalance = await this.ledgerProvider.getUserBalance(
      customerId,
      'USDC',
    );
    if (
      !customerBalance ||
      customerBalance.availableBalance < BigInt(Math.round(amount * 100))
    ) {
      throw new BadRequestException('Insufficient balance');
    }

    // 7. Calculate fee
    const fee = merchant.calculateFee(amount);
    const netAmount = amount - fee;

    // 8. Create merchant payment entity
    const merchantPayment = MerchantPaymentEntity.create({
      merchantId: merchant.id,
      customerId,
      customerWalletId: customerWallet.id,
      merchantWalletId: merchantWallet.id,
      paymentRequestId,
      amount,
      fee,
      currency: qrPayload.currency || 'USDC',
      description: qrPayload.description,
    });

    // 9. Execute the transfer via ledger (P2P transfer from customer to merchant)
    try {
      const transferResult = await this.ledgerProvider.recordP2PTransfer({
        senderId: customerId,
        recipientId: merchant.ownerId, // Merchant owner's user ID
        amount: BigInt(Math.round(amount * 100)), // Convert to cents
        currency: 'USDC',
        reference: `MP-${merchantPayment.reference}`,
        description: `Payment to ${merchant.displayName}`,
        note: qrPayload.description,
        metadata: {
          type: 'merchant_payment',
          merchantId: merchant.id,
          paymentId: merchantPayment.paymentId,
          fee: fee,
          netAmount: netAmount,
        },
      });

      merchantPayment.setLedgerTransactionId(transferResult.transactionId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process payment: ${errorMessage}`, error);
      throw new BadRequestException('Payment processing failed');
    }

    // 10. Update merchant volumes
    merchant.recordPayment(amount);
    await this.merchantRepository.save(merchant);

    // 11. Update payment request if dynamic
    if (paymentRequestId) {
      const paymentRequest =
        await this.paymentRequestRepository.findById(paymentRequestId);
      if (paymentRequest) {
        paymentRequest.markAsPaid(merchantPayment.paymentId, customerId);
        await this.paymentRequestRepository.save(paymentRequest);
      }
    }

    // 12. Save merchant payment
    const savedPayment =
      await this.merchantPaymentRepository.save(merchantPayment);

    this.logger.log(
      `Merchant payment ${savedPayment.paymentId} completed successfully`,
    );

    this.eventEmitter.emit('merchant.payment.completed', {
      customerId,
      merchantId: merchant.id,
      paymentId: savedPayment.paymentId,
      amount: savedPayment.amount,
      fee: savedPayment.fee,
      currency: savedPayment.currency,
      timestamp: new Date(),
    });

    return {
      paymentId: savedPayment.paymentId,
      reference: savedPayment.reference,
      merchantId: merchant.id,
      merchantName: merchant.displayName,
      amount: savedPayment.amount,
      fee: savedPayment.fee,
      netAmount: savedPayment.netAmount,
      currency: savedPayment.currency,
      status: savedPayment.status,
      createdAt: savedPayment.createdAt,
      receipt: {
        transactionId: savedPayment.paymentId,
        merchantName: merchant.displayName,
        merchantCategory: merchant.category,
        amount: savedPayment.amount,
        fee: savedPayment.fee,
        total: savedPayment.amount,
        timestamp: savedPayment.createdAt,
        reference: savedPayment.reference,
      },
    };
  }
}
