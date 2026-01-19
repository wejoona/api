import { Injectable, Inject } from '@nestjs/common';
import { WalletEntity } from '../../domain/entities/wallet.entity';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import {
  PAYMENT_GATEWAY,
  IPaymentGateway,
} from '../../../shared/domain/gateways';

export interface CreateWalletInput {
  userId: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  countryCode?: string;
}

@Injectable()
export class CreateWalletUseCase {
  constructor(
    private readonly repository: WalletRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  async execute(input: CreateWalletInput): Promise<WalletEntity> {
    // Check if user already has a wallet
    const existingWallet = await this.repository.findByUserId(input.userId);
    if (existingWallet) {
      return existingWallet;
    }

    // Create subwallet via payment gateway
    const subwallet = await this.paymentGateway.createSubwallet({
      userId: input.userId,
      name: input.userName || `User ${input.userId}`,
      email: input.userEmail,
      phone: input.userPhone,
      country: input.countryCode || 'CI',
    });

    // Create local wallet entity linked to external provider
    const wallet = WalletEntity.create({
      userId: input.userId,
      yellowCardWalletId: subwallet.externalId, // Using generic field name in entity
      currency: 'USD',
    });

    return this.repository.save(wallet);
  }
}
