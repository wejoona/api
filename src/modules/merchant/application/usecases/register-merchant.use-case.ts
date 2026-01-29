import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { MerchantEntity } from '../../domain/entities/merchant.entity';
import { MerchantCategory } from '../../domain/entities/merchant.types';
import { MerchantRepository } from '../../infrastructure/repositories/merchant.repository';
import { WalletRepository } from '../../../wallet/infrastructure/repositories/wallet.repository';
import { QrCodeService } from './qr-code.service';

export interface RegisterMerchantInput {
  userId: string;
  businessName: string;
  displayName?: string;
  category: MerchantCategory;
  country: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  taxId?: string;
  webhookUrl?: string;
}

export interface RegisterMerchantOutput {
  merchantId: string;
  businessName: string;
  displayName: string;
  category: string;
  country: string;
  walletId: string;
  qrCode: string;
  qrCodeUrl?: string;
  isVerified: boolean;
  status: string;
  feePercent: number;
  dailyLimit: number;
  monthlyLimit: number;
  dailyVolume: number;
  monthlyVolume: number;
  remainingDailyLimit: number;
  remainingMonthlyLimit: number;
  totalTransactions: number;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Register Merchant Use Case
 * Handles business registration and merchant account creation
 */
@Injectable()
export class RegisterMerchantUseCase {
  private readonly logger = new Logger(RegisterMerchantUseCase.name);

  constructor(
    private readonly merchantRepository: MerchantRepository,
    private readonly walletRepository: WalletRepository,
    private readonly qrCodeService: QrCodeService,
  ) {}

  async execute(input: RegisterMerchantInput): Promise<RegisterMerchantOutput> {
    this.logger.log(`Registering merchant for user ${input.userId}`);

    // 1. Validate user has a wallet
    const wallet = await this.walletRepository.findByUserId(input.userId);
    if (!wallet) {
      throw new BadRequestException(
        'User must have a wallet to register as a merchant',
      );
    }

    // 2. Check if user already has a merchant account
    const existingMerchant = await this.merchantRepository.findByOwnerId(
      input.userId,
    );
    if (existingMerchant) {
      throw new ConflictException('User already has a merchant account');
    }

    // 3. Check if business name is already taken
    const nameExists = await this.merchantRepository.existsByBusinessName(
      input.businessName,
    );
    if (nameExists) {
      throw new ConflictException('Business name is already registered');
    }

    // 4. Create merchant entity
    const merchant = MerchantEntity.create({
      businessName: input.businessName,
      displayName: input.displayName,
      ownerId: input.userId,
      category: input.category,
      country: input.country,
      walletId: wallet.id,
      businessAddress: input.businessAddress,
      businessPhone: input.businessPhone,
      businessEmail: input.businessEmail,
      taxId: input.taxId,
      webhookUrl: input.webhookUrl,
    });

    // 5. Generate static QR code
    const qrCode = this.qrCodeService.generateStaticQr(merchant.id);
    const qrCodeUrl = this.qrCodeService.generateQrCodeUrl(qrCode);
    merchant.setQrCode(qrCode, qrCodeUrl);

    // 6. Save merchant
    const savedMerchant = await this.merchantRepository.save(merchant);

    this.logger.log(`Merchant ${savedMerchant.id} registered successfully`);

    return {
      merchantId: savedMerchant.id,
      businessName: savedMerchant.businessName,
      displayName: savedMerchant.displayName,
      category: savedMerchant.category,
      country: savedMerchant.country,
      walletId: savedMerchant.walletId,
      qrCode: savedMerchant.qrCode,
      qrCodeUrl: savedMerchant.qrCodeUrl || qrCodeUrl,
      isVerified: savedMerchant.isVerified,
      status: savedMerchant.status,
      feePercent: savedMerchant.feePercent,
      dailyLimit: savedMerchant.dailyLimit,
      monthlyLimit: savedMerchant.monthlyLimit,
      dailyVolume: savedMerchant.dailyVolume,
      monthlyVolume: savedMerchant.monthlyVolume,
      remainingDailyLimit: savedMerchant.remainingDailyLimit,
      remainingMonthlyLimit: savedMerchant.remainingMonthlyLimit,
      totalTransactions: savedMerchant.totalTransactions,
      businessAddress: savedMerchant.businessAddress,
      businessPhone: savedMerchant.businessPhone,
      businessEmail: savedMerchant.businessEmail,
      logoUrl: savedMerchant.logoUrl,
      createdAt: savedMerchant.createdAt,
      updatedAt: savedMerchant.updatedAt,
    };
  }
}
