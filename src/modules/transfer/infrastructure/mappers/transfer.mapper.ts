import { Injectable } from '@nestjs/common';
import { TransferOrmEntity } from '../orm-entities/transfer.orm-entity';
import {
  TransferEntity,
  TransferType,
  TransferStatus,
} from '../../application/domain/entities/transfer.entity';

@Injectable()
export class TransferMapper {
  toOrmEntity(domainEntity: TransferEntity): TransferOrmEntity {
    if (!domainEntity) {
      throw new Error('Domain entity is required');
    }

    const ormEntity = new TransferOrmEntity();
    ormEntity.id = domainEntity.id;
    ormEntity.reference = domainEntity.reference;
    ormEntity.type = domainEntity.type;
    ormEntity.status = domainEntity.status;
    ormEntity.senderId = domainEntity.senderId;
    ormEntity.senderWalletId = domainEntity.senderWalletId;
    ormEntity.senderPhone = domainEntity.senderPhone;
    ormEntity.recipientId = domainEntity.recipientId;
    ormEntity.recipientWalletId = domainEntity.recipientWalletId;
    ormEntity.recipientPhone = domainEntity.recipientPhone;
    ormEntity.recipientAddress = domainEntity.recipientAddress;
    ormEntity.recipientBlockchain = domainEntity.recipientBlockchain;
    ormEntity.amount = domainEntity.amount;
    ormEntity.fee = domainEntity.fee;
    ormEntity.currency = domainEntity.currency;
    ormEntity.note = domainEntity.note;
    ormEntity.providerTransferId = domainEntity.providerTransferId;
    ormEntity.providerName = domainEntity.providerName;
    ormEntity.ledgerTransactionId = domainEntity.ledgerTransactionId;
    ormEntity.txHash = domainEntity.txHash;
    ormEntity.errorMessage = domainEntity.errorMessage;
    ormEntity.metadata = domainEntity.metadata;
    ormEntity.createdAt = domainEntity.createdAt;
    ormEntity.updatedAt = domainEntity.updatedAt;
    ormEntity.completedAt = domainEntity.completedAt;

    return ormEntity;
  }

  toDomainEntity(ormEntity: TransferOrmEntity): TransferEntity {
    if (!ormEntity) {
      throw new Error('ORM entity is required');
    }

    return TransferEntity.reconstitute({
      id: ormEntity.id,
      reference: ormEntity.reference,
      type: ormEntity.type as TransferType,
      status: ormEntity.status as TransferStatus,
      senderId: ormEntity.senderId,
      senderWalletId: ormEntity.senderWalletId,
      senderPhone: ormEntity.senderPhone,
      recipientId: ormEntity.recipientId,
      recipientWalletId: ormEntity.recipientWalletId,
      recipientPhone: ormEntity.recipientPhone,
      recipientAddress: ormEntity.recipientAddress,
      recipientBlockchain: ormEntity.recipientBlockchain,
      amount: Number(ormEntity.amount) || 0,
      fee: Number(ormEntity.fee) || 0,
      currency: ormEntity.currency,
      note: ormEntity.note,
      providerTransferId: ormEntity.providerTransferId,
      providerName: ormEntity.providerName,
      ledgerTransactionId: ormEntity.ledgerTransactionId,
      txHash: ormEntity.txHash,
      errorMessage: ormEntity.errorMessage,
      metadata: ormEntity.metadata,
      createdAt: ormEntity.createdAt,
      updatedAt: ormEntity.updatedAt,
      completedAt: ormEntity.completedAt,
    });
  }

  toDomainEntities(ormEntities: TransferOrmEntity[]): TransferEntity[] {
    return ormEntities.map((ormEntity) => this.toDomainEntity(ormEntity));
  }
}
