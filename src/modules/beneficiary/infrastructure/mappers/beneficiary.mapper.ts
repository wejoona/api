import { Injectable } from '@nestjs/common';
import {
  Beneficiary,
  BeneficiaryAccountType,
} from '../../domain/entities/beneficiary.entity';
import {
  BeneficiaryOrmEntity,
  BeneficiaryAccountType as OrmAccountType,
} from '../orm-entities/beneficiary.orm-entity';

@Injectable()
export class BeneficiaryMapper {
  toDomain(entity: BeneficiaryOrmEntity): Beneficiary {
    return Beneficiary.reconstitute({
      id: entity.id,
      walletId: entity.walletId,
      name: entity.name,
      phoneE164: entity.phoneE164,
      accountType: entity.accountType as unknown as BeneficiaryAccountType,
      beneficiaryUserId: entity.beneficiaryUserId,
      beneficiaryWalletAddress: entity.beneficiaryWalletAddress,
      bankCode: entity.bankCode,
      bankAccountNumber: entity.bankAccountNumber,
      mobileMoneyProvider: entity.mobileMoneyProvider,
      isFavorite: entity.isFavorite,
      isVerified: entity.isVerified,
      transferCount: entity.transferCount,
      totalTransferred: parseFloat(entity.totalTransferred),
      lastTransferAt: entity.lastTransferAt,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toOrmEntity(beneficiary: Beneficiary): BeneficiaryOrmEntity {
    const entity = new BeneficiaryOrmEntity();
    entity.id = beneficiary.id;
    entity.walletId = beneficiary.walletId;
    entity.name = beneficiary.name;
    entity.phoneE164 = beneficiary.phoneE164;
    entity.accountType = beneficiary.accountType as unknown as OrmAccountType;
    entity.beneficiaryUserId = beneficiary.beneficiaryUserId;
    entity.beneficiaryWalletAddress = beneficiary.beneficiaryWalletAddress;
    entity.bankCode = beneficiary.bankCode;
    entity.bankAccountNumber = beneficiary.bankAccountNumber;
    entity.mobileMoneyProvider = beneficiary.mobileMoneyProvider;
    entity.isFavorite = beneficiary.isFavorite;
    entity.isVerified = beneficiary.isVerified;
    entity.transferCount = beneficiary.transferCount;
    entity.totalTransferred = beneficiary.totalTransferred.toString();
    entity.lastTransferAt = beneficiary.lastTransferAt;
    entity.metadata = beneficiary.metadata;
    return entity;
  }
}
