import { Injectable } from '@nestjs/common';
import { MerchantEntity } from '../../domain/entities/merchant.entity';
import {
  MerchantCategory,
  MerchantStatus,
} from '../../domain/entities/merchant.types';
import { MerchantOrmEntity } from '../orm-entities/merchant.orm-entity';

@Injectable()
export class MerchantMapper {
  /**
   * Convert ORM entity to domain entity
   */
  toDomain(orm: MerchantOrmEntity): MerchantEntity {
    return MerchantEntity.reconstitute({
      id: orm.id,
      businessName: orm.businessName,
      displayName: orm.displayName,
      ownerId: orm.ownerId,
      category: orm.category as MerchantCategory,
      country: orm.country,
      walletId: orm.walletId,
      qrCode: orm.qrCode,
      qrCodeUrl: orm.qrCodeUrl || undefined,
      isVerified: orm.isVerified,
      feePercent: Number(orm.feePercent),
      dailyLimit: Number(orm.dailyLimit),
      monthlyLimit: Number(orm.monthlyLimit),
      dailyVolume: Number(orm.dailyVolume),
      monthlyVolume: Number(orm.monthlyVolume),
      totalTransactions: orm.totalTransactions,
      status: orm.status as MerchantStatus,
      businessAddress: orm.businessAddress || undefined,
      businessPhone: orm.businessPhone || undefined,
      businessEmail: orm.businessEmail || undefined,
      taxId: orm.taxId || undefined,
      logoUrl: orm.logoUrl || undefined,
      webhookUrl: orm.webhookUrl || undefined,
      metadata: orm.metadata || undefined,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  /**
   * Convert domain entity to ORM entity for persistence
   */
  toPersistence(domain: MerchantEntity): Partial<MerchantOrmEntity> {
    return {
      id: domain.id,
      businessName: domain.businessName,
      displayName: domain.displayName,
      ownerId: domain.ownerId,
      category: domain.category,
      country: domain.country,
      walletId: domain.walletId,
      qrCode: domain.qrCode,
      qrCodeUrl: domain.qrCodeUrl || null,
      isVerified: domain.isVerified,
      feePercent: domain.feePercent,
      dailyLimit: domain.dailyLimit,
      monthlyLimit: domain.monthlyLimit,
      dailyVolume: domain.dailyVolume,
      monthlyVolume: domain.monthlyVolume,
      totalTransactions: domain.totalTransactions,
      status: domain.status,
      businessAddress: domain.businessAddress || null,
      businessPhone: domain.businessPhone || null,
      businessEmail: domain.businessEmail || null,
      taxId: domain.taxId || null,
      logoUrl: domain.logoUrl || null,
      webhookUrl: domain.webhookUrl || null,
      metadata: domain.metadata || null,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }
}
