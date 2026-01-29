import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { PaymentRequestEntity } from '../../domain/entities/payment-request.entity';
import { IPaymentRequestRepository } from '../../domain/repositories/payment-request.repository';
import { PaymentRequestOrmEntity } from '../orm-entities/payment-request.orm-entity';
import { PaymentRequestMapper } from '../mappers/payment-request.mapper';

@Injectable()
export class PaymentRequestRepository implements IPaymentRequestRepository {
  constructor(
    @InjectRepository(PaymentRequestOrmEntity)
    private readonly repository: Repository<PaymentRequestOrmEntity>,
    private readonly mapper: PaymentRequestMapper,
  ) {}

  async findById(id: string): Promise<PaymentRequestEntity | null> {
    const orm = await this.repository.findOne({ where: { id } });
    return orm ? this.mapper.toDomain(orm) : null;
  }

  async findByRequestId(
    requestId: string,
  ): Promise<PaymentRequestEntity | null> {
    const orm = await this.repository.findOne({ where: { requestId } });
    return orm ? this.mapper.toDomain(orm) : null;
  }

  async findByMerchantId(
    merchantId: string,
    limit = 50,
    offset = 0,
  ): Promise<PaymentRequestEntity[]> {
    const orms = await this.repository.find({
      where: { merchantId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return orms.map((orm) => this.mapper.toDomain(orm));
  }

  async findPendingByMerchantId(
    merchantId: string,
    limit = 20,
  ): Promise<PaymentRequestEntity[]> {
    const now = new Date();
    const orms = await this.repository
      .createQueryBuilder('pr')
      .where('pr.merchant_id = :merchantId', { merchantId })
      .andWhere('pr.status = :status', { status: 'pending' })
      .andWhere('pr.expires_at > :now', { now })
      .orderBy('pr.created_at', 'DESC')
      .take(limit)
      .getMany();

    return orms.map((orm) => this.mapper.toDomain(orm));
  }

  async findExpiredPending(): Promise<PaymentRequestEntity[]> {
    const now = new Date();
    const orms = await this.repository.find({
      where: {
        status: 'pending',
        expiresAt: LessThan(now),
      },
      take: 1000,
    });
    return orms.map((orm) => this.mapper.toDomain(orm));
  }

  async save(
    paymentRequest: PaymentRequestEntity,
  ): Promise<PaymentRequestEntity> {
    const persistence = this.mapper.toPersistence(paymentRequest);
    const saved = await this.repository.save(
      persistence as PaymentRequestOrmEntity,
    );
    return this.mapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async countByMerchantId(merchantId: string): Promise<number> {
    return this.repository.count({ where: { merchantId } });
  }

  async markExpiredRequests(): Promise<number> {
    const now = new Date();
    const result = await this.repository
      .createQueryBuilder()
      .update(PaymentRequestOrmEntity)
      .set({ status: 'expired', updatedAt: new Date() })
      .where('status = :status', { status: 'pending' })
      .andWhere('expires_at < :now', { now })
      .execute();

    return result.affected || 0;
  }
}
