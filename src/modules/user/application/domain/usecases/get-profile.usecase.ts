import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../entities';
import { UserRepository } from '../../../infrastructure/repositories';
import { KycService } from '../../../../kyc/application/services/kyc.service';

export interface GetProfileInput {
  userId: string;
}

export interface GetProfileOutput {
  user: User;
  kycRejectionReason: string | null;
}

@Injectable()
export class GetProfileUsecase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly kycService: KycService,
  ) {}

  async execute(input: GetProfileInput): Promise<GetProfileOutput> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Fetch KYC rejection reason if status is rejected
    let kycRejectionReason: string | null = null;
    if (user.kycStatus === 'rejected') {
      const kycStatus = await this.kycService.getStatus(input.userId);
      kycRejectionReason = kycStatus.rejectionReason || null;
    }

    return {
      user,
      kycRejectionReason,
    };
  }
}
