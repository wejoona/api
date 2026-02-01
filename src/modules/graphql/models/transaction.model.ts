import {
  ObjectType,
  Field,
  ID,
  Float,
  registerEnumType,
} from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import type {
  TransactionType as TransactionTypeAlias,
  TransactionStatus as TransactionStatusAlias,
} from '@/modules/transaction/domain/entities/transaction.entity';

// Create enum objects for GraphQL
export enum TransactionType {
  DEPOSIT = 'deposit',
  TRANSFER_INTERNAL = 'transfer_internal',
  TRANSFER_EXTERNAL = 'transfer_external',
  WITHDRAWAL = 'withdrawal',
  BILL_PAYMENT = 'bill_payment',
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// Register enums for GraphQL
registerEnumType(TransactionType, {
  name: 'TransactionType',
  description: 'Type of transaction',
});

registerEnumType(TransactionStatus, {
  name: 'TransactionStatus',
  description: 'Transaction processing status',
});

@ObjectType({ description: 'Transaction record' })
export class TransactionModel {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  walletId: string;

  @Field(() => TransactionType)
  type: TransactionTypeAlias;

  @Field(() => Float)
  amount: number;

  @Field()
  currency: string;

  @Field(() => TransactionStatus)
  status: TransactionStatusAlias;

  @Field({ nullable: true })
  yellowCardRef?: string;

  @Field({ nullable: true })
  recipientAddress?: string;

  @Field({ nullable: true })
  recipientPhone?: string;

  @Field({ nullable: true })
  recipientWalletId?: string;

  @Field(() => GraphQLJSONObject, { nullable: true })
  metadata?: Record<string, unknown>;

  @Field({ nullable: true })
  failureReason?: string;

  @Field()
  createdAt: Date;

  @Field({ nullable: true })
  completedAt?: Date;

  // Computed fields
  @Field({ nullable: true })
  providerRef?: string;

  @Field()
  isPending: boolean;

  @Field()
  isCompleted: boolean;

  @Field()
  isFailed: boolean;

  @Field()
  isDeposit: boolean;

  @Field()
  isTransfer: boolean;

  @Field()
  isBillPayment: boolean;

  // Relations
  @Field(() => WalletModel, { nullable: true })
  wallet?: WalletModel;

  @Field(() => UserModel, { nullable: true })
  user?: UserModel;

  @Field(() => WalletModel, { nullable: true })
  recipientWallet?: WalletModel;
}

// Import will be resolved at runtime to avoid circular dependencies
import { WalletModel } from './wallet.model';
import { UserModel } from './user.model';
