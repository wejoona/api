import { Injectable } from '@nestjs/common';
import {
  BulkPaymentEntity,
  BulkPaymentItemEntity,
  BulkPaymentStatus,
  BulkPaymentItemStatus,
} from '../../domain/entities/bulk-payment.entity';
import {
  BulkPaymentOrmEntity,
  BulkPaymentItemOrmEntity,
} from '../orm-entities/bulk-payment.orm-entity';

@Injectable()
export class BulkPaymentMapper {
  toDomain(
    ormEntity: BulkPaymentOrmEntity,
    items: BulkPaymentItemOrmEntity[] = [],
  ): BulkPaymentEntity {
    const domainItems = items.map((item) => this.itemToDomain(item));

    return BulkPaymentEntity.reconstitute(
      {
        id: ormEntity.id,
        walletId: ormEntity.walletId,
        name: ormEntity.name,
        totalAmount: Number(ormEntity.totalAmount),
        totalRecipients: ormEntity.totalRecipients,
        successCount: ormEntity.successCount,
        failedCount: ormEntity.failedCount,
        status: ormEntity.status as BulkPaymentStatus,
        createdAt: ormEntity.createdAt,
        updatedAt: ormEntity.updatedAt,
        processedAt: ormEntity.processedAt,
      },
      domainItems,
    );
  }

  toOrmEntity(domain: BulkPaymentEntity): BulkPaymentOrmEntity {
    const ormEntity = new BulkPaymentOrmEntity();
    ormEntity.id = domain.id;
    ormEntity.walletId = domain.walletId;
    ormEntity.name = domain.name;
    ormEntity.totalAmount = domain.totalAmount;
    ormEntity.totalRecipients = domain.totalRecipients;
    ormEntity.successCount = domain.successCount;
    ormEntity.failedCount = domain.failedCount;
    ormEntity.status = domain.status;
    ormEntity.processedAt = domain.processedAt;
    return ormEntity;
  }

  itemToDomain(ormEntity: BulkPaymentItemOrmEntity): BulkPaymentItemEntity {
    return BulkPaymentItemEntity.reconstitute({
      id: ormEntity.id,
      bulkPaymentId: ormEntity.bulkPaymentId,
      recipientPhone: ormEntity.recipientPhone,
      recipientName: ormEntity.recipientName,
      amount: Number(ormEntity.amount),
      description: ormEntity.description,
      status: ormEntity.status as BulkPaymentItemStatus,
      errorMessage: ormEntity.errorMessage,
      transactionId: ormEntity.transactionId,
      createdAt: ormEntity.createdAt,
      updatedAt: ormEntity.updatedAt,
      processedAt: ormEntity.processedAt,
    });
  }

  itemToOrmEntity(domain: BulkPaymentItemEntity): BulkPaymentItemOrmEntity {
    const ormEntity = new BulkPaymentItemOrmEntity();
    ormEntity.id = domain.id;
    ormEntity.bulkPaymentId = domain.bulkPaymentId;
    ormEntity.recipientPhone = domain.recipientPhone;
    ormEntity.recipientName = domain.recipientName;
    ormEntity.amount = domain.amount;
    ormEntity.description = domain.description;
    ormEntity.status = domain.status;
    ormEntity.errorMessage = domain.errorMessage;
    ormEntity.transactionId = domain.transactionId;
    ormEntity.processedAt = domain.processedAt;
    return ormEntity;
  }
}
