import {
  ObjectType,
  Field,
  ID,
  Float,
  registerEnumType,
} from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import { BeneficiaryAccountType } from '@/modules/beneficiary/domain/entities/beneficiary.entity';

// Register enum for GraphQL
registerEnumType(BeneficiaryAccountType, {
  name: 'BeneficiaryAccountType',
  description: 'Type of beneficiary account',
});

@ObjectType({ description: 'Saved beneficiary/recipient' })
export class BeneficiaryModel {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  walletId: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  phoneE164?: string;

  @Field(() => BeneficiaryAccountType)
  accountType: BeneficiaryAccountType;

  @Field({ nullable: true })
  beneficiaryUserId?: string;

  @Field({ nullable: true })
  beneficiaryWalletAddress?: string;

  @Field({ nullable: true })
  bankCode?: string;

  @Field({ nullable: true })
  bankAccountNumber?: string;

  @Field({ nullable: true })
  mobileMoneyProvider?: string;

  @Field()
  isFavorite: boolean;

  @Field()
  isVerified: boolean;

  @Field(() => Float)
  transferCount: number;

  @Field(() => Float)
  totalTransferred: number;

  @Field({ nullable: true })
  lastTransferAt?: Date;

  @Field(() => GraphQLJSONObject, { nullable: true })
  metadata?: Record<string, unknown>;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Computed fields
  @Field()
  isJoonaPayUser: boolean;

  @Field()
  isMobileMoney: boolean;

  @Field()
  isBankAccount: boolean;

  @Field()
  isExternalWallet: boolean;

  // Relations
  @Field(() => WalletModel, { nullable: true })
  wallet?: WalletModel;

  @Field(() => UserModel, { nullable: true })
  beneficiaryUser?: UserModel;
}

// Import will be resolved at runtime to avoid circular dependencies
import { WalletModel } from './wallet.model';
import { UserModel } from './user.model';
