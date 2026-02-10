import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DepositEntity } from '../../domain/entities/deposit.entity';
import { DepositStatus } from '../../domain/enums/deposit-status.enum';

import { PaymentMethodType } from '../../domain/enums/payment-method-type.enum';

export interface CreateDepositParams {
  userId: string;
  amount: bigint;
  currency: string;
  providerCode: string;
  paymentMethodType: PaymentMethodType;
  phoneNumber?: string;
  providerTransactionId?: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface UpdateDepositParams {
  status?: DepositStatus;
  providerTransactionId?: string;
  providerReference?: string;
  failureReason?: string;
  blnkTransactionId?: string;
  completedAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface ListDepositsParams {
  userId: string;
  status?: DepositStatus;
  limit?: number;
  offset?: number;
}

@Injectable()
export class DepositRepository {
  private readonly logger = new Logger(DepositRepository.name);

  constructor(
    @InjectRepository(DepositEntity)
    private readonly repository: Repository<DepositEntity>,
  ) {}

  async create(params: CreateDepositParams): Promise<DepositEntity> {
    this.logger.debug(`Creating deposit for user ${params.userId}`);

    const deposit = this.repository.create({
      ...params,
      status: DepositStatus.INITIATED,
    });

    return this.repository.save(deposit);
  }

  async findById(id: string): Promise<DepositEntity | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  async findByIdAndUserId(id: string, userId: string): Promise<DepositEntity | null> {
    return this.repository.findOne({
      where: { id, userId },
    });
  }

  async findByProviderTransactionId(providerTransactionId: string): Promise<DepositEntity | null> {
    return this.repository.findOne({
      where: { providerTransactionId },
    });
  }

  async update(id: string, params: UpdateDepositParams): Promise<void> {
    this.logger.debug(`Updating deposit ${id}`, params);

    await this.repository.update(id, params);
  }

  async listByUser(params: ListDepositsParams): Promise<{ deposits: DepositEntity[]; total: number }> {
    const { userId, status, limit = 20, offset = 0 } = params;

    const queryBuilder = this.repository
      .createQueryBuilder('deposit')
      .where('deposit.userId = :userId', { userId });

    if (status) {
      queryBuilder.andWhere('deposit.status = :status', { status });
    }

    const [deposits, total] = await queryBuilder
      .orderBy('deposit.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    return { deposits, total };
  }

  async markExpired(): Promise<number> {
    this.logger.debug('Marking expired deposits');

    const result = await this.repository
      .createQueryBuilder()
      .update(DepositEntity)
      .set({ status: DepositStatus.EXPIRED })
      .where('expiresAt < :now', { now: new Date() })
      .andWhere('status IN (:...statuses)', { 
        statuses: [
          DepositStatus.INITIATED,
          DepositStatus.PENDING_OTP,
          DepositStatus.PENDING_CONFIRMATION,
        ]
      })
      .execute();

    return result.affected || 0;
  }
}