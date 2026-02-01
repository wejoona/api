import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import type {
  KycStatus as KycStatusAlias,
  UserRole as UserRoleAlias,
  UserStatus as UserStatusAlias,
} from '@/modules/user/application/domain/entities/user.entity';

// Create enum objects for GraphQL
export enum KycStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated',
}

// Register enums for GraphQL
registerEnumType(KycStatus, {
  name: 'KycStatus',
  description: 'KYC verification status',
});

registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'User role in the system',
});

registerEnumType(UserStatus, {
  name: 'UserStatus',
  description: 'User account status',
});

@ObjectType({ description: 'User account' })
export class UserModel {
  @Field(() => ID)
  id: string;

  @Field()
  phone: string;

  @Field()
  phoneVerified: boolean;

  @Field({ nullable: true })
  username?: string;

  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field({ nullable: true })
  email?: string;

  @Field()
  countryCode: string;

  @Field(() => KycStatus)
  kycStatus: KycStatusAlias;

  @Field({ nullable: true })
  kycProviderId?: string;

  @Field(() => UserRole)
  role: UserRoleAlias;

  @Field(() => UserStatus)
  status: UserStatusAlias;

  @Field({ nullable: true })
  suspendedAt?: Date;

  @Field({ nullable: true })
  suspendedReason?: string;

  @Field()
  hasPin: boolean;

  @Field({ nullable: true })
  pinSetAt?: Date;

  @Field()
  isPinLocked: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Computed fields
  @Field({ nullable: true })
  displayName?: string;

  @Field({ nullable: true })
  fullName?: string;

  @Field()
  isPhoneVerified: boolean;

  @Field()
  isKycApproved: boolean;

  @Field()
  canTransact: boolean;

  @Field()
  canWithdraw: boolean;

  @Field()
  isActive: boolean;

  @Field()
  isSuspended: boolean;

  @Field()
  isAdmin: boolean;

  // Relations
  @Field(() => WalletModel, { nullable: true })
  wallet?: WalletModel;

  @Field(() => [TransactionModel], { nullable: true })
  transactions?: TransactionModel[];
}

// Import will be resolved at runtime to avoid circular dependencies
import { WalletModel } from './wallet.model';
import { TransactionModel } from './transaction.model';
