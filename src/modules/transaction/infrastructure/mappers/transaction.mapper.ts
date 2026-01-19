import { TransactionOrmEntity } from '../orm-entities/transaction.orm-entity';
import {
  TransactionEntity,
  TransactionType,
  TransactionStatus,
} from '../../domain/entities/transaction.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TransactionMapper {
  toOrmEntity(domainEntity: TransactionEntity): TransactionOrmEntity {
    if (!domainEntity) {
      throw new Error('Domain entity is required');
    }

    const ormEntity = new TransactionOrmEntity();
    ormEntity.id = domainEntity.id;
    ormEntity.walletId = domainEntity.walletId;
    ormEntity.type = domainEntity.type;
    ormEntity.amount = domainEntity.amount;
    ormEntity.currency = domainEntity.currency;
    ormEntity.status = domainEntity.status;
    ormEntity.yellowCardRef = domainEntity.yellowCardRef;
    ormEntity.recipientAddress = domainEntity.recipientAddress;
    ormEntity.recipientPhone = domainEntity.recipientPhone;
    ormEntity.recipientWalletId = domainEntity.recipientWalletId;
    ormEntity.metadata = domainEntity.metadata;
    ormEntity.failureReason = domainEntity.failureReason;
    ormEntity.createdAt = domainEntity.createdAt;
    ormEntity.completedAt = domainEntity.completedAt;

    return ormEntity;
  }

  toDomainEntity(ormEntity: TransactionOrmEntity): TransactionEntity {
    return TransactionEntity.reconstitute({
      id: ormEntity.id,
      walletId: ormEntity.walletId,
      type: ormEntity.type as TransactionType,
      amount: Number(ormEntity.amount),
      currency: ormEntity.currency,
      status: ormEntity.status as TransactionStatus,
      yellowCardRef: ormEntity.yellowCardRef,
      recipientAddress: ormEntity.recipientAddress,
      recipientPhone: ormEntity.recipientPhone,
      recipientWalletId: ormEntity.recipientWalletId,
      metadata: ormEntity.metadata,
      failureReason: ormEntity.failureReason,
      createdAt: ormEntity.createdAt,
      completedAt: ormEntity.completedAt,
    });
  }
}
