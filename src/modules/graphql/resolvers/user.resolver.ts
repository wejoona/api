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
import { UserModel } from '../models/user.model';
import { WalletModel } from '../models/wallet.model';
import { TransactionModel } from '../models/transaction.model';
import { LoaderContext } from '../loaders';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@/modules/user/application/domain/entities/user.entity';
import { UserRepository } from '@/modules/user/infrastructure/repositories/user.repository';

@Resolver(() => UserModel)
export class UserResolver {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly loaders: LoaderContext,
  ) {}

  /**
   * Get current authenticated user
   */
  @Query(() => UserModel, { name: 'me' })
  @UseGuards(GqlAuthGuard)
  async getCurrentUser(@CurrentUser() user: User): Promise<UserModel> {
    return this.mapUserToModel(user);
  }

  /**
   * Get user by ID (admin only in production)
   */
  @Query(() => UserModel, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async user(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<UserModel | null> {
    const user = await this.loaders.user.byId.load(id);
    return user ? this.mapUserToModel(user) : null;
  }

  /**
   * Search users by phone
   */
  @Query(() => UserModel, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async userByPhone(@Args('phone') phone: string): Promise<UserModel | null> {
    const user = await this.loaders.user.byPhone.load(phone);
    return user ? this.mapUserToModel(user) : null;
  }

  /**
   * Search users by username
   */
  @Query(() => UserModel, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async userByUsername(
    @Args('username') username: string,
  ): Promise<UserModel | null> {
    const user = await this.loaders.user.byUsername.load(username);
    return user ? this.mapUserToModel(user) : null;
  }

  /**
   * Update user profile
   */
  @Mutation(() => UserModel)
  @UseGuards(GqlAuthGuard)
  async updateProfile(
    @CurrentUser() currentUser: User,
    @Args('firstName', { nullable: true }) firstName?: string,
    @Args('lastName', { nullable: true }) lastName?: string,
    @Args('email', { nullable: true }) email?: string,
  ): Promise<UserModel> {
    currentUser.updateProfile({ firstName, lastName, email });
    const updated = await this.userRepository.save(currentUser);
    return this.mapUserToModel(updated);
  }

  /**
   * Set username
   */
  @Mutation(() => UserModel)
  @UseGuards(GqlAuthGuard)
  async setUsername(
    @CurrentUser() currentUser: User,
    @Args('username') username: string,
  ): Promise<UserModel> {
    currentUser.setUsername(username);
    const updated = await this.userRepository.save(currentUser);
    return this.mapUserToModel(updated);
  }

  /**
   * Resolve wallet relation
   */
  @ResolveField(() => WalletModel, { nullable: true })
  async wallet(@Parent() user: UserModel): Promise<WalletModel | null> {
    const wallet = await this.loaders.wallet.byUserId.load(user.id);
    return wallet ? this.mapWalletToModel(wallet) : null;
  }

  /**
   * Resolve transactions relation
   */
  @ResolveField(() => [TransactionModel])
  async transactions(@Parent() user: UserModel): Promise<TransactionModel[]> {
    const wallet = await this.loaders.wallet.byUserId.load(user.id);
    if (!wallet) return [];

    const transactions = await this.loaders.transaction.byWalletId.load(
      wallet.id,
    );
    return transactions.map((t) => this.mapTransactionToModel(t));
  }

  /**
   * Map domain entity to GraphQL model
   */
  private mapUserToModel(user: User): UserModel {
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
}
