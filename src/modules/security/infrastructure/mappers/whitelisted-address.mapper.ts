import {
  WhitelistedAddress,
  AddressType,
  WhitelistStatus,
} from '../../domain/entities';
import { WhitelistedAddressOrmEntity } from '../orm-entities';

export class WhitelistedAddressMapper {
  static toDomain(orm: WhitelistedAddressOrmEntity): WhitelistedAddress {
    return WhitelistedAddress.reconstitute({
      id: orm.id,
      userId: orm.userId,
      address: orm.address,
      label: orm.label,
      addressType: orm.addressType as AddressType,
      network: orm.network,
      status: orm.status as WhitelistStatus,
      verifiedAt: orm.verifiedAt,
      lastUsedAt: orm.lastUsedAt,
      usageCount: orm.usageCount,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(domain: WhitelistedAddress): WhitelistedAddressOrmEntity {
    const orm = new WhitelistedAddressOrmEntity();
    orm.id = domain.id;
    orm.userId = domain.userId;
    orm.address = domain.address;
    orm.label = domain.label;
    orm.addressType = domain.addressType;
    orm.network = domain.network;
    orm.status = domain.status;
    orm.verifiedAt = domain.verifiedAt;
    orm.lastUsedAt = domain.lastUsedAt;
    orm.usageCount = domain.usageCount;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }
}
