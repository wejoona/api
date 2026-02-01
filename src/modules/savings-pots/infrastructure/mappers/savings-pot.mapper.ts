import { Injectable } from '@nestjs/common';
import { SavingsPotOrmEntity } from '../orm-entities/savings-pot.orm-entity';
import {
  SavingsPotEntity,
  SavingsPotStatus,
  AutoDepositFrequency,
} from '../../domain/entities/savings-pot.entity';

@Injectable()
export class SavingsPotMapper {
  toOrmEntity(domainEntity: SavingsPotEntity): SavingsPotOrmEntity {
    if (!domainEntity) {
      throw new Error('Domain entity is required');
    }

    const ormEntity = new SavingsPotOrmEntity();
    ormEntity.id = domainEntity.id;
    ormEntity.walletId = domainEntity.walletId;
    ormEntity.name = domainEntity.name;
    ormEntity.targetAmount = domainEntity.targetAmount;
    ormEntity.currentAmount = domainEntity.currentAmount;
    ormEntity.currency = domainEntity.currency;
    ormEntity.targetDate = domainEntity.targetDate;
    ormEntity.isLocked = domainEntity.isLocked;
    ormEntity.lockUntil = domainEntity.lockUntil;
    ormEntity.autoDepositAmount = domainEntity.autoDepositAmount;
    ormEntity.autoDepositFrequency = domainEntity.autoDepositFrequency;
    ormEntity.status = domainEntity.status;
    ormEntity.createdAt = domainEntity.createdAt;
    ormEntity.updatedAt = domainEntity.updatedAt;
    ormEntity.completedAt = domainEntity.completedAt;

    return ormEntity;
  }

  toDomainEntity(ormEntity: SavingsPotOrmEntity): SavingsPotEntity {
    return SavingsPotEntity.reconstitute({
      id: ormEntity.id,
      walletId: ormEntity.walletId,
      name: ormEntity.name,
      targetAmount: Number(ormEntity.targetAmount) || 0,
      currentAmount: Number(ormEntity.currentAmount) || 0,
      currency: ormEntity.currency,
      targetDate: ormEntity.targetDate,
      isLocked: ormEntity.isLocked,
      lockUntil: ormEntity.lockUntil,
      autoDepositAmount: ormEntity.autoDepositAmount ? Number(ormEntity.autoDepositAmount) : null,
      autoDepositFrequency: ormEntity.autoDepositFrequency as AutoDepositFrequency | null,
      status: ormEntity.status as SavingsPotStatus,
      createdAt: ormEntity.createdAt,
      updatedAt: ormEntity.updatedAt,
      completedAt: ormEntity.completedAt,
    });
  }
}
