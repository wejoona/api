import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  PAYMENT_GATEWAY,
  IPaymentGateway,
} from '../../../shared/domain/gateways/payment.gateway';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';

export interface GetKycStatusInput {
  userId: string;
}

export interface GetKycStatusOutput {
  walletId: string;
  kycStatus: string;
  providerStatus?: string;
  rejectionReason?: string;
  verifiedAt?: Date;
}

@Injectable()
export class GetKycStatusUseCase {
  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(input: GetKycStatusInput): Promise<GetKycStatusOutput> {
    // Find user's wallet
    const wallet = await this.walletRepository.findByUserId(input.userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // If not linked to provider, return local status only
    if (!wallet.isLinkedToProvider) {
      return {
        walletId: wallet.id,
        kycStatus: wallet.kycStatus,
      };
    }

    // Get KYC status from payment provider for live updates
    try {
      const kycResponse = await this.paymentGateway.getKycStatus(
        wallet.providerWalletId,
      );

      // Sync status if different
      const providerStatus = kycResponse.status;
      if (providerStatus !== wallet.kycStatus) {
        wallet.updateKycStatus(providerStatus);
        await this.walletRepository.save(wallet);
      }

      return {
        walletId: wallet.id,
        kycStatus: kycResponse.status,
        providerStatus: kycResponse.status,
        rejectionReason: kycResponse.rejectionReason,
        verifiedAt: kycResponse.verifiedAt,
      };
    } catch {
      // If provider call fails, return local status
      return {
        walletId: wallet.id,
        kycStatus: wallet.kycStatus,
      };
    }
  }
}
