import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { BeneficiaryRepository } from '../../domain/repositories/beneficiary.repository';
import {
  Beneficiary,
  BeneficiaryAccountType,
} from '../../domain/entities/beneficiary.entity';

export interface CreateBeneficiaryParams {
  walletId: string;
  name: string;
  phoneE164?: string;
  accountType?: BeneficiaryAccountType;
  beneficiaryUserId?: string;
  beneficiaryWalletAddress?: string;
  bankCode?: string;
  bankAccountNumber?: string;
  mobileMoneyProvider?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateBeneficiaryParams {
  name?: string;
  isFavorite?: boolean;
  metadata?: Record<string, unknown>;
}

export interface BeneficiaryResponse {
  id: string;
  walletId: string;
  name: string;
  phoneE164: string | null;
  accountType: BeneficiaryAccountType;
  beneficiaryUserId: string | null;
  beneficiaryWalletAddress: string | null;
  bankCode: string | null;
  bankAccountNumber: string | null;
  mobileMoneyProvider: string | null;
  isFavorite: boolean;
  isVerified: boolean;
  transferCount: number;
  totalTransferred: number;
  lastTransferAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class BeneficiaryService {
  private readonly logger = new Logger(BeneficiaryService.name);
  private readonly maxBeneficiariesPerWallet = 100;

  constructor(private readonly beneficiaryRepository: BeneficiaryRepository) {}

  /**
   * Create a new beneficiary.
   */
  async createBeneficiary(
    params: CreateBeneficiaryParams,
  ): Promise<Beneficiary> {
    const { walletId, phoneE164 } = params;

    // Check if beneficiary with same phone already exists
    if (phoneE164) {
      const existing = await this.beneficiaryRepository.findByWalletIdAndPhone(
        walletId,
        phoneE164,
      );
      if (existing) {
        throw new ConflictException(
          'Beneficiary with this phone number already exists',
        );
      }
    }

    // Check beneficiary limit
    const count = await this.beneficiaryRepository.countByWalletId(walletId);
    if (count >= this.maxBeneficiariesPerWallet) {
      throw new ConflictException(
        `Maximum number of beneficiaries (${this.maxBeneficiariesPerWallet}) reached`,
      );
    }

    const beneficiary = Beneficiary.create(params);
    const saved = await this.beneficiaryRepository.save(beneficiary);

    this.logger.log(
      `Created beneficiary ${saved.id} for wallet ${walletId}: ${params.name}`,
    );
    return saved;
  }

  /**
   * Get all beneficiaries for a wallet.
   */
  async getBeneficiaries(walletId: string): Promise<BeneficiaryResponse[]> {
    const beneficiaries =
      await this.beneficiaryRepository.findByWalletId(walletId);
    return beneficiaries.map(this.toResponse);
  }

  /**
   * Get favorite beneficiaries for a wallet.
   */
  async getFavoriteBeneficiaries(
    walletId: string,
  ): Promise<BeneficiaryResponse[]> {
    const beneficiaries =
      await this.beneficiaryRepository.findFavoritesByWalletId(walletId);
    return beneficiaries.map(this.toResponse);
  }

  /**
   * Get recent beneficiaries for a wallet.
   */
  async getRecentBeneficiaries(
    walletId: string,
    limit: number = 10,
  ): Promise<BeneficiaryResponse[]> {
    const beneficiaries = await this.beneficiaryRepository.findRecentByWalletId(
      walletId,
      limit,
    );
    return beneficiaries.map(this.toResponse);
  }

  /**
   * Get beneficiaries by account type.
   */
  async getBeneficiariesByType(
    walletId: string,
    accountType: BeneficiaryAccountType,
  ): Promise<BeneficiaryResponse[]> {
    const beneficiaries = await this.beneficiaryRepository.findByAccountType(
      walletId,
      accountType,
    );
    return beneficiaries.map(this.toResponse);
  }

  /**
   * Get a beneficiary by ID.
   */
  async getBeneficiary(
    walletId: string,
    beneficiaryId: string,
  ): Promise<Beneficiary> {
    const beneficiary =
      await this.beneficiaryRepository.findById(beneficiaryId);

    if (!beneficiary) {
      throw new NotFoundException('Beneficiary not found');
    }

    if (beneficiary.walletId !== walletId) {
      throw new ForbiddenException(
        'Beneficiary does not belong to this wallet',
      );
    }

    return beneficiary;
  }

  /**
   * Update a beneficiary.
   */
  async updateBeneficiary(
    walletId: string,
    beneficiaryId: string,
    params: UpdateBeneficiaryParams,
  ): Promise<Beneficiary> {
    const beneficiary = await this.getBeneficiary(walletId, beneficiaryId);

    if (params.name) {
      beneficiary.updateName(params.name);
    }

    if (params.isFavorite !== undefined) {
      beneficiary.setFavorite(params.isFavorite);
    }

    if (params.metadata) {
      beneficiary.updateMetadata(params.metadata);
    }

    const saved = await this.beneficiaryRepository.save(beneficiary);
    this.logger.log(`Updated beneficiary ${beneficiaryId}`);
    return saved;
  }

  /**
   * Toggle favorite status.
   */
  async toggleFavorite(
    walletId: string,
    beneficiaryId: string,
  ): Promise<Beneficiary> {
    const beneficiary = await this.getBeneficiary(walletId, beneficiaryId);
    beneficiary.toggleFavorite();

    const saved = await this.beneficiaryRepository.save(beneficiary);
    this.logger.log(
      `Toggled favorite for beneficiary ${beneficiaryId}: ${saved.isFavorite}`,
    );
    return saved;
  }

  /**
   * Delete a beneficiary.
   */
  async deleteBeneficiary(
    walletId: string,
    beneficiaryId: string,
  ): Promise<void> {
    const beneficiary = await this.getBeneficiary(walletId, beneficiaryId);
    await this.beneficiaryRepository.delete(beneficiary.id);
    this.logger.log(`Deleted beneficiary ${beneficiaryId}`);
  }

  /**
   * Record a transfer to a beneficiary (updates stats).
   */
  async recordTransfer(
    beneficiaryId: string,
    amount: number,
  ): Promise<Beneficiary> {
    const beneficiary =
      await this.beneficiaryRepository.findById(beneficiaryId);

    if (!beneficiary) {
      throw new NotFoundException('Beneficiary not found');
    }

    beneficiary.recordTransfer(amount);
    return this.beneficiaryRepository.save(beneficiary);
  }

  /**
   * Find or create a beneficiary for a phone number.
   */
  async findOrCreateByPhone(
    walletId: string,
    phoneE164: string,
    name: string,
    beneficiaryUserId?: string,
  ): Promise<Beneficiary> {
    let beneficiary = await this.beneficiaryRepository.findByWalletIdAndPhone(
      walletId,
      phoneE164,
    );

    if (beneficiary) {
      // Update name if provided and different
      if (name && name !== beneficiary.name) {
        beneficiary.updateName(name);
        beneficiary = await this.beneficiaryRepository.save(beneficiary);
      }
      return beneficiary;
    }

    // Create new beneficiary
    return this.createBeneficiary({
      walletId,
      name,
      phoneE164,
      accountType: beneficiaryUserId
        ? BeneficiaryAccountType.JOONAPAY_USER
        : BeneficiaryAccountType.MOBILE_MONEY,
      beneficiaryUserId,
    });
  }

  private toResponse(beneficiary: Beneficiary): BeneficiaryResponse {
    return {
      id: beneficiary.id,
      walletId: beneficiary.walletId,
      name: beneficiary.name,
      phoneE164: beneficiary.phoneE164,
      accountType: beneficiary.accountType,
      beneficiaryUserId: beneficiary.beneficiaryUserId,
      beneficiaryWalletAddress: beneficiary.beneficiaryWalletAddress,
      bankCode: beneficiary.bankCode,
      bankAccountNumber: beneficiary.bankAccountNumber,
      mobileMoneyProvider: beneficiary.mobileMoneyProvider,
      isFavorite: beneficiary.isFavorite,
      isVerified: beneficiary.isVerified,
      transferCount: beneficiary.transferCount,
      totalTransferred: beneficiary.totalTransferred,
      lastTransferAt: beneficiary.lastTransferAt,
      createdAt: beneficiary.createdAt,
    };
  }
}
