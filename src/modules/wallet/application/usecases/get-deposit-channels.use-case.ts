import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import {
  PAYMENT_GATEWAY,
  IPaymentGateway,
  OnRampChannel,
} from '../../../shared/domain/gateways';

export interface GetDepositChannelsInput {
  userId: string;
  currency?: string;
}

export interface GetDepositChannelsOutput {
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

    // Get available deposit channels for Ivory Coast
    const channels = await this.paymentGateway.getOnRampChannels(
      'CI',
      input.currency,
    );

    return { channels };
  }
}
