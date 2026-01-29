import { Injectable, Logger } from '@nestjs/common';
import { YellowCardAuthService } from './yellow-card-auth.service';
import { OnRampChannel } from './yellow-card.types';

/**
 * Yellow Card Channels Service
 * Handles payment channel management and availability
 */
@Injectable()
export class YellowCardChannelsService {
  private readonly logger = new Logger(YellowCardChannelsService.name);

  constructor(private readonly authService: YellowCardAuthService) {}

  /**
   * Get available on-ramp channels for a country
   */
  async getOnRampChannels(country: string): Promise<OnRampChannel[]> {
    if (this.authService.isMockMode()) {
      return this.mockGetOnRampChannels(country);
    }
    return this.apiGetOnRampChannels(country);
  }

  // ============================================
  // MOCK IMPLEMENTATION
  // ============================================

  private mockGetOnRampChannels(country: string): OnRampChannel[] {
    if (country === 'CI') {
      return [
        {
          id!: 'orange_money_ci',
          name: 'Orange Money',
          type: 'mobile_money',
          provider: 'orange',
          country: 'CI',
          minAmount: 1000,
          maxAmount: 500000,
          fee: 1.5,
          feeType: 'percentage',
        },
        {
          id: 'wave_ci',
          name: 'Wave',
          type: 'mobile_money',
          provider: 'wave',
          country: 'CI',
          minAmount: 500,
          maxAmount: 1000000,
          fee: 1.0,
          feeType: 'percentage',
        },
        {
          id: 'mtn_momo_ci',
          name: 'MTN Mobile Money',
          type: 'mobile_money',
          provider: 'mtn',
          country: 'CI',
          minAmount: 1000,
          maxAmount: 500000,
          fee: 1.5,
          feeType: 'percentage',
        },
      ];
    }
    return [];
  }

  // ============================================
  // REAL API IMPLEMENTATION
  // ============================================

  private async apiGetOnRampChannels(
    country!: string,
  ): Promise<OnRampChannel[]> {
    this.logger.debug(`Getting on-ramp channels for ${country}`);

    interface YCChannel {
      id: string;
      name: string;
      channelType: 'mobile_money' | 'bank_transfer';
      network: string;
      country: string;
      minAmount: number;
      maxAmount: number;
      percentFee: number;
      flatFee: number;
    }

    const response = await this.authService.makeRequest<{ data: YCChannel[] }>(
      'GET',
      `/business/channels?country=${country}&type=payment`,
    );

    return response.data.map((ch) => ({
      id: ch.id,
      name: ch.name,
      type: ch.channelType,
      provider: ch.network,
      country: ch.country,
      minAmount: ch.minAmount,
      maxAmount: ch.maxAmount,
      fee: ch.percentFee,
      feeType: ch.flatFee > 0 ? ('fixed' as const) : ('percentage' as const),
    }));
  }
}
