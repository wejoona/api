import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import {
  ReferralOrmEntity,
  ReferralStatus,
} from '../orm-entities/referral.orm-entity';

export const REFERRAL_REPOSITORY = Symbol('REFERRAL_REPOSITORY');

@Injectable()
export class ReferralRepository {
  constructor(
    @InjectRepository(ReferralOrmEntity)
    private readonly repository: Repository<ReferralOrmEntity>,
  ) {}

  async findById(id: string): Promise<ReferralOrmEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByCode(code: string): Promise<ReferralOrmEntity | null> {
    return this.repository.findOne({ where: { referralCode: code } });
  }

  async findByReferrerId(referrerId: string): Promise<ReferralOrmEntity[]> {
    return this.repository.find({
      where: { referrerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByReferredId(
    referredId: string,
  ): Promise<ReferralOrmEntity | null> {
    return this.repository.findOne({ where: { referredId } });
  }

  async findPendingByCode(code: string): Promise<ReferralOrmEntity | null> {
    return this.repository.findOne({
      where: {
        referralCode: code,
        status: 'pending',
        expiresAt: MoreThan(new Date()),
      },
    });
  }

  async create(
    referral: Partial<ReferralOrmEntity>,
  ): Promise<ReferralOrmEntity> {
    const entity = this.repository.create(this.normalizeMoneyFields(referral));
    return this.repository.save(entity);
  }

  async update(
    id: string,
    updates: Partial<ReferralOrmEntity>,
  ): Promise<ReferralOrmEntity | null> {
    await this.repository.update(id, this.normalizeMoneyFields(updates));
    return this.findById(id);
  }

  async updateStatus(id: string, status: ReferralStatus): Promise<void> {
    const updates: Partial<ReferralOrmEntity> = { status };
    if (status === 'completed') {
      updates.completedAt = new Date();
    } else if (status === 'rewarded') {
      updates.rewardedAt = new Date();
    }
    await this.repository.update(id, updates);
  }

  async countByReferrerId(referrerId: string): Promise<number> {
    return this.repository.count({ where: { referrerId } });
  }

  async countCompletedByReferrerId(referrerId: string): Promise<number> {
    return this.repository.count({
      where: { referrerId, status: 'completed' },
    });
  }

  async findUnrewardedCompleted(): Promise<ReferralOrmEntity[]> {
    return this.repository.find({
      where: { status: 'completed' },
      order: { completedAt: 'ASC' },
    });
  }

  private normalizeMoneyFields(
    value: Partial<ReferralOrmEntity>,
  ): Partial<ReferralOrmEntity> {
    return {
      ...value,
      referrerReward: this.toDatabaseBigInt(value.referrerReward),
      referredReward: this.toDatabaseBigInt(value.referredReward),
    };
  }

  private toDatabaseBigInt(
    value: bigint | string | number | null | undefined,
  ): any {
    return typeof value === 'bigint' ? value.toString() : value;
  }
}
