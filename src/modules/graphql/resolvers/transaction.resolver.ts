import {
  Resolver,
  Query,
  Args,
  ID,
  ResolveField,
  Parent,
  Int,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TransactionModel } from '../models/transaction.model';
import { WalletModel } from '../models/wallet.model';
import { UserModel } from '../models/user.model';
import { LoaderContext } from '../loaders';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@/modules/user/application/domain/entities/user.entity';
import { TransactionRepository } from '@/modules/transaction/infrastructure/repositories/transaction.repository';

@Resolver(() => TransactionModel)
export class TransactionResolver {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly loaders: LoaderContext,
  ) {}

  /**
   * Get transaction by ID
   */
  @Query(() => TransactionModel, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async transaction(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<TransactionModel | null> {
    const transaction = await this.loaders.transaction.byId.load(id);
    return transaction ? this.mapTransactionToModel(transaction) : null;
  }

  /**
   * Get current user's transactions
   */
  @Query(() => [TransactionModel], { name: 'myTransactions' })
  @UseGuards(GqlAuthGuard)
  async getCurrentUserTransactions(
    @CurrentUser() user: User,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 50 })
    limit: number = 50,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 })
    offset: number = 0,
  ): Promise<TransactionModel[]> {
    const wallet = await this.loaders.wallet.byUserId.load(user.id);
    if (!wallet) return [];

    const result = await this.transactionRepository.findByWalletIdPaginated(
      wallet.id,
      { limit, offset },
    );
    return result.transactions.map((t) => this.mapTransactionToModel(t));
  }

  /**
   * Get transactions for a specific wallet
   */
  @Query(() => [TransactionModel])
  @UseGuards(GqlAuthGuard)
  async walletTransactions(
    @Args('walletId', { type: () => ID }) walletId: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 50 })
    limit: number = 50,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 })
    offset: number = 0,
  ): Promise<TransactionModel[]> {
    const result = await this.transactionRepository.findByWalletIdPaginated(
      walletId,
      { limit, offset },
    );
    return result.transactions.map((t) => this.mapTransactionToModel(t));
  }

  /**
   * Resolve wallet relation
   */
  @ResolveField(() => WalletModel, { nullable: true })
  async wallet(
    @Parent() transaction: TransactionModel,
  ): Promise<WalletModel | null> {
    const wallet = await this.loaders.wallet.byId.load(transaction.walletId);
    return wallet ? this.mapWalletToModel(wallet) : null;
  }

  /**
   * Resolve user relation (through wallet)
   */
  @ResolveField(() => UserModel, { nullable: true })
  async user(
    @Parent() transaction: TransactionModel,
  ): Promise<UserModel | null> {
    const wallet = await this.loaders.wallet.byId.load(transaction.walletId);
    if (!wallet) return null;

    const user = await this.loaders.user.byId.load(wallet.userId);
    return user ? this.mapUserToModel(user) : null;
  }

  /**
   * Resolve recipient wallet relation
   */
  @ResolveField(() => WalletModel, { nullable: true })
  async recipientWallet(
    @Parent() transaction: TransactionModel,
  ): Promise<WalletModel | null> {
    if (!transaction.recipientWalletId) return null;

    const wallet = await this.loaders.wallet.byId.load(
      transaction.recipientWalletId,
    );
    return wallet ? this.mapWalletToModel(wallet) : null;
  }

  /**
   * Map domain entity to GraphQL model
   */
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
