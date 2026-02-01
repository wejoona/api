import { Injectable } from '@nestjs/common';
import { Bank } from '../../domain/entities/bank.entity';
import { BankVerificationMethod } from '../../domain/entities/linked-bank-account.entity';
import { BankOrmEntity } from '../orm-entities/bank.orm-entity';

@Injectable()
export class BankMapper {
  toDomain(entity: BankOrmEntity): Bank {
    return Bank.reconstitute({
      code: entity.code,
      name: entity.name,
      logoUrl: entity.logoUrl,
      country: entity.country,
      verificationMethods:
        entity.verificationMethods as BankVerificationMethod[],
      supportsBalanceCheck: entity.supportsBalanceCheck,
      supportsDirectDebit: entity.supportsDirectDebit,
      isActive: entity.isActive,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toOrmEntity(domain: Bank): BankOrmEntity {
    const entity = new BankOrmEntity();
    entity.code = domain.code;
    entity.name = domain.name;
    entity.logoUrl = domain.logoUrl;
    entity.country = domain.country;
    entity.verificationMethods = domain.verificationMethods as string[];
    entity.supportsBalanceCheck = domain.supportsBalanceCheck;
    entity.supportsDirectDebit = domain.supportsDirectDebit;
    entity.isActive = domain.isActive;
    entity.metadata = domain.metadata;
    return entity;
  }
}
