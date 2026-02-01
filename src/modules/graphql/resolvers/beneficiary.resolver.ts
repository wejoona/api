import {
  Resolver,
  Query,
  Args,
  ID,
  ResolveField,
  Parent,
  Mutation,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { BeneficiaryModel } from '../models/beneficiary.model';
import { WalletModel } from '../models/wallet.model';
import { UserModel } from '../models/user.model';
import { LoaderContext } from '../loaders';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@/modules/user/application/domain/entities/user.entity';
import { BeneficiaryRepository } from '@/modules/beneficiary/domain/repositories/beneficiary.repository';

@Resolver(() => BeneficiaryModel)
export class BeneficiaryResolver {
  constructor(
    private readonly beneficiaryRepository: BeneficiaryRepository,
    private readonly loaders: LoaderContext,
  ) {}

  /**
   * Get beneficiary by ID
   */
  @Query(() => BeneficiaryModel, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async beneficiary(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<BeneficiaryModel | null> {
    const beneficiary = await this.loaders.beneficiary.byId.load(id);
    return beneficiary ? this.mapBeneficiaryToModel(beneficiary) : null;
  }

  /**
   * Get current user's beneficiaries
   */
  @Query(() => [BeneficiaryModel], { name: 'myBeneficiaries' })
  @UseGuards(GqlAuthGuard)
  async getCurrentUserBeneficiaries(
    @CurrentUser() user: User,
  ): Promise<BeneficiaryModel[]> {
    const wallet = await this.loaders.wallet.byUserId.load(user.id);
    if (!wallet) return [];

    const beneficiaries = await this.loaders.beneficiary.byWalletId.load(
      wallet.id,
    );
    return beneficiaries.map((b) => this.mapBeneficiaryToModel(b));
  }

  /**
   * Get favorite beneficiaries
   */
  @Query(() => [BeneficiaryModel], { name: 'myFavoriteBeneficiaries' })
  @UseGuards(GqlAuthGuard)
  async getFavoriteBeneficiaries(
    @CurrentUser() user: User,
  ): Promise<BeneficiaryModel[]> {
    const wallet = await this.loaders.wallet.byUserId.load(user.id);
    if (!wallet) return [];

    const beneficiaries =
      await this.beneficiaryRepository.findFavoritesByWalletId(wallet.id);
    return beneficiaries.map((b) => this.mapBeneficiaryToModel(b));
  }

  /**
   * Toggle beneficiary favorite status
   */
  @Mutation(() => BeneficiaryModel)
  @UseGuards(GqlAuthGuard)
  async toggleBeneficiaryFavorite(
    @CurrentUser() user: User,
    @Args('beneficiaryId', { type: () => ID }) beneficiaryId: string,
  ): Promise<BeneficiaryModel> {
    const beneficiary =
      await this.beneficiaryRepository.findById(beneficiaryId);
    if (!beneficiary) {
      throw new Error('Beneficiary not found');
    }

    // Verify ownership through wallet
    const wallet = await this.loaders.wallet.byUserId.load(user.id);
    if (!wallet || beneficiary.walletId !== wallet.id) {
      throw new Error('Unauthorized');
    }

    beneficiary.toggleFavorite();
    const updated = await this.beneficiaryRepository.save(beneficiary);
    return this.mapBeneficiaryToModel(updated);
  }

  /**
   * Resolve wallet relation
   */
  @ResolveField(() => WalletModel, { nullable: true })
  async wallet(
    @Parent() beneficiary: BeneficiaryModel,
  ): Promise<WalletModel | null> {
    const wallet = await this.loaders.wallet.byId.load(beneficiary.walletId);
    return wallet ? this.mapWalletToModel(wallet) : null;
  }

  /**
   * Resolve beneficiary user relation
   */
  @ResolveField(() => UserModel, { nullable: true })
  async beneficiaryUser(
    @Parent() beneficiary: BeneficiaryModel,
  ): Promise<UserModel | null> {
    if (!beneficiary.beneficiaryUserId) return null;

    const user = await this.loaders.user.byId.load(
      beneficiary.beneficiaryUserId,
    );
    return user ? this.mapUserToModel(user) : null;
  }

  /**
   * Map domain entity to GraphQL model
   */
  private mapBeneficiaryToModel(beneficiary: any): BeneficiaryModel {
    return {
      id: beneficiary.id,
      walletId: beneficiary.walletId,
      name: beneficiary.name,
      phoneE164: beneficiary.phoneE164 || undefined,
      accountType: beneficiary.accountType,
      beneficiaryUserId: beneficiary.beneficiaryUserId || undefined,
      beneficiaryWalletAddress:
        beneficiary.beneficiaryWalletAddress || undefined,
      bankCode: beneficiary.bankCode || undefined,
      bankAccountNumber: beneficiary.bankAccountNumber || undefined,
      mobileMoneyProvider: beneficiary.mobileMoneyProvider || undefined,
      isFavorite: beneficiary.isFavorite,
      isVerified: beneficiary.isVerified,
      transferCount: beneficiary.transferCount,
      totalTransferred: beneficiary.totalTransferred,
      lastTransferAt: beneficiary.lastTransferAt || undefined,
      metadata: beneficiary.metadata || undefined,
      createdAt: beneficiary.createdAt,
      updatedAt: beneficiary.updatedAt,
      isJoonaPayUser: beneficiary.isJoonaPayUser,
      isMobileMoney: beneficiary.isMobileMoney,
      isBankAccount: beneficiary.isBankAccount,
      isExternalWallet: beneficiary.isExternalWallet,
    };
  }

  private mapWalletToModel(wallet: any): WalletModel {
    return {
      id: wallet.id,
      userId: wallet.userId,
      yellowCardWalletId: wallet.yellowCardWalletId || undefined,
      circleWalletId: wallet.circleWalletId || undefined,
      circleWalletAddress: wallet.circleWalletAddress || undefined,
      currency: wallet.currency,
      balance: wallet.balance,
      kycStatus: wallet.kycStatus,
      status: wallet.status,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
      isActive: wallet.isActive,
      isLinkedToYellowCard: wallet.isLinkedToYellowCard,
      isLinkedToCircle: wallet.isLinkedToCircle,
      isLinkedToProvider: wallet.isLinkedToProvider,
      isKycVerified: wallet.isKycVerified,
      providerWalletId: wallet.providerWalletId || undefined,
      depositAddress: wallet.depositAddress || undefined,
    };
  }

  private mapUserToModel(user: any): UserModel {
    return {
      id: user.id,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      username: user.username || undefined,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      email: user.email || undefined,
      countryCode: user.countryCode,
      kycStatus: user.kycStatus,
      kycProviderId: user.kycProviderId || undefined,
      role: user.role,
      status: user.status,
      suspendedAt: user.suspendedAt || undefined,
      suspendedReason: user.suspendedReason || undefined,
      hasPin: user.hasPin,
      pinSetAt: user.pinSetAt || undefined,
      isPinLocked: user.isPinLocked,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      displayName: user.displayName,
      fullName: user.fullName || undefined,
      isPhoneVerified: user.isPhoneVerified,
      isKycApproved: user.isKycApproved,
      canTransact: user.canTransact,
      canWithdraw: user.canWithdraw,
      isActive: user.isActive,
      isSuspended: user.isSuspended,
      isAdmin: user.isAdmin,
    };
  }
}
