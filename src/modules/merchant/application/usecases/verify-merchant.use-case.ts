import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MerchantRepository } from '../../infrastructure/repositories/merchant.repository';

export interface VerifyMerchantInput {
  merchantId: string;
  adminUserId: string;
}

export interface VerifyMerchantOutput {
  merchantId: string;
  businessName: string;
  status: string;
  isVerified: boolean;
  verifiedAt: Date;
}

/**
 * Verify Merchant Use Case
 * Admin use case to verify a merchant after KYB review
 */
@Injectable()
export class VerifyMerchantUseCase {
  private readonly logger = new Logger(VerifyMerchantUseCase.name);

  constructor(
    private readonly merchantRepository: MerchantRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: VerifyMerchantInput): Promise<VerifyMerchantOutput> {
    const { merchantId } = input;

    this.logger.log(`Verifying merchant ${merchantId}`);

    // 1. Find merchant
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    // 2. Check if already verified
    if (merchant.isVerified) {
      throw new BadRequestException('Merchant is already verified');
    }

    // 3. Verify the merchant
    merchant.verify();

    // 4. Save
    const savedMerchant = await this.merchantRepository.save(merchant);

    this.logger.log(`Merchant ${merchantId} verified successfully`);

    this.eventEmitter.emit('merchant.verified', {
      merchantId: savedMerchant.id,
      businessName: savedMerchant.businessName,
      adminUserId: input.adminUserId,
      timestamp: new Date(),
    });

    return {
      merchantId: savedMerchant.id,
      businessName: savedMerchant.businessName,
      status: savedMerchant.status,
      isVerified: savedMerchant.isVerified,
      verifiedAt: savedMerchant.updatedAt,
    };
  }
}

/**
 * Suspend Merchant Use Case
 * Admin use case to suspend a merchant
 */
@Injectable()
export class SuspendMerchantUseCase {
  private readonly logger = new Logger(SuspendMerchantUseCase.name);

  constructor(private readonly merchantRepository: MerchantRepository) {}

  async execute(input: { merchantId: string; reason?: string }): Promise<void> {
    const { merchantId, reason } = input;

    this.logger.log(
      `Suspending merchant ${merchantId}. Reason: ${reason || 'Not specified'}`,
    );

    // 1. Find merchant
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    // 2. Suspend
    merchant.suspend();

    // 3. Save
    await this.merchantRepository.save(merchant);

    this.logger.log(`Merchant ${merchantId} suspended successfully`);
  }
}

/**
 * Activate Merchant Use Case
 * Admin use case to reactivate a suspended merchant
 */
@Injectable()
export class ActivateMerchantUseCase {
  private readonly logger = new Logger(ActivateMerchantUseCase.name);

  constructor(private readonly merchantRepository: MerchantRepository) {}

  async execute(input: { merchantId: string }): Promise<void> {
    const { merchantId } = input;

    this.logger.log(`Activating merchant ${merchantId}`);

    // 1. Find merchant
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    // 2. Activate
    merchant.activate();

    // 3. Save
    await this.merchantRepository.save(merchant);

    this.logger.log(`Merchant ${merchantId} activated successfully`);
  }
}
