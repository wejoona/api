import { Injectable } from '@nestjs/common';
import {
  PaymentLink,
  PaymentLinkStatus,
} from '../../domain/entities/payment-link.entity';
import { PaymentLinkOrmEntity } from '../orm-entities/payment-link.orm-entity';

@Injectable()
export class PaymentLinkMapper {
  toDomain(entity: PaymentLinkOrmEntity): PaymentLink {
    return PaymentLink.reconstitute({
      id: entity.id,
      userId: entity.userId,
      walletId: entity.walletId,
      code: entity.code,
      amount: entity.amount ? parseFloat(entity.amount) : null,
      currency: entity.currency,
      description: entity.description,
      status: entity.status as PaymentLinkStatus,
      expiresAt: entity.expiresAt,
      paidAt: entity.paidAt,
      paidByUserId: entity.paidByUserId,
      viewCount: entity.viewCount,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toOrmEntity(paymentLink: PaymentLink): PaymentLinkOrmEntity {
    const entity = new PaymentLinkOrmEntity();
    entity.id = paymentLink.id;
    entity.userId = paymentLink.userId;
    entity.walletId = paymentLink.walletId;
    entity.code = paymentLink.code;
    entity.amount =
      paymentLink.amount !== null ? paymentLink.amount.toString() : null;
    entity.currency = paymentLink.currency;
    entity.description = paymentLink.description;
    entity.status = paymentLink.status;
    entity.expiresAt = paymentLink.expiresAt;
    entity.paidAt = paymentLink.paidAt;
    entity.paidByUserId = paymentLink.paidByUserId;
    entity.viewCount = paymentLink.viewCount;
    entity.createdAt = paymentLink.createdAt;
    entity.updatedAt = paymentLink.updatedAt;
    return entity;
  }
}
