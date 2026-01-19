import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import {
  PAYMENT_GATEWAY,
  IPaymentGateway,
  Balance,
} from '../../../shared/domain/gateways';

export interface GetBalanceInput {
  userId: string;
}

export interface GetBalanceOutput {
  walletId: string;
  currency: string;
  balances: Balance[];
}

@Injectable()
export class GetBalanceUseCase {
  constructor(
    private readonly walletRepository: WalletRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  async execute(input: GetBalanceInput): Promise<GetBalanceOutput> {
    const wallet = await this.walletRepository.findByUserId(input.userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (!wallet.yellowCardWalletId) {
      throw new NotFoundException('Wallet not linked to payment provider');
    }

    const balanceResponse = await this.paymentGateway.getBalance(
      wallet.yellowCardWalletId,
    );

    return {
      walletId: wallet.id,
      currency: wallet.currency,
      balances: balanceResponse.balances,
    };
  }
}
