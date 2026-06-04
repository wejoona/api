import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import {
  PAYMENT_GATEWAY,
  IPaymentGateway,
  OnRampChannel,
} from '../../../shared/domain/gateways';

export interface GetDepositChannelsInput {
  userId: string;
  country?: string;
  currency?: string;
}

export interface GetDepositChannelsOutput {
  country: string;
  currency: string | null;
  status: 'available' | 'unavailable';
  reason: string | null;
  retryable: boolean;
  supportReviewRequired: boolean;
  channels: OnRampChannel[];
}

@Injectable()
export class GetDepositChannelsUseCase {
  constructor(
    private readonly walletRepository: WalletRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  async execute(
    input: GetDepositChannelsInput,
  ): Promise<GetDepositChannelsOutput> {
    const wallet = await this.walletRepository.findByUserId(input.userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const country = input.country?.trim().toUpperCase() || 'CI';
    const currency = input.currency?.trim().toUpperCase();
    const channels = await this.paymentGateway.getOnRampChannels(
      country,
      currency,
    );

    return {
      country,
      currency: currency ?? null,
      status: channels.length > 0 ? 'available' : 'unavailable',
      reason: channels.length > 0 ? null : 'no_deposit_channels_available',
      retryable: false,
      supportReviewRequired: channels.length === 0,
      channels,
    };
  }
}
