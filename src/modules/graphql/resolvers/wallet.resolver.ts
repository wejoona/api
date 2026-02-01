import {
  Resolver,
  Query,
  Args,
  ID,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { WalletModel } from '../models/wallet.model';
import { UserModel } from '../models/user.model';
import { TransactionModel } from '../models/transaction.model';
import { BeneficiaryModel } from '../models/beneficiary.model';
import { LoaderContext } from '../loaders';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@/modules/user/application/domain/entities/user.entity';

@Resolver(() => WalletModel)
export class WalletResolver {
  constructor(private readonly loaders: LoaderContext) {}

  /**
   * Get current user's wallet
   */
  @Query(() => WalletModel, { name: 'myWallet', nullable: true })
  @UseGuards(GqlAuthGuard)
  async getCurrentUserWallet(
    @CurrentUser() user: User,
  ): Promise<WalletModel | null> {
    const wallet = await this.loaders.wallet.byUserId.load(user.id);
    return wallet ? this.mapWalletToModel(wallet) : null;
  }

  /**
   * Get wallet by ID
   */
  @Query(() => WalletModel, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async wallet(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<WalletModel | null> {
    const wallet = await this.loaders.wallet.byId.load(id);
    return wallet ? this.mapWalletToModel(wallet) : null;
  }

  /**
   * Resolve user relation
   */
  @ResolveField(() => UserModel, { nullable: true })
  async user(@Parent() wallet: WalletModel): Promise<UserModel | null> {
    const user = await this.loaders.user.byId.load(wallet.userId);
    return user ? this.mapUserToModel(user) : null;
  }

  /**
   * Resolve transactions relation
   */
  @ResolveField(() => [TransactionModel])
  async transactions(
    @Parent() wallet: WalletModel,
  ): Promise<TransactionModel[]> {
    const transactions = await this.loaders.transaction.byWalletId.load(
      wallet.id,
    );
    return transactions.map((t) => this.mapTransactionToModel(t));
  }

  /**
   * Resolve beneficiaries relation
   */
  @ResolveField(() => [BeneficiaryModel])
  async beneficiaries(
    @Parent() wallet: WalletModel,
  ): Promise<BeneficiaryModel[]> {
    const beneficiaries = await this.loaders.beneficiary.byWalletId.load(
      wallet.id,
    );
    return beneficiaries.map((b) => this.mapBeneficiaryToModel(b));
  }

  /**
   * Map domain entity to GraphQL model
   */
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

  private mapTransactionToModel(transaction: any): TransactionModel {
    return {
      id: transaction.id,
      walletId: transaction.walletId,
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      yellowCardRef: transaction.yellowCardRef || undefined,
      recipientAddress: transaction.recipientAddress || undefined,
      recipientPhone: transaction.recipientPhone || undefined,
      recipientWalletId: transaction.recipientWalletId || undefined,
      metadata: transaction.metadata || undefined,
      failureReason: transaction.failureReason || undefined,
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt || undefined,
      providerRef: transaction.providerRef || undefined,
      isPending: transaction.isPending,
      isCompleted: transaction.isCompleted,
      isFailed: transaction.isFailed,
      isDeposit: transaction.isDeposit,
      isTransfer: transaction.isTransfer,
      isBillPayment: transaction.isBillPayment,
    };
  }

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
}
