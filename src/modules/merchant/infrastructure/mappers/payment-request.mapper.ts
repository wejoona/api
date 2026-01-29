import { Injectable } from '@nestjs/common';
import { PaymentRequestEntity } from '../../domain/entities/payment-request.entity';
import { PaymentRequestStatus } from '../../domain/entities/merchant.types';
import { PaymentRequestOrmEntity } from '../orm-entities/payment-request.orm-entity';

@Injectable()
export class PaymentRequestMapper {
  /**
   * Convert ORM entity to domain entity
   */
  toDomain(orm: PaymentRequestOrmEntity): PaymentRequestEntity {
    return PaymentRequestEntity.reconstitute({
      id: orm.id,
      requestId: orm.requestId,
      merchantId: orm.merchantId,
      amount: Number(orm.amount),
      currency: orm.currency,
      description: orm.description || undefined,
      reference: orm.reference || undefined,
      expiresAt: orm.expiresAt,
      status: orm.status as PaymentRequestStatus,
      qrData: orm.qrData,
      paidAt: orm.paidAt || undefined,
      paymentId: orm.paymentId || undefined,
      customerId: orm.customerId || undefined,
      metadata: orm.metadata || undefined,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  /**
   * Convert domain entity to ORM entity for persistence
   */
  toPersistence(
    domain: PaymentRequestEntity,
  ): Partial<PaymentRequestOrmEntity> {
    return {
      id: domain.id,
      requestId: domain.requestId,
      merchantId: domain.merchantId,
      amount: domain.amount,
      currency: domain.currency,
      description: domain.description || null,
      reference: domain.reference || null,
      expiresAt: domain.expiresAt,
      status: domain.status,
      qrData: domain.qrData,
      paidAt: domain.paidAt || null,
      paymentId: domain.paymentId || null,
      customerId: domain.customerId || null,
      metadata: domain.metadata || null,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }
}
