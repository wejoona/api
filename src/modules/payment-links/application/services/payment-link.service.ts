import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentLinkRepository } from '../../domain/repositories/payment-link.repository';
import { PaymentLink } from '../../domain/entities/payment-link.entity';
import {
  CreatePaymentLinkDto,
  PayPaymentLinkDto,
  PaymentLinkResponseDto,
} from '../dto';
import {
  IWalletRepository,
  WALLET_REPOSITORY,
} from '../../../wallet/domain/repositories/wallet.repository';
import {
  ITransferRepository,
  TRANSFER_REPOSITORY,
} from '../../../transfer/domain/repositories/transfer.repository';
import {
  ILedgerProvider,
  LEDGER_PROVIDER,
} from '../../../providers/interfaces';
import { TransferEntity } from '../../../transfer/application/domain/entities/transfer.entity';
import { AppException } from '../../../../common/exceptions';
import { ERROR_CODES } from '../../../../common/constants/error-codes';

@Injectable()
export class PaymentLinkService {
  private readonly logger = new Logger(PaymentLinkService.name);

  constructor(
    private readonly paymentLinkRepository: PaymentLinkRepository,
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: IWalletRepository,
    @Inject(TRANSFER_REPOSITORY)
    private readonly transferRepository: ITransferRepository,
    @Inject(LEDGER_PROVIDER)
    private readonly ledgerProvider: ILedgerProvider,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createPaymentLink(
    userId: string,
    dto: CreatePaymentLinkDto,
  ): Promise<PaymentLinkResponseDto> {
    // Get user's wallet
    const wallet = await this.walletRepository.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (!wallet.isActive) {
      throw new BadRequestException('Wallet is not active');
    }

    // Parse expiry date - either from expiresAt or expiryHours
    let expiresAt: Date | null = null;
    if (dto.expiresAt) {
      expiresAt = new Date(dto.expiresAt);
      if (expiresAt <= new Date()) {
        throw new BadRequestException('Expiry date must be in the future');
      }
    } else if (dto.expiryHours) {
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + dto.expiryHours);
    }

    // Create payment link
    const paymentLink = PaymentLink.create({
      userId,
      walletId: wallet.id,
      amount: dto.amount,
      currency: dto.currency || 'USDC',
      description: dto.description,
      expiresAt,
    });

    const saved = await this.paymentLinkRepository.save(paymentLink);

    this.eventEmitter.emit('payment-link.created', {
      paymentLinkId: saved.id,
      userId,
      amount: dto.amount,
      currency: dto.currency || 'USDC',
      expiresAt,
      timestamp: new Date(),
    });

    return this.toResponseDto(saved);
  }

  async getPaymentLinks(
    userId: string,
    options?: {
      status?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ links: PaymentLinkResponseDto[]; total: number }> {
    let paymentLinks = await this.paymentLinkRepository.findByUserId(userId);

    // Apply status filter
    if (options?.status) {
      paymentLinks = paymentLinks.filter(
        (link) => (link.status as string) === options.status,
      );
    }

    const total = paymentLinks.length;

    // Apply pagination
    const offset = options?.offset || 0;
    if (options?.limit) {
      const end = Math.min(offset + options.limit, paymentLinks.length);
      paymentLinks = paymentLinks.slice(offset, end);
    }

    return {
      links: paymentLinks.map((link) => this.toResponseDto(link)),
      total,
    };
  }

  async getPaymentLinkById(
    id: string,
    userId: string,
  ): Promise<PaymentLinkResponseDto> {
    const paymentLink = await this.paymentLinkRepository.findById(id);

    if (!paymentLink) {
      throw new NotFoundException('Payment link not found');
    }

    if (paymentLink.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.toResponseDto(paymentLink);
  }

  async getPaymentLinkByCode(code: string): Promise<PaymentLinkResponseDto> {
    const paymentLink = await this.paymentLinkRepository.findByCode(code);

    if (!paymentLink) {
      throw new NotFoundException('Payment link not found');
    }

    // Increment view count
    paymentLink.incrementViewCount();
    await this.paymentLinkRepository.save(paymentLink);

    return this.toResponseDto(paymentLink);
  }

  async refreshPaymentLink(
    id: string,
    userId: string,
  ): Promise<PaymentLinkResponseDto> {
    const paymentLink = await this.paymentLinkRepository.findById(id);

    if (!paymentLink) {
      throw new NotFoundException('Payment link not found');
    }

    if (paymentLink.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Check if expired and update status
    if (paymentLink.isExpired && paymentLink.isActive) {
      paymentLink.expire();
      await this.paymentLinkRepository.save(paymentLink);
    }

    return this.toResponseDto(paymentLink);
  }

  async cancelPaymentLink(
    id: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const paymentLink = await this.paymentLinkRepository.findById(id);

    if (!paymentLink) {
      throw new NotFoundException('Payment link not found');
    }

    if (paymentLink.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    paymentLink.cancel();
    await this.paymentLinkRepository.save(paymentLink);

    return { success: true, message: 'Payment link cancelled' };
  }

  async payPaymentLink(
    code: string,
    payerUserId: string,
    dto: PayPaymentLinkDto,
  ): Promise<{ transactionId: string; amount: number; status: string }> {
    const paymentLink = await this.paymentLinkRepository.findByCode(code);

    if (!paymentLink) {
      throw new NotFoundException('Payment link not found');
    }

    if (!paymentLink.isActive) {
      throw new BadRequestException('Payment link is not active');
    }

    if (paymentLink.isExpired) {
      paymentLink.expire();
      await this.paymentLinkRepository.save(paymentLink);
      throw new BadRequestException('Payment link has expired');
    }

    // Cannot pay your own link
    if (paymentLink.userId === payerUserId) {
      throw new BadRequestException('Cannot pay your own payment link');
    }

    // Determine amount
    let amount: number;
    if (paymentLink.isFlexibleAmount) {
      if (!dto.amount) {
        throw new BadRequestException(
          'Amount is required for flexible payment links',
        );
      }
      amount = dto.amount;
    } else {
      amount = paymentLink.amount!;
    }

    // Get payer's wallet
    const payerWallet = await this.walletRepository.findByUserId(payerUserId);
    if (!payerWallet) {
      throw new NotFoundException('Payer wallet not found');
    }

    if (!payerWallet.isActive) {
      throw new BadRequestException('Payer wallet is not active');
    }

    // Check balance via Blnk ledger (source of truth)
    try {
      const amountInMicro = BigInt(Math.round(amount * 1_000_000));
      const availableBalance = await this.ledgerProvider.getAvailableBalance(
        payerUserId,
        'USDC',
      );
      if (availableBalance < amountInMicro) {
        throw AppException.badRequest(
          ERROR_CODES.PAYMENT_LINK_INSUFFICIENT_FUNDS,
          'Insufficient balance',
        );
      }
    } catch (error) {
      if (error instanceof AppException) throw error;
      // Fallback to local balance check
      this.logger.warn(`Blnk balance check failed, falling back to local: ${error instanceof Error ? error.message : 'Unknown'}`);
      if (payerWallet.balance < amount) {
        throw AppException.badRequest(
          ERROR_CODES.PAYMENT_LINK_INSUFFICIENT_FUNDS,
          'Insufficient balance',
        );
      }
    }

    // Get recipient's wallet
    const recipientWallet = await this.walletRepository.findById(
      paymentLink.walletId,
    );
    if (!recipientWallet) {
      throw new NotFoundException('Recipient wallet not found');
    }

    if (!recipientWallet.isActive) {
      throw new BadRequestException('Recipient wallet is not active');
    }

    // Record P2P transfer in Blnk ledger (source of truth — NO direct wallet.debit/credit)
    const reference = `pl_${paymentLink.code}_${Date.now()}`;
    try {
      const amountInMicro = BigInt(Math.round(amount * 1_000_000));
      await this.ledgerProvider.recordP2PTransfer({
        senderId: payerUserId,
        recipientId: paymentLink.userId,
        amount: amountInMicro,
        currency: 'USDC',
        reference,
        description: `Payment link: ${paymentLink.code}`,
        metadata: {
          paymentLinkId: paymentLink.id,
          paymentLinkCode: paymentLink.code,
        },
      });
    } catch (error) {
      this.logger.error(`Blnk P2P transfer failed for payment link ${paymentLink.code}: ${error instanceof Error ? error.message : 'Unknown'}`);
      throw new BadRequestException('Payment failed. Please try again later.');
    }

    // Update local wallet balances as mirror of Blnk
    payerWallet.debit(amount);
    recipientWallet.credit(amount);
    await Promise.all([
      this.walletRepository.save(payerWallet),
      this.walletRepository.save(recipientWallet),
    ]);

    // Create transfer record
    const transfer = TransferEntity.createInternal({
      senderId: payerUserId,
      senderWalletId: payerWallet.id,
      recipientId: paymentLink.userId,
      recipientWalletId: recipientWallet.id,
      recipientPhone: '',
      amount,
      currency: paymentLink.currency,
      note: `Payment link: ${paymentLink.code}`,
      metadata: {
        paymentLinkId: paymentLink.id,
        paymentLinkCode: paymentLink.code,
        blnkReference: reference,
      },
    });

    // Mark payment link as paid
    paymentLink.markAsPaid(payerUserId);

    // Save transfer record and payment link (wallet balances updated via Blnk, not locally)
    await Promise.all([
      this.transferRepository.save(transfer),
      this.paymentLinkRepository.save(paymentLink),
    ]);

    // Emit events
    this.eventEmitter.emit('payment-link.paid', {
      paymentLinkId: paymentLink.id,
      payerUserId,
      recipientUserId: paymentLink.userId,
      amount,
      currency: paymentLink.currency,
      transactionId: transfer.id,
      timestamp: new Date(),
    });

    return {
      transactionId: transfer.id,
      amount: amount,
      status: 'completed',
    };
  }

  async deletePaymentLink(
    id: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const paymentLink = await this.paymentLinkRepository.findById(id);

    if (!paymentLink) {
      throw new NotFoundException('Payment link not found');
    }

    if (paymentLink.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    paymentLink.cancel();
    await this.paymentLinkRepository.save(paymentLink);

    return { success: true, message: 'Payment link deleted' };
  }

  private toResponseDto(paymentLink: PaymentLink): PaymentLinkResponseDto {
    // Map backend status to mobile-expected status names
    let mobileStatus = paymentLink.status;
    if (
      (paymentLink.status as string) === 'active' &&
      paymentLink.viewCount === 0
    ) {
      mobileStatus = 'pending' as any;
    } else if (
      (paymentLink.status as string) === 'active' &&
      paymentLink.viewCount > 0
    ) {
      mobileStatus = 'viewed' as any;
    }

    return {
      id: paymentLink.id,
      userId: paymentLink.userId,
      walletId: paymentLink.walletId,
      code: paymentLink.code,
      shortCode: paymentLink.code, // Mobile expects shortCode
      amount: paymentLink.amount,
      currency: paymentLink.currency,
      description: paymentLink.description,
      status: mobileStatus,
      expiresAt: paymentLink.expiresAt,
      paidAt: paymentLink.paidAt,
      paidByUserId: paymentLink.paidByUserId,
      viewCount: paymentLink.viewCount,
      isExpired: paymentLink.isExpired,
      isActive: paymentLink.isActive,
      isFlexibleAmount: paymentLink.isFlexibleAmount,
      url: `${process.env.APP_URL || 'https://pay.joonapay.com'}/p/${paymentLink.code}`, // Mobile expects 'url'
      shareUrl: `${process.env.APP_URL || 'https://pay.joonapay.com'}/p/${paymentLink.code}`,
      createdAt: paymentLink.createdAt,
      updatedAt: paymentLink.updatedAt,
    } as any;
  }
}
