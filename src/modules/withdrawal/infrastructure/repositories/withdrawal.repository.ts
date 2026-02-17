import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { WithdrawalEntity } from '../../domain/entities/withdrawal.entity';
import { WithdrawalStatus } from '../../domain/enums/withdrawal-status.enum';
import { PaymentMethodType } from '../../../deposit/domain/enums/payment-method-type.enum';

export interface CreateWithdrawalParams {
  userId: string;
  amount: bigint;
  fiatAmount: bigint;
  currency: string;
  providerCode: string;
  paymentMethodType: PaymentMethodType;
  phoneNumber: string;
  exchangeRate?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateWithdrawalParams {
  status?: WithdrawalStatus;
  providerTransactionId?: string;
  providerReference?: string;
  failureReason?: string;
  blnkTransactionId?: string;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface ListWithdrawalsParams {
  userId: string;
  status?: WithdrawalStatus;
  limit?: number;
  offset?: number;
}

@Injectable()
export class WithdrawalRepository {
  private readonly logger = new Logger(WithdrawalRepository.name);

  constructor(
    @InjectRepository(WithdrawalEntity)
    private readonly repository: Repository<WithdrawalEntity>,
  ) {}

  async create(params: CreateWithdrawalParams): Promise<WithdrawalEntity> {
    this.logger.debug(`Creating withdrawal for user ${params.userId}`);

    const withdrawal = this.repository.create({
      ...params,
      status: WithdrawalStatus.INITIATED,
    });

    return this.repository.save(withdrawal);
  }

  async findById(id: string): Promise<WithdrawalEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByIdAndUser(id: string, userId: string): Promise<WithdrawalEntity | null> {
    return this.repository.findOne({ where: { id, userId } });
  }

  async update(id: string, params: UpdateWithdrawalParams): Promise<WithdrawalEntity> {
    await this.repository.update(id, params as any);
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Withdrawal ${id} not found after update`);
    return updated;
  }

  async list(params: ListWithdrawalsParams): Promise<{ withdrawals: WithdrawalEntity[]; total: number }> {
    const where: any = { userId: params.userId };
    if (params.status) where.status = params.status;

    const [withdrawals, total] = await this.repository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: params.limit || 20,
      skip: params.offset || 0,
    });

    return { withdrawals, total };
  }
}
