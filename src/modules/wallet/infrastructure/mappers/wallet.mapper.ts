import { WalletOrmEntity } from '../orm-entities/wallet.orm-entity';
import {
  WalletEntity,
  WalletStatus,
  KycStatus,
} from '../../domain/entities/wallet.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WalletMapper {
  toOrmEntity(domainEntity: WalletEntity): WalletOrmEntity {
    if (!domainEntity) {
      throw new Error('Domain entity is required');
    }

    const ormEntity = new WalletOrmEntity();
    ormEntity.id = domainEntity.id;
    ormEntity.userId = domainEntity.userId;
    ormEntity.yellowCardWalletId = domainEntity.yellowCardWalletId;
    ormEntity.circleWalletId = domainEntity.circleWalletId;
    ormEntity.circleWalletAddress = domainEntity.circleWalletAddress;
    ormEntity.blnkBalanceId = domainEntity.blnkBalanceId;
    ormEntity.stellarAddress = domainEntity.stellarAddress;
    ormEntity.currency = domainEntity.currency;
    ormEntity.balance = domainEntity.balance;
    ormEntity.kycStatus = domainEntity.kycStatus;
    ormEntity.status = domainEntity.status;
    ormEntity.createdAt = domainEntity.createdAt;
    ormEntity.updatedAt = domainEntity.updatedAt;

    return ormEntity;
  }

  toDomainEntity(ormEntity: WalletOrmEntity): WalletEntity {
    return WalletEntity.reconstitute({
      id: ormEntity.id,
      userId: ormEntity.userId,
      yellowCardWalletId: ormEntity.yellowCardWalletId,
      circleWalletId: ormEntity.circleWalletId,
      circleWalletAddress: ormEntity.circleWalletAddress,
      blnkBalanceId: ormEntity.blnkBalanceId,
      stellarAddress: ormEntity.stellarAddress,
      currency: ormEntity.currency,
      balance: Number(ormEntity.balance) || 0,
      kycStatus: (ormEntity.kycStatus as KycStatus) || 'none',
      status: ormEntity.status as WalletStatus,
      createdAt: ormEntity.createdAt,
      updatedAt: ormEntity.updatedAt,
    });
  }
}
