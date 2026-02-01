import { Injectable } from '@nestjs/common';
import {
  SubBusiness,
  SubBusinessType,
  SubBusinessStatus,
  SubBusinessPermissions,
} from '../../domain/entities/sub-business.entity';
import { SubBusinessOrmEntity } from '../orm-entities/sub-business.orm-entity';

@Injectable()
export class SubBusinessMapper {
  toDomain(entity: SubBusinessOrmEntity): SubBusiness {
    return SubBusiness.reconstitute({
      id: entity.id,
      businessId: entity.businessId,
      walletId: entity.walletId,
      name: entity.name,
      description: entity.description,
      type: entity.type as SubBusinessType,
      permissions: entity.permissions as SubBusinessPermissions,
      spendingLimit: entity.spendingLimit
        ? parseFloat(entity.spendingLimit)
        : null,
      status: entity.status as SubBusinessStatus,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toOrmEntity(subBusiness: SubBusiness): SubBusinessOrmEntity {
    const entity = new SubBusinessOrmEntity();
    entity.id = subBusiness.id;
    entity.businessId = subBusiness.businessId;
    entity.walletId = subBusiness.walletId;
    entity.name = subBusiness.name;
    entity.description = subBusiness.description;
    entity.type = subBusiness.type;
    entity.permissions = subBusiness.permissions;
    entity.spendingLimit = subBusiness.spendingLimit?.toString() ?? null;
    entity.status = subBusiness.status;
    return entity;
  }
}
