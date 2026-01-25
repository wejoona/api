import { Injectable } from '@nestjs/common';
import { MerchantPaymentEntity } from '../../domain/entities/merchant-payment.entity';
import { MerchantPaymentStatus } from '../../domain/entities/merchant.types';
import { MerchantPaymentOrmEntity } from '../orm-entities/merchant-payment.orm-entity';

@Injectable()
export class MerchantPaymentMapper {
  /**
   * Convert ORM entity to domain entity
   */
  toDomain(orm: MerchantPaymentOrmEntity): MerchantPaymentEntity {
    return MerchantPaymentEntity.reconstitute({
      id: orm.id,
      paymentId: orm.paymentId,
      merchantId: orm.merchantId,
      customerId: orm.customerId,
      customerWalletId: orm.customerWalletId,
      merchantWalletId: orm.merchantWalletId,
      paymentRequestId: orm.paymentRequestId || undefined,
      amount: Number(orm.amount),
      fee: Number(orm.fee),
      netAmount: Number(orm.netAmount),
      currency: orm.currency,
      reference: orm.reference,
      description: orm.description || undefined,
      status: orm.status as MerchantPaymentStatus,
      txHash: orm.txHash || undefined,
      ledgerTransactionId: orm.ledgerTransactionId || undefined,
      refundedAt: orm.refundedAt || undefined,
      refundReason: orm.refundReason || undefined,
      metadata: orm.metadata || undefined,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  /**
   * Convert domain entity to ORM entity for persistence
   */
  toPersistence(domain: MerchantPaymentEntity): Partial<MerchantPaymentOrmEntity> {
    return {
      id: domain.id,
      paymentId: domain.paymentId,
      merchantId: domain.merchantId,
      customerId: domain.customerId,
      customerWalletId: domain.customerWalletId,
      merchantWalletId: domain.merchantWalletId,
      paymentRequestId: domain.paymentRequestId || null,
      amount: domain.amount,
      fee: domain.fee,
      netAmount: domain.netAmount,
      currency: domain.currency,
      reference: domain.reference,
      description: domain.description || null,
      status: domain.status,
      txHash: domain.txHash || null,
      ledgerTransactionId: domain.ledgerTransactionId || null,
      refundedAt: domain.refundedAt || null,
      refundReason: domain.refundReason || null,
      metadata: domain.metadata || null,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }
}
