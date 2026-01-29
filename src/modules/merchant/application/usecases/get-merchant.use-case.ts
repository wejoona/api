import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { MerchantRepository } from '../../infrastructure/repositories/merchant.repository';

export interface GetMerchantInput {
  merchantId?: string;
  userId?: string;
}

export interface GetMerchantOutput {
  merchantId: string;
  businessName: string;
  displayName: string;
  category: string;
  country: string;
  walletId: string;
  qrCode: string;
  qrCodeUrl?: string;
  isVerified: boolean;
  feePercent: number;
  dailyLimit: number;
  monthlyLimit: number;
  dailyVolume: number;
  monthlyVolume: number;
  remainingDailyLimit: number;
  remainingMonthlyLimit: number;
  totalTransactions: number;
  status: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get Merchant Use Case
 * Retrieves merchant details by ID or owner ID
 */
@Injectable()
export class GetMerchantUseCase {
  private readonly logger = new Logger(GetMerchantUseCase.name);

  constructor(private readonly merchantRepository: MerchantRepository) {}

  async execute(input: GetMerchantInput): Promise<GetMerchantOutput> {
    let merchant;

    if (input.merchantId) {
      merchant = await this.merchantRepository.findById(input.merchantId);
    } else if (input.userId) {
      merchant = await this.merchantRepository.findByOwnerId(input.userId);
    } else {
      throw new NotFoundException('Must provide merchantId or userId');
    }

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return {
      merchantId: merchant.id,
      businessName: merchant.businessName,
      displayName: merchant.displayName,
      category: merchant.category,
      country: merchant.country,
      walletId: merchant.walletId,
      qrCode: merchant.qrCode,
      qrCodeUrl: merchant.qrCodeUrl,
      isVerified: merchant.isVerified,
      feePercent: merchant.feePercent,
      dailyLimit: merchant.dailyLimit,
      monthlyLimit: merchant.monthlyLimit,
      dailyVolume: merchant.dailyVolume,
      monthlyVolume: merchant.monthlyVolume,
      remainingDailyLimit: merchant.remainingDailyLimit,
      remainingMonthlyLimit: merchant.remainingMonthlyLimit,
      totalTransactions: merchant.totalTransactions,
      status: merchant.status,
      businessAddress: merchant.businessAddress,
      businessPhone: merchant.businessPhone,
      businessEmail: merchant.businessEmail,
      logoUrl: merchant.logoUrl,
      createdAt: merchant.createdAt,
      updatedAt: merchant.updatedAt,
    };
  }
}

/**
 * Get Merchant by QR Code Use Case
 * Retrieves merchant details by scanning their QR code
 */
@Injectable()
export class GetMerchantByQrUseCase {
  private readonly logger = new Logger(GetMerchantByQrUseCase.name);

  constructor(
    private readonly merchantRepository: MerchantRepository,
    private readonly getMerchantUseCase: GetMerchantUseCase,
  ) {}

  async execute(
    qrData: string,
  ): Promise<
    GetMerchantOutput & { qrType: string; amount?: number; requestId?: string }
  > {
    // Import QrCodeService to decode
    // For simplicity, we'll parse the URL directly here
    try {
      const url = new URL(qrData);
      const merchantId = url.searchParams.get('m');
      const type = url.searchParams.get('t') || 'static';
      const amount = url.searchParams.get('a');
      const requestId = url.searchParams.get('r');

      if (!merchantId) {
        throw new NotFoundException('Invalid QR code');
      }

      const merchantData = await this.getMerchantUseCase.execute({
        merchantId,
      });

      return {
        ...merchantData,
        qrType: type,
        amount: amount ? parseFloat(amount) : undefined,
        requestId: requestId || undefined,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Invalid QR code format');
    }
  }
}
