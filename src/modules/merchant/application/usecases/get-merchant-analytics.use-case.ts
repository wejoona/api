import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { MerchantRepository } from '../../infrastructure/repositories/merchant.repository';
import { MerchantPaymentRepository } from '../../infrastructure/repositories/merchant-payment.repository';
import { IMerchantAnalytics } from '../../domain/entities/merchant.types';

export interface GetMerchantAnalyticsInput {
  userId: string;
  merchantId: string;
  period?: 'day' | 'week' | 'month' | 'year';
}

export interface GetMerchantAnalyticsOutput extends IMerchantAnalytics {
  merchantName: string;
  currency: string;
}

/**
 * Get Merchant Analytics Use Case
 * Retrieves sales analytics and performance metrics for a merchant
 */
@Injectable()
export class GetMerchantAnalyticsUseCase {
  private readonly logger = new Logger(GetMerchantAnalyticsUseCase.name);

  constructor(
    private readonly merchantRepository: MerchantRepository,
    private readonly merchantPaymentRepository: MerchantPaymentRepository,
  ) {}

  async execute(input: GetMerchantAnalyticsInput): Promise<GetMerchantAnalyticsOutput> {
    const { userId, merchantId, period = 'month' } = input;

    this.logger.log(`Getting analytics for merchant ${merchantId}`);

    // 1. Find merchant
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    // 2. Verify ownership
    if (merchant.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // 3. Calculate date range based on period
    const { startDate, endDate } = this.calculateDateRange(period);

    // 4. Get analytics from repository
    const analytics = await this.merchantPaymentRepository.getAnalytics(
      merchantId,
      period,
      startDate,
      endDate,
    );

    return {
      ...analytics,
      merchantName: merchant.displayName,
      currency: 'USDC',
    };
  }

  private calculateDateRange(
    period: 'day' | 'week' | 'month' | 'year',
  ): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    switch (period) {
      case 'day':
        // Today
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    return { startDate, endDate };
  }
}
