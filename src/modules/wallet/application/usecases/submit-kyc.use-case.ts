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
import { UploadService } from '../../../upload/application/services/upload.service';

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
  // Document S3 keys (from KYC upload)
  documentFrontKey?: string;
  documentBackKey?: string;
  selfieKey?: string;
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
    private readonly uploadService: UploadService,
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

    // Validate that all KYC documents have been uploaded
    if (!input.documentFrontKey || !input.documentBackKey || !input.selfieKey) {
      const missingDocs: string[] = [];
      if (!input.documentFrontKey) missingDocs.push('ID front');
      if (!input.documentBackKey) missingDocs.push('ID back');
      if (!input.selfieKey) missingDocs.push('selfie');

      throw new BadRequestException(
        `All KYC documents are required. Missing: ${missingDocs.join(', ')}`,
      );
    }

    // Get signed URLs for documents (valid for 1 hour for provider to fetch)
    const [documentFrontUrl, documentBackUrl, selfieUrl] = await Promise.all([
      this.uploadService.getSignedUrl(input.documentFrontKey, 3600),
      this.uploadService.getSignedUrl(input.documentBackKey, 3600),
      this.uploadService.getSignedUrl(input.selfieKey, 3600),
    ]);

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
      documentFrontUrl,
      documentBackUrl,
      selfieUrl,
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
