import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  PAYMENT_GATEWAY,
  IPaymentGateway,
} from '../../../shared/domain/gateways/payment.gateway';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';

export interface SubmitKycInput {
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  country: string;
  idType: 'passport' | 'national_id' | 'drivers_license';
  idNumber: string;
  idExpiryDate?: string;
  address?: {
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
}

export interface SubmitKycOutput {
  walletId: string;
  kycStatus: string;
  message: string;
  submittedAt: Date;
}

@Injectable()
export class SubmitKycUseCase {
  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(input: SubmitKycInput): Promise<SubmitKycOutput> {
    // Find user's wallet
    const wallet = await this.walletRepository.findByUserId(input.userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Check if wallet is linked to provider
    if (!wallet.isLinkedToProvider) {
      throw new BadRequestException('Wallet is not linked to payment provider');
    }

    // Check if KYC is already submitted or verified
    if (wallet.kycStatus === 'pending') {
      throw new BadRequestException(
        'KYC already submitted and pending verification',
      );
    }
    if (wallet.kycStatus === 'verified') {
      throw new BadRequestException('KYC already verified');
    }

    // Submit KYC to payment provider
    const kycResponse = await this.paymentGateway.submitKyc({
      subwalletId: wallet.providerWalletId,
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      country: input.country,
      idType: input.idType,
      idNumber: input.idNumber,
      idExpiryDate: input.idExpiryDate,
      address: input.address,
    });

    // Update wallet KYC status
    wallet.updateKycStatus('pending');
    await this.walletRepository.save(wallet);

    return {
      walletId: wallet.id,
      kycStatus: kycResponse.status,
      message: 'KYC submitted successfully. Verification pending.',
      submittedAt: new Date(),
    };
  }
}
