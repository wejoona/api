import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { BillPaymentOrmEntity } from '../orm-entities';
import {
  BillPaymentStatus,
  BillCategory,
  GetPaymentHistoryQuery,
  BillPaymentHistoryItem,
  PaginatedBillPaymentHistory,
} from '../../domain/types';

@Injectable()
export class BillPaymentRepository {
  constructor(
    @InjectRepository(BillPaymentOrmEntity)
    private readonly repository: Repository<BillPaymentOrmEntity>,
  ) {}

  async create(payment: Partial<BillPaymentOrmEntity>): Promise<BillPaymentOrmEntity> {
    const entity = this.repository.create(payment);
    return this.repository.save(entity);
  }

  async findById(id: string): Promise<BillPaymentOrmEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['provider'],
    });
  }

  async findByIdempotencyKey(key: string): Promise<BillPaymentOrmEntity | null> {
    return this.repository.findOne({
      where: { idempotencyKey: key },
      relations: ['provider'],
    });
  }

  async findByReceiptNumber(receiptNumber: string): Promise<BillPaymentOrmEntity | null> {
    return this.repository.findOne({
      where: { receiptNumber },
      relations: ['provider'],
    });
  }

  async findByUserId(
    userId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<BillPaymentOrmEntity[]> {
    return this.repository.find({
      where: { userId },
      relations: ['provider'],
      order: { createdAt: 'DESC' },
      take: options.limit || 20,
      skip: options.offset || 0,
    });
  }

  async findPendingPayments(olderThan?: Date): Promise<BillPaymentOrmEntity[]> {
    const qb = this.repository.createQueryBuilder('payment')
      .leftJoinAndSelect('payment.provider', 'provider')
      .where('payment.status IN (:...statuses)', {
        statuses: ['pending', 'processing'],
      });

    if (olderThan) {
      qb.andWhere('payment.createdAt < :olderThan', { olderThan });
    }

    return qb.orderBy('payment.createdAt', 'ASC').getMany();
  }

  async getPaginatedHistory(query: GetPaymentHistoryQuery): Promise<PaginatedBillPaymentHistory> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;

    const qb = this.repository.createQueryBuilder('payment')
      .leftJoinAndSelect('payment.provider', 'provider')
      .where('payment.userId = :userId', { userId: query.userId });

    if (query.category) {
      qb.andWhere('payment.category = :category', { category: query.category });
    }

    if (query.status) {
      qb.andWhere('payment.status = :status', { status: query.status });
    }

    if (query.startDate) {
      qb.andWhere('payment.createdAt >= :startDate', { startDate: query.startDate });
    }

    if (query.endDate) {
      qb.andWhere('payment.createdAt <= :endDate', { endDate: query.endDate });
    }

    const [entities, total] = await qb
      .orderBy('payment.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      items: entities.map(this.toHistoryItem),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateStatus(
    id: string,
    status: BillPaymentStatus,
    additionalData?: Partial<BillPaymentOrmEntity>,
  ): Promise<void> {
    const updateData: Partial<BillPaymentOrmEntity> = {
      status,
      ...additionalData,
    };

    if (status === 'completed') {
      updateData.completedAt = new Date();
    } else if (status === 'refunded') {
      updateData.refundedAt = new Date();
    }

    await this.repository.update(id, updateData);
  }

  async incrementRetryCount(id: string): Promise<void> {
    await this.repository.increment({ id }, 'retryCount', 1);
  }

  async setFailureReason(id: string, reason: string): Promise<void> {
    await this.repository.update(id, {
      status: 'failed',
      failureReason: reason,
    });
  }

  async getDailyPaymentVolume(userId: string, startOfDay: Date): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('payment')
      .select('SUM(payment.totalAmount)', 'total')
      .where('payment.userId = :userId', { userId })
      .andWhere('payment.createdAt >= :startOfDay', { startOfDay })
      .andWhere('payment.status IN (:...statuses)', {
        statuses: ['completed', 'processing', 'pending'],
      })
      .getRawOne();

    return parseFloat(result?.total) || 0;
  }

  async getRecentPaymentForAccount(
    userId: string,
    providerId: string,
    accountNumber: string,
    withinMinutes: number = 5,
  ): Promise<BillPaymentOrmEntity | null> {
    const since = new Date(Date.now() - withinMinutes * 60 * 1000);

    return this.repository.findOne({
      where: {
        userId,
        providerId,
        accountNumber,
        createdAt: MoreThanOrEqual(since),
        status: In(['pending', 'processing', 'completed']),
      },
      order: { createdAt: 'DESC' },
    });
  }

  private toHistoryItem(entity: BillPaymentOrmEntity): BillPaymentHistoryItem {
    return {
      id: entity.id,
      providerId: entity.providerId,
      providerName: entity.provider?.name || 'Unknown Provider',
      providerLogo: entity.provider?.logo || '',
      category: entity.category,
      accountNumber: entity.accountNumber,
      customerName: entity.customerName || undefined,
      amount: Number(entity.amount),
      fee: Number(entity.fee),
      totalAmount: Number(entity.totalAmount),
      currency: entity.currency,
      status: entity.status,
      receiptNumber: entity.receiptNumber || undefined,
      tokenNumber: entity.tokenNumber || undefined,
      createdAt: entity.createdAt,
      completedAt: entity.completedAt || undefined,
    };
  }
}
