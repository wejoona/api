import {
  ObjectType,
  Field,
  ID,
  Float,
  registerEnumType,
} from '@nestjs/graphql';
import type {
  WalletStatus as WalletStatusAlias,
  KycStatus as KycStatusAlias,
} from '@/modules/wallet/domain/entities/wallet.entity';

// Create enum objects for GraphQL
export enum WalletStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
}

export enum WalletKycStatus {
  NONE = 'none',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

// Register enums for GraphQL
registerEnumType(WalletStatus, {
  name: 'WalletStatus',
  description: 'Wallet status',
});

registerEnumType(WalletKycStatus, {
  name: 'WalletKycStatus',
  description: 'Wallet KYC verification status',
});

@ObjectType({ description: 'User wallet' })
export class WalletModel {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  userId: string;

  @Field({ nullable: true })
  yellowCardWalletId?: string;

  @Field({ nullable: true })
  circleWalletId?: string;

  @Field({ nullable: true })
  circleWalletAddress?: string;

  @Field()
  currency: string;

  @Field(() => Float)
  balance: number;

  @Field(() => WalletKycStatus)
  kycStatus: KycStatusAlias;

  @Field(() => WalletStatus)
  status: WalletStatusAlias;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Computed fields
  @Field()
  isActive: boolean;

  @Field()
  isLinkedToYellowCard: boolean;

  @Field()
  isLinkedToCircle: boolean;

  @Field()
  isLinkedToProvider: boolean;

  @Field()
  isKycVerified: boolean;

  @Field({ nullable: true })
  providerWalletId?: string;

  @Field({ nullable: true })
  depositAddress?: string;

  // Relations
  @Field(() => UserModel, { nullable: true })
  user?: UserModel;

  @Field(() => [TransactionModel], { nullable: true })
  transactions?: TransactionModel[];

  @Field(() => [BeneficiaryModel], { nullable: true })
  beneficiaries?: BeneficiaryModel[];
}

// Import will be resolved at runtime to avoid circular dependencies
import { UserModel } from './user.model';
import { TransactionModel } from './transaction.model';
import { BeneficiaryModel } from './beneficiary.model';
