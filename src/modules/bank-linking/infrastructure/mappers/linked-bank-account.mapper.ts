import { Injectable } from '@nestjs/common';
import {
  LinkedBankAccount,
  BankAccountStatus,
  BankVerificationMethod,
} from '../../domain/entities/linked-bank-account.entity';
import { LinkedBankAccountOrmEntity } from '../orm-entities/linked-bank-account.orm-entity';

@Injectable()
export class LinkedBankAccountMapper {
  toDomain(entity: LinkedBankAccountOrmEntity): LinkedBankAccount {
    return LinkedBankAccount.reconstitute({
      id: entity.id,
      walletId: entity.walletId,
      bankCode: entity.bankCode,
      bankName: entity.bankName,
      bankLogoUrl: entity.bankLogoUrl,
      accountNumberEncrypted: entity.accountNumberEncrypted,
      accountNumberMasked: entity.accountNumberMasked,
      accountHolderName: entity.accountHolderName,
      status: entity.status as BankAccountStatus,
      isVerified: entity.isVerified,
      isPrimary: entity.isPrimary,
      countryCode: entity.countryCode,
      currency: entity.currency,
      availableBalance: entity.availableBalance
        ? parseFloat(entity.availableBalance)
        : null,
      lastBalanceCheckAt: entity.lastBalanceCheckAt,
      lastVerifiedAt: entity.lastVerifiedAt,
      verificationMethod:
        entity.verificationMethod as BankVerificationMethod | null,
      supportsBalanceCheck: entity.supportsBalanceCheck,
      supportsDirectDebit: entity.supportsDirectDebit,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toOrmEntity(domain: LinkedBankAccount): LinkedBankAccountOrmEntity {
    const entity = new LinkedBankAccountOrmEntity();
    entity.id = domain.id;
    entity.walletId = domain.walletId;
    entity.bankCode = domain.bankCode;
    entity.bankName = domain.bankName;
    entity.bankLogoUrl = domain.bankLogoUrl;
    entity.accountNumberEncrypted = domain.accountNumberEncrypted;
    entity.accountNumberMasked = domain.accountNumberMasked;
    entity.accountHolderName = domain.accountHolderName;
    entity.status = domain.status;
    entity.isVerified = domain.isVerified;
    entity.isPrimary = domain.isPrimary;
    entity.countryCode = domain.countryCode;
    entity.currency = domain.currency;
    entity.availableBalance = domain.availableBalance?.toString() ?? null;
    entity.lastBalanceCheckAt = domain.lastBalanceCheckAt;
    entity.lastVerifiedAt = domain.lastVerifiedAt;
    entity.verificationMethod = domain.verificationMethod;
    entity.supportsBalanceCheck = domain.supportsBalanceCheck;
    entity.supportsDirectDebit = domain.supportsDirectDebit;
    entity.metadata = domain.metadata;
    return entity;
  }
}
