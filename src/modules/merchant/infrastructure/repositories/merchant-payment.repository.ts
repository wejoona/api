import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { MerchantPaymentEntity } from '../../domain/entities/merchant-payment.entity';
import { IMerchantAnalytics } from '../../domain/entities/merchant.types';
import { IMerchantPaymentRepository } from '../../domain/repositories/merchant-payment.repository';
import { MerchantPaymentOrmEntity } from '../orm-entities/merchant-payment.orm-entity';
import { MerchantPaymentMapper } from '../mappers/merchant-payment.mapper';

@Injectable()
export class MerchantPaymentRepository implements IMerchantPaymentRepository {
  constructor(
    @InjectRepository(MerchantPaymentOrmEntity)
    private readonly repository: Repository<MerchantPaymentOrmEntity>,
    private readonly mapper: MerchantPaymentMapper,
  ) {}

  async findById(id: string): Promise<MerchantPaymentEntity | null> {
    const orm = await this.repository.findOne({ where: { id } });
    return orm ? this.mapper.toDomain(orm) : null;
  }

  async findByPaymentId(
    paymentId: string,
  ): Promise<MerchantPaymentEntity | null> {
    const orm = await this.repository.findOne({ where: { paymentId } });
    return orm ? this.mapper.toDomain(orm) : null;
  }

  async findByReference(
    reference: string,
  ): Promise<MerchantPaymentEntity | null> {
    const orm = await this.repository.findOne({ where: { reference } });
    return orm ? this.mapper.toDomain(orm) : null;
  }

  async findByMerchantId(
    merchantId: string,
    limit = 50,
    offset = 0,
  ): Promise<MerchantPaymentEntity[]> {
    const orms = await this.repository.find({
      where: { merchantId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return orms.map((orm) => this.mapper.toDomain(orm));
  }

  async findByCustomerId(
    customerId: string,
    limit = 50,
    offset = 0,
  ): Promise<MerchantPaymentEntity[]> {
    const orms = await this.repository.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return orms.map((orm) => this.mapper.toDomain(orm));
  }

  async findByMerchantIdAndDateRange(
    merchantId: string,
    startDate: Date,
    endDate: Date,
    limit = 100,
    offset = 0,
  ): Promise<MerchantPaymentEntity[]> {
    const orms = await this.repository.find({
      where: {
        merchantId,
        createdAt: Between(startDate, endDate),
      },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return orms.map((orm) => this.mapper.toDomain(orm));
  }

  async save(payment: MerchantPaymentEntity): Promise<MerchantPaymentEntity> {
    const persistence = this.mapper.toPersistence(payment);
    const saved = await this.repository.save(
      persistence as MerchantPaymentOrmEntity,
    );
    return this.mapper.toDomain(saved);
  }

  async countByMerchantId(merchantId: string): Promise<number> {
    return this.repository.count({ where: { merchantId } });
  }

  async countByCustomerId(customerId: string): Promise<number> {
    return this.repository.count({ where: { customerId } });
  }

  async getTotalVolumeByMerchantId(
    merchantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.merchant_id = :merchantId', { merchantId })
      .andWhere('payment.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('payment.status = :status', { status: 'completed' })
      .getRawOne();

    return result?.total ? Number(result.total) : 0;
  }

  async getAnalytics(
    merchantId: string,
    period: 'day' | 'week' | 'month' | 'year',
    startDate: Date,
    endDate: Date,
  ): Promise<IMerchantAnalytics> {
    // Get totals
    const totals = await this.repository
      .createQueryBuilder('payment')
      .select([
        'COUNT(*) as total_transactions',
        'COALESCE(SUM(payment.amount), 0) as total_volume',
        'COALESCE(SUM(payment.fee), 0) as total_fees',
        'COALESCE(AVG(payment.amount), 0) as avg_transaction',
      ])
      .where('payment.merchant_id = :merchantId', { merchantId })
      .andWhere('payment.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('payment.status = :status', { status: 'completed' })
      .getRawOne();

    // Get unique customers
    const uniqueCustomers = await this.getUniqueCustomerCount(
      merchantId,
      startDate,
      endDate,
    );

    // Get top hours
    const topHours = await this.repository
      .createQueryBuilder('payment')
      .select([
        'EXTRACT(HOUR FROM payment.created_at) as hour',
        'COUNT(*) as count',
      ])
      .where('payment.merchant_id = :merchantId', { merchantId })
      .andWhere('payment.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('payment.status = :status', { status: 'completed' })
      .groupBy('EXTRACT(HOUR FROM payment.created_at)')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    // Get transactions by day
    const transactionsByDay = await this.repository
      .createQueryBuilder('payment')
      .select([
        'DATE(payment.created_at) as date',
        'COUNT(*) as count',
        'COALESCE(SUM(payment.amount), 0) as volume',
      ])
      .where('payment.merchant_id = :merchantId', { merchantId })
      .andWhere('payment.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('payment.status = :status', { status: 'completed' })
      .groupBy('DATE(payment.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      merchantId,
      period,
      startDate,
      endDate,
      totalTransactions: Number(totals?.total_transactions || 0),
      totalVolume: Number(totals?.total_volume || 0),
      totalFees: Number(totals?.total_fees || 0),
      averageTransactionSize: Number(totals?.avg_transaction || 0),
      uniqueCustomers,
      topHours: topHours.map((h) => ({
        hour: Number(h.hour),
        count: Number(h.count),
      })),
      transactionsByDay: transactionsByDay.map((d) => ({
        date: d.date.toISOString().split('T')[0],
        count: Number(d.count),
        volume: Number(d.volume),
      })),
    };
  }

  async getUniqueCustomerCount(
    merchantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('payment')
      .select('COUNT(DISTINCT payment.customer_id)', 'count')
      .where('payment.merchant_id = :merchantId', { merchantId })
      .andWhere('payment.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('payment.status = :status', { status: 'completed' })
      .getRawOne();

    return result?.count ? Number(result.count) : 0;
  }
}
